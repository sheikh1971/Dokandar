
"use client";

import { useState, useEffect, useMemo } from "react";
import { SellerPortal } from "@/components/seller/SellerPortal";
import { AdminDashboard } from "@/components/admin/AdminDashboard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LayoutDashboard, ShoppingBag, Zap, LogOut, Mail, Lock, Loader2, ShieldAlert, Key, User as UserIcon } from "lucide-react";
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
  const [view, setView] = useState<"seller" | "admin">("seller");
  const [showLogin, setShowLogin] = useState(false);

  const userProfileQuery = useMemo(() => {
    if (!firestore || !user) return null;
    return doc(firestore, "users", user.uid);
  }, [firestore, user]);

  const { data: profile, loading: profileLoading } = useDoc(userProfileQuery);

  // Auto-view assignment based on role when logged in as admin
  useEffect(() => {
    if (!profileLoading && user && profile?.role === "admin") {
      setView("admin");
    }
  }, [profile, profileLoading, user]);

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth || !email || !password) return;
    setIsAuthenticating(true);

    try {
      await signInWithEmailAndPassword(auth, email, password);
      toast({
        title: "Authorization Success",
        description: "Credentials verified.",
      });
      setShowLogin(false);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Login Failed",
        description: "Invalid credentials.",
      });
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleLogout = () => {
    if (auth) {
      signOut(auth).then(() => {
        toast({
          title: "Session Terminated",
          description: "Logged out safely.",
        });
      });
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="animate-spin text-primary h-12 w-12" />
          <p className="text-muted-foreground font-black animate-pulse uppercase tracking-[0.3em] text-[10px]">Initializing Smart Ledger...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* PERSISTENT HEADER WITH BOTH PORTALS ACCESSIBLE */}
      <header className="sticky top-0 z-50 glass-morphism border-b border-border px-6 py-4 flex justify-between items-center bg-white/80 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-md">
            <Zap className="text-primary-foreground fill-primary-foreground" size={20} />
          </div>
          <h1 className="font-headline text-2xl tracking-tight font-black hidden sm:block uppercase">
            DOKAN<span className="text-primary">HISHAB</span>
          </h1>
        </div>

        {/* VIEW SELECTOR - ACCESSIBLE WITHOUT AUTH */}
        <div className="flex items-center gap-4">
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
              SELLER POS
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

          <div className="flex items-center gap-3 pl-4 border-l border-border">
            {user ? (
              <div className="flex items-center gap-3">
                <div className="hidden md:flex flex-col items-end">
                  <span className="text-xs font-black leading-none uppercase tracking-tighter">{user.email?.split('@')[0]}</span>
                  <span className="text-[9px] text-primary uppercase font-black mt-1.5 tracking-[0.2em] flex items-center gap-1.5 bg-primary/5 px-2 py-0.5 rounded-full border border-primary/10">
                    <div className={`w-1.5 h-1.5 rounded-full ${profile?.role === 'admin' ? 'bg-secondary' : 'bg-primary'} animate-pulse`} />
                    {profile?.role === 'admin' ? 'SUPER ADMIN' : 'SELLER'}
                  </span>
                </div>
                <Button variant="ghost" size="icon" onClick={handleLogout} className="rounded-2xl text-destructive hover:bg-destructive/10 h-10 w-10 border border-transparent hover:border-destructive/20 transition-all">
                  <LogOut size={18} />
                </Button>
              </div>
            ) : (
              <Button onClick={() => setShowLogin(!showLogin)} variant="outline" className="rounded-2xl font-black text-[10px] tracking-[0.2em] uppercase h-10 px-6 border-border hover:bg-muted">
                <UserIcon size={14} className="mr-2" />
                Auth
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="p-6">
        <div className="max-w-7xl mx-auto">
          {/* OPTIONAL LOGIN DRAWER/SECTION */}
          {showLogin && !user && (
            <div className="mb-12 max-w-md mx-auto glass-morphism p-10 rounded-[2.5rem] space-y-8 border-t-4 border-primary shadow-2xl relative overflow-hidden animate-in fade-in slide-in-from-top-4">
              <div className="absolute top-0 right-0 p-4 opacity-5">
                <ShieldAlert size={120} />
              </div>
              
              <div className="text-center space-y-3 relative z-10">
                <div className="mx-auto w-12 h-12 rounded-xl bg-primary flex items-center justify-center shadow-lg">
                  <Zap className="text-primary-foreground fill-primary-foreground" size={24} />
                </div>
                <div className="space-y-1">
                  <h2 className="font-headline text-2xl font-black uppercase tracking-tighter">Authorize <span className="text-primary">Session</span></h2>
                  <p className="text-muted-foreground text-[8px] font-black uppercase tracking-widest border-y border-border py-1.5 inline-block px-6">Super Admin Command Center</p>
                </div>
              </div>

              <form onSubmit={handleEmailAuth} className="space-y-5 relative z-10">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Admin Email</Label>
                  <div className="relative group">
                    <Mail className="absolute left-4 top-4 text-muted-foreground group-focus-within:text-primary transition-colors" size={18} />
                    <Input 
                      type="email" 
                      placeholder="admin@shop.com" 
                      className="pl-12 h-14 rounded-2xl bg-muted/30 border-border font-bold" 
                      value={email} 
                      onChange={(e) => setEmail(e.target.value)} 
                      required 
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Password</Label>
                  <div className="relative group">
                    <Lock className="absolute left-4 top-4 text-muted-foreground group-focus-within:text-primary transition-colors" size={18} />
                    <Input 
                      type="password" 
                      placeholder="••••••••" 
                      className="pl-12 h-14 rounded-2xl bg-muted/30 border-border font-bold" 
                      value={password} 
                      onChange={(e) => setPassword(e.target.value)} 
                      required 
                    />
                  </div>
                </div>
                <Button type="submit" className="w-full py-8 font-black rounded-2xl text-lg shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all bg-primary hover:bg-primary/90 uppercase tracking-widest" disabled={isAuthenticating}>
                  {isAuthenticating ? <Loader2 className="animate-spin" /> : "Verify Identity"}
                </Button>
              </form>
            </div>
          )}

          {/* MAIN APP SHELL CONTENT */}
          {view === "admin" ? <AdminDashboard /> : <SellerPortal />}
        </div>
      </main>
    </div>
  );
}
