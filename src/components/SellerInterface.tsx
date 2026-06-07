
"use client";

import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ShoppingCart, Banknote, Package, Plus, Search, Trash2, ArrowRightLeft, ShieldCheck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export function SellerInterface() {
  const { toast } = useToast();
  const [lang, setLang] = useState<"bn" | "en">("bn");
  const [cart, setCart] = useState<{ id: string; name: string; price: number; qty: number }[]>([]);

  const t = {
    bn: {
      sales: "দৈনিক বিক্রি",
      expenses: "খরচ হিসাব",
      inventory: "স্টক চেক",
      addSale: "বিক্রি যুক্ত করুন",
      addExpense: "খরচ যুক্ত করুন",
      productName: "পণ্যের নাম",
      price: "দাম",
      qty: "পরিমাণ",
      amount: "টাকার পরিমাণ",
      category: "ক্যাটাগরি",
      submit: "দাখিল করুন",
      cart: "কার্ট",
      total: "মোট",
      checkout: "চেকআউট"
    },
    en: {
      sales: "Daily Sales",
      expenses: "Daily Expenses",
      inventory: "Stock Check",
      addSale: "Add Sale",
      addExpense: "Add Expense",
      productName: "Product Name",
      price: "Price",
      qty: "Qty",
      amount: "Amount",
      category: "Category",
      submit: "Submit Entry",
      cart: "Cart",
      total: "Total",
      checkout: "Checkout"
    }
  }[lang];

  const addToCart = () => {
    // Mock adding to cart
    setCart([...cart, { id: Math.random().toString(), name: "Mock Product", price: 120, qty: 1 }]);
  };

  const handleCheckout = () => {
    toast({
      title: lang === "bn" ? "সফল হয়েছে" : "Success",
      description: lang === "bn" ? "বিক্রি রেকর্ড করা হয়েছে" : "Sale recorded successfully",
    });
    setCart([]);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="font-headline text-xl text-primary flex items-center gap-2">
          <ArrowRightLeft className="animate-spin-slow" />
          {lang === "bn" ? "স্টাফ পোর্টাল" : "STAFF PORTAL"}
        </h2>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => setLang(lang === "bn" ? "en" : "bn")}
          className="border-primary/50 text-primary hover:bg-primary/20"
        >
          {lang === "bn" ? "English" : "বাংলা"}
        </Button>
      </div>

      <Tabs defaultValue="sales" className="w-full">
        <TabsList className="grid w-full grid-cols-3 bg-muted/20 border border-white/10 p-1 mb-8">
          <TabsTrigger value="sales" className="data-[state=active]:bg-primary data-[state=active]:text-black font-headline text-xs tracking-tighter">
            <ShoppingCart className="mr-2" size={16} /> {t.sales}
          </TabsTrigger>
          <TabsTrigger value="expenses" className="data-[state=active]:bg-secondary data-[state=active]:text-black font-headline text-xs tracking-tighter">
            <Banknote className="mr-2" size={16} /> {t.expenses}
          </TabsTrigger>
          <TabsTrigger value="inventory" className="data-[state=active]:bg-accent data-[state=active]:text-black font-headline text-xs tracking-tighter">
            <Package className="mr-2" size={16} /> {t.inventory}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="sales">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2 glass-morphism neon-border-green">
              <CardHeader>
                <CardTitle className="font-headline text-primary flex items-center gap-2">
                  <Search size={18} /> {t.addSale}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[1, 2, 3, 4, 5, 6].map(i => (
                    <Button 
                      key={i} 
                      variant="ghost" 
                      onClick={addToCart}
                      className="h-24 flex flex-col items-center justify-center border border-white/5 hover:neon-border-green hover:bg-primary/10 transition-all rounded-xl"
                    >
                      <Package size={24} className="mb-2 text-primary opacity-60" />
                      <span className="text-xs font-headline">Product {i}</span>
                      <span className="text-xs text-muted-foreground">৳150</span>
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="glass-morphism border-white/10">
              <CardHeader>
                <CardTitle className="font-headline text-white flex items-center justify-between">
                  {t.cart}
                  <span className="text-xs bg-primary/20 text-primary px-2 py-1 rounded">{cart.length} items</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="max-h-[300px] overflow-y-auto space-y-2 pr-2">
                  {cart.map(item => (
                    <div key={item.id} className="flex justify-between items-center bg-white/5 p-2 rounded border border-white/5">
                      <div>
                        <p className="text-sm font-medium">{item.name}</p>
                        <p className="text-xs text-muted-foreground">৳{item.price} x {item.qty}</p>
                      </div>
                      <Button variant="ghost" size="icon" className="text-destructive h-8 w-8 hover:bg-destructive/20">
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  ))}
                  {cart.length === 0 && (
                    <div className="text-center py-10 text-muted-foreground italic text-sm">
                      Cart is empty
                    </div>
                  )}
                </div>
                <div className="border-t border-white/10 pt-4 space-y-2">
                  <div className="flex justify-between text-lg font-headline">
                    <span>{t.total}</span>
                    <span className="text-primary">৳{cart.reduce((acc, curr) => acc + curr.price * curr.qty, 0)}</span>
                  </div>
                  <Button 
                    className="w-full bg-primary text-black font-headline neon-border-green hover:scale-[1.02] transition-transform" 
                    disabled={cart.length === 0}
                    onClick={handleCheckout}
                  >
                    {t.checkout}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="expenses">
          <Card className="glass-morphism neon-border-magenta max-w-2xl mx-auto">
            <CardHeader>
              <CardTitle className="font-headline text-secondary">{t.addExpense}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>{t.productName} / Description</Label>
                <Input placeholder="Rent, Electricity, Supplies..." className="bg-white/5 border-secondary/30 focus:border-secondary" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t.amount}</Label>
                  <Input type="number" placeholder="0.00" className="bg-white/5 border-secondary/30 focus:border-secondary" />
                </div>
                <div className="space-y-2">
                  <Label>{t.category}</Label>
                  <Input placeholder="Operations..." className="bg-white/5 border-secondary/30 focus:border-secondary" />
                </div>
              </div>
              <Button className="w-full bg-secondary text-white font-headline hover:bg-secondary/80">
                <Plus className="mr-2" size={16} /> {t.submit}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="inventory">
          <div className="grid gap-4">
             <div className="flex items-center gap-2 p-4 bg-accent/10 border border-accent rounded-lg text-accent animate-pulse">
                <ShieldCheck size={20} />
                <span className="font-headline text-sm uppercase tracking-widest">Real-time Stock Monitor Active</span>
             </div>
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3, 4, 5, 6].map(i => (
                  <Card key={i} className="glass-morphism border-white/5 hover:border-accent transition-colors">
                    <CardContent className="p-4 flex justify-between items-center">
                      <div>
                        <h4 className="font-headline text-sm">Product Item #{i}</h4>
                        <p className="text-xs text-muted-foreground">Category: Essentials</p>
                      </div>
                      <div className="text-right">
                        <p className="font-headline text-accent">42 Units</p>
                        <p className="text-[10px] text-green-500">In Stock</p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
             </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
