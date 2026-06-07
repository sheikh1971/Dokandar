
"use client";

import { useState, useMemo } from "react";
import { AdminDashboard } from "@/components/admin/AdminDashboard";
import { SellerPortal } from "@/components/seller/SellerPortal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { 
  Zap, 
  LogOut, 
  Mail, 
  Lock, 
  Loader2, 
  ShieldAlert, 
  User as UserIcon, 
  LogIn, 
  ShieldCheck,
  Building2,
  Users,
  Key,
  Fingerprint,
  LockKeyhole,
  Chrome
} from "lucide-react";
import { useAuth, useUser, useFirestore, useDoc } from "@/firebase";
import { 
  signOut, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup
} from "firebase/auth";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";

export default function Home() {
  const { auth } = useAuth();
  const { firestore } = useFirestore();
  const { user, loading: authLoading } = useUser();
  const { toast } = useToast();
  
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authRole, setAuthRole] = useState<"admin" | "seller">("seller");
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
        // REGISTER TO FIREBASE
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        
        // PROVISION ROLE IN FIRESTORE
        const profileData = {
          uid: cred.user.uid,
          email: email,
          role: authRole,
          displayName: email.split('@')[0],
          createdAt: new Date().toISOString()
        };
        await setDoc(doc(firestore, "users", cred.user.uid), profileData);
        
        toast({
          title: "Identity Provisioned",
          description: `Access granted as ${authRole === 'admin' ? 'SUPER ADMIN' : 'SELLER'}.`,
        });
      } else {
        // LOGIN
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

  const handleGoogleAuth = async () => {
    if (!auth || !firestore) return;
    setIsAuthenticating(true);
    const provider = new GoogleAuthProvider();

    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      // Check if profile exists
      const docRef = doc(firestore, "users", user.uid);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        // First time login - provision with selected role
        const profileData = {
          uid: user.uid,
          email: user.email,
          role: authRole,
          displayName: user.displayName || user.email?.split('@')[0],
          createdAt: new Date().toISOString()
        };
        await setDoc(docRef, profileData);
        toast({
          title: "Identity Provisioned",
          description: `Google identity linked as ${authRole === 'admin' ? 'SUPER ADMIN' : 'SELLER'}.`,
        });
      } else {
        toast({
          title: "Authorization Success",
          description: "Google credentials verified.",
        });
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Google Auth Failed",
        description: error.message || "Could not complete Google authentication.",
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

  // 1. LOADING STATE
  if (authLoading || (user && profileLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="animate-spin text-primary h-12 w-12" />
          <p className="text-muted-foreground font-black animate-pulse uppercase tracking-[0.3em] text-[10px]">Verifying Intelligence Link...</p>
        </div>
      </div>
    );
  }

  // 2. UNAUTHENTICATED STATE (LOGIN/SIGNUP GATE)
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-6 relative overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-secondary/5 rounded-full blur-[120px]" />

        <div className={`max-w-md w-full glass-morphism p-10 rounded-[2.5rem] space-y-8 border-t-4 ${isSignUp ? 'border-secondary' : 'border-primary'} shadow-2xl relative overflow-hidden animate-in fade-in slide-in-from-bottom-4 transition-all duration-500`}>
          <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
            {isSignUp ? <Key size={120} /> : <LockKeyhole size={120} />}
          </div>
          
          <div className="text-center space-y-3 relative z-10">
            <div className={`mx-auto w-16 h-16 rounded-2xl ${isSignUp ? 'bg-secondary' : 'bg-primary'} flex items-center justify-center shadow-lg transform hover:rotate-12 transition-transform duration-500`}>
              <Zap className="text-primary-foreground fill-primary-foreground" size={32} />
            </div>
            <div className="space-y-1">
              <h2 className="font-headline text-2xl font-black uppercase tracking-tighter">
                DOKAN<span className={isSignUp ? 'text-secondary' : 'text-primary'}>HISHAB</span>
              </h2>
              <p className="text-muted-foreground text-[8px] font-black uppercase tracking-widest border-y border-border py-1.5 inline-block px-6">
                {isSignUp ? "New Identity Provisioning" : "Mandatory Auth Required"}
              </p>
            </div>
          </div>

          <form onSubmit={handleAuth} className="space-y-5 relative z-10">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Identity (Email)</Label>
              <div className="relative group">
                <Mail className={`absolute left-4 top-4 text-muted-foreground group-focus-within:${isSignUp ? 'text-secondary' : 'text-primary'} transition-colors`} size={18} />
                <Input 
                  type="email" 
                  placeholder="admin@gmail.com" 
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
                <Lock className={`absolute left-4 top-4 text-muted-foreground group-focus-within:${isSignUp ? 'text-secondary' : 'text-primary'} transition-colors`} size={18} />
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

            <div className="space-y-4 animate-in fade-in slide-in-from-top-2 bg-muted/20 p-5 rounded-2xl border border-border/50">
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                    <Fingerprint size={12} className="text-secondary" />
                    Portal Access Level
                  </Label>
                  <div className="flex items-center gap-3">
                    <span className={`text-[9px] font-black uppercase tracking-widest ${authRole === 'seller' ? 'text-secondary' : 'text-muted-foreground'}`}>Seller</span>
                    <Switch 
                      checked={authRole === "admin"} 
                      onCheckedChange={(checked) => setAuthRole(checked ? "admin" : "seller")}
                      className="data-[state=checked]:bg-secondary"
                    />
                    <span className={`text-[9px] font-black uppercase tracking-widest ${authRole === 'admin' ? 'text-secondary' : 'text-muted-foreground'}`}>Admin</span>
                  </div>
                </div>
                <div className={`p-2 rounded-xl border text-center transition-colors duration-300 ${authRole === 'admin' ? 'bg-secondary/10 border-secondary/20' : 'bg-muted/40 border-border'}`}>
                  <p className={`text-[8px] font-black uppercase tracking-[0.2em] ${authRole === 'admin' ? 'text-secondary' : 'text-muted-foreground'}`}>
                    {authRole === 'admin' ? 'SUPER ADMIN: OWNER COMMAND CENTER' : 'STANDARD POS: STAFF TERMINAL'}
                  </p>
                </div>
            </div>

            <div className="pt-2 space-y-3">
              <Button 
                type="submit" 
                className={`w-full py-8 font-black rounded-2xl text-lg shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all ${isSignUp ? 'bg-secondary hover:bg-secondary/90' : 'bg-primary hover:bg-primary/90'} uppercase tracking-widest`} 
                disabled={isAuthenticating}
              >
                {isAuthenticating ? <Loader2 className="animate-spin" /> : (isSignUp ? "Provision Identity" : "Authorize Entry")}
              </Button>

              <div className="relative flex items-center py-2">
                <div className="flex-grow border-t border-border"></div>
                <span className="flex-shrink mx-4 text-[9px] font-black text-muted-foreground uppercase tracking-widest">or continue with</span>
                <div className="flex-grow border-t border-border"></div>
              </div>

              <Button 
                type="button"
                variant="outline"
                onClick={handleGoogleAuth}
                className="w-full py-8 font-black rounded-2xl text-sm border-border hover:bg-muted/50 transition-all uppercase tracking-widest flex items-center justify-center gap-3"
                disabled={isAuthenticating}
              >
                {isAuthenticating ? <Loader2 className="animate-spin" /> : (
                  <>
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                      <path
                        fill="currentColor"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="currentColor"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="currentColor"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.27.81-.57z"
                      />
                      <path
                        fill="currentColor"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      />
                    </svg>
                    Google Authentication
                  </>
                )}
              </Button>
            </div>
          </form>

          <div className="pt-4 text-center space-y-4">
            <button 
              onClick={() => setIsSignUp(!isSignUp)}
              className={`text-[9px] font-black ${isSignUp ? 'text-secondary' : 'text-primary'} uppercase tracking-[0.2em] hover:underline`}
            >
              {isSignUp ? "Already Registered? Authorize" : "New Terminal? Register Role"}
            </button>
            <p className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest block">System Architecture: Cloud Native Intelligence</p>
          </div>
        </div>
      </div>
    );
  }

  // 3. AUTHENTICATED BUT PROFILE MISSING (MANDATORY IDENTITY CHECK)
  if (user && !profile && !profileLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <Card className="max-w-md w-full glass-morphism p-10 border-t-4 border-destructive shadow-2xl rounded-[2.5rem]">
          <CardHeader className="text-center space-y-4">
            <div className="mx-auto w-16 h-16 rounded-2xl bg-destructive/10 flex items-center justify-center text-destructive">
              <ShieldAlert size={32} />
            </div>
            <CardTitle className="font-headline text-2xl font-black uppercase tracking-tighter">Identity <span className="text-destructive">Glitched</span></CardTitle>
            <CardDescription className="text-[10px] font-bold uppercase tracking-widest mt-2 border-y border-border py-2">
              Unauthorized session detected.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 pt-4">
            <p className="text-[10px] text-muted-foreground uppercase font-bold text-center leading-relaxed">
              Your account is authenticated but lacks a verified role profile in our database. Please terminate this session and register correctly.
            </p>
            <Button onClick={handleLogout} variant="destructive" className="w-full py-7 rounded-2xl font-black uppercase tracking-widest shadow-lg hover:scale-[1.02] transition-all">
              Terminate Corrupt Session
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // 4. MAIN PORTAL ROUTING (VERIFIED ROLE)
  return (
    <div className="min-h-screen bg-background text-foreground animate-in fade-in duration-1000">
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
              <span className={`text-[9px] uppercase font-black mt-1.5 tracking-[0.2em] flex items-center gap-1.5 px-2 py-0.5 rounded-full border ${profile?.role === 'admin' ? 'text-secondary bg-secondary/5 border-secondary/10' : 'text-primary bg-primary/5 border-primary/10'}`}>
                <div className={`w-1.5 h-1.5 rounded-full ${profile?.role === 'admin' ? 'bg-secondary' : 'bg-primary'} animate-pulse`} />
                {profile?.role === 'admin' ? 'SUPER ADMIN' : 'SELLER'}
              </span>
            </div>
            <Button variant="ghost" size="icon" onClick={handleLogout} className="rounded-2xl text-destructive h-10 w-10 border border-transparent hover:border-destructive/20 transition-all">
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
