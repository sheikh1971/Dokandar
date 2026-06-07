"use client";

import { useState, useEffect, useMemo } from "react";
import { SellerInterface } from "@/components/SellerInterface";
import { OwnerDashboard } from "@/components/OwnerDashboard";
import { Button } from "@/components/ui/button";
import { LayoutDashboard, ShoppingBag, Zap, LogIn, LogOut, AlertCircle, Copy, Check } from "lucide-react";
import { useAuth, useUser, useFirestore, useDoc } from "@/firebase";
import { GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function Home() {
  const { auth } = useAuth();
  const { firestore } = useFirestore();
  const { user, loading: authLoading } = useUser();
  const { toast } = useToast();
  
  const [authError, setAuthError] = useState<string | null>(null);
  const [hostname, setHostname] = useState<string>("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setHostname(window.location.hostname);
    }
  }, []);

  const copyToClipboard = () => {
    if (typeof navigator !== 'undefined') {
      navigator.clipboard.writeText(hostname);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({
        title: "Domain Copied",
        description: "Now paste it in Firebase Console -> Auth -> Settings -> Authorized Domains",
      });
    }
  };

  // Memoize user profile query to prevent infinite render loops
  const userProfileQuery = useMemo(() => {
    if (!firestore || !user) return null;
    return doc(firestore, "users", user.uid);
  }, [firestore, user]);

  const { data: profile, loading: profileLoading } = useDoc(userProfileQuery);

  const [view, setView] = useState<"seller" | "owner">("seller");

  // Sync role to view if profile exists
  useEffect(() => {
    if (profile?.role) {
      setView(profile.role as "seller" | "owner");
    }
  }, [profile]);

  const handleLogin = async () => {
    if (!auth || !firestore) return;
    setAuthError(null);
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      const userRef = doc(firestore, "users", user.uid);
      await setDoc(userRef, {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        role: "seller" // Default role for new users
      }, { merge: true });

    } catch (error: any) {
      if (error.code === "auth/unauthorized-domain" || (error.message && error.message.includes("unauthorized-domain"))) {
        setAuthError("unauthorized-domain");
      } else {
        toast({
          variant: "destructive",
          title: "Login Failed",
          description: error.message || "An unexpected error occurred during login."
        });
      }
    }
  };

  const handleLogout = () => {
    if (auth) signOut(auth);
  };

  if (authLoading || (user && profileLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Zap className="animate-pulse text-primary" size={48} />
          <p className="text-muted-foreground font-medium">Loading DOKANHISHAB...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-6">
        <div className="max-w-md w-full glass-morphism p-8 rounded-3xl text-center space-y-6">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-primary flex items-center justify-center shadow-lg">
            <Zap className="text-primary-foreground fill-primary-foreground" size={32} />
          </div>
          <div className="space-y-2">
            <h1 className="font-headline text-3xl font-bold">DOKAN<span className="text-primary">HISHAB</span></h1>
            <p className="text-muted-foreground">Smart Business Ledger & Insights</p>
          </div>

          {authError === "unauthorized-domain" && (
            <Alert variant="destructive" className="text-left bg-destructive/5 border-destructive/20 relative overflow-hidden">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle className="font-bold">Unauthorized Domain</AlertTitle>
              <AlertDescription className="text-xs space-y-3">
                <p>Firebase is blocking this login. You must add your current domain to the list of authorized domains in the Firebase Console.</p>
                
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-destructive/10 p-2 rounded font-mono text-[10px] break-all border border-destructive/20 select-all">
                    {hostname}
                  </div>
                  <Button size="icon" variant="outline" className="h-8 w-8 shrink-0 bg-background hover:bg-muted" onClick={copyToClipboard}>
                    {copied ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}
                  </Button>
                </div>
                
                <div className="pt-2 text-[10px] opacity-80 italic leading-relaxed">
                  Steps: Firebase Console &gt; Authentication &gt; Settings &gt; Authorized Domains &gt; Add Domain
                </div>
              </AlertDescription>
            </Alert>
          )}

          <Button onClick={handleLogin} className="w-full py-6 text-lg font-bold rounded-2xl shadow-md transition-all active:scale-95" size="lg">
            <LogIn className="mr-2" /> Continue with Google
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-50 glass-morphism border-b border-border px-6 py-4 flex justify-between items-center bg-white/80">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-md">
            <Zap className="text-primary-foreground fill-primary-foreground" size={20} />
          </div>
          <h1 className="font-headline text-2xl tracking-tight font-bold hidden sm:block">
            DOKAN<span className="text-primary">HISHAB</span>
          </h1>
        </div>

        <div className="flex items-center gap-4">
          {profile?.role === "owner" && (
            <div className="flex gap-1 p-1 bg-muted rounded-xl border border-border">
              <Button
                variant={view === "seller" ? "default" : "ghost"}
                size="sm"
                onClick={() => setView("seller")}
                className={`rounded-lg font-bold text-xs ${
                  view === "seller" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                }`}
              >
                <ShoppingBag className="mr-2" size={14} />
                বিক্রেতা
              </Button>
              <Button
                variant={view === "owner" ? "default" : "ghost"}
                size="sm"
                onClick={() => setView("owner")}
                className={`rounded-lg font-bold text-xs ${
                  view === "owner" ? "bg-secondary text-secondary-foreground" : "text-muted-foreground"
                }`}
              >
                <LayoutDashboard className="mr-2" size={14} />
                মালিক
              </Button>
            </div>
          )}

          <div className="flex items-center gap-2">
            <div className="hidden md:flex flex-col items-end">
              <span className="text-xs font-bold leading-none">{user.displayName}</span>
              <span className="text-[10px] text-primary uppercase font-bold">{profile?.role || 'Seller'}</span>
            </div>
            <Button variant="ghost" size="icon" onClick={handleLogout} className="rounded-full text-destructive hover:bg-destructive/10">
              <LogOut size={18} />
            </Button>
          </div>
        </div>
      </header>

      <main className="p-6">
        <div className="max-w-7xl mx-auto">
          {view === "seller" ? <SellerInterface /> : <OwnerDashboard />}
        </div>
      </main>
    </div>
  );
}
