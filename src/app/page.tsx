
"use client";

import { useState } from "react";
import { SellerInterface } from "@/components/SellerInterface";
import { OwnerDashboard } from "@/components/OwnerDashboard";
import { Button } from "@/components/ui/button";
import { User, ShieldCheck, Zap } from "lucide-react";

export default function Home() {
  const [view, setView] = useState<"seller" | "owner">("seller");

  return (
    <div className="min-h-screen bg-[#050505] text-white">
      {/* Top Navigation / Switcher */}
      <header className="sticky top-0 z-50 glass-morphism border-b border-primary/20 px-4 py-3 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center animate-pulse-neon border-2">
            <Zap className="text-black fill-black" size={24} />
          </div>
          <h1 className="font-headline text-2xl tracking-tighter neon-text-green">
            DOKAN<span className="text-accent">HISHAB</span>
          </h1>
        </div>

        <div className="flex gap-2 p-1 bg-muted/30 rounded-full border border-white/5">
          <Button
            variant={view === "seller" ? "default" : "ghost"}
            size="sm"
            onClick={() => setView("seller")}
            className={`rounded-full font-headline text-xs tracking-wider transition-all duration-500 ${
              view === "seller" ? "bg-primary text-black neon-border-green" : "text-muted-foreground"
            }`}
          >
            <User className="mr-2" size={14} />
            বিক্রেতা (SELLER)
          </Button>
          <Button
            variant={view === "owner" ? "default" : "ghost"}
            size="sm"
            onClick={() => setView("owner")}
            className={`rounded-full font-headline text-xs tracking-wider transition-all duration-500 ${
              view === "owner" ? "bg-accent text-black neon-border-cyan" : "text-muted-foreground"
            }`}
          >
            <ShieldCheck className="mr-2" size={14} />
            মালিক (OWNER)
          </Button>
        </div>
      </header>

      <main className="p-4 md:p-6 transition-transform duration-500">
        <div className="max-w-7xl mx-auto">
          {view === "seller" ? <SellerInterface /> : <OwnerDashboard />}
        </div>
      </main>
    </div>
  );
}
