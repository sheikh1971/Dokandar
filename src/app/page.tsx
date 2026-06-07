
"use client";

import { useState, useEffect, useMemo } from "react";
import { SellerInterface } from "@/components/SellerInterface";
import { OwnerDashboard } from "@/components/OwnerDashboard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LayoutDashboard, ShoppingBag, Zap, LogOut, AlertCircle, Copy, Check, Mail, Lock } from "lucide-react";
import { useAuth, useUser, useFirestore, useDoc } from "@/firebase";
import { signOut, signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";
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
  const [isCreatingProfile, setIsCreatingProfile] = useState(false);

  // Email login state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSigningUp, setIsSigningUp] = useState(false);

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

  const userProfileQuery = useMemo(() => {
    if (!firestore || !user || isCreatingProfile) return null;
    return doc(firestore, "users", user.uid);
  }, [firestore, user, isCreatingProfile]);

  const { data: profile, loading: profileLoading } = useDoc(userProfileQuery);

  const [view, setView] = useState<"seller" | "owner">("seller");

  useEffect(() => {
    if (profile?.role) {
      setView(profile.role as "seller" | "owner");
    }
  }, [profile]);

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth || !firestore || !email || !password) return;
    setIsCreatingProfile(true);

    try {
      let loggedUser;
      if (isSigningUp) {
        const result = await createUserWithEmailAndPassword(auth, email, password);
        loggedUser = result.user;
      } else {
        const result = await signInWithEmailAndPassword(auth, email, password);
        loggedUser = result.user;
      }

      // Owners/Super Admins log in via email/password
      const userRef = doc(firestore, "users", loggedUser.uid);
      await setDoc(userRef, {
        uid: loggedUser.uid,
        email: loggedUser.email,
        displayName: loggedUser.email?.split('@')[0],
        role: "owner"
      }, { merge: true });

      toast({
        title: isSigningUp ? "Account Created" : "Welcome Back",
        description: `Logged in as Super Admin`,
      });

    } catch (error: any) {
      if (error.code === "auth/unauthorized-domain") {
        setAuthError("unauthorized-domain");
      } else {
        toast({
          variant: "destructive",
          title: "Authentication Error",
          description: error.message
        });
      }
    } finally {
      setIsCreatingProfile(false);
    }
  };

  const handleLogout = () => {
    if (auth) signOut(auth);
  };

  if (authLoading || (user && profileLoading) || isCreatingProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Zap className="animate-pulse text-primary" size={48} />
          <p className="text-muted-foreground font-medium">Synchronizing DOKANHISHAB...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-6">
        <div className="max-w-md w-full glass-morphism p-8 rounded-3xl space-y-6">
          <div className="text-center space-y-4">
            <div className="mx-auto w-16 h-16 rounded-2xl bg-primary flex items-center justify-center shadow-lg">
              <Zap className="text-primary-foreground fill-primary-foreground" size={32} />
            </div>
            <div className="space-y-1">
              <h1 className="font-headline text-3xl font-bold">DOKAN<span className="text-primary">HISHAB</span></h1>
              <p className="text-muted-foreground text-sm">Smart Business Ledger & Insights</p>
            </div>
          </div>

          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-xl font-bold text-foreground">Staff Portal</h2>
              <p className="text-xs text-muted-foreground mt-1">Super Admin Login</p>
            </div>

            {authError === "unauthorized-domain" && (
              <Alert variant="destructive" className="bg-destructive/5 border-destructive/20">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle className="font-bold">Unauthorized Domain</AlertTitle>
                <AlertDescription className="text-xs space-y-3">
                  <p>Firebase is blocking this login. You must add your current domain to the list of authorized domains in the Firebase Console.</p>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-destructive/10 p-2 rounded font-mono text-[10px] break-all border border-destructive/20 select-all">
                      {hostname}
                    </div>
                    <Button size="icon" variant="outline" className="h-8 w-8 shrink-0" onClick={copyToClipboard}>
                      {copied ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}
                    </Button>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleEmailAuth} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 text-muted-foreground" size={16} />
                  <Input 
                    id="email" 
                    type="email" 
                    placeholder="admin@shop.com" 
                    className="pl-10" 
                    value={email} 
                    onChange={(e) => setEmail(e.target.value)} 
                    required 
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 text-muted-foreground" size={16} />
                  <Input 
                    id="password" 
                    type="password" 
                    placeholder="••••••••" 
                    className="pl-10" 
                    value={password} 
                    onChange={(e) => setPassword(e.target.value)} 
                    required 
                  />
                </div>
              </div>
              <Button type="submit" className="w-full py-6 font-bold rounded-2xl">
                {isSigningUp ? "Setup Super Admin" : "Login to Portal"}
              </Button>
              <button 
                type="button" 
                onClick={() => setIsSigningUp(!isSigningUp)}
                className="w-full text-xs text-primary font-semibold hover:underline"
              >
                {isSigningUp ? "Already have an account? Login" : "First time? Setup Admin Account"}
              </button>
            </form>
          </div>
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
              <span className="text-xs font-bold leading-none">{user.displayName || user.email}</span>
              <span className="text-[10px] text-primary uppercase font-bold">{profile?.role || 'Admin'}</span>
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
