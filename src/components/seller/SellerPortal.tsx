
"use client";

import { useState, useMemo } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { 
  ShoppingCart, 
  Banknote, 
  Package, 
  Plus, 
  Search, 
  Trash2, 
  Loader2,
  Zap,
  Edit3,
  History,
  Calendar,
  AlertCircle
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useFirestore, useUser, useCollection } from "@/firebase";
import { collection, addDoc, serverTimestamp, query, orderBy, deleteDoc, doc, where, Timestamp, updateDoc } from "firebase/firestore";
import { errorEmitter } from "@/firebase/error-emitter";
import { FirestorePermissionError } from "@/firebase/errors";
import { startOfDay, isAfter, subDays, format } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";

export function SellerPortal() {
  const { toast } = useToast();
  const { firestore } = useFirestore();
  const { user } = useUser();
  const [lang, setLang] = useState<"bn" | "en">("en");
  const [cart, setCart] = useState<{ id: string; name: string; price: number; qty: number }[]>([]);
  
  // POS Form State
  const [quickItemName, setQuickItemName] = useState("");
  const [quickItemPrice, setQuickItemPrice] = useState("");

  // Product Management State
  const [newProductName, setNewProductName] = useState("");
  const [newProductPrice, setNewProductPrice] = useState("");
  const [newProductCategory, setNewProductCategory] = useState("Essentials");

  // Expense form state
  const [expenseDesc, setExpenseDesc] = useState("");
  const [expenseAmount, setExpenseAmount] = useState("");
  const [expenseCat, setExpenseCat] = useState("Operations");

  // Edit record state
  const [editingRecord, setEditingRecord] = useState<any>(null);
  const [editValue, setEditValue] = useState("");

  // Fetch Live Inventory
  const productsQuery = useMemo(() => {
    if (!firestore) return null;
    return query(collection(firestore, "products"), orderBy("name", "asc"));
  }, [firestore]);

  const { data: products, loading: productsLoading } = useCollection(productsQuery);

  // Fetch Seller's Sales for ledger (last 7 days)
  const salesQuery = useMemo(() => {
    if (!firestore || !user) return null;
    return query(
      collection(firestore, "sales"), 
      where("sellerId", "==", user.uid),
      orderBy("timestamp", "desc")
    );
  }, [firestore, user]);

  const { data: sellerSales } = useCollection(salesQuery);

  // Fetch Seller's Expenses for ledger (last 7 days)
  const expensesQuery = useMemo(() => {
    if (!firestore || !user) return null;
    return query(
      collection(firestore, "expenses"),
      where("sellerId", "==", user.uid),
      orderBy("timestamp", "desc")
    );
  }, [firestore, user]);

  const { data: sellerExpenses } = useCollection(expensesQuery);

  const stats = useMemo(() => {
    const today = startOfDay(new Date());
    const sevenDaysAgo = subDays(today, 7);

    const filteredSales = sellerSales?.filter(s => {
      const ts = s.timestamp as Timestamp;
      return ts && isAfter(ts.toDate(), sevenDaysAgo);
    }) || [];

    const filteredExpenses = sellerExpenses?.filter(e => {
      const ts = e.timestamp as Timestamp;
      return ts && isAfter(ts.toDate(), sevenDaysAgo);
    }) || [];

    const todayTotal = filteredSales.filter(s => {
      const ts = s.timestamp as Timestamp;
      return ts && isAfter(ts.toDate(), today);
    }).reduce((acc, s) => acc + (s.total || 0), 0);

    return {
      todayTotal,
      todayCount: filteredSales.filter(s => isAfter((s.timestamp as Timestamp).toDate(), today)).length,
      recentSales: filteredSales,
      recentExpenses: filteredExpenses
    };
  }, [sellerSales, sellerExpenses]);

  const t = {
    bn: {
      sales: "দৈনিক বিক্রি",
      expenses: "খরচ হিসাব",
      inventory: "স্টক ও পণ্য",
      ledger: "৭ দিনের হিসাব",
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
      checkout: "চেকআউট",
      quickAdd: "দ্রুত পণ্য যোগ / মূল্য পরিবর্তন",
      manageProducts: "পণ্য পরিচালনা",
      performance: "আজকের পারফরম্যান্স",
      adjustHint: "পণ্যে ক্লিক করে দাম পরিবর্তন করুন",
      history: "লেনদেনের তালিকা",
      edit: "সম্পাদনা",
      delete: "মুছে ফেলুন"
    },
    en: {
      sales: "Daily Sales",
      expenses: "Daily Expenses",
      inventory: "Stock & Products",
      ledger: "7-Day Ledger",
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
      checkout: "Checkout",
      quickAdd: "Quick Entry / Manual Price",
      manageProducts: "Manage Products",
      performance: "Today's Performance",
      adjustHint: "Click product to adjust price manually",
      history: "Transaction History",
      edit: "Edit Record",
      delete: "Delete"
    }
  }[lang];

  const handleProductSelect = (product: { name: string, price: number }) => {
    setQuickItemName(product.name);
    setQuickItemPrice(product.price.toString());
    toast({
      title: "Product Selected",
      description: "Adjust name or price manually below.",
      duration: 1500
    });
  };

  const handleQuickAdd = () => {
    if (!quickItemName || !quickItemPrice) return;
    const item = {
      id: `manual-${Date.now()}`,
      name: quickItemName,
      price: parseFloat(quickItemPrice),
      qty: 1
    };
    setCart([...cart, item]);
    setQuickItemName("");
    setQuickItemPrice("");
    toast({
      title: "Item Added to Cart",
      description: `${item.name} @ ৳${item.price}`,
      duration: 1000
    });
  };

  const updateCartItem = (idx: number, updates: Partial<{ price: number, qty: number }>) => {
    const newCart = [...cart];
    newCart[idx] = { ...newCart[idx], ...updates };
    setCart(newCart);
  };

  const handleCheckout = async () => {
    if (!firestore || !user) return;

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
          title: lang === "bn" ? "সফল হয়েছে" : "Sale Recorded",
          description: lang === "bn" ? "বিক্রি রেকর্ড করা হয়েছে" : `৳${total.toLocaleString()} added to daily work ledger.`,
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

  const handleAddProduct = () => {
    if (!firestore || !newProductName || !newProductPrice) return;
    const productData = {
      name: newProductName,
      price: parseFloat(newProductPrice),
      category: newProductCategory,
      stock: 0,
      timestamp: serverTimestamp()
    };
    addDoc(collection(firestore, "products"), productData)
      .then(() => {
        toast({ title: "Product Catalog Updated", description: `${newProductName} is now live.` });
        setNewProductName("");
        setNewProductPrice("");
      })
      .catch(async (err) => {
        const pErr = new FirestorePermissionError({
          path: "products",
          operation: "create",
          requestResourceData: productData
        });
        errorEmitter.emit("permission-error", pErr);
      });
  };

  const handleDeleteProduct = (id: string) => {
    if (!firestore) return;
    deleteDoc(doc(firestore, "products", id));
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
        toast({ title: "Expense Recorded", description: "Ledger updated." });
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

  const handleDeleteRecord = async (type: "sales" | "expenses", id: string) => {
    if (!firestore) return;
    deleteDoc(doc(firestore, type, id))
      .then(() => {
        toast({ title: "Record Deleted", description: "The entry has been removed from your ledger." });
      });
  };

  const handleUpdateRecord = async () => {
    if (!firestore || !editingRecord || !editValue || !user) return;
    
    const type = editingRecord.type === "sale" ? "sales" : "expenses";
    const ref = doc(firestore, type, editingRecord.id);
    const val = parseFloat(editValue);

    const updates = type === "sales" 
      ? { total: val, updatedAt: serverTimestamp(), updatedBy: user.displayName || user.email }
      : { amount: val, updatedAt: serverTimestamp(), updatedBy: user.displayName || user.email };

    updateDoc(ref, updates).then(() => {
      toast({ title: "Record Updated", description: "Audit trail has been updated for admin review." });
      setEditingRecord(null);
      setEditValue("");
    });
  };

  return (
    <div className="space-y-6">
      {/* Header & Performance Metrics */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
        <div>
          <h2 className="text-2xl font-black font-headline tracking-tighter uppercase flex items-center gap-3">
            <Zap className="text-primary fill-primary" />
            {lang === "bn" ? "বিক্রেতা ড্যাশবোর্ড" : "SELLER POS CORE"}
          </h2>
          <p className="text-muted-foreground text-[10px] font-black uppercase tracking-[0.2em] mt-1">Operational Intelligence Node</p>
        </div>

        <div className="flex items-center gap-4 w-full md:w-auto">
          <Card className="glass-morphism px-6 py-3 flex items-center gap-4 rounded-2xl border-none shadow-lg">
            <div className="text-right">
              <p className="text-[8px] font-black text-muted-foreground uppercase tracking-widest">{t.performance}</p>
              <p className="text-xl font-black text-primary tracking-tighter">৳{stats.todayTotal.toLocaleString()}</p>
            </div>
            <div className="w-px h-8 bg-border" />
            <div className="text-right">
              <p className="text-[8px] font-black text-muted-foreground uppercase tracking-widest">{lang === 'bn' ? 'বিক্রি' : 'TXNS'}</p>
              <p className="text-xl font-black text-foreground tracking-tighter">{stats.todayCount}</p>
            </div>
          </Card>
          
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setLang(lang === "bn" ? "en" : "bn")}
            className="rounded-2xl font-black text-[10px] uppercase border-border h-12 px-6"
          >
            {lang === "bn" ? "English" : "বাংলা"}
          </Button>
        </div>
      </div>

      <Tabs defaultValue="sales" className="w-full">
        <TabsList className="grid w-full grid-cols-4 bg-muted border border-border p-1 mb-8 h-14 rounded-2xl">
          <TabsTrigger value="sales" className="rounded-xl font-black text-[10px] uppercase tracking-widest data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all">
            <ShoppingCart className="mr-2" size={16} /> {t.sales}
          </TabsTrigger>
          <TabsTrigger value="expenses" className="rounded-xl font-black text-[10px] uppercase tracking-widest data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all">
            <Banknote className="mr-2" size={16} /> {t.expenses}
          </TabsTrigger>
          <TabsTrigger value="inventory" className="rounded-xl font-black text-[10px] uppercase tracking-widest data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all">
            <Package className="mr-2" size={16} /> {t.inventory}
          </TabsTrigger>
          <TabsTrigger value="ledger" className="rounded-xl font-black text-[10px] uppercase tracking-widest data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all">
            <History className="mr-2" size={16} /> {t.ledger}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="sales">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <Card className="glass-morphism border-t-4 border-primary shadow-xl">
                <CardHeader className="pb-4">
                  <div className="flex justify-between items-center">
                    <CardTitle className="text-xs font-black uppercase tracking-[0.2em] flex items-center gap-2">
                      <Edit3 size={16} className="text-primary" /> {t.quickAdd}
                    </CardTitle>
                    <span className="text-[9px] font-black text-primary/60 uppercase bg-primary/5 px-3 py-1 rounded-full border border-primary/10">
                      {t.adjustHint}
                    </span>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-[2]">
                      <Label className="text-[9px] font-black uppercase text-muted-foreground ml-1 mb-2 block">Item Name</Label>
                      <Input 
                        placeholder={t.productName} 
                        value={quickItemName} 
                        onChange={(e) => setQuickItemName(e.target.value)}
                        className="bg-muted border-border font-black h-12 rounded-xl"
                      />
                    </div>
                    <div className="flex-1">
                      <Label className="text-[9px] font-black uppercase text-muted-foreground ml-1 mb-2 block">Manual Price (৳)</Label>
                      <Input 
                        type="number" 
                        placeholder={t.price} 
                        value={quickItemPrice} 
                        onChange={(e) => setQuickItemPrice(e.target.value)}
                        className="bg-muted border-border font-black h-12 rounded-xl text-primary"
                      />
                    </div>
                    <div className="flex items-end">
                      <Button onClick={handleQuickAdd} className="bg-primary hover:bg-primary/90 rounded-xl h-12 px-10 shadow-lg">
                        <Plus size={20} className="mr-2" />
                        <span className="font-black uppercase tracking-widest text-[10px]">Add to Cart</span>
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="glass-morphism border-t-4 border-muted">
                <CardHeader>
                  <CardTitle className="text-xs font-black uppercase tracking-widest flex items-center gap-2">
                    <Search size={16} className="text-primary" /> {t.addSale}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {productsLoading ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-4">
                      <Loader2 className="animate-spin text-primary" size={32} />
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {products?.map((prod: any) => (
                        <Button 
                          key={prod.id} 
                          variant="ghost" 
                          onClick={() => handleProductSelect(prod)}
                          className="h-32 flex flex-col items-center justify-center border border-border hover:border-primary hover:bg-primary/5 transition-all rounded-2xl shadow-sm group"
                        >
                          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-3">
                            <Package size={20} className="text-primary" />
                          </div>
                          <span className="text-[10px] font-black uppercase text-center leading-tight mb-1">{prod.name}</span>
                          <span className="text-[12px] font-black text-primary">৳{prod.price}</span>
                        </Button>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <Card className="glass-morphism border-t-4 border-secondary flex flex-col h-full shadow-2xl">
              <CardHeader>
                <CardTitle className="text-lg font-black uppercase tracking-widest flex items-center justify-between">
                  {t.cart}
                  <span className="text-[10px] bg-secondary/10 text-secondary px-3 py-1 rounded-full font-black">
                    {cart.reduce((a, b) => a + b.qty, 0)} ITEMS
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 flex-1">
                <div className="max-h-[450px] overflow-y-auto space-y-3 pr-2 scrollbar-hide">
                  {cart.map((item, idx) => (
                    <div key={idx} className="bg-muted/40 p-4 rounded-xl border border-border">
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex-1">
                          <p className="text-[11px] font-black uppercase leading-none mb-1">{item.name}</p>
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => {
                          const newCart = [...cart];
                          newCart.splice(idx, 1);
                          setCart(newCart);
                        }} className="text-destructive h-8 w-8 hover:bg-destructive/10 rounded-lg">
                          <Trash2 size={14} />
                        </Button>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label className="text-[8px] font-black uppercase text-muted-foreground ml-1">Price (৳)</Label>
                          <Input 
                            type="number"
                            value={item.price}
                            onChange={(e) => updateCartItem(idx, { price: parseFloat(e.target.value) || 0 })}
                            className="h-8 rounded-lg bg-background border-border text-[10px] font-black"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[8px] font-black uppercase text-muted-foreground ml-1">Quantity</Label>
                          <Input 
                            type="number"
                            value={item.qty}
                            onChange={(e) => updateCartItem(idx, { qty: parseInt(e.target.value) || 0 })}
                            className="h-8 rounded-lg bg-background border-border text-[10px] font-black"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="border-t border-border pt-6 space-y-4">
                  <div className="flex justify-between text-2xl font-black uppercase tracking-tighter">
                    <span>{t.total}</span>
                    <span className="text-primary">৳{cart.reduce((acc, curr) => acc + curr.price * curr.qty, 0).toLocaleString()}</span>
                  </div>
                  <Button 
                    className="w-full bg-primary text-primary-foreground font-black py-8 rounded-2xl shadow-xl hover:scale-[1.02] transition-all uppercase tracking-[0.2em] text-sm" 
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
          <Card className="glass-morphism max-w-2xl mx-auto border-t-4 border-destructive shadow-xl">
            <CardHeader>
              <CardTitle className="text-lg font-black uppercase tracking-widest">{t.addExpense}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-muted-foreground">Description</Label>
                <Input value={expenseDesc} onChange={(e) => setExpenseDesc(e.target.value)} placeholder="Rent, Electricity, Supplies..." className="bg-muted border-border font-bold h-12 rounded-xl" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-muted-foreground">{t.amount}</Label>
                  <Input type="number" value={expenseAmount} onChange={(e) => setExpenseAmount(e.target.value)} placeholder="0.00" className="bg-muted border-border font-bold h-12 rounded-xl" />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-muted-foreground">{t.category}</Label>
                  <Select value={expenseCat} onValueChange={setExpenseCat}>
                    <SelectTrigger className="bg-muted border-border h-12 rounded-xl">
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
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="glass-morphism border-t-4 border-primary">
              <CardHeader>
                <CardTitle className="text-xs font-black uppercase tracking-widest flex items-center gap-2 text-primary">
                  <Plus size={16} /> {t.manageProducts}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase">Item Name</Label>
                  <Input value={newProductName} onChange={(e) => setNewProductName(e.target.value)} placeholder="e.g., Organic Rice" className="bg-muted border-border h-12 rounded-xl font-bold" />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase">Selling Price (৳)</Label>
                  <Input type="number" value={newProductPrice} onChange={(e) => setNewProductPrice(e.target.value)} placeholder="0.00" className="bg-muted border-border h-12 rounded-xl font-bold" />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase">Category</Label>
                  <Select value={newProductCategory} onValueChange={setNewProductCategory}>
                    <SelectTrigger className="bg-muted border-border h-12 rounded-xl font-bold">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Essentials">Essentials</SelectItem>
                      <SelectItem value="Beverage">Beverage</SelectItem>
                      <SelectItem value="Premium">Premium</SelectItem>
                      <SelectItem value="Snacks">Snacks</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={handleAddProduct} className="w-full bg-primary font-black uppercase h-14 rounded-2xl shadow-lg tracking-widest">
                  Deploy to POS
                </Button>
              </CardContent>
            </Card>

            <div className="lg:col-span-2 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {products?.map((p: any) => (
                  <Card key={p.id} className="glass-morphism border-border hover:border-primary transition-all group overflow-hidden relative">
                    <CardContent className="p-8 flex justify-between items-center relative z-10">
                      <div>
                        <h4 className="font-black text-[14px] uppercase tracking-tighter">{p.name}</h4>
                        <p className="text-[9px] text-muted-foreground font-black uppercase mt-1 tracking-widest">{p.category}</p>
                        <div className="mt-4 flex items-center gap-4">
                           <p className="text-lg font-black text-primary tracking-tighter">৳{p.price}</p>
                        </div>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => handleDeleteProduct(p.id)}
                        className="text-destructive h-10 w-10 border border-transparent hover:border-destructive/20 rounded-xl"
                      >
                        <Trash2 size={16} />
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="ledger">
          <Card className="glass-morphism border-t-4 border-secondary shadow-2xl">
            <CardHeader>
              <CardTitle className="text-xs font-black uppercase tracking-widest flex items-center gap-2">
                <History size={16} className="text-secondary" /> {t.history}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="max-h-[600px] overflow-y-auto">
                <div className="p-4 bg-muted/30 border-b border-border text-[9px] font-black text-muted-foreground uppercase flex items-center gap-2">
                  <Calendar size={12} /> Last 7 Days Ledger
                </div>
                {/* Unified List of Sales and Expenses */}
                {[...(stats.recentSales || []).map(s => ({...s, type: 'sale'})), ...(stats.recentExpenses || []).map(e => ({...e, type: 'expense'}))]
                  .sort((a, b) => (b.timestamp as any)?.toDate() - (a.timestamp as any)?.toDate())
                  .map((record: any) => (
                    <div key={record.id} className="flex flex-col md:flex-row md:items-center justify-between p-6 border-b border-border/30 hover:bg-muted/30 transition-all gap-4">
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${record.type === 'sale' ? 'bg-primary/10 text-primary' : 'bg-destructive/10 text-destructive'}`}>
                          {record.type === 'sale' ? <ShoppingCart size={20} /> : <Banknote size={20} />}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-black uppercase tracking-tighter">
                              {record.type === 'sale' ? 'Sale Record' : (record.description || record.category)}
                            </p>
                            {record.updatedAt && (
                              <span className="text-[8px] bg-secondary/10 text-secondary px-2 py-0.5 rounded-full font-black flex items-center gap-1">
                                <AlertCircle size={8} /> MODIFIED
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] font-bold text-muted-foreground uppercase mt-1">
                            {record.timestamp?.toDate()?.toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-6">
                        <div className="text-right">
                          <p className={`text-lg font-black ${record.type === 'sale' ? 'text-primary' : 'text-destructive'}`}>
                            {record.type === 'sale' ? `+৳${record.total}` : `-৳${record.amount}`}
                          </p>
                          <div className="flex gap-2 mt-1">
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  className="h-7 text-[9px] font-black uppercase tracking-widest text-secondary hover:bg-secondary/10"
                                  onClick={() => {
                                    setEditingRecord(record);
                                    setEditValue((record.type === 'sale' ? record.total : record.amount).toString());
                                  }}
                                >
                                  {t.edit}
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="glass-morphism border-t-4 border-secondary">
                                <DialogHeader>
                                  <DialogTitle className="text-sm font-black uppercase tracking-widest">Adjust Ledger Entry</DialogTitle>
                                </DialogHeader>
                                <div className="py-4 space-y-4">
                                  <div className="space-y-2">
                                    <Label className="text-[10px] font-black uppercase">{record.type === 'sale' ? 'Sale Total' : 'Expense Amount'}</Label>
                                    <Input 
                                      type="number" 
                                      value={editValue} 
                                      onChange={(e) => setEditValue(e.target.value)} 
                                      className="bg-muted font-black"
                                    />
                                  </div>
                                  <p className="text-[9px] text-muted-foreground font-bold uppercase border-l-2 border-primary/20 pl-3">
                                    Note: Changes will be logged with your identity for administrative auditing.
                                  </p>
                                </div>
                                <DialogFooter>
                                  <Button onClick={handleUpdateRecord} className="w-full bg-secondary font-black uppercase">Finalize Adjustment</Button>
                                </DialogFooter>
                              </DialogContent>
                            </Dialog>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-7 text-[9px] font-black uppercase tracking-widest text-destructive hover:bg-destructive/10"
                              onClick={() => handleDeleteRecord(record.type === 'sale' ? 'sales' : 'expenses', record.id)}
                            >
                              {t.delete}
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  {(!stats.recentSales.length && !stats.recentExpenses.length) && (
                    <div className="flex flex-col items-center justify-center py-40 opacity-20">
                      <History size={60} className="mb-6" />
                      <p className="text-xs font-black uppercase tracking-[0.3em]">No Recent Activity</p>
                    </div>
                  )}
                </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
