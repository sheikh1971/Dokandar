
"use client";

import { useState, useMemo } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ShoppingCart, Banknote, Package, Plus, Search, Trash2, ArrowRightLeft, ShieldCheck, ShoppingBag, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useFirestore, useUser, useCollection } from "@/firebase";
import { collection, addDoc, serverTimestamp, query, orderBy } from "firebase/firestore";
import { errorEmitter } from "@/firebase/error-emitter";
import { FirestorePermissionError } from "@/firebase/errors";

export function SellerPortal() {
  const { toast } = useToast();
  const { firestore } = useFirestore();
  const { user } = useUser();
  const [lang, setLang] = useState<"bn" | "en">("en");
  const [cart, setCart] = useState<{ id: string; name: string; price: number; qty: number }[]>([]);
  
  // Expense form state
  const [expenseDesc, setExpenseDesc] = useState("");
  const [expenseAmount, setExpenseAmount] = useState("");
  const [expenseCat, setExpenseCat] = useState("Operations");

  // Fetch Live Inventory
  const productsQuery = useMemo(() => {
    if (!firestore) return null;
    return query(collection(firestore, "products"), orderBy("name", "asc"));
  }, [firestore]);

  const { data: products, loading: productsLoading } = useCollection(productsQuery);

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

  const addToCart = (product: { id: string, name: string, price: number }) => {
    const existing = cart.find(item => item.id === product.id);
    if (existing) {
      setCart(cart.map(item => item.id === product.id ? { ...item, qty: item.qty + 1 } : item));
    } else {
      setCart([...cart, { id: product.id, name: product.name, price: product.price, qty: 1 }]);
    }
    toast({
      title: "Item Added",
      description: `${product.name} added to cart.`,
      duration: 1000
    });
  };

  const handleCheckout = async () => {
    if (!firestore || !user) {
      toast({ variant: "destructive", title: "Auth Required", description: "Login to process sales." });
      return;
    }

    const total = cart.reduce((acc, curr) => acc + curr.price * curr.qty, 0);
    const saleData = {
      items: cart,
      total,
      timestamp: serverTimestamp(),
      sellerId: user.uid,
      sellerName: user.displayName || user.email?.split('@')[0] || "Unknown Seller"
    };

    addDoc(collection(firestore, "sales"), saleData)
      .then(() => {
        toast({
          title: lang === "bn" ? "সফল হয়েছে" : "Success",
          description: lang === "bn" ? "বিক্রি রেকর্ড করা হয়েছে" : "Sale recorded successfully",
        });
        setCart([]);
      })
      .catch(async (err) => {
        const pErr = new FirestorePermissionError({
          path: "sales",
          operation: "create",
          requestResourceData: saleData
        });
        errorEmitter.emit("permission-error", pErr);
      });
  };

  const handleSubmitExpense = async () => {
    if (!firestore || !user || !expenseAmount) return;

    const expenseData = {
      description: expenseDesc,
      amount: parseFloat(expenseAmount),
      category: expenseCat,
      timestamp: serverTimestamp(),
      sellerId: user.uid
    };

    addDoc(collection(firestore, "expenses"), expenseData)
      .then(() => {
        toast({ title: "Expense Added", description: "Expense record saved." });
        setExpenseDesc("");
        setExpenseAmount("");
      })
      .catch(async (err) => {
        const pErr = new FirestorePermissionError({
          path: "expenses",
          operation: "create",
          requestResourceData: expenseData
        });
        errorEmitter.emit("permission-error", pErr);
      });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-2">
        <h2 className="text-xl font-black font-headline tracking-tighter uppercase flex items-center gap-2">
          <ShoppingBag className="text-primary" />
          {lang === "bn" ? "বিক্রেতা পোর্টাল" : "SELLER POS"}
        </h2>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => setLang(lang === "bn" ? "en" : "bn")}
          className="rounded-2xl font-black text-[10px] uppercase border-border"
        >
          {lang === "bn" ? "English" : "বাংলা"}
        </Button>
      </div>

      <Tabs defaultValue="sales" className="w-full">
        <TabsList className="grid w-full grid-cols-3 bg-muted border border-border p-1 mb-8 h-12 rounded-2xl">
          <TabsTrigger value="sales" className="rounded-xl font-black text-[10px] uppercase tracking-widest data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all">
            <ShoppingCart className="mr-2" size={14} /> {t.sales}
          </TabsTrigger>
          <TabsTrigger value="expenses" className="rounded-xl font-black text-[10px] uppercase tracking-widest data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all">
            <Banknote className="mr-2" size={14} /> {t.expenses}
          </TabsTrigger>
          <TabsTrigger value="inventory" className="rounded-xl font-black text-[10px] uppercase tracking-widest data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all">
            <Package className="mr-2" size={14} /> {t.inventory}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="sales">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2 glass-morphism border-t-4 border-primary">
              <CardHeader>
                <CardTitle className="text-lg font-black uppercase tracking-widest flex items-center gap-2">
                  <Search size={18} className="text-primary" /> {t.addSale}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {productsLoading ? (
                  <div className="flex flex-col items-center justify-center py-20 gap-4">
                    <Loader2 className="animate-spin text-primary" size={32} />
                    <p className="text-[10px] font-black uppercase tracking-widest animate-pulse">Syncing Inventory...</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {products?.map((prod: any) => (
                      <Button 
                        key={prod.id} 
                        variant="ghost" 
                        onClick={() => addToCart(prod)}
                        className="h-32 flex flex-col items-center justify-center border border-border hover:border-primary hover:bg-primary/5 transition-all rounded-2xl shadow-sm group"
                      >
                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                          <Package size={20} className="text-primary" />
                        </div>
                        <span className="text-[10px] font-black uppercase text-center leading-tight mb-1">{prod.name}</span>
                        <span className="text-[12px] font-black text-primary">৳{prod.price}</span>
                      </Button>
                    ))}
                    {!products?.length && (
                      <div className="col-span-full py-20 text-center opacity-40">
                        <Package className="mx-auto mb-4" size={40} />
                        <p className="text-[10px] font-black uppercase tracking-widest">Inventory Empty • Admin Must Add Products</p>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="glass-morphism border-t-4 border-secondary">
              <CardHeader>
                <CardTitle className="text-lg font-black uppercase tracking-widest flex items-center justify-between">
                  {t.cart}
                  <span className="text-[10px] bg-secondary/10 text-secondary px-3 py-1 rounded-full font-black">
                    {cart.reduce((a, b) => a + b.qty, 0)} ITEMS
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="max-h-[350px] overflow-y-auto space-y-2 pr-2">
                  {cart.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center bg-muted/40 p-4 rounded-xl border border-border group">
                      <div>
                        <p className="text-[11px] font-black uppercase leading-none">{item.name}</p>
                        <p className="text-[10px] text-muted-foreground font-bold uppercase mt-1.5">৳{item.price} x {item.qty}</p>
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => {
                        const newCart = [...cart];
                        newCart.splice(idx, 1);
                        setCart(newCart);
                      }} className="text-destructive h-8 w-8 hover:bg-destructive/10">
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  ))}
                  {cart.length === 0 && (
                    <div className="text-center py-20 opacity-30">
                      <ShoppingCart className="mx-auto mb-4" size={32} />
                      <p className="text-[10px] font-black uppercase tracking-widest">Cart Standby</p>
                    </div>
                  )}
                </div>
                <div className="border-t border-border pt-6 space-y-4">
                  <div className="flex justify-between text-xl font-black uppercase tracking-tighter">
                    <span>{t.total}</span>
                    <span className="text-primary">৳{cart.reduce((acc, curr) => acc + curr.price * curr.qty, 0).toLocaleString()}</span>
                  </div>
                  <Button 
                    className="w-full bg-primary text-primary-foreground font-black py-8 rounded-2xl shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all uppercase tracking-[0.2em] text-sm" 
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
          <Card className="glass-morphism max-w-2xl mx-auto border-t-4 border-destructive">
            <CardHeader>
              <CardTitle className="text-lg font-black uppercase tracking-widest">{t.addExpense}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-muted-foreground">Description</Label>
                <Input value={expenseDesc} onChange={(e) => setExpenseDesc(e.target.value)} placeholder="Rent, Electricity, Supplies..." className="bg-muted border-border font-bold h-12" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-muted-foreground">{t.amount}</Label>
                  <Input type="number" value={expenseAmount} onChange={(e) => setExpenseAmount(e.target.value)} placeholder="0.00" className="bg-muted border-border font-bold h-12" />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-muted-foreground">{t.category}</Label>
                  <Select value={expenseCat} onValueChange={setExpenseCat}>
                    <SelectTrigger className="bg-muted border-border h-12">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Operations">Operations</SelectItem>
                      <SelectItem value="Utilities">Utilities</SelectItem>
                      <SelectItem value="Marketing">Marketing</SelectItem>
                      <SelectItem value="Salaries">Salaries</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button onClick={handleSubmitExpense} className="w-full bg-destructive text-destructive-foreground font-black py-8 rounded-2xl shadow-lg uppercase tracking-widest text-sm">
                <Plus className="mr-2" size={18} /> {t.submit}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="inventory">
          <div className="grid gap-6">
             <div className="flex items-center gap-3 p-6 bg-primary/5 border border-primary/20 rounded-3xl text-primary font-black uppercase tracking-widest text-[11px]">
                <ShieldCheck size={20} />
                <span>Neural Stock Matrix: Syncing Global Assets</span>
             </div>
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {products?.map((p: any) => (
                  <Card key={p.id} className="glass-morphism border-border hover:border-primary transition-all group overflow-hidden">
                    <CardContent className="p-8 flex justify-between items-center relative">
                      <div className="absolute top-0 right-0 p-2 opacity-5">
                        <Package size={80} />
                      </div>
                      <div className="relative z-10">
                        <h4 className="font-black text-[14px] uppercase tracking-tighter group-hover:text-primary transition-colors">{p.name}</h4>
                        <p className="text-[9px] text-muted-foreground font-black uppercase mt-1 tracking-widest">{p.category}</p>
                      </div>
                      <div className="text-right relative z-10">
                        <p className="text-2xl font-black text-primary tracking-tighter">{p.stock}</p>
                        <p className="text-[8px] text-primary/70 font-black uppercase tracking-widest">Available</p>
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
