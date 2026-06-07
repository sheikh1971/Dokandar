
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
  Calendar as CalendarIcon,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  DollarSign,
  CheckCircle2
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useFirestore, useUser, useCollection } from "@/firebase";
import { collection, addDoc, serverTimestamp, query, orderBy, deleteDoc, doc, where, Timestamp, updateDoc } from "firebase/firestore";
import { errorEmitter } from "@/firebase/error-emitter";
import { FirestorePermissionError, type SecurityRuleContext } from "@/firebase/errors";
import { startOfDay, isAfter, subDays, format } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

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

  // Manual Past Entry State
  const [isPastEntryOpen, setIsPastEntryOpen] = useState(false);
  const [pastEntryDate, setPastEntryDate] = useState<Date>(new Date());
  const [pastEntryType, setPastEntryType] = useState<"sale" | "expense">("sale");
  const [pastEntryAmount, setPastEntryAmount] = useState("");
  const [pastEntryDesc, setPastEntryDesc] = useState("");

  const productsQuery = useMemo(() => {
    if (!firestore) return null;
    return query(collection(firestore, "products"), orderBy("name", "asc"));
  }, [firestore]);

  const { data: products, loading: productsLoading } = useCollection(productsQuery);

  const salesQuery = useMemo(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, "sales"), where("sellerId", "==", user.uid));
  }, [firestore, user]);

  const expensesQuery = useMemo(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, "expenses"), where("sellerId", "==", user.uid));
  }, [firestore, user]);

  const { data: sellerSales } = useCollection(salesQuery);
  const { data: sellerExpenses } = useCollection(expensesQuery);

  const stats = useMemo(() => {
    const today = startOfDay(new Date());
    const sevenDaysAgo = subDays(today, 7);

    const recentSales = (sellerSales || []).filter(s => {
      const ts = s.timestamp as Timestamp;
      return ts && isAfter(ts.toDate(), sevenDaysAgo);
    }).sort((a, b) => (b.timestamp as any)?.toDate() - (a.timestamp as any)?.toDate());

    const recentExpenses = (sellerExpenses || []).filter(e => {
      const ts = e.timestamp as Timestamp;
      return ts && isAfter(ts.toDate(), sevenDaysAgo);
    }).sort((a, b) => (b.timestamp as any)?.toDate() - (a.timestamp as any)?.toDate());

    const todayTotal = recentSales.filter(s => {
      const ts = s.timestamp as Timestamp;
      return ts && isAfter(ts.toDate(), today);
    }).reduce((acc, s) => acc + (s.total || 0), 0);

    const weekRevenue = recentSales.reduce((acc, s) => acc + (s.total || 0), 0);
    const weekExpenses = recentExpenses.reduce((acc, e) => acc + (e.amount || 0), 0);

    return {
      todayTotal,
      todayCount: recentSales.filter(s => isAfter((s.timestamp as Timestamp).toDate(), today)).length,
      weekRevenue,
      weekExpenses,
      netProfit: weekRevenue - weekExpenses,
      recentSales,
      recentExpenses
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
      performance: "আজকের পারফরম্যান্স",
      history: "লেনদেনের তালিকা",
      edit: "সম্পাদনা",
      delete: "মুছে ফেলুন",
      addMissing: "পুরানো হিসাব যুক্ত করুন",
      deployProduct: "পণ্য যুক্ত করুন"
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
      performance: "Today's Performance",
      history: "Transaction History",
      edit: "Edit Record",
      delete: "Delete",
      addMissing: "Add Missing Entry",
      deployProduct: "Deploy Product"
    }
  }[lang];

  const handleProductSelect = (product: any) => {
    setQuickItemName(product.name);
    setQuickItemPrice(product.price.toString());
    
    const newItem = {
      id: `auto-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: product.name,
      price: product.price,
      qty: 1
    };
    setCart(prev => [...prev, newItem]);
    
    toast({
      title: "Added to Cart",
      description: `${product.name} added at ৳${product.price}`,
      duration: 1000
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
  };

  const handleCheckout = async () => {
    if (!firestore || !user) return;
    const total = cart.reduce((a, b) => a + b.price * b.qty, 0);
    const saleData = {
      items: cart,
      total,
      timestamp: serverTimestamp(),
      sellerId: user.uid,
      sellerName: user.displayName || user.email?.split('@')[0] || "Staff"
    };

    addDoc(collection(firestore, "sales"), saleData)
      .then(() => {
        toast({ title: "Sale Recorded", description: `৳${total.toLocaleString()} confirmed.` });
        setCart([]);
      })
      .catch(async () => {
        errorEmitter.emit("permission-error", new FirestorePermissionError({
          path: "sales", operation: "create", requestResourceData: saleData
        }));
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
        toast({ title: "Expense Saved", description: "Ledger updated." });
        setExpenseDesc("");
        setExpenseAmount("");
      })
      .catch(async () => {
        errorEmitter.emit("permission-error", new FirestorePermissionError({
          path: "expenses", operation: "create", requestResourceData: expenseData
        }));
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
        toast({ title: "Catalog Updated", description: `${newProductName} deployed.` });
        setNewProductName("");
        setNewProductPrice("");
      })
      .catch(async () => {
        errorEmitter.emit("permission-error", new FirestorePermissionError({
          path: "products", operation: "create", requestResourceData: productData
        }));
      });
  };

  const handleDeleteProduct = (id: string) => {
    if (!firestore) return;
    deleteDoc(doc(firestore, "products", id))
      .catch(async () => {
        errorEmitter.emit("permission-error", new FirestorePermissionError({
          path: `products/${id}`, operation: "delete"
        }));
      });
  };

  const handleAddPastEntry = async () => {
    if (!firestore || !user || !pastEntryAmount || !pastEntryDesc) return;
    const isSale = pastEntryType === "sale";
    const collectionName = isSale ? "sales" : "expenses";
    const entryData = isSale ? {
      total: parseFloat(pastEntryAmount),
      items: [{ name: pastEntryDesc, price: parseFloat(pastEntryAmount), qty: 1 }],
      timestamp: Timestamp.fromDate(pastEntryDate),
      sellerId: user.uid,
      sellerName: user.displayName || user.email?.split('@')[0] || "Staff"
    } : {
      amount: parseFloat(pastEntryAmount),
      description: pastEntryDesc,
      category: "Manual Entry",
      timestamp: Timestamp.fromDate(pastEntryDate),
      sellerId: user.uid
    };

    addDoc(collection(firestore, collectionName), entryData)
      .then(() => {
        toast({ title: "Audit Success", description: "Record backfilled." });
        setIsPastEntryOpen(false);
      })
      .catch(async () => {
        errorEmitter.emit("permission-error", new FirestorePermissionError({
          path: collectionName, operation: "create", requestResourceData: entryData
        }));
      });
  };

  const handleDeleteRecord = async (type: string, id: string) => {
    if (!firestore) return;
    const collectionName = type === 'sale' ? 'sales' : 'expenses';
    deleteDoc(doc(firestore, collectionName, id))
      .then(() => toast({ title: "Record Purged" }))
      .catch(async () => {
        errorEmitter.emit("permission-error", new FirestorePermissionError({
          path: `${collectionName}/${id}`, operation: "delete"
        }));
      });
  };

  const handleUpdateRecord = async () => {
    if (!firestore || !editingRecord || !editValue || !user) return;
    const type = editingRecord.type === "sale" ? "sales" : "expenses";
    const ref = doc(firestore, type, editingRecord.id);
    const val = parseFloat(editValue);
    const updates = type === "sales" 
      ? { total: val, updatedAt: serverTimestamp(), updatedBy: user.email }
      : { amount: val, updatedAt: serverTimestamp(), updatedBy: user.email };

    updateDoc(ref, updates).then(() => {
      toast({ title: "Audit Trail Updated" });
      setEditingRecord(null);
    }).catch(async () => {
      errorEmitter.emit("permission-error", new FirestorePermissionError({
        path: `${type}/${editingRecord.id}`, operation: "update", requestResourceData: updates
      } satisfies SecurityRuleContext));
    });
  };

  return (
    <div className="space-y-6">
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
              <p className="text-[8px] font-black text-muted-foreground uppercase tracking-widest">TXNS</p>
              <p className="text-xl font-black text-foreground tracking-tighter">{stats.todayCount}</p>
            </div>
          </Card>
          
          <Button variant="outline" size="sm" onClick={() => setLang(lang === "bn" ? "en" : "bn")} className="rounded-2xl font-black text-[10px] uppercase border-border h-12 px-6">
            {lang === "bn" ? "English" : "বাংলা"}
          </Button>
        </div>
      </div>

      <Tabs defaultValue="sales" className="w-full">
        <TabsList className="grid w-full grid-cols-4 bg-muted border border-border p-1 mb-8 h-14 rounded-2xl">
          <TabsTrigger value="sales" className="rounded-xl font-black text-[10px] uppercase tracking-widest data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <ShoppingCart className="mr-2" size={16} /> {t.sales}
          </TabsTrigger>
          <TabsTrigger value="expenses" className="rounded-xl font-black text-[10px] uppercase tracking-widest data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Banknote className="mr-2" size={16} /> {t.expenses}
          </TabsTrigger>
          <TabsTrigger value="inventory" className="rounded-xl font-black text-[10px] uppercase tracking-widest data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Package className="mr-2" size={16} /> {t.inventory}
          </TabsTrigger>
          <TabsTrigger value="ledger" className="rounded-xl font-black text-[10px] uppercase tracking-widest data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <History className="mr-2" size={16} /> {t.ledger}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="sales">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <Card className="glass-morphism border-t-4 border-primary">
                <CardHeader><CardTitle className="text-xs font-black uppercase tracking-[0.2em]">{t.quickAdd}</CardTitle></CardHeader>
                <CardContent>
                  <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-[2]">
                      <Label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Item Name</Label>
                      <Input value={quickItemName} onChange={(e) => setQuickItemName(e.target.value)} className="bg-muted border-border font-black h-12 rounded-xl" />
                    </div>
                    <div className="flex-1">
                      <Label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Manual Price (৳)</Label>
                      <Input type="number" value={quickItemPrice} onChange={(e) => setQuickItemPrice(e.target.value)} className="bg-muted border-border font-black h-12 rounded-xl text-primary" />
                    </div>
                    <Button onClick={handleQuickAdd} className="bg-primary hover:bg-primary/90 rounded-xl h-12 px-10 self-end font-black uppercase tracking-widest text-[10px]">Add to Cart</Button>
                  </div>
                </CardContent>
              </Card>

              <Card className="glass-morphism border-t-4 border-muted">
                <CardContent className="pt-6">
                  {productsLoading ? <div className="flex justify-center py-20"><Loader2 className="animate-spin text-primary" size={32} /></div> : (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {products?.map((prod: any) => (
                        <Button key={prod.id} variant="ghost" onClick={() => handleProductSelect(prod)} className="h-32 flex flex-col border border-border hover:border-primary hover:bg-primary/5 rounded-2xl shadow-sm group">
                          <Package size={20} className="text-primary mb-2" />
                          <span className="text-[10px] font-black uppercase">{prod.name}</span>
                          <span className="text-[12px] font-black text-primary mt-1">৳{prod.price}</span>
                        </Button>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <Card className="glass-morphism border-t-4 border-secondary flex flex-col h-full shadow-2xl">
              <CardHeader><CardTitle className="text-lg font-black uppercase tracking-widest flex justify-between">{t.cart} <span className="text-[10px] bg-secondary/10 text-secondary px-3 py-1 rounded-full">{cart.length} ITEMS</span></CardTitle></CardHeader>
              <CardContent className="space-y-4 flex-1">
                <div className="max-h-[450px] overflow-y-auto space-y-3 pr-2 scrollbar-hide">
                  {cart.map((item, idx) => (
                    <div key={item.id} className="bg-muted/40 p-4 rounded-xl border border-border">
                      <div className="flex justify-between items-start mb-2">
                        <p className="text-[11px] font-black uppercase">{item.name}</p>
                        <Button variant="ghost" size="icon" onClick={() => setCart(cart.filter((_, i) => i !== idx))} className="text-destructive h-8 w-8 hover:bg-destructive/10"><Trash2 size={14} /></Button>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label className="text-[8px] font-black uppercase text-muted-foreground">Price</Label>
                          <Input type="number" value={item.price} onChange={(e) => {
                            const n = [...cart]; n[idx].price = parseFloat(e.target.value) || 0; setCart(n);
                          }} className="h-8 text-[10px] font-black bg-white" />
                        </div>
                        <div>
                          <Label className="text-[8px] font-black uppercase text-muted-foreground">Qty</Label>
                          <Input type="number" value={item.qty} onChange={(e) => {
                            const n = [...cart]; n[idx].qty = parseInt(e.target.value) || 0; setCart(n);
                          }} className="h-8 text-[10px] font-black bg-white" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="border-t pt-6 space-y-4">
                  <div className="flex justify-between text-2xl font-black tracking-tighter">
                    <span>{t.total}</span><span className="text-primary">৳{cart.reduce((a, b) => a + b.price * b.qty, 0).toLocaleString()}</span>
                  </div>
                  <Button className="w-full bg-primary py-8 rounded-2xl shadow-xl font-black uppercase tracking-widest" disabled={cart.length === 0} onClick={handleCheckout}>{t.checkout}</Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="expenses">
          <Card className="glass-morphism max-w-2xl mx-auto border-t-4 border-destructive">
            <CardHeader><CardTitle className="text-lg font-black uppercase tracking-widest">{t.addExpense}</CardTitle></CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-muted-foreground">Description</Label>
                <Input value={expenseDesc} onChange={(e) => setExpenseDesc(e.target.value)} placeholder="Rent, Supplies..." className="bg-muted/30 border-border h-12 rounded-xl font-black" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-muted-foreground">Amount</Label>
                  <Input type="number" value={expenseAmount} onChange={(e) => setExpenseAmount(e.target.value)} placeholder="0.00" className="bg-muted/30 border-border h-12 rounded-xl font-black text-destructive" />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-muted-foreground">Category</Label>
                  <Select value={expenseCat} onValueChange={setExpenseCat}>
                    <SelectTrigger className="bg-muted border-border h-12 rounded-xl font-black"><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="Operations">Operations</SelectItem><SelectItem value="Rent">Rent</SelectItem><SelectItem value="Other">Other</SelectItem></SelectContent>
                  </Select>
                </div>
              </div>
              <Button onClick={handleSubmitExpense} className="w-full bg-destructive text-destructive-foreground font-black py-8 rounded-2xl hover:bg-destructive/90 uppercase tracking-widest shadow-lg">
                <Plus className="mr-2" size={16} /> {t.submit}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="inventory" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="glass-morphism border-t-4 border-primary">
              <CardHeader><CardTitle className="text-sm font-black text-primary uppercase tracking-widest">Add Product</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest">Item Name</Label>
                  <Input value={newProductName} onChange={(e) => setNewProductName(e.target.value)} placeholder="New Item" className="bg-muted border-border h-12 rounded-xl font-black" />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest">Price (৳)</Label>
                  <Input type="number" value={newProductPrice} onChange={(e) => setNewProductPrice(e.target.value)} placeholder="0.00" className="bg-muted border-border h-12 rounded-xl font-black text-primary" />
                </div>
                <Button onClick={handleAddProduct} className="w-full bg-primary font-black uppercase tracking-widest h-14 rounded-2xl shadow-xl">Deploy Product</Button>
              </CardContent>
            </Card>

            <Card className="lg:col-span-2 glass-morphism">
              <CardHeader><CardTitle className="text-sm font-black uppercase tracking-widest">Active Catalog</CardTitle></CardHeader>
              <CardContent className="p-0">
                <div className="max-h-[500px] overflow-y-auto">
                  {products?.map((p: any) => (
                    <div key={p.id} className="flex justify-between items-center p-4 border-b border-border/30 hover:bg-muted/50 transition-colors">
                      <div><p className="text-sm font-black uppercase">{p.name}</p><p className="text-[10px] font-bold text-muted-foreground uppercase">{p.category}</p></div>
                      <div className="flex items-center gap-6"><p className="text-sm font-black text-primary">৳{p.price}</p><Button variant="ghost" size="icon" onClick={() => handleDeleteProduct(p.id)} className="text-destructive h-10 w-10"><Trash2 size={16} /></Button></div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="ledger">
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <LedgerStatCard label="7D Revenue" value={stats.weekRevenue} icon={<TrendingUp />} color="primary" />
              <LedgerStatCard label="7D Expenses" value={stats.weekExpenses} icon={<TrendingDown />} color="destructive" />
              <LedgerStatCard label="7D Profit" value={stats.netProfit} icon={<DollarSign />} color="secondary" />
            </div>

            <Card className="glass-morphism border-t-4 border-secondary shadow-xl overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between border-b bg-secondary/5 py-4">
                <CardTitle className="text-sm font-black uppercase tracking-widest">{t.history}</CardTitle>
                <Dialog open={isPastEntryOpen} onOpenChange={setIsPastEntryOpen}>
                  <DialogTrigger asChild><Button variant="outline" size="sm" className="font-black text-[10px] uppercase border-secondary text-secondary h-10 px-5 rounded-xl"><Plus className="mr-2" size={14} /> {t.addMissing}</Button></DialogTrigger>
                  <DialogContent className="glass-morphism border-t-4 border-secondary">
                    <DialogHeader><DialogTitle className="text-sm font-black uppercase tracking-[0.2em]">Audit Adjustment Entry</DialogTitle></DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase text-muted-foreground">Original Transaction Date</Label>
                        <Popover><PopoverTrigger asChild><Button variant="outline" className="w-full justify-start text-left font-bold h-12 rounded-xl"><CalendarIcon className="mr-2 h-4 w-4" /> {pastEntryDate ? format(pastEntryDate, "PPP") : <span>Select date</span>}</Button></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={pastEntryDate} onSelect={(d) => d && setPastEntryDate(d)} initialFocus /></PopoverContent></Popover>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-[10px] font-black uppercase text-muted-foreground">Type</Label>
                          <Select value={pastEntryType} onValueChange={(v: any) => setPastEntryType(v)}><SelectTrigger className="bg-muted h-12 rounded-xl font-black"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="sale">Revenue In</SelectItem><SelectItem value="expense">Expense Out</SelectItem></SelectContent></Select>
                        </div>
                        <div className="space-y-2"><Label className="text-[10px] font-black uppercase text-muted-foreground">Amount (৳)</Label><Input type="number" value={pastEntryAmount} onChange={(e) => setPastEntryAmount(e.target.value)} className="bg-muted h-12 rounded-xl font-black" /></div>
                      </div>
                      <div className="space-y-2"><Label className="text-[10px] font-black uppercase text-muted-foreground">Description</Label><Input value={pastEntryDesc} onChange={(e) => setPastEntryDesc(e.target.value)} className="bg-muted h-12 rounded-xl font-black" /></div>
                    </div>
                    <DialogFooter><Button onClick={handleAddPastEntry} className="w-full bg-secondary py-8 rounded-2xl font-black uppercase tracking-widest shadow-xl">Finalize Historical Adjustment</Button></DialogFooter>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent className="p-0">
                <div className="max-h-[500px] overflow-y-auto">
                  {[...stats.recentSales.map(s => ({...s, type: 'sale'})), ...stats.recentExpenses.map(e => ({...e, type: 'expense'}))]
                    .sort((a, b) => (b.timestamp as any)?.toDate() - (a.timestamp as any)?.toDate())
                    .map((record: any) => (
                      <div key={record.id} className="flex justify-between items-center p-6 border-b border-border/30 hover:bg-muted/30 transition-all">
                        <div className="flex items-center gap-4">
                          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${record.type === 'sale' ? 'bg-primary/10 text-primary' : 'bg-destructive/10 text-destructive'}`}>
                            {record.type === 'sale' ? <ShoppingCart size={20} /> : <Banknote size={20} />}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-black uppercase tracking-tight">{record.type === 'sale' ? 'Sales Entry' : record.description}</p>
                              {record.updatedAt && <span className="text-[8px] bg-secondary/10 text-secondary px-2 py-0.5 rounded-full font-black border border-secondary/20 flex items-center gap-1"><Edit3 size={8} /> MODIFIED</span>}
                            </div>
                            <p className="text-[10px] font-bold text-muted-foreground uppercase mt-1 flex items-center gap-1.5"><CalendarIcon size={10} /> {record.timestamp?.toDate()?.toLocaleString()}</p>
                          </div>
                        </div>
                        <div className="text-right space-y-2">
                          <p className={`text-lg font-black tracking-tighter ${record.type === 'sale' ? 'text-primary' : 'text-destructive'}`}>৳{(record.total || record.amount).toLocaleString()}</p>
                          <div className="flex gap-2 justify-end">
                            <Button variant="ghost" size="sm" className="h-8 text-[9px] font-black uppercase text-secondary hover:bg-secondary/10 rounded-lg px-3" onClick={() => { setEditingRecord(record); setEditValue((record.total || record.amount).toString()); }}>Edit</Button>
                            <Button variant="ghost" size="sm" className="h-8 text-[9px] font-black uppercase text-destructive hover:bg-destructive/10 rounded-lg px-3" onClick={() => handleDeleteRecord(record.type, record.id)}>Delete</Button>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={!!editingRecord} onOpenChange={() => setEditingRecord(null)}>
        <DialogContent className="glass-morphism border-t-4 border-secondary">
          <DialogHeader><DialogTitle className="text-sm font-black uppercase tracking-widest">Adjust Verified Entry</DialogTitle></DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-2"><Label className="text-[10px] font-black uppercase text-muted-foreground">New Rectified Amount (৳)</Label><Input type="number" value={editValue} onChange={(e) => setEditValue(e.target.value)} className="bg-muted font-black h-12 rounded-xl text-secondary" /></div>
            <div className="bg-secondary/5 border border-secondary/20 p-4 rounded-xl flex gap-3"><AlertCircle className="text-secondary shrink-0" size={16} /><p className="text-[9px] text-muted-foreground font-bold uppercase leading-relaxed">Audit Log: All adjustments are recorded and linked to your identity.</p></div>
          </div>
          <DialogFooter><Button onClick={handleUpdateRecord} className="w-full bg-secondary py-8 rounded-2xl font-black uppercase tracking-widest shadow-xl">Commit Rectification</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function LedgerStatCard({ label, value, icon, color }: any) {
  return (
    <Card className="glass-morphism border-none shadow-lg group">
      <CardContent className="p-5 flex items-center justify-between">
        <div><p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-1">{label}</p><p className={cn("text-xl font-black tracking-tighter", color === 'primary' ? 'text-primary' : color === 'destructive' ? 'text-destructive' : 'text-secondary')}>৳{value.toLocaleString()}</p></div>
        <div className={cn("p-2.5 rounded-2xl bg-muted border border-border group-hover:rotate-12 transition-transform", color === 'primary' ? 'text-primary' : color === 'destructive' ? 'text-destructive' : 'text-secondary')}>{icon}</div>
      </CardContent>
    </Card>
  );
}
