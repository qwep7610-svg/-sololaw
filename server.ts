import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import cron from "node-cron";
import axios from "axios";
import admin from "firebase-admin";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Firebase Admin
// Note: In a real production environment, you would use a service account key.
// Here we initialize with default credentials or empty if not available.
if (!admin.apps.length) {
  try {
    admin.initializeApp({
      projectId: process.env.VITE_FIREBASE_PROJECT_ID || "solo-law-app",
    });
  } catch (error) {
    console.error("Firebase Admin initialization error:", error);
  }
}

const db = admin.firestore();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // PortOne Billing Key Save API
  app.post("/api/subscriptions/billing-key", async (req, res) => {
    const { lawyerId, customer_uid, planType, amount } = req.body;
    
    if (!lawyerId || !customer_uid) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    try {
      const nextBillingDate = new Date();
      nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);

      await db.collection("subscriptions").doc(lawyerId).set({
        lawyerId,
        billingKey: customer_uid,
        planType,
        amount,
        nextBillingDate: admin.firestore.Timestamp.fromDate(nextBillingDate),
        status: "active",
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      // Update lawyer registration status
      await db.collection("lawyers").doc(lawyerId).update({
        hasActiveSubscription: true,
        subscriptionPlan: planType
      });

      res.json({ success: true });
    } catch (error) {
      console.error("Failed to save billing key:", error);
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
          
          // PortOne 'Again' API call logic
          // 1. Get Access Token
          // 2. Call /subscribe/payments/again
          
          /* 
          // Example implementation (Requires PORTONE_API_KEY and SECRET)
          const tokenRes = await axios.post('https://api.iamport.kr/users/getToken', {
            imp_key: process.env.PORTONE_API_KEY,
            imp_secret: process.env.PORTONE_API_SECRET
          });
          const accessToken = tokenRes.data.response.access_token;

          const payRes = await axios.post('https://api.iamport.kr/subscribe/payments/again', {
            customer_uid: sub.billingKey,
            merchant_uid: `sub_${sub.lawyerId}_${Date.now()}`,
            amount: sub.amount,
            name: `SoloLaw 변호사 정액제 광고 (${sub.planType})`
          }, {
            headers: { Authorization: accessToken }
          });

          if (payRes.data.code !== 0) throw new Error(payRes.data.message);
          */

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
          await doc.ref.update({
            status: "failed",
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });
          
          // Update lawyer status to reflect failed payment
          await db.collection("lawyers").doc(sub.lawyerId).update({
            hasActiveSubscription: false
          });
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
