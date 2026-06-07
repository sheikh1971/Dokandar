"use client";

import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ShoppingCart, Banknote, Package, Plus, Search, Trash2, ArrowRightLeft, ShieldCheck, CheckCircle2 } from "lucide-react";
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
    setCart([...cart, { id: Math.random().toString(), name: "Sample Product", price: 120, qty: 1 }]);
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
      <div className="flex justify-between items-center mb-2">
        <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
          <ArrowRightLeft className="text-primary" />
          {lang === "bn" ? "বিক্রেতা পোর্টাল" : "SELLER PORTAL"}
        </h2>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => setLang(lang === "bn" ? "en" : "bn")}
          className="border-border text-foreground hover:bg-muted"
        >
          {lang === "bn" ? "English" : "বাংলা"}
        </Button>
      </div>

      <Tabs defaultValue="sales" className="w-full">
        <TabsList className="grid w-full grid-cols-3 bg-muted border border-border p-1 mb-8">
          <TabsTrigger value="sales" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-semibold text-xs transition-all">
            <ShoppingCart className="mr-2" size={14} /> {t.sales}
          </TabsTrigger>
          <TabsTrigger value="expenses" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-semibold text-xs transition-all">
            <Banknote className="mr-2" size={14} /> {t.expenses}
          </TabsTrigger>
          <TabsTrigger value="inventory" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-semibold text-xs transition-all">
            <Package className="mr-2" size={14} /> {t.inventory}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="sales">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2 glass-morphism">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-foreground flex items-center gap-2">
                  <Search size={18} className="text-primary" /> {t.addSale}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                    <Button 
                      key={i} 
                      variant="ghost" 
                      onClick={addToCart}
                      className="h-28 flex flex-col items-center justify-center border border-border hover:border-primary/50 hover:bg-primary/5 transition-all rounded-xl shadow-sm"
                    >
                      <Package size={24} className="mb-3 text-primary/60" />
                      <span className="text-xs font-semibold">Product {i}</span>
                      <span className="text-xs text-muted-foreground mt-1 font-bold">৳150</span>
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="glass-morphism">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-foreground flex items-center justify-between">
                  {t.cart}
                  <span className="text-xs bg-primary/10 text-primary px-2.5 py-1 rounded-full font-bold">{cart.length} items</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="max-h-[350px] overflow-y-auto space-y-2 pr-2">
                  {cart.map(item => (
                    <div key={item.id} className="flex justify-between items-center bg-muted/40 p-3 rounded-lg border border-border">
                      <div>
                        <p className="text-sm font-semibold">{item.name}</p>
                        <p className="text-xs text-muted-foreground font-medium">৳{item.price} x {item.qty}</p>
                      </div>
                      <Button variant="ghost" size="icon" className="text-destructive h-8 w-8 hover:bg-destructive/10">
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  ))}
                  {cart.length === 0 && (
                    <div className="text-center py-12 text-muted-foreground italic text-sm">
                      Your cart is currently empty.
                    </div>
                  )}
                </div>
                <div className="border-t border-border pt-4 space-y-3">
                  <div className="flex justify-between text-lg font-bold">
                    <span>{t.total}</span>
                    <span className="text-primary">৳{cart.reduce((acc, curr) => acc + curr.price * curr.qty, 0)}</span>
                  </div>
                  <Button 
                    className="w-full bg-primary text-primary-foreground font-bold shadow-md hover:scale-[1.01] transition-transform" 
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
          <Card className="glass-morphism max-w-2xl mx-auto">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-foreground">{t.addExpense}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{t.productName} / Description</Label>
                <Input placeholder="Rent, Electricity, Supplies..." className="bg-muted/30 border-border focus:border-primary/50" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{t.amount}</Label>
                  <Input type="number" placeholder="0.00" className="bg-muted/30 border-border focus:border-primary/50" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{t.category}</Label>
                  <Input placeholder="Operations..." className="bg-muted/30 border-border focus:border-primary/50" />
                </div>
              </div>
              <Button className="w-full bg-primary text-primary-foreground font-bold py-6 hover:bg-primary/90">
                <Plus className="mr-2" size={16} /> {t.submit}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="inventory">
          <div className="grid gap-4">
             <div className="flex items-center gap-3 p-4 bg-primary/5 border border-primary/20 rounded-xl text-primary font-semibold text-sm">
                <CheckCircle2 size={18} />
                <span>Real-time Stock Monitor Active & Secured</span>
             </div>
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3, 4, 5, 6].map(i => (
                  <Card key={i} className="glass-morphism border-border hover:border-primary/30 transition-all cursor-default group">
                    <CardContent className="p-5 flex justify-between items-center">
                      <div>
                        <h4 className="font-bold text-foreground group-hover:text-primary transition-colors">Product Item #{i}</h4>
                        <p className="text-xs text-muted-foreground font-medium">Category: Essentials</p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-primary">42 Units</p>
                        <p className="text-[10px] text-primary/70 font-bold uppercase tracking-tighter">In Stock</p>
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
