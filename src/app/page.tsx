
"use client";

import { useState, useEffect, useMemo } from "react";
import { SellerInterface } from "@/components/SellerInterface";
import { OwnerDashboard } from "@/components/OwnerDashboard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LayoutDashboard, ShoppingBag, Zap, LogOut, Mail, Lock, Loader2, ShieldAlert } from "lucide-react";
import { useAuth, useUser, useFirestore, useDoc } from "@/firebase";
import { signOut, signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider } from "firebase/auth";
import { doc } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";

export default function Home() {
  const { auth } = useAuth();
  const { firestore } = useFirestore();
  const { user, loading: authLoading } = useUser();
  const { toast } = useToast();
  
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [view, setView] = useState<"seller" | "admin" | null>(null);

  const userProfileQuery = useMemo(() => {
    if (!firestore || !user) return null;
    return doc(firestore, "users", user.uid);
  }, [firestore, user]);

  const { data: profile, loading: profileLoading } = useDoc(userProfileQuery);

  // Robust Redirection Logic: Ensures Super Admin is prioritized
  useEffect(() => {
    if (!profileLoading && user && view === null) {
      if (profile?.role === "admin") {
        setView("admin");
      } else {
        setView("seller");
      }
    }
  }, [profile, profileLoading, user, view]);

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth || !email || !password) return;
    setIsAuthenticating(true);

    try {
      await signInWithEmailAndPassword(auth, email, password);
      toast({
        title: "Access Authorized",
        description: "Credentials verified successfully.",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Authorization Failed",
        description: "Invalid identity key or password.",
      });
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
        title: "Identity Verified",
        description: "Google credentials accepted.",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Connection Failed",
        description: error.message,
      });
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleLogout = () => {
    if (auth) {
      signOut(auth);
      setView(null);
      toast({
        title: "Session Terminated",
        description: "Logged out securely.",
      });
    }
  };

  if (authLoading || (user && (profileLoading || view === null)) || isAuthenticating) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="animate-spin text-primary h-12 w-12" />
          <p className="text-muted-foreground font-black animate-pulse uppercase tracking-[0.3em] text-[10px]">Verifying Permissions & Loading Intel...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-6">
        <div className="max-w-md w-full glass-morphism p-10 rounded-[2.5rem] space-y-8 border-t-4 border-primary shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-5">
            <ShieldAlert size={120} />
          </div>
          
          <div className="text-center space-y-3 relative z-10">
            <div className="mx-auto w-16 h-16 rounded-2xl bg-primary flex items-center justify-center shadow-lg transform rotate-3 hover:rotate-0 transition-transform">
              <Zap className="text-primary-foreground fill-primary-foreground" size={32} />
            </div>
            <div className="space-y-1">
              <h1 className="font-headline text-3xl font-black uppercase tracking-tighter">DOKAN<span className="text-primary">HISHAB</span></h1>
              <p className="text-muted-foreground text-[9px] font-black uppercase tracking-widest border-y border-border py-1.5 inline-block px-6">Super Admin & Seller Portal</p>
            </div>
          </div>

          <div className="space-y-6 relative z-10">
            <form onSubmit={handleEmailAuth} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Identity (Email)</Label>
                <div className="relative group">
                  <Mail className="absolute left-4 top-4 text-muted-foreground group-focus-within:text-primary transition-colors" size={18} />
                  <Input 
                    id="email" 
                    type="email" 
                    placeholder="admin@shop.com" 
                    className="pl-12 h-14 rounded-2xl bg-muted/30 border-border focus:ring-primary focus:border-primary font-bold" 
                    value={email} 
                    onChange={(e) => setEmail(e.target.value)} 
                    required 
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Secure Key (Password)</Label>
                <div className="relative group">
                  <Lock className="absolute left-4 top-4 text-muted-foreground group-focus-within:text-primary transition-colors" size={18} />
                  <Input 
                    id="password" 
                    type="password" 
                    placeholder="••••••••" 
                    className="pl-12 h-14 rounded-2xl bg-muted/30 border-border focus:ring-primary focus:border-primary font-bold" 
                    value={password} 
                    onChange={(e) => setPassword(e.target.value)} 
                    required 
                  />
                </div>
              </div>
              <Button type="submit" className="w-full py-8 font-black rounded-2xl text-lg shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all bg-primary hover:bg-primary/90 uppercase tracking-widest">
                Authorize Access
              </Button>
            </form>

            <div className="flex items-center gap-4 py-2">
              <Separator className="flex-1" />
              <span className="text-[10px] text-muted-foreground font-black uppercase tracking-widest px-2">OR</span>
              <Separator className="flex-1" />
            </div>

            <Button 
              onClick={handleGoogleAuth} 
              variant="outline" 
              className="w-full py-8 flex items-center justify-center gap-3 border-border hover:bg-muted font-black rounded-2xl transition-all shadow-sm uppercase tracking-widest text-xs"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              Google Identity
            </Button>

            <div className="bg-muted/50 p-4 rounded-xl border border-border">
              <p className="text-center text-[8px] text-muted-foreground leading-relaxed uppercase font-black tracking-widest">
                Access is restricted to authorized identities managed in the Super Admin Console.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-50 glass-morphism border-b border-border px-6 py-4 flex justify-between items-center bg-white/80 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-md">
            <Zap className="text-primary-foreground fill-primary-foreground" size={20} />
          </div>
          <h1 className="font-headline text-2xl tracking-tight font-black hidden sm:block uppercase">
            DOKAN<span className="text-primary">HISHAB</span>
          </h1>
        </div>

        <div className="flex items-center gap-4">
          {profile?.role === "admin" && (
            <div className="flex gap-1 p-1 bg-muted rounded-2xl border border-border shadow-inner">
              <Button
                variant={view === "seller" ? "default" : "ghost"}
                size="sm"
                onClick={() => setView("seller")}
                className={`rounded-xl font-black text-[9px] tracking-[0.2em] px-5 h-9 transition-all ${
                  view === "seller" ? "bg-primary text-primary-foreground shadow-md" : "text-muted-foreground"
                }`}
              >
                <ShoppingBag className="mr-2" size={14} />
                POS
              </Button>
              <Button
                variant={view === "admin" ? "default" : "ghost"}
                size="sm"
                onClick={() => setView("admin")}
                className={`rounded-xl font-black text-[9px] tracking-[0.2em] px-5 h-9 transition-all ${
                  view === "admin" ? "bg-secondary text-secondary-foreground shadow-md" : "text-muted-foreground"
                }`}
              >
                <LayoutDashboard className="mr-2" size={14} />
                SUPER ADMIN
              </Button>
            </div>
          )}

          <div className="flex items-center gap-3 pl-4 border-l border-border">
            <div className="hidden md:flex flex-col items-end">
              <span className="text-xs font-black leading-none uppercase tracking-tighter">{profile?.displayName || user.displayName || user.email?.split('@')[0]}</span>
              <span className="text-[9px] text-primary uppercase font-black mt-1.5 tracking-[0.2em] flex items-center gap-1.5 bg-primary/5 px-2 py-0.5 rounded-full border border-primary/10">
                <div className={`w-1.5 h-1.5 rounded-full ${profile?.role === 'admin' ? 'bg-secondary' : 'bg-primary'} animate-pulse`} />
                {profile?.role === 'admin' ? 'SUPER ADMIN' : 'SELLER'}
              </span>
            </div>
            <Button variant="ghost" size="icon" onClick={handleLogout} className="rounded-2xl text-destructive hover:bg-destructive/10 h-10 w-10 border border-transparent hover:border-destructive/20 transition-all">
              <LogOut size={18} />
            </Button>
          </div>
        </div>
      </header>

      <main className="p-6">
        <div className="max-w-7xl mx-auto">
          {view === "admin" ? <OwnerDashboard /> : <SellerInterface />}
        </div>
      </main>
    </div>
  );
}
