"use client";

import { useState } from "react";
import { SellerInterface } from "@/components/SellerInterface";
import { OwnerDashboard } from "@/components/OwnerDashboard";
import { Button } from "@/components/ui/button";
import { LayoutDashboard, ShoppingBag, Zap } from "lucide-react";

export default function Home() {
  const [view, setView] = useState<"seller" | "owner">("seller");

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary/20">
      {/* Top Navigation / Switcher */}
      <header className="sticky top-0 z-50 glass-morphism border-b border-border px-6 py-4 flex justify-between items-center bg-white/80">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-md">
            <Zap className="text-primary-foreground fill-primary-foreground" size={20} />
          </div>
          <h1 className="font-headline text-2xl tracking-tight font-bold">
            DOKAN<span className="text-primary">HISHAB</span>
          </h1>
        </div>

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
            বিক্রেতা (SELLER)
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
            মালিক (OWNER)
          </Button>
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
