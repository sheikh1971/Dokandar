'use client';

import { useState } from 'react';
import { useAuth, useUser, useFirestore } from '@/firebase';
import { updatePassword, updateProfile } from 'firebase/auth';
import { doc, updateDoc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ShieldCheck, Key, User } from 'lucide-react';

export function ProfileSettings() {
  const { auth } = useAuth();
  const { firestore } = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [newPassword, setNewPassword] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  const handleUpdate = async () => {
    if (!auth || !user || !firestore) return;
    setIsUpdating(true);
    try {
      if (displayName && displayName !== user.displayName) {
        await updateProfile(user, { displayName });
        const userRef = doc(firestore, 'users', user.uid);
        await updateDoc(userRef, { displayName });
      }
      if (newPassword) {
        await updatePassword(user, newPassword);
      }
      toast({
        title: 'Identity Synchronized',
        description: 'Profile and security credentials have been updated.',
      });
      setNewPassword('');
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Update Denied',
        description: error.message || 'Verification failed during update.',
      });
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <DialogContent className="glass-morphism border-t-4 border-primary rounded-[2rem] max-w-md w-full">
      <DialogHeader>
        <DialogTitle className="font-headline text-xl font-black uppercase tracking-tighter">Security & Profile <span className="text-primary">Settings</span></DialogTitle>
        <DialogDescription className="text-[10px] font-bold uppercase tracking-widest mt-1">
          Manage your neural link identity and access tokens.
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-6 py-6">
        <div className="space-y-2">
          <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2 ml-1">
            <User size={12} className="text-primary" /> Display Identity
          </Label>
          <Input 
            value={displayName} 
            onChange={(e) => setDisplayName(e.target.value)} 
            placeholder="Identity Name"
            className="bg-muted/30 border-border h-12 rounded-xl font-black focus:ring-primary"
          />
        </div>
        <div className="space-y-2">
          <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2 ml-1">
            <Key size={12} className="text-primary" /> New Access Token (Password)
          </Label>
          <Input 
            type="password" 
            value={newPassword} 
            onChange={(e) => setNewPassword(e.target.value)} 
            placeholder="••••••••"
            className="bg-muted/30 border-border h-12 rounded-xl font-black focus:ring-primary"
          />
          <p className="text-[8px] text-muted-foreground uppercase font-bold italic ml-1">Leave empty to retain current access token.</p>
        </div>
        <div className="bg-primary/5 border border-primary/20 p-5 rounded-2xl flex gap-4 animate-in fade-in slide-in-from-bottom-2">
          <ShieldCheck className="text-primary shrink-0" size={20} />
          <div className="space-y-1">
            <p className="text-[10px] text-foreground font-black uppercase tracking-widest">Protocol Verified</p>
            <p className="text-[8px] text-muted-foreground font-bold uppercase leading-relaxed">Identity updates require active session validation. Changes are effective immediately across all nodes.</p>
          </div>
        </div>
      </div>
      <DialogFooter>
        <Button 
          onClick={handleUpdate} 
          className="w-full bg-primary py-8 rounded-2xl font-black uppercase tracking-widest shadow-xl hover:scale-[1.02] transition-all" 
          disabled={isUpdating}
        >
          {isUpdating ? <Loader2 className="animate-spin" /> : "Commit Identity Changes"}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
