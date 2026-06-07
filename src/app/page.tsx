
"use client";

import { useState, useEffect } from "react";
import { SellerInterface } from "@/components/SellerInterface";
import { OwnerDashboard } from "@/components/OwnerDashboard";
import { Button } from "@/components/ui/button";
import { LayoutDashboard, ShoppingBag, Zap, LogIn, LogOut, UserCircle } from "lucide-react";
import { useAuth, useUser, useFirestore, useDoc } from "@/firebase";
import { GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";

export default function Home() {
  const { auth } = useAuth();
  const { firestore } = useFirestore();
  const { user, loading: authLoading } = useUser();
  const { toast } = useToast();
  
  // Track profile role
  const userProfileQuery = user ? doc(firestore!, "users", user.uid) : null;
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
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      // Check if user has profile, if not default to seller or ask. 
      // For MVP, if new, we initialize as seller.
      const userRef = doc(firestore, "users", user.uid);
      // We don't overwrite if it exists to preserve role changes made manually in Firebase
      await setDoc(userRef, {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        role: "seller" // Default role
      }, { merge: true });

    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Login Failed",
        description: error.message
      });
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
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="max-w-md w-full glass-morphism p-8 rounded-3xl text-center space-y-6">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-primary flex items-center justify-center shadow-lg">
            <Zap className="text-primary-foreground fill-primary-foreground" size={32} />
          </div>
          <div className="space-y-2">
            <h1 className="font-headline text-3xl font-bold">DOKAN<span className="text-primary">HISHAB</span></h1>
            <p className="text-muted-foreground">Log in to manage your shop's smart ledger.</p>
          </div>
          <Button onClick={handleLogin} className="w-full py-6 text-lg font-bold rounded-2xl" size="lg">
            <LogIn className="mr-2" /> Continue with Google
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary/20">
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
            <div className="flex gap-1 p-1 bg-muted rounded-xl border border-border shadow-inner">
              <Button
                variant={view === "seller" ? "default" : "ghost"}
                size="sm"
                onClick={() => setView("seller")}
                className={`rounded-lg font-bold text-xs transition-all duration-300 ${
                  view === "seller" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <ShoppingBag className="mr-2" size={14} />
                বিক্রেতা
              </Button>
              <Button
                variant={view === "owner" ? "default" : "ghost"}
                size="sm"
                onClick={() => setView("owner")}
                className={`rounded-lg font-bold text-xs transition-all duration-300 ${
                  view === "owner" ? "bg-secondary text-secondary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
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
              <span className="text-[10px] text-primary uppercase font-bold">{profile?.role || 'Guest'}</span>
            </div>
            <Button variant="ghost" size="icon" onClick={handleLogout} className="rounded-full hover:bg-destructive/10 text-destructive">
              <LogOut size={18} />
            </Button>
          </div>
        </div>
      </header>

      <main className="p-6 transition-all duration-300">
        <div className="max-w-7xl mx-auto">
          {view === "seller" ? <SellerInterface /> : <OwnerDashboard />}
        </div>
      </main>
    </div>
  );
}
