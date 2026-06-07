
"use client";

import { useState, useMemo } from "react";
import { AdminDashboard } from "@/components/admin/AdminDashboard";
import { SellerPortal } from "@/components/seller/SellerPortal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Zap, LogOut, Mail, Lock, Loader2, ShieldAlert, User as UserIcon, LogIn, ShieldCheck } from "lucide-react";
import { useAuth, useUser, useFirestore, useDoc } from "@/firebase";
import { signOut, signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";

export default function Home() {
  const { auth } = useAuth();
  const { firestore } = useFirestore();
  const { user, loading: authLoading } = useUser();
  const { toast } = useToast();
  
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authRole, setAuthRole] = useState<"admin" | "seller">("admin");
  const [isSignUp, setIsSignUp] = useState(false);

  const userProfileQuery = useMemo(() => {
    if (!firestore || !user) return null;
    return doc(firestore, "users", user.uid);
  }, [firestore, user]);

  const { data: profile, loading: profileLoading } = useDoc(userProfileQuery);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth || !firestore || !email || !password) return;
    setIsAuthenticating(true);

    try {
      if (isSignUp) {
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        // Provision the role immediately in Firestore as a strict condition
        await setDoc(doc(firestore, "users", cred.user.uid), {
          uid: cred.user.uid,
          email: email,
          role: authRole,
          displayName: email.split('@')[0]
        });
        toast({
          title: "Identity Provisioned",
          description: `Access granted as ${authRole === 'admin' ? 'SUPER ADMIN' : 'SELLER'}.`,
        });
      } else {
        await signInWithEmailAndPassword(auth, email, password);
        toast({
          title: "Authorization Success",
          description: "Credentials verified. Accessing Terminal.",
        });
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Security Violation",
        description: error.message || "Invalid credentials or unauthorized attempt.",
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

  if (authLoading || (user && profileLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="animate-spin text-primary h-12 w-12" />
          <p className="text-muted-foreground font-black animate-pulse uppercase tracking-[0.3em] text-[10px]">Syncing Smart Node...</p>
        </div>
      </div>
    );
  }

  // LOGIN TERMINAL
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-6">
        <div className="max-w-md w-full glass-morphism p-10 rounded-[2.5rem] space-y-8 border-t-4 border-primary shadow-2xl relative overflow-hidden animate-in fade-in slide-in-from-bottom-4">
          <div className="absolute top-0 right-0 p-4 opacity-5">
            <ShieldAlert size={120} />
          </div>
          
          <div className="text-center space-y-3 relative z-10">
            <div className="mx-auto w-16 h-16 rounded-2xl bg-primary flex items-center justify-center shadow-lg">
              <Zap className="text-primary-foreground fill-primary-foreground" size={32} />
            </div>
            <div className="space-y-1">
              <h2 className="font-headline text-2xl font-black uppercase tracking-tighter">DOKAN<span className="text-primary">HISHAB</span></h2>
              <p className="text-muted-foreground text-[8px] font-black uppercase tracking-widest border-y border-border py-1.5 inline-block px-6">Secure Business Intelligence Terminal</p>
            </div>
          </div>

          <form onSubmit={handleAuth} className="space-y-5 relative z-10">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Identity (Email)</Label>
              <div className="relative group">
                <Mail className="absolute left-4 top-4 text-muted-foreground group-focus-within:text-primary transition-colors" size={18} />
                <Input 
                  type="email" 
                  placeholder="name@shop.com" 
                  className="pl-12 h-14 rounded-2xl bg-muted/30 border-border font-bold focus:ring-primary focus:border-primary" 
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)} 
                  required 
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Access Token (Password)</Label>
              <div className="relative group">
                <Lock className="absolute left-4 top-4 text-muted-foreground group-focus-within:text-primary transition-colors" size={18} />
                <Input 
                  type="password" 
                  placeholder="••••••••" 
                  className="pl-12 h-14 rounded-2xl bg-muted/30 border-border font-bold focus:ring-primary focus:border-primary" 
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)} 
                  required 
                />
              </div>
            </div>

            {isSignUp && (
              <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Assign Operational Role</Label>
                <Select value={authRole} onValueChange={(v: any) => setAuthRole(v)}>
                  <SelectTrigger className="h-14 rounded-2xl bg-muted/30 border-border font-bold focus:ring-primary">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl border-border">
                    <SelectItem value="admin" className="font-black text-[10px] uppercase tracking-widest text-primary">Super Admin / Owner</SelectItem>
                    <SelectItem value="seller" className="font-black text-[10px] uppercase tracking-widest">Seller / Staff Portal</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-[8px] text-primary font-bold uppercase tracking-widest mt-1 text-center">Selected role is a strict entry condition.</p>
              </div>
            )}

            <div className="pt-2">
              <Button type="submit" className="w-full py-8 font-black rounded-2xl text-lg shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all bg-primary hover:bg-primary/90 uppercase tracking-widest" disabled={isAuthenticating}>
                {isAuthenticating ? <Loader2 className="animate-spin" /> : (isSignUp ? "Provision Identity" : "Authorize Entry")}
              </Button>
            </div>
          </form>

          <div className="pt-4 text-center space-y-4">
            <button 
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-[9px] font-black text-primary uppercase tracking-[0.2em] hover:underline"
            >
              {isSignUp ? "Switch to Secure Login" : "New Terminal? Register Role"}
            </button>
            <p className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest block">System Architecture: Cloud Native Intelligence</p>
          </div>
        </div>
      </div>
    );
  }

  // MAIN PORTAL ROUTING (STRICT ROLE CONDITION)
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-50 glass-morphism border-b border-border px-6 py-4 flex justify-between items-center bg-white/80 shadow-sm backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-md">
            <Zap className="text-primary-foreground fill-primary-foreground" size={20} />
          </div>
          <h1 className="font-headline text-2xl tracking-tight font-black hidden sm:block uppercase">
            DOKAN<span className="text-primary">HISHAB</span>
          </h1>
        </div>

        <div className="flex items-center gap-3 pl-4 border-l border-border">
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
        </div>
      </header>

      <main className="p-6">
        <div className="max-w-7xl mx-auto">
          {profile?.role === 'admin' ? (
            <AdminDashboard />
          ) : (
            <SellerPortal />
          )}
        </div>
      </main>
    </div>
  );
}
