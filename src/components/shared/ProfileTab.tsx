
"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth, useUser, useFirestore, useDoc } from "@/firebase";
import { updatePassword, updateProfile, signOut } from "firebase/auth";
import { doc, updateDoc } from "firebase/firestore";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  Loader2,
  ShieldCheck,
  Key,
  User as UserIcon,
  Mail,
  Phone,
  Store,
  CalendarClock,
  LogOut,
  Save,
  BadgeCheck,
} from "lucide-react";
import { format } from "date-fns";

type Lang = "bn" | "en";

const dict = {
  bn: {
    profileTitle: "প্রোফাইল",
    profileSubtitle: "আপনার অ্যাকাউন্টের বিস্তারিত তথ্য",
    accountInfo: "অ্যাকাউন্ট তথ্য",
    accountInfoDesc: "আপনার ব্যক্তিগত ও ব্যবসায়িক তথ্য পরিবর্তন করুন",
    displayName: "নাম",
    email: "ইমেইল",
    phone: "মোবাইল নম্বর",
    phonePlaceholder: "যেমনঃ ০১৭xxxxxxxx",
    shopName: "দোকান / প্রতিষ্ঠানের নাম",
    shopNamePlaceholder: "আপনার দোকানের নাম লিখুন",
    save: "পরিবর্তন সংরক্ষণ করুন",
    security: "নিরাপত্তা",
    securityDesc: "আপনার পাসওয়ার্ড পরিবর্তন করুন",
    newPassword: "নতুন পাসওয়ার্ড",
    passwordHint: "পরিবর্তন না করতে চাইলে খালি রাখুন",
    updatePassword: "পাসওয়ার্ড আপডেট করুন",
    sessionInfo: "অ্যাকাউন্ট স্ট্যাটাস",
    role: "পদবী",
    roleAdmin: "সুপার এডমিন",
    roleSeller: "বিক্রেতা",
    memberSince: "যোগদানের তারিখ",
    accountId: "অ্যাকাউন্ট আইডি",
    verified: "যাচাইকৃত অ্যাকাউন্ট",
    logout: "লগ আউট",
    updateSuccess: "প্রোফাইল সফলভাবে হালনাগাদ হয়েছে",
    updateSuccessDesc: "আপনার তথ্য সংরক্ষণ করা হয়েছে।",
    updateFailed: "হালনাগাদ ব্যর্থ হয়েছে",
    notAvailable: "তথ্য পাওয়া যায়নি",
  },
  en: {
    profileTitle: "Profile",
    profileSubtitle: "Your detailed account information",
    accountInfo: "Account Information",
    accountInfoDesc: "Update your personal and business details",
    displayName: "Display Name",
    email: "Email",
    phone: "Phone Number",
    phonePlaceholder: "e.g. 017xxxxxxxx",
    shopName: "Shop / Business Name",
    shopNamePlaceholder: "Enter your shop name",
    save: "Save Changes",
    security: "Security",
    securityDesc: "Change your account password",
    newPassword: "New Password",
    passwordHint: "Leave empty to keep current password",
    updatePassword: "Update Password",
    sessionInfo: "Account Status",
    role: "Role",
    roleAdmin: "Super Admin",
    roleSeller: "Seller",
    memberSince: "Member Since",
    accountId: "Account ID",
    verified: "Verified Account",
    logout: "Log Out",
    updateSuccess: "Profile Updated",
    updateSuccessDesc: "Your information has been saved.",
    updateFailed: "Update Failed",
    notAvailable: "Not available",
  },
};

export function ProfileTab({ lang, role }: { lang: Lang; role: "admin" | "seller" }) {
  const { auth } = useAuth();
  const { firestore } = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  const t = dict[lang];

  const userProfileRef = useMemo(() => {
    if (!firestore || !user) return null;
    return doc(firestore, "users", user.uid);
  }, [firestore, user]);

  const { data: profile } = useDoc<any>(userProfileRef);

  const [displayName, setDisplayName] = useState("");
  const [phone, setPhone] = useState("");
  const [shopName, setShopName] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSavingPassword, setIsSavingPassword] = useState(false);

  useEffect(() => {
    setDisplayName(user?.displayName || "");
    setPhone(profile?.phone || "");
    setShopName(profile?.shopName || "");
  }, [user, profile]);

  const handleSaveProfile = async () => {
    if (!auth || !user || !firestore) return;
    setIsSavingProfile(true);
    try {
      if (displayName !== user.displayName) {
        await updateProfile(user, { displayName });
      }
      await updateDoc(doc(firestore, "users", user.uid), {
        displayName,
        phone,
        shopName,
      });
      toast({ title: t.updateSuccess, description: t.updateSuccessDesc });
    } catch (error: any) {
      toast({ variant: "destructive", title: t.updateFailed, description: error.message });
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleUpdatePassword = async () => {
    if (!auth || !user || !newPassword) return;
    setIsSavingPassword(true);
    try {
      await updatePassword(user, newPassword);
      toast({ title: t.updateSuccess, description: t.updateSuccessDesc });
      setNewPassword("");
    } catch (error: any) {
      toast({ variant: "destructive", title: t.updateFailed, description: error.message });
    } finally {
      setIsSavingPassword(false);
    }
  };

  const handleLogout = () => {
    if (auth) signOut(auth);
  };

  const initial = (user?.displayName || user?.email || "?").charAt(0).toUpperCase();
  const memberSince = profile?.createdAt ? format(new Date(profile.createdAt), "PPP") : t.notAvailable;

  return (
    <div className="space-y-4 md:space-y-6 max-w-2xl mx-auto pb-6">
      {/* Profile Header */}
      <Card className="glass-morphism border-t-4 border-primary shadow-xl overflow-hidden">
        <CardContent className="pt-8 pb-6 flex flex-col items-center text-center gap-3">
          <div className="w-20 h-20 rounded-full bg-primary flex items-center justify-center shadow-lg">
            <span className="text-3xl font-black text-primary-foreground">{initial}</span>
          </div>
          <div>
            <h3 className="text-lg font-black uppercase tracking-tight">{user?.displayName || user?.email?.split("@")[0]}</h3>
            <p className="text-[10px] font-bold text-muted-foreground mt-1 flex items-center justify-center gap-1.5">
              <Mail size={11} /> {user?.email}
            </p>
          </div>
          <span className={`text-[9px] font-black uppercase tracking-[0.2em] px-3 py-1.5 rounded-full border flex items-center gap-1.5 ${role === "admin" ? "text-secondary bg-secondary/5 border-secondary/20" : "text-primary bg-primary/5 border-primary/20"}`}>
            <BadgeCheck size={12} />
            {role === "admin" ? t.roleAdmin : t.roleSeller}
          </span>
        </CardContent>
      </Card>

      {/* Account Info */}
      <Card className="glass-morphism border-t-4 border-secondary shadow-xl">
        <CardHeader>
          <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
            <UserIcon size={16} className="text-secondary" /> {t.accountInfo}
          </CardTitle>
          <CardDescription className="text-[10px] font-bold uppercase">{t.accountInfoDesc}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
              <UserIcon size={12} className="text-primary" /> {t.displayName}
            </Label>
            <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} className="bg-muted/30 border-border h-12 rounded-xl font-black" />
          </div>
          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
              <Mail size={12} className="text-primary" /> {t.email}
            </Label>
            <Input value={user?.email || ""} disabled className="bg-muted/50 border-border h-12 rounded-xl font-black opacity-70" />
          </div>
          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
              <Phone size={12} className="text-primary" /> {t.phone}
            </Label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder={t.phonePlaceholder} className="bg-muted/30 border-border h-12 rounded-xl font-black" />
          </div>
          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
              <Store size={12} className="text-primary" /> {t.shopName}
            </Label>
            <Input value={shopName} onChange={(e) => setShopName(e.target.value)} placeholder={t.shopNamePlaceholder} className="bg-muted/30 border-border h-12 rounded-xl font-black" />
          </div>
          <Button onClick={handleSaveProfile} disabled={isSavingProfile} className="w-full bg-secondary py-7 rounded-2xl font-black uppercase tracking-widest shadow-xl">
            {isSavingProfile ? <Loader2 className="animate-spin" /> : <><Save className="mr-2" size={16} /> {t.save}</>}
          </Button>
        </CardContent>
      </Card>

      {/* Security */}
      <Card className="glass-morphism border-t-4 border-primary shadow-xl">
        <CardHeader>
          <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
            <Key size={16} className="text-primary" /> {t.security}
          </CardTitle>
          <CardDescription className="text-[10px] font-bold uppercase">{t.securityDesc}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{t.newPassword}</Label>
            <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="••••••••" className="bg-muted/30 border-border h-12 rounded-xl font-black" />
            <p className="text-[8px] text-muted-foreground uppercase font-bold italic">{t.passwordHint}</p>
          </div>
          <Button onClick={handleUpdatePassword} disabled={isSavingPassword || !newPassword} className="w-full bg-primary py-7 rounded-2xl font-black uppercase tracking-widest shadow-xl">
            {isSavingPassword ? <Loader2 className="animate-spin" /> : t.updatePassword}
          </Button>
        </CardContent>
      </Card>

      {/* Session Info */}
      <Card className="glass-morphism shadow-xl">
        <CardHeader>
          <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
            <ShieldCheck size={16} className="text-muted-foreground" /> {t.sessionInfo}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between items-center p-3 bg-muted/30 rounded-xl border border-border/50">
            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2"><BadgeCheck size={12} /> {t.role}</span>
            <span className="text-[10px] font-black uppercase">{role === "admin" ? t.roleAdmin : t.roleSeller}</span>
          </div>
          <div className="flex justify-between items-center p-3 bg-muted/30 rounded-xl border border-border/50">
            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2"><CalendarClock size={12} /> {t.memberSince}</span>
            <span className="text-[10px] font-black uppercase">{memberSince}</span>
          </div>
          <div className="flex justify-between items-center p-3 bg-muted/30 rounded-xl border border-border/50 gap-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground shrink-0">{t.accountId}</span>
            <span className="text-[9px] font-bold truncate">{user?.uid}</span>
          </div>
        </CardContent>
      </Card>

      <Button onClick={handleLogout} variant="outline" className="w-full border-destructive/30 text-destructive hover:bg-destructive/10 py-7 rounded-2xl font-black uppercase tracking-widest">
        <LogOut className="mr-2" size={16} /> {t.logout}
      </Button>
    </div>
  );
}
