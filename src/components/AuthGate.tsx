import { useEffect, useState, type ReactNode } from "react";
import {
  GithubAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  type User,
} from "firebase/auth";
import { LogIn, LogOut, ShieldCheck } from "lucide-react";
import { auth } from "../lib/firebase";

interface AuthGateProps {
  children: ReactNode;
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Authentication failed.";
}

export default function AuthGate({ children }: AuthGateProps) {
  const [user, setUser] = useState<User | null>(auth.currentUser);
  const [isChecking, setIsChecking] = useState(true);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => onAuthStateChanged(auth, (nextUser) => {
    setUser(nextUser);
    setIsChecking(false);
  }), []);

  const handleSignIn = async () => {
    setIsSigningIn(true);
    setError(null);
    try {
      const provider = new GithubAuthProvider();
      provider.setCustomParameters({ prompt: "select_account" });
      await signInWithPopup(auth, provider);
    } catch (caught) {
      setError(getErrorMessage(caught));
    } finally {
      setIsSigningIn(false);
    }
  };

  if (isChecking) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100 text-sm font-semibold text-slate-600">
        Verifying access…
      </main>
    );
  }

  if (!user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100 p-6">
        <section className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-xl shadow-slate-200/60">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
            <ShieldCheck className="h-7 w-7" />
          </div>
          <p className="mt-6 text-xs font-bold uppercase tracking-[0.18em] text-blue-600">Fluidnatek Smart Memory</p>
          <h1 className="mt-2 text-2xl font-bold text-slate-950">Authorized access only</h1>
          <p className="mt-3 text-sm leading-6 text-slate-500">Sign in with an approved GitHub account to access the shared experimental database.</p>
          {error && <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
          <button type="button" onClick={handleSignIn} disabled={isSigningIn} className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 font-bold text-white disabled:opacity-50">
            <LogIn className="h-4 w-4" />
            {isSigningIn ? "Signing in…" : "Sign in with GitHub"}
          </button>
        </section>
      </main>
    );
  }

  return (
    <div className="relative h-screen">
      <div className="absolute right-6 top-3 z-50 flex items-center gap-3 rounded-xl border border-slate-200 bg-white/95 px-3 py-2 text-xs shadow-sm">
        <span className="max-w-52 truncate text-slate-600">{user.email ?? "Authenticated user"}</span>
        <button type="button" onClick={() => void signOut(auth)} className="flex items-center gap-1 font-bold text-slate-700 hover:text-red-600">
          <LogOut className="h-3.5 w-3.5" /> Sign out
        </button>
      </div>
      {children}
    </div>
  );
}
