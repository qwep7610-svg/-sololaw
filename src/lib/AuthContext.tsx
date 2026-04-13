import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth, googleProvider, naverProvider, kakaoProvider, signInWithPopup, signOut, onAuthStateChanged, User, db, doc, getDoc, setDoc, serverTimestamp, onSnapshot } from './firebase';
import { UserCredential } from 'firebase/auth';

interface AuthContextType {
  user: (User & { role?: string; isRegistered?: boolean; status?: string; rejectionReason?: string }) | null;
  loading: boolean;
  login: () => Promise<UserCredential | null>;
  loginWithGoogle: () => Promise<UserCredential | null>;
  loginWithKakao: () => Promise<UserCredential | null>;
  loginWithNaver: () => Promise<UserCredential | null>;
  logout: () => Promise<void>;
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

  const value = React.useMemo(() => ({
    user,
    loading,
    login,
    loginWithGoogle,
    loginWithKakao,
    loginWithNaver,
    logout
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
