import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import cron from "node-cron";
import axios from "axios";
import admin from "firebase-admin";
import fs from "fs";

import { getFirestore } from "firebase-admin/firestore";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Firebase Admin
if (!admin.apps.length) {
  try {
    const firebaseConfigPath = path.join(__dirname, 'firebase-applet-config.json');
    let projectId = process.env.VITE_FIREBASE_PROJECT_ID;
    let config: any = {};
    if (fs.existsSync(firebaseConfigPath)) {
      config = JSON.parse(fs.readFileSync(firebaseConfigPath, 'utf8'));
      projectId = projectId || config.projectId;
    }
    
    console.log(`[Firebase] Initializing Admin with Project ID: ${projectId || 'ADC'}`);
    
    // In this environment, initializeApp() with no args often works best for ADC,
    // but if we have a projectId, we should provide it.
    const options: any = {};
    if (projectId) options.projectId = projectId;
    
    admin.initializeApp(options);
  } catch (error) {
    console.error("Firebase Admin initialization error:", error);
  }
}

// Get the correct database instance
const getDb = () => {
  try {
    const configPath = path.join(__dirname, 'firebase-applet-config.json');
    if (fs.existsSync(configPath)) {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      if (config.firestoreDatabaseId) {
        console.log(`[Firebase] Using Named Database ID: ${config.firestoreDatabaseId}`);
        return getFirestore(admin.app(), config.firestoreDatabaseId);
      }
    }
  } catch (e) {
    console.warn("[Firebase] Could not initialize named database ID, using default.");
  }
  return getFirestore();
};

const db = getDb();

// In-memory fallback for AI usage tracking when Firestore permissions fail
const memoryUsageStore = new Map<string, { count: number, date: string, userId: string }>();

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Cloud Run Cost Optimization:
  // 1. Instance Memory: 256MiB - Optimized for light API handling (Costs 50% less than 512MiB)
  // 2. CPU allocation: CPU is only allocated during request processing
  // 3. Auto-scaling: min-instances 0 ensures zero cost when idle
  
  app.use(express.json());

  // API routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // AI Usage Tracking API
  app.post("/api/usage/ai", async (req, res) => {
    const { userId } = req.body;
    if (!userId) {
      return res.status(400).json({ error: "Missing userId" });
    }

    const today = new Date().toISOString().split('T')[0];
    const usageDocId = `${userId}_${today}`;
    const dailyLimit = 15;

    // Try Firestore first
    try {
      const usageRef = db.collection("ai_usage").doc(usageDocId);
      const result = await db.runTransaction(async (transaction) => {
        const usageDoc = await transaction.get(usageRef);
        const currentCount = usageDoc.exists ? usageDoc.data()?.count || 0 : 0;

        if (currentCount >= dailyLimit) {
          return { allowed: false, currentCount, dailyLimit };
        }

        if (usageDoc.exists) {
          transaction.update(usageRef, {
            count: currentCount + 1,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
          });
        } else {
          transaction.set(usageRef, {
            userId,
            date: today,
            count: 1,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
          });
        }

        return { allowed: true, currentCount: currentCount + 1, dailyLimit };
      });

      if (!result.allowed) {
        return res.status(429).json({
          error: "Daily AI usage limit reached",
          message: `일일 AI 사용량(${result.dailyLimit}회)을 모두 소진했습니다. 내일 다시 이용해 주세요.`,
          ...result
        });
      }

      // Also update memory store as a secondary "fast-cache"
      memoryUsageStore.set(usageDocId, { count: result.currentCount, date: today, userId });

      res.json({ success: true, ...result });
    } catch (error: any) {
      console.warn("[Firebase] AI Usage Firestore Write Error (Permission/Index):", error.message);
      
      // Fallback to memory tracking
      const current = memoryUsageStore.get(usageDocId) || { count: 0, date: today, userId };
      if (current.date !== today) {
        current.count = 0;
        current.date = today;
      }

      if (current.count >= dailyLimit) {
        return res.status(429).json({
          allowed: false,
          currentCount: current.count,
          dailyLimit,
          error: "Daily AI usage limit reached",
          message: `일일 AI 사용량(${dailyLimit}회)을 모두 소진했습니다. 내일 다시 이용해 주세요. (Fallback Mode)`
        });
      }

      current.count += 1;
      memoryUsageStore.set(usageDocId, current);

      res.json({ 
        success: true, 
        allowed: true, 
        currentCount: current.count, 
        dailyLimit,
        isFallback: true 
      });
    }
  });

  // AI Usage Stats for Admin
  app.get("/api/admin/usage-stats", async (req, res) => {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      // 1. Collect from Memory
      const memStatsDocs = Array.from(memoryUsageStore.values())
        .filter(doc => doc.date === today);

      // 2. Try to collect from Firestore
      let fsStatsDocs: any[] = [];
      try {
        const snapshot = await db.collection("ai_usage")
          .where("date", "==", today)
          .get();
        fsStatsDocs = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
      } catch (fsError: any) {
        console.warn("[Admin] Could not fetch Firestore usage stats:", fsError.message);
      }

      // Merge results
      const userMap = new Map();
      fsStatsDocs.forEach(d => userMap.set(d.userId, d));
      memStatsDocs.forEach(d => {
        const existing = userMap.get(d.userId);
        if (!existing || d.count > (existing.count || 0)) {
          userMap.set(d.userId, { ...existing, ...d });
        }
      });

      const allStats = Array.from(userMap.values());
      const topUsers = allStats
        .sort((a: any, b: any) => (b.count || 0) - (a.count || 0))
        .slice(0, 10);
      
      const totalToday = allStats.reduce((acc, doc: any) => acc + (doc.count || 0), 0);

      res.json({
        date: today,
        totalToday,
        topUsers,
        usingFallback: fsStatsDocs.length === 0 && memStatsDocs.length > 0
      });
    } catch (error: any) {
      console.error("[Admin] Usage Stats Critical Failure:", error.message);
      res.status(500).json({ 
        error: "Internal Server Error",
        details: error.message
      });
    }
  });

  // Toss Payments: Exchange authKey for billingKey
  app.post("/api/toss/billing-key", async (req, res) => {
    const { authKey, customerKey } = req.body;
    const secretKey = process.env.TOSS_SECRET_KEY;

    if (!authKey || !customerKey) {
      return res.status(400).json({ error: "Missing authKey or customerKey" });
    }

    if (!secretKey) {
      return res.status(500).json({ error: "TOSS_SECRET_KEY is not configured" });
    }

    try {
      const basicAuth = Buffer.from(secretKey + ":").toString('base64');
      const response = await axios.post(
        "https://api.tosspayments.com/v1/billing/authorizations/issue",
        { authKey, customerKey },
        {
          headers: {
            Authorization: `Basic ${basicAuth}`,
            'Content-Type': 'application/json'
          }
        }
      );

      res.json(response.data);
    } catch (error: any) {
      console.error("Toss Billing Key Exchange Error:", error.response?.data || error.message);
      res.status(error.response?.status || 500).json(error.response?.data || { error: "Internal Server Error" });
    }
  });

  // Toss Payments: Charge subscription
  app.post("/api/toss/charge", async (req, res) => {
    const { billingKey, amount, customerKey, orderName } = req.body;
    const secretKey = process.env.TOSS_SECRET_KEY;

    if (!billingKey || !amount || !customerKey) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    if (!secretKey) {
      return res.status(500).json({ error: "TOSS_SECRET_KEY is not configured" });
    }

    try {
      const basicAuth = Buffer.from(secretKey + ":").toString('base64');
      const response = await axios.post(
        `https://api.tosspayments.com/v1/billing/${billingKey}`,
        {
          customerKey,
          amount,
          orderId: `SOLO_AD_${Date.now()}`,
          orderName: orderName || "SoloLaw Partnership 정액 광고료"
        },
        {
          headers: {
            Authorization: `Basic ${basicAuth}`,
            'Content-Type': 'application/json'
          }
        }
      );

      res.json(response.data);
    } catch (error: any) {
      console.error("Toss Charge Error:", error.response?.data || error.message);
      res.status(error.response?.status || 500).json(error.response?.data || { error: "Internal Server Error" });
    }
  });

  // Toss Payments: Cancel subscription/billing key (Placeholder)
  app.post("/api/toss/cancel-subscription", async (req, res) => {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: "Missing userId" });

    try {
      // Find the subscription for this user
      const subRef = db.collection("subscriptions").doc(userId);
      const subDoc = await subRef.get();

      if (subDoc.exists) {
        // Mark as inactive in DB
        await subRef.update({
          status: "inactive",
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        
        // In real Toss Payments, you might want to call an API if you have recurring schedules managed by Toss
        // But for billing-key based payments (like we do in the scheduler), 
        // simply making it inactive in our DB stops the payments.
      }

      res.json({ success: true, message: "Subscription cancelled successfully" });
    } catch (error) {
      console.error("Cancel Subscription Error:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // Scheduler: Every day at 9 AM
  // For testing purposes, you might want to run this more frequently or manually trigger it.
  cron.schedule("0 9 * * *", async () => {
    console.log("Running subscription payment scheduler...");
    const now = new Date();
    
    try {
      const snapshot = await db.collection("subscriptions")
        .where("nextBillingDate", "<=", admin.firestore.Timestamp.fromDate(now))
        .where("status", "==", "active")
        .get();

      if (snapshot.empty) {
        console.log("No subscriptions due for payment today.");
        return;
      }

      for (const doc of snapshot.docs) {
        const sub = doc.data();
        try {
          console.log(`Processing payment for lawyer: ${sub.lawyerId} (${sub.planType})`);
          
          // 1. Determine PG provider and process payment
          if (sub.billingKey && sub.billingKey.startsWith('toss_')) {
            // Toss Payments logic
            const secretKey = process.env.TOSS_SECRET_KEY;
            if (!secretKey) throw new Error("TOSS_SECRET_KEY is not configured");
            
            const basicAuth = Buffer.from(secretKey + ":").toString('base64');
            const payRes = await axios.post(
              `https://api.tosspayments.com/v1/billing/${sub.billingKey}`,
              {
                customerKey: sub.lawyerId,
                amount: sub.amount,
                orderId: `SOLO_AD_${sub.lawyerId}_${Date.now()}`,
                orderName: `SoloLaw Partnership Ad (${sub.planType})`
              },
              {
                headers: {
                  Authorization: `Basic ${basicAuth}`,
                  'Content-Type': 'application/json'
                }
              }
            );
            
            if (payRes.status !== 200) throw new Error("Toss Payment failed");
          } else {
            console.log(`Skipping payment for lawyer ${sub.lawyerId}: Billing key not supported or missing.`);
            continue; // Skip unsupported providers
          }

          // Simulate successful payment for logic flow
          const nextDate = new Date(sub.nextBillingDate.toDate());
          nextDate.setMonth(nextDate.getMonth() + 1);

          await doc.ref.update({
            nextBillingDate: admin.firestore.Timestamp.fromDate(nextDate),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });

          console.log(`Successfully processed payment and renewed subscription for: ${sub.lawyerId}`);
        } catch (payError) {
          console.error(`Payment failed for lawyer ${sub.lawyerId}:`, payError);
          // Update lawyer status to reflect failed payment
          const batch = db.batch();
          batch.update(db.collection("subscriptions").doc(doc.id), {
            status: "failed",
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });
          
          batch.update(db.collection("lawyers").doc(sub.lawyerId), {
            hasActiveSubscription: false,
            adStatus: "failed",
            adPlan: null,
            priority: 0,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });
          
          // Also remove from ad slots if payment fails
          const adSlots = await db.collection("ad_slots").where("lawyerId", "==", sub.lawyerId).get();
          adSlots.docs.forEach(slotDoc => {
            batch.delete(slotDoc.ref);
          });
          
          await batch.commit();
        }
      }
    } catch (error) {
      console.error("Scheduler error:", error);
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
