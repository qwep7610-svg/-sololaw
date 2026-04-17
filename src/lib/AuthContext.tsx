import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth, googleProvider, naverProvider, kakaoProvider, signInWithPopup, signOut, onAuthStateChanged, User, db, doc, getDoc, setDoc, serverTimestamp, onSnapshot, collection, query, where, getDocs, deleteDoc, writeBatch, handleFirestoreError, OperationType } from './firebase';
import { UserCredential, deleteUser, reauthenticateWithPopup, GoogleAuthProvider } from 'firebase/auth';

interface AuthContextType {
  user: (User & { role?: string; isRegistered?: boolean; status?: string; rejectionReason?: string }) | null;
  loading: boolean;
  login: () => Promise<UserCredential | null>;
  loginWithGoogle: () => Promise<UserCredential | null>;
  loginWithKakao: () => Promise<UserCredential | null>;
  loginWithNaver: () => Promise<UserCredential | null>;
  logout: () => Promise<void>;
  deleteAccount: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<(User & { role?: string; isRegistered?: boolean; status?: string; rejectionReason?: string }) | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribeUser: (() => void) | null = null;
    let unsubscribeLawyer: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      if (unsubscribeUser) unsubscribeUser();
      if (unsubscribeLawyer) unsubscribeLawyer();

      if (firebaseUser) {
        const userRef = doc(db, 'users', firebaseUser.uid);
        
        // Initial check and creation
        try {
          // Prevent auto-creation if we are in the middle of a deletion process
          if (localStorage.getItem('is_withdrawing') === 'true') {
            setLoading(false);
            return;
          }

          const userDoc = await getDoc(userRef);
          const isAdminEmail = firebaseUser.email === 'qwep7610@naver.com';
          
          if (!userDoc.exists()) {
            const role = isAdminEmail ? 'admin' : 'user';
            await setDoc(userRef, {
              uid: firebaseUser.uid,
              email: firebaseUser.email || `${firebaseUser.uid}@placeholder.com`,
              displayName: firebaseUser.displayName || '사용자',
              photoURL: firebaseUser.photoURL || '',
              role: role,
              isRegistered: false,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp()
            });
          } else if (isAdminEmail && userDoc.data().role !== 'admin') {
            await setDoc(userRef, { role: 'admin' }, { merge: true });
          }
        } catch (error) {
          console.error("Error initializing user:", error);
        }

        // Listen for user doc changes
        unsubscribeUser = onSnapshot(userRef, (docSnap) => {
          if (docSnap.exists()) {
            const userData = docSnap.data();
            const role = userData.role || 'user';
            
            if (role === 'lawyer') {
              // Also listen to lawyer doc if role is lawyer
              if (unsubscribeLawyer) unsubscribeLawyer();
              unsubscribeLawyer = onSnapshot(doc(db, 'lawyers', firebaseUser.uid), (lawyerSnap) => {
                const lawyerData = lawyerSnap.exists() ? lawyerSnap.data() : null;
                setUser({
                  ...firebaseUser,
                  role: role,
                  isRegistered: userData.isRegistered || false,
                  status: lawyerData?.status || 'pending',
                  rejectionReason: lawyerData?.rejectionReason || ''
                } as any);
              });
            } else {
              setUser({
                ...firebaseUser,
                role: role,
                isRegistered: userData.isRegistered || false,
                status: 'active'
              } as any);
            }
          } else {
            setUser(firebaseUser as any);
          }
          setLoading(false);
        }, (error) => {
          console.error("User snapshot error:", error);
          setLoading(false);
        });
      } else {
        setUser(null);
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeUser) unsubscribeUser();
      if (unsubscribeLawyer) unsubscribeLawyer();
    };
  }, []);

  const loginWithGoogle = async () => {
    try {
      return await signInWithPopup(auth, googleProvider);
    } catch (error: any) {
      if (error.code === 'auth/popup-closed-by-user' || error.code === 'auth/cancelled-popup-request') {
        console.log("Login popup closed by user.");
        return null;
      }
      console.error("Google login failed:", error);
      throw error;
    }
  };

  const loginWithKakao = async () => {
    try {
      return await signInWithPopup(auth, kakaoProvider);
    } catch (error: any) {
      if (error.code === 'auth/operation-not-allowed' || error.code === 'auth/invalid-provider-id') {
        throw new Error("카카오 로그인이 아직 Firebase 콘솔에서 설정되지 않았습니다. [Authentication > Sign-in method]에서 'oidc.kakao' 제공업체를 추가해 주세요.");
      }
      if (error.code === 'auth/popup-closed-by-user' || error.code === 'auth/cancelled-popup-request') {
        console.log("Kakao login popup closed by user.");
        return null;
      }
      console.error("Kakao login failed:", error);
      throw error;
    }
  };

  const loginWithNaver = async () => {
    try {
      return await signInWithPopup(auth, naverProvider);
    } catch (error: any) {
      if (error.code === 'auth/operation-not-allowed' || error.code === 'auth/invalid-provider-id') {
        throw new Error("네이버 로그인이 아직 Firebase 콘솔에서 설정되지 않았습니다. [Authentication > Sign-in method]에서 'oidc.naver' 제공업체를 추가해 주세요.");
      }
      if (error.code === 'auth/popup-closed-by-user' || error.code === 'auth/cancelled-popup-request') {
        console.log("Naver login popup closed by user.");
        return null;
      }
      console.error("Naver login failed:", error);
      throw error;
    }
  };

  const login = loginWithGoogle;

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const deleteAccount = async () => {
    const currentUser = auth.currentUser;
    if (!currentUser) throw new Error("로그인된 사용자가 없습니다.");

    try {
      const uid = currentUser.uid;
      // Mark as withdrawing to prevent onAuthStateChanged from recreating the user doc
      localStorage.setItem('is_withdrawing', 'true');

      // 1. Check for active subscriptions and Toss billing keys
      const userRef = doc(db, 'users', uid);
      let userDoc;
      try {
        userDoc = await getDoc(userRef);
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, `users/${uid}`);
        return; // handleFirestoreError throws, but for TS completeness
      }
      const userData = userDoc.data();

      // If user is a lawyer, check for subscriptions
      if (userData?.role === 'lawyer' || userData?.billingKey) {
        // In a real app, you'd call a backend API to cancel Toss subscription
        try {
          await fetch('/api/toss/cancel-subscription', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: uid })
          });
        } catch (e) {
          console.error("Failed to call subscription cancellation API:", e);
        }
      }

      // 2. Delete user-related collections
      const batch = writeBatch(db);

      // A. Legal document history (subcollection)
      const historyRef = collection(db, 'users', uid, 'history');
      let historySnap;
      try {
        historySnap = await getDocs(historyRef);
      } catch (error) {
        handleFirestoreError(error, OperationType.LIST, `users/${uid}/history`);
        return;
      }
      historySnap.forEach((doc) => batch.delete(doc.ref));
      
      // B. Lawyer related records if user is a lawyer
      batch.delete(doc(db, 'lawyers', uid));
      batch.delete(doc(db, 'lawyer_profiles', uid));
      batch.delete(doc(db, 'subscriptions', uid)); 
      batch.delete(doc(db, 'lawyer_ads', uid));

      // C. Additional lawyer history and financial records
      const profileHistoryQuery = query(collection(db, 'lawyer_profile_history'), where('userId', '==', uid));
      const settlementQuery = query(collection(db, 'settlements'), where('lawyerId', '==', uid));
      const adSlotQuery = query(collection(db, 'ad_slots'), where('lawyerId', '==', uid));
      const paymentsQuery = query(collection(db, 'payments'), where('lawyerId', '==', uid));
      const notificationsQuery = query(collection(db, 'notifications'), where('userId', '==', uid));
      const logsQuery = query(collection(db, 'logs'), where('userId', '==', uid));
      
      let snapshots;
      try {
        snapshots = await Promise.all([
          getDocs(profileHistoryQuery),
          getDocs(settlementQuery),
          getDocs(adSlotQuery),
          getDocs(paymentsQuery),
          getDocs(notificationsQuery),
          getDocs(logsQuery)
        ]);
      } catch (error) {
        handleFirestoreError(error, OperationType.LIST, 'Multiple lawyer/user collections');
        return;
      }
      
      const [pHistorySnap, settSnap, adSnap, paySnap, notifSnap, logsSnap] = snapshots;
      
      pHistorySnap.forEach(d => batch.delete(d.ref));
      settSnap.forEach(d => batch.delete(d.ref));
      adSnap.forEach(d => batch.delete(d.ref));
      paySnap.forEach(d => batch.delete(d.ref));
      notifSnap.forEach(d => batch.delete(d.ref));
      logsSnap.forEach(d => batch.delete(d.ref));

      // D. Review requests (where user is either requester or lawyer)
      const reviewReqsQuery = query(collection(db, 'review_requests'), where('userId', '==', uid));
      const queries = [getDocs(reviewReqsQuery)];
      
      // Only query lawyer-specific collections if user has lawyer role or billingKey
      if (userData?.role === 'lawyer' || userData?.billingKey) {
        queries.push(getDocs(query(collection(db, 'review_requests'), where('lawyerId', '==', uid))));
        queries.push(getDocs(query(collection(db, 'ad_payment_requests'), where('lawyerId', '==', uid))));
      }
      
      let results;
      try {
        results = await Promise.all(queries);
      } catch (error) {
        handleFirestoreError(error, OperationType.LIST, 'review_requests/ad_payment_requests');
        return;
      }

      results.forEach(snap => {
        snap.forEach(d => batch.delete(d.ref));
      });
      
      // 3. Backup non-identifiable info or log the deletion for compliance
      try {
        await setDoc(doc(db, 'deleted_users_logs', uid), {
          uid: uid,
          email: userData?.email ? `${userData.email.split('@')[0].slice(0, 3)}***@${userData.email.split('@')[1]}` : 'deleted_user',
          deletedAt: serverTimestamp(),
          reason: 'User withdrawal'
        });
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, `deleted_users_logs/${uid}`);
        return;
      }

      // 4. Delete user document
      batch.delete(userRef);
      
      try {
        await batch.commit();
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, 'Batch commit');
        return;
      }

      // 5. Delete Auth user
      try {
        // Try deleting the auth user first to see if re-auth is needed
        // But wait, if we delete auth user first, firestore rules will fail for the batch if not committed.
        // So we keep the batch commit FIRST.
        await deleteUser(currentUser);
        localStorage.removeItem('is_withdrawing');
      } catch (authError: any) {
        if (authError.code === 'auth/requires-recent-login') {
          try {
            const provider = new GoogleAuthProvider();
            // Force account selection to avoid automatic "wrong account" selection in some cases
            provider.setCustomParameters({ prompt: 'select_account' });
            
            await reauthenticateWithPopup(currentUser, provider);
            await deleteUser(currentUser);
            localStorage.removeItem('is_withdrawing');
          } catch (reAuthError: any) {
            // If re-auth fails or cancelled, we should probably keep the flag 
            // but the Firestore doc is already deleted.
            // If the user refreshes now, the doc will stay deleted.
            if (reAuthError.code === 'auth/user-mismatch') {
              throw new Error("현재 로그인된 계정과 재인증한 계정이 일치하지 않습니다. 원래 계정으로 다시 시도해주세요.");
            }
            if (reAuthError.code === 'auth/popup-closed-by-user') {
              throw new Error("보안을 위해 재인증이 필요합니다. 팝업창에서 인증을 완료해주세요.");
            }
            throw reAuthError;
          }
        } else {
          throw authError;
        }
      }

      setUser(null);
    } catch (error: any) {
      console.error("Account deletion failed:", error);
      // Detailed error mapping for Firebase Auth error
      const errorCode = error.code || "";
      const errorMessage = error.message || "";

      if (errorCode === 'auth/user-mismatch' || errorMessage.includes('user-mismatch')) {
        throw new Error("현재 로그인된 계정과 재인증한 계정이 일치하지 않습니다. 처음에 로그인했던 구글 계정을 선택해주세요.");
      }
      
      if (errorCode === 'auth/requires-recent-login') {
        throw new Error("보안을 위해 재인증이 필요합니다. 다시 시도하여 인증을 완료해주세요.");
      }

      if (errorCode === 'auth/popup-closed-by-user') {
        throw new Error("인증 창이 닫혔습니다. 탈퇴를 진행하려면 인증을 완료해야 합니다.");
      }

      if (errorCode === 'auth/network-request-failed') {
        throw new Error("네트워크 연결이 불안정합니다. 인터넷 연결을 확인해주세요.");
      }

      if (errorCode === 'auth/too-many-requests') {
        throw new Error("짧은 시간에 너무 많은 요청이 있었습니다. 잠시 후 다시 시도해주세요.");
      }

      // If we failed but marked as withdrawing, it might be stuck
      // However, Firestore data IS deleted if it reached here after commit.
      // So we don't necessarily want to remove the flag if firestore is gone.

      // Fallback to original error message
      if (typeof error.message === 'string' && error.message.length > 0 && !error.message.includes('Firebase')) {
        throw error;
      }

      throw new Error("회원 탈퇴 중 오류가 발생했습니다: " + (error.message || "알 수 없는 오류"));
    }
  };

  const value = React.useMemo(() => ({
    user,
    loading,
    login,
    loginWithGoogle,
    loginWithKakao,
    loginWithNaver,
    logout,
    deleteAccount
  }), [user, loading]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
