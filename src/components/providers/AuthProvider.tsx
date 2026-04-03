"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  EmailAuthProvider,
  isSignInWithEmailLink,
  linkWithCredential,
  onAuthStateChanged,
  sendSignInLinkToEmail,
  signInAnonymously,
  signInWithEmailLink,
  type User,
} from "firebase/auth";
import { EMAIL_FOR_SIGNIN_STORAGE_KEY } from "@/lib/authConstants";
import {
  getAppBaseUrl,
  getFirebaseAuth,
  isFirebaseConfigured,
} from "@/lib/firebase/client";
import { isStudentEmail } from "@/lib/studentEmail";

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  firebaseReady: boolean;
  /** 匿名ではなく、学術メールが紐づいている */
  isVerifiedStudent: boolean;
  sendStudentEmailLink: (email: string) => Promise<void>;
  completeEmailLinkSignIn: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth は AuthProvider 内で使用してください");
  return ctx;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const firebaseReady = isFirebaseConfigured();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!firebaseReady || typeof window === "undefined") {
      setLoading(false);
      return;
    }

    const auth = getFirebaseAuth();
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });

    return () => unsub();
  }, [firebaseReady]);

  useEffect(() => {
    if (!firebaseReady || loading) return;
    if (user) return;
    const auth = getFirebaseAuth();
    signInAnonymously(auth).catch(() => setLoading(false));
  }, [firebaseReady, loading, user]);

  const sendStudentEmailLink = useCallback(
    async (email: string) => {
      if (!firebaseReady) throw new Error("Firebase が未設定です");
      const trimmed = email.trim().toLowerCase();
      if (!isStudentEmail(trimmed)) {
        throw new Error("学術メール（〜.ac.jp）のみ利用できます");
      }
      const base = getAppBaseUrl();
      if (!base) {
        throw new Error("NEXT_PUBLIC_APP_URL を設定してください（メールリンクの戻り先）");
      }

      const auth = getFirebaseAuth();
      await sendSignInLinkToEmail(auth, trimmed, {
        url: `${base}/auth/finish`,
        handleCodeInApp: true,
      });
      window.localStorage.setItem(EMAIL_FOR_SIGNIN_STORAGE_KEY, trimmed);
    },
    [firebaseReady]
  );

  const completeEmailLinkSignIn = useCallback(async () => {
    if (typeof window === "undefined") return;
    if (!firebaseReady) throw new Error("Firebase が未設定です");
    const auth = getFirebaseAuth();
    const href = window.location.href;
    if (!isSignInWithEmailLink(auth, href)) {
      throw new Error("メールリンクが無効か期限切れです");
    }
    const email = window.localStorage.getItem(EMAIL_FOR_SIGNIN_STORAGE_KEY);
    if (!email) {
      throw new Error(
        "メールアドレスが見つかりません。リンクを送信した同じ端末・ブラウザで開いてください"
      );
    }

    const current = auth.currentUser;
    if (current?.isAnonymous) {
      const cred = EmailAuthProvider.credentialWithLink(email, href);
      await linkWithCredential(current, cred);
    } else {
      await signInWithEmailLink(auth, email, href);
    }
    window.localStorage.removeItem(EMAIL_FOR_SIGNIN_STORAGE_KEY);
  }, [firebaseReady]);

  const isVerifiedStudent = Boolean(
    user && !user.isAnonymous && user.email && isStudentEmail(user.email)
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      firebaseReady,
      isVerifiedStudent,
      sendStudentEmailLink,
      completeEmailLinkSignIn,
    }),
    [user, loading, firebaseReady, isVerifiedStudent, sendStudentEmailLink, completeEmailLinkSignIn]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
