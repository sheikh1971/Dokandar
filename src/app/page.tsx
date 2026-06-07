
"use client";

import { useState, useEffect, useMemo } from "react";
import { SellerInterface } from "@/components/SellerInterface";
import { OwnerDashboard } from "@/components/OwnerDashboard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LayoutDashboard, ShoppingBag, Zap, LogOut, AlertCircle, Copy, Check, Mail, Lock } from "lucide-react";
import { useAuth, useUser, useFirestore, useDoc } from "@/firebase";
import { signOut, signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider } from "firebase/auth";
import { doc } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";

export default function Home() {
  const { auth } = useAuth();
  const { firestore } = useFirestore();
  const { user, loading: authLoading } = useUser();
  const { toast } = useToast();
  
  const [authError, setAuthError] = useState<string | null>(null);
  const [hostname, setHostname] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const [uidCopied, setUidCopied] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  // Email login state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

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

  const copyUidToClipboard = (uid: string) => {
    if (typeof navigator !== 'undefined') {
      navigator.clipboard.writeText(uid);
      setUidCopied(true);
      setTimeout(() => setUidCopied(false), 2000);
      toast({
        title: "UID Copied",
        description: "Use this Document ID in the 'users' collection.",
      });
    }
  };

  const userProfileQuery = useMemo(() => {
    if (!firestore || !user) return null;
    return doc(firestore, "users", user.uid);
  }, [firestore, user]);

  const { data: profile, loading: profileLoading } = useDoc(userProfileQuery);

  const [view, setView] = useState<"seller" | "owner">("seller");

  useEffect(() => {
    if (profile?.role) {
      setView(profile.role as "seller" | "owner");
    }
  }, [profile]);

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth || !email || !password) return;
    setIsAuthenticating(true);

    try {
      await signInWithEmailAndPassword(auth, email, password);
      toast({
        title: "Welcome",
        description: `Logged in to Seller Portal`,
      });
    } catch (error: any) {
      if (error.code === "auth/unauthorized-domain") {
        setAuthError("unauthorized-domain");
      } else {
        toast({
          variant: "destructive",
          title: "Authentication Error",
          description: "Invalid email or password. Please contact Admin."
        });
      }
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleGoogleAuth = async () => {
    if (!auth) return;
    setIsAuthenticating(true);
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
      toast({
        title: "Signed In",
        description: "Access granted.",
      });
    } catch (error: any) {
      if (error.code === "auth/unauthorized-domain") {
        setAuthError("unauthorized-domain");
      } else if (error.code === "auth/popup-blocked") {
        toast({
          variant: "destructive",
          title: "Popup Blocked",
          description: "Please allow popups for this site to sign in with Google.",
        });
      } else {
        toast({
          variant: "destructive",
          title: "Authentication Error",
          description: error.message
        });
      }
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleLogout = () => {
    if (auth) signOut(auth);
  };

  if (authLoading || (user && profileLoading) || isAuthenticating) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Zap className="animate-pulse text-primary" size={48} />
          <p className="text-muted-foreground font-medium">Synchronizing Portal...</p>
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
              <h1 className="font-headline text-3xl font-bold uppercase tracking-tighter">DOKAN<span className="text-primary">HISHAB</span></h1>
              <p className="text-muted-foreground text-xs font-bold uppercase tracking-widest">Smart Ledger System</p>
            </div>
          </div>

          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-xl font-bold text-foreground">Seller Portal</h2>
              <p className="text-[10px] text-muted-foreground uppercase font-bold mt-1">Authorized Access Only</p>
            </div>

            {authError === "unauthorized-domain" && (
              <Alert variant="destructive" className="bg-destructive/5 border-destructive/20">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle className="font-bold">Unauthorized Domain</AlertTitle>
                <AlertDescription className="text-xs space-y-3">
                  <p>Firebase is blocking this login. Add your domain to authorized domains in Firebase Console.</p>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-destructive/10 p-2 rounded font-mono text-[10px] break-all border border-destructive/20">
                      {hostname}
                    </div>
                    <Button size="icon" variant="outline" className="h-8 w-8 shrink-0" onClick={copyToClipboard}>
                      {copied ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}
                    </Button>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            <div className="space-y-4">
              <Button 
                onClick={handleGoogleAuth} 
                variant="outline" 
                className="w-full py-7 flex items-center justify-center gap-3 border-border hover:bg-muted font-bold rounded-2xl transition-all"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
                Continue with Google
              </Button>

              <div className="flex items-center gap-4 py-2">
                <Separator className="flex-1" />
                <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">or login with credentials</span>
                <Separator className="flex-1" />
              </div>

              <form onSubmit={handleEmailAuth} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Email Address</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 text-muted-foreground" size={16} />
                    <Input 
                      id="email" 
                      type="email" 
                      placeholder="seller@shop.com" 
                      className="pl-10 h-12 rounded-xl" 
                      value={email} 
                      onChange={(e) => setEmail(e.target.value)} 
                      required 
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 text-muted-foreground" size={16} />
                    <Input 
                      id="password" 
                      type="password" 
                      placeholder="••••••••" 
                      className="pl-10 h-12 rounded-xl" 
                      value={password} 
                      onChange={(e) => setPassword(e.target.value)} 
                      required 
                    />
                  </div>
                </div>
                <Button type="submit" className="w-full py-7 font-bold rounded-2xl text-md shadow-md hover:scale-[1.01] transition-all">
                  Sign In to System
                </Button>
                <p className="text-center text-[10px] text-muted-foreground mt-4 italic">
                  Credentials provided by Admin in the Firebase console.
                </p>
              </form>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (user && !profile && !profileLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-6">
        <div className="max-w-md w-full glass-morphism p-8 rounded-3xl space-y-6 text-center border-t-4 border-primary">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
            <AlertCircle className="text-primary" size={32} />
          </div>
          <h2 className="text-2xl font-bold uppercase tracking-tighter">Setup Required</h2>
          <p className="text-muted-foreground text-sm font-medium">
            Your account ({user.email}) is authenticated, but your profile needs to be added to the backend manually by the admin.
          </p>

          <div className="bg-muted/50 p-5 rounded-2xl text-left space-y-3 border border-border">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">User Identity (UID)</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-[11px] break-all font-mono bg-background p-2.5 rounded-lg border border-border text-primary font-bold">
                {user.uid}
              </code>
              <Button size="icon" variant="ghost" className="h-10 w-10 shrink-0 bg-background border border-border" onClick={() => copyUidToClipboard(user.uid)}>
                {uidCopied ? <CheckCircle2 size={18} className="text-green-600" /> : <Copy size={18} />}
              </Button>
            </div>
            <p className="text-[9px] text-muted-foreground italic font-medium leading-relaxed">
              Give this UID to the admin. They must create a document in the `users` collection with this UID as the ID and set your role.
            </p>
          </div>

          <Button variant="outline" onClick={handleLogout} className="w-full rounded-2xl py-7 font-bold border-border">
            Logout & Try Another Account
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
          <h1 className="font-headline text-2xl tracking-tight font-bold hidden sm:block uppercase">
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
              <span className="text-[10px] text-primary uppercase font-bold mt-0.5 tracking-widest">{profile?.role === 'owner' ? 'Admin' : 'Seller'}</span>
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

import { CheckCircle2 } from "lucide-react";
