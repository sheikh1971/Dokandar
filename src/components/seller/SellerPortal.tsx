
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
  CheckCircle2,
  Wallet,
  ArrowDownCircle,
  ArrowUpCircle,
  ClipboardCheck,
  Eye,
  ArrowRight,
  Target,
  User,
  Receipt,
  Tags
} from "lucide-react";
import { ProfileTab } from "@/components/shared/ProfileTab";
import { useToast } from "@/hooks/use-toast";
import { useFirestore, useUser, useCollection } from "@/firebase";
import { collection, addDoc, serverTimestamp, query, orderBy, deleteDoc, doc, where, Timestamp, updateDoc } from "firebase/firestore";
import { errorEmitter } from "@/firebase/error-emitter";
import { FirestorePermissionError, type SecurityRuleContext } from "@/firebase/errors";
import { startOfDay, isAfter, subDays, format, isSameDay } from "date-fns";
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
  const [expenseDate, setExpenseDate] = useState<Date>(new Date());
  const [isExpenseDateOpen, setIsExpenseDateOpen] = useState(false);

  // Daily Account Audit State
  const [cashbox, setCashbox] = useState("");
  const [joma, setJoma] = useState("");
  const [due, setDue] = useState("");
  const [auditDate, setAuditDate] = useState<Date>(new Date());
  const [isAuditDateOpen, setIsAuditDateOpen] = useState(false);
  const [isAccountSubmitting, setIsAccountSubmitting] = useState(false);

  // Detail view state
  const [viewingAudit, setViewingAudit] = useState<any>(null);

  // Edit record state
  const [editingRecord, setEditingRecord] = useState<any>(null);
  const [editValue, setEditValue] = useState("");
  const [editDate, setEditDate] = useState<Date>(new Date());
  const [isEditDateOpen, setIsEditDateOpen] = useState(false);

  // Stock edit state
  const [editingStockId, setEditingStockId] = useState<string | null>(null);
  const [editStockValue, setEditStockValue] = useState("");

  // Submit loading states (prevent double-tap)
  const [isCheckoutSubmitting, setIsCheckoutSubmitting] = useState(false);
  const [isExpenseSubmitting, setIsExpenseSubmitting] = useState(false);

  // Delete confirmation state
  const [pendingDelete, setPendingDelete] = useState<{ type: string; id: string } | null>(null);

  // Edit description (for expenses)
  const [editDescription, setEditDescription] = useState("");

  // Manual Past Entry State (Ledger tab)
  const [isPastEntryOpen, setIsPastEntryOpen] = useState(false);
  const [pastEntryDate, setPastEntryDate] = useState<Date>(new Date());
  const [isPastEntryDateOpen, setIsPastEntryDateOpen] = useState(false);
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

  const accountLogsQuery = useMemo(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, "account_logs"), where("sellerId", "==", user.uid));
  }, [firestore, user]);

  const overheadConfigsQuery = useMemo(() => {
    if (!firestore) return null;
    return collection(firestore, "overhead_configs");
  }, [firestore]);

  const { data: sellerSales } = useCollection(salesQuery);
  const { data: sellerExpenses } = useCollection(expensesQuery);
  const { data: sellerAccountLogs } = useCollection(accountLogsQuery);
  const { data: overheadConfigs } = useCollection(overheadConfigsQuery);

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

    const recentAudits = (sellerAccountLogs || []).filter(l => {
      const ts = l.timestamp as Timestamp;
      return ts && isAfter(ts.toDate(), sevenDaysAgo);
    }).sort((a, b) => (b.timestamp as any)?.toDate() - (a.timestamp as any)?.toDate());

    const todayTotal = (sellerSales || []).filter(s => {
      const ts = s.timestamp as Timestamp;
      return ts && isAfter(ts.toDate(), today);
    }).reduce((acc, s) => acc + (Number(s.total) || 0), 0);

    return {
      todayTotal,
      todayCount: (sellerSales || []).filter(s => {
        const ts = s.timestamp as Timestamp;
        return ts && isAfter(ts.toDate(), today);
      }).length,
      weekRevenue: recentSales.reduce((acc, s) => acc + (Number(s.total) || 0), 0),
      weekExpenses: recentExpenses.reduce((acc, e) => acc + (Number(e.amount) || 0), 0),
      netProfit: recentSales.reduce((acc, s) => acc + (Number(s.total) || 0), 0) - recentExpenses.reduce((acc, e) => acc + (Number(e.amount) || 0), 0),
      recentSales,
      recentExpenses,
      recentAudits
    };
  }, [sellerSales, sellerExpenses, sellerAccountLogs]);

  const targetStats = useMemo(() => {
    const now = new Date();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const totalMonthlyOverhead = overheadConfigs?.reduce((acc: number, c: any) => acc + (Number(c.amount) || 0), 0) || 0;
    const dailyTarget = totalMonthlyOverhead / daysInMonth;
    const progress = dailyTarget > 0 ? Math.min(100, Math.round((stats.todayTotal / dailyTarget) * 100)) : 0;
    
    return { dailyTarget, progress };
  }, [overheadConfigs, stats.todayTotal]);

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
      deployProduct: "পণ্য যুক্ত করুন",
      dailyAudit: "দৈনিক হিসাব মিলকরণ",
      cashbox: "ক্যাশ বক্স",
      joma: "জমা",
      due: "বাকি",
      selectDate: "তারিখ নির্বাচন করুন",
      dailyMission: "আজকের লক্ষ্য",
      thresholdText: "ন্যূনতম খরচ তোলার লক্ষ্য",
      profile: "প্রোফাইল",
      myExpenses: "আমার খরচ",
      expenseHistory: "খরচের তালিকা",
      allTimeExpenses: "সর্বমোট খরচ",
      noExpenses: "এখনো কোনো খরচ যুক্ত করা হয়নি।"
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
      deployProduct: "Deploy Product",
      dailyAudit: "Daily Account Audit",
      cashbox: "Cashbox",
      joma: "Joma",
      due: "Due",
      selectDate: "Select Date",
      dailyMission: "Today's Mission",
      thresholdText: "Target to cover daily expenses",
      profile: "Profile",
      myExpenses: "My Expenses",
      expenseHistory: "Expense History",
      allTimeExpenses: "All-Time Expenses",
      noExpenses: "No expenses recorded yet."
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

  const handleCheckout = () => {
    if (!firestore || !user || isCheckoutSubmitting) return;
    setIsCheckoutSubmitting(true);
    const total = cart.reduce((a, b) => a + b.price * b.qty, 0);
    const saleData = {
      items: cart,
      total,
      timestamp: serverTimestamp(),
      sellerId: user.uid,
      sellerName: user.displayName || user.email?.split('@')[0] || "Staff"
    };

    // Reset UI immediately — Firebase queues the write locally when offline
    addDoc(collection(firestore, "sales"), saleData).catch(() => {
      errorEmitter.emit("permission-error", new FirestorePermissionError({
        path: "sales", operation: "create", requestResourceData: saleData
      }));
    });
    toast({ title: "Sale Recorded", description: `৳${total.toLocaleString()} saved.` });
    setCart([]);
    setIsCheckoutSubmitting(false);
  };

  const handleSubmitExpense = () => {
    if (!firestore || !user || !expenseAmount || isExpenseSubmitting) return;
    setIsExpenseSubmitting(true);
    const expenseData = {
      description: expenseDesc,
      amount: parseFloat(expenseAmount),
      category: expenseCat,
      timestamp: Timestamp.fromDate(expenseDate),
      sellerId: user.uid
    };

    addDoc(collection(firestore, "expenses"), expenseData).catch(() => {
      errorEmitter.emit("permission-error", new FirestorePermissionError({
        path: "expenses", operation: "create", requestResourceData: expenseData
      }));
    });
    toast({ title: "Expense Saved", description: "Ledger updated." });
    setExpenseDesc("");
    setExpenseAmount("");
    setIsExpenseSubmitting(false);
  };

  const handleSubmitDailyAudit = () => {
    if (!firestore || !user || !cashbox) return;
    setIsAccountSubmitting(true);
    const auditData = {
      cashbox: parseFloat(cashbox) || 0,
      joma: parseFloat(joma) || 0,
      due: parseFloat(due) || 0,
      timestamp: Timestamp.fromDate(auditDate),
      sellerId: user.uid,
      sellerName: user.displayName || user.email?.split('@')[0] || "Staff"
    };

    addDoc(collection(firestore, "account_logs"), auditData).catch(() => {
      errorEmitter.emit("permission-error", new FirestorePermissionError({
        path: "account_logs", operation: "create", requestResourceData: auditData
      }));
    });
    toast({ title: "Audit Submitted", description: "Saved locally — will sync when online." });
    setCashbox("");
    setJoma("");
    setDue("");
    setIsAccountSubmitting(false);
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

  const handleUpdateStock = (productId: string) => {
    if (!firestore || editStockValue === "") return;
    updateDoc(doc(firestore, "products", productId), {
      stock: parseInt(editStockValue) || 0
    })
      .then(() => {
        toast({ title: "Stock Updated", description: "Inventory level saved." });
        setEditingStockId(null);
        setEditStockValue("");
      })
      .catch(async () => {
        errorEmitter.emit("permission-error", new FirestorePermissionError({
          path: `products/${productId}`, operation: "update"
        }));
      });
  };

  const handleAddPastEntry = () => {
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

    addDoc(collection(firestore, collectionName), entryData).catch(() => {
      errorEmitter.emit("permission-error", new FirestorePermissionError({
        path: collectionName, operation: "create", requestResourceData: entryData
      }));
    });
    toast({ title: "Audit Success", description: "Record backfilled." });
    setIsPastEntryOpen(false);
  };

  const handleDeleteRecord = async (type: string, id: string) => {
    if (!firestore) return;
    const collectionName = type === 'sale' ? 'sales' : type === 'expense' ? 'expenses' : 'account_logs';
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
    const type = editingRecord.type === "sale" ? "sales" : editingRecord.type === "expense" ? "expenses" : "account_logs";
    const ref = doc(firestore, type, editingRecord.id);
    const val = parseFloat(editValue);
    
    let updates: any = {
      updatedAt: serverTimestamp(),
      updatedBy: user.email,
      timestamp: Timestamp.fromDate(editDate)
    };
    if (type === "sales") updates.total = val;
    else if (type === "expenses") {
      updates.amount = val;
      if (editDescription.trim()) updates.description = editDescription.trim();
    } else if (type === "account_logs") {
       updates.cashbox = val;
    }

    updateDoc(ref, updates).then(() => {
      toast({ title: "Audit Trail Updated" });
      setEditingRecord(null);
    }).catch(async () => {
      errorEmitter.emit("permission-error", new FirestorePermissionError({
        path: `${type}/${editingRecord.id}`, operation: "update", requestResourceData: updates
      } satisfies SecurityRuleContext));
    });
  };

  const mergedHistory = useMemo(() => {
    const list = [
      ...(stats.recentSales || []).map(s => ({ ...s, type: 'sale' })),
      ...(stats.recentExpenses || []).map(e => ({ ...e, type: 'expense' })),
      ...(stats.recentAudits || []).map(l => ({ ...l, type: 'audit' }))
    ];
    return list.sort((a: any, b: any) => (b.timestamp)?.toDate() - (a.timestamp)?.toDate());
  }, [stats.recentSales, stats.recentExpenses, stats.recentAudits]);

  // All expenses this seller has ever added, newest first
  const allExpenses = useMemo(() => {
    return (sellerExpenses || []).slice().sort((a, b) => {
      const ta = (a.timestamp as Timestamp)?.toDate?.()?.getTime() ?? 0;
      const tb = (b.timestamp as Timestamp)?.toDate?.()?.getTime() ?? 0;
      return tb - ta;
    });
  }, [sellerExpenses]);

  const totalAllExpenses = useMemo(() => {
    return allExpenses.reduce((acc, e) => acc + (Number(e.amount) || 0), 0);
  }, [allExpenses]);

  // Derived data for detail view
  const auditDetailData = useMemo(() => {
    if (!viewingAudit || !sellerSales || !sellerExpenses) return { sales: [], expenses: [] };
    const date = (viewingAudit.timestamp as Timestamp).toDate();
    
    const sales = (sellerSales || []).filter(s => {
      const ts = s.timestamp as Timestamp;
      return ts && isSameDay(ts.toDate(), date);
    });

    const expenses = (sellerExpenses || []).filter(e => {
      const ts = e.timestamp as Timestamp;
      return ts && isAfter(ts.toDate(), startOfDay(date)) && !isAfter(ts.toDate(), Timestamp.fromDate(new Date(date.getTime() + 86400000)).toDate());
    });

    return { sales, expenses };
  }, [viewingAudit, sellerSales, sellerExpenses]);

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 md:gap-6 mb-4 md:mb-8">
        <div>
          <h2 className="text-xl md:text-2xl font-black font-headline tracking-tighter uppercase flex items-center gap-2">
            <Zap className="text-primary fill-primary" size={20} />
            {lang === "bn" ? "বিক্রেতা পোর্টাল" : "SELLER POS CORE"}
          </h2>
          <p className="text-muted-foreground text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] mt-1">Operational Intelligence Node</p>
        </div>

        <div className="flex flex-col md:flex-row items-end gap-4 w-full md:w-auto">
          <Card className="glass-morphism w-full md:w-64 px-4 py-3 rounded-2xl border-none shadow-lg space-y-2">
             <div className="flex justify-between items-center">
                <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
                  <Target size={11} className="text-primary" /> {t.dailyMission}
                </p>
                <span className="text-[10px] font-black text-primary">{targetStats.progress}%</span>
             </div>
             <div className="h-2 bg-muted rounded-full overflow-hidden border border-border">
                <div
                  className="h-full bg-primary transition-all duration-1000 ease-out"
                  style={{ width: `${targetStats.progress}%` }}
                />
             </div>
             <p className="text-[8px] font-bold text-muted-foreground uppercase text-center tracking-tighter">
               {t.thresholdText}: ৳{Math.round(targetStats.dailyTarget).toLocaleString()}
             </p>
          </Card>

          <div className="flex items-center gap-2 w-full md:w-auto">
            <Card className="glass-morphism flex-1 md:flex-none px-4 py-2.5 flex items-center gap-3 rounded-2xl border-none shadow-lg">
              <div className="text-right">
                <p className="text-[8px] font-black text-muted-foreground uppercase tracking-widest">{t.performance}</p>
                <p className="text-lg md:text-xl font-black text-primary tracking-tighter">৳{stats.todayTotal.toLocaleString()}</p>
              </div>
              <div className="w-px h-7 bg-border" />
              <div className="text-right">
                <p className="text-[8px] font-black text-muted-foreground uppercase tracking-widest">TXNS</p>
                <p className="text-lg md:text-xl font-black text-foreground tracking-tighter">{stats.todayCount}</p>
              </div>
            </Card>

            <Button variant="outline" size="sm" onClick={() => setLang(lang === "bn" ? "en" : "bn")} className="rounded-2xl font-black text-[9px] uppercase border-border h-10 px-4 shrink-0">
              {lang === "bn" ? "EN" : "বাং"}
            </Button>
          </div>
        </div>
      </div>

      <Tabs defaultValue="sales" className="w-full">
        <TabsList className="fixed inset-x-0 bottom-0 z-40 grid w-full grid-cols-6 gap-0 rounded-none border-t border-border bg-card p-0 pb-[env(safe-area-inset-bottom)] h-16 shadow-[0_-2px_10px_rgba(0,0,0,0.06)] md:static md:h-14 md:gap-1 md:rounded-2xl md:border md:bg-muted md:p-1 md:pb-1 md:shadow-none">
          <TabsTrigger value="sales" className="relative flex h-full flex-col items-center justify-center gap-1 rounded-none font-black text-[9px] uppercase tracking-widest text-muted-foreground data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:shadow-none data-[state=active]:after:absolute data-[state=active]:after:top-0 data-[state=active]:after:left-1/2 data-[state=active]:after:-translate-x-1/2 data-[state=active]:after:h-1 data-[state=active]:after:w-8 data-[state=active]:after:rounded-full data-[state=active]:after:bg-primary data-[state=active]:after:content-[''] md:after:hidden md:h-auto md:flex-row md:gap-2 md:rounded-xl md:py-1 md:text-[9px] md:data-[state=active]:bg-primary md:data-[state=active]:text-primary-foreground">
            <ShoppingCart className="h-5 w-5 md:h-[15px] md:w-[15px]" />
            <span className="leading-none">{lang === "bn" ? "বিক্রি" : "Sales"}</span>
          </TabsTrigger>
          <TabsTrigger value="expenses" className="relative flex h-full flex-col items-center justify-center gap-1 rounded-none font-black text-[9px] uppercase tracking-widest text-muted-foreground data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:shadow-none data-[state=active]:after:absolute data-[state=active]:after:top-0 data-[state=active]:after:left-1/2 data-[state=active]:after:-translate-x-1/2 data-[state=active]:after:h-1 data-[state=active]:after:w-8 data-[state=active]:after:rounded-full data-[state=active]:after:bg-primary data-[state=active]:after:content-[''] md:after:hidden md:h-auto md:flex-row md:gap-2 md:rounded-xl md:py-1 md:text-[9px] md:data-[state=active]:bg-primary md:data-[state=active]:text-primary-foreground">
            <Banknote className="h-5 w-5 md:h-[15px] md:w-[15px]" />
            <span className="leading-none">{lang === "bn" ? "খরচ" : "Expense"}</span>
          </TabsTrigger>
          <TabsTrigger value="expense_history" className="relative flex h-full flex-col items-center justify-center gap-1 rounded-none font-black text-[9px] uppercase tracking-widest text-muted-foreground data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:shadow-none data-[state=active]:after:absolute data-[state=active]:after:top-0 data-[state=active]:after:left-1/2 data-[state=active]:after:-translate-x-1/2 data-[state=active]:after:h-1 data-[state=active]:after:w-8 data-[state=active]:after:rounded-full data-[state=active]:after:bg-primary data-[state=active]:after:content-[''] md:after:hidden md:h-auto md:flex-row md:gap-2 md:rounded-xl md:py-1 md:text-[9px] md:data-[state=active]:bg-primary md:data-[state=active]:text-primary-foreground">
            <Receipt className="h-5 w-5 md:h-[15px] md:w-[15px]" />
            <span className="leading-none">{t.myExpenses}</span>
          </TabsTrigger>
          <TabsTrigger value="inventory" className="relative flex h-full flex-col items-center justify-center gap-1 rounded-none font-black text-[9px] uppercase tracking-widest text-muted-foreground data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:shadow-none data-[state=active]:after:absolute data-[state=active]:after:top-0 data-[state=active]:after:left-1/2 data-[state=active]:after:-translate-x-1/2 data-[state=active]:after:h-1 data-[state=active]:after:w-8 data-[state=active]:after:rounded-full data-[state=active]:after:bg-primary data-[state=active]:after:content-[''] md:after:hidden md:h-auto md:flex-row md:gap-2 md:rounded-xl md:py-1 md:text-[9px] md:data-[state=active]:bg-primary md:data-[state=active]:text-primary-foreground">
            <Package className="h-5 w-5 md:h-[15px] md:w-[15px]" />
            <span className="leading-none">{lang === "bn" ? "স্টক" : "Stock"}</span>
          </TabsTrigger>
          <TabsTrigger value="ledger" className="relative flex h-full flex-col items-center justify-center gap-1 rounded-none font-black text-[9px] uppercase tracking-widest text-muted-foreground data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:shadow-none data-[state=active]:after:absolute data-[state=active]:after:top-0 data-[state=active]:after:left-1/2 data-[state=active]:after:-translate-x-1/2 data-[state=active]:after:h-1 data-[state=active]:after:w-8 data-[state=active]:after:rounded-full data-[state=active]:after:bg-primary data-[state=active]:after:content-[''] md:after:hidden md:h-auto md:flex-row md:gap-2 md:rounded-xl md:py-1 md:text-[9px] md:data-[state=active]:bg-primary md:data-[state=active]:text-primary-foreground">
            <History className="h-5 w-5 md:h-[15px] md:w-[15px]" />
            <span className="leading-none">{lang === "bn" ? "হিসাব" : "Ledger"}</span>
          </TabsTrigger>
          <TabsTrigger value="profile" className="relative flex h-full flex-col items-center justify-center gap-1 rounded-none font-black text-[9px] uppercase tracking-widest text-muted-foreground data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:shadow-none data-[state=active]:after:absolute data-[state=active]:after:top-0 data-[state=active]:after:left-1/2 data-[state=active]:after:-translate-x-1/2 data-[state=active]:after:h-1 data-[state=active]:after:w-8 data-[state=active]:after:rounded-full data-[state=active]:after:bg-primary data-[state=active]:after:content-[''] md:after:hidden md:h-auto md:flex-row md:gap-2 md:rounded-xl md:py-1 md:text-[9px] md:data-[state=active]:bg-primary md:data-[state=active]:text-primary-foreground">
            <User className="h-5 w-5 md:h-[15px] md:w-[15px]" />
            <span className="leading-none">{t.profile}</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="sales">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
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
                        <Button key={prod.id} variant="ghost" onClick={() => handleProductSelect(prod)} className="h-24 md:h-32 flex flex-col border border-border hover:border-primary hover:bg-primary/5 rounded-2xl shadow-sm group p-2">
                          <Package size={16} className="text-primary mb-1.5 md:mb-2 shrink-0" />
                          <span className="text-[9px] md:text-[10px] font-black uppercase leading-tight text-center line-clamp-2">{prod.name}</span>
                          <span className="text-[11px] md:text-[12px] font-black text-primary mt-1">৳{prod.price}</span>
                        </Button>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <Card className="glass-morphism border-t-4 border-secondary flex flex-col shadow-2xl">
              <CardHeader className="py-3 md:py-4"><CardTitle className="text-base md:text-lg font-black uppercase tracking-widest flex justify-between items-center">{t.cart} <span className="text-[10px] bg-secondary/10 text-secondary px-3 py-1 rounded-full">{cart.length} ITEMS</span></CardTitle></CardHeader>
              <CardContent className="space-y-3 flex-1">
                <div className="max-h-[280px] md:max-h-[450px] overflow-y-auto space-y-3 pr-2 scrollbar-hide">
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
                <div className="border-t pt-4 space-y-3">
                  <div className="flex justify-between text-xl md:text-2xl font-black tracking-tighter">
                    <span>{t.total}</span><span className="text-primary">৳{cart.reduce((a, b) => a + b.price * b.qty, 0).toLocaleString()}</span>
                  </div>
                  <Button className="w-full bg-primary py-6 md:py-8 rounded-2xl shadow-xl font-black uppercase tracking-widest" disabled={cart.length === 0 || isCheckoutSubmitting} onClick={handleCheckout}>
                    {isCheckoutSubmitting ? <Loader2 className="animate-spin" /> : t.checkout}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="expenses">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-6xl mx-auto">
            <Card className="glass-morphism border-t-4 border-destructive shadow-xl">
              <CardHeader><CardTitle className="text-lg font-black uppercase tracking-widest">{t.addExpense}</CardTitle></CardHeader>
              <CardContent className="space-y-5">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-muted-foreground">{t.selectDate}</Label>
                  <Popover open={isExpenseDateOpen} onOpenChange={setIsExpenseDateOpen}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left font-bold h-12 rounded-xl bg-muted/30 border-border">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {expenseDate ? format(expenseDate, "PPP") : <span>Pick a date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar mode="single" selected={expenseDate} onSelect={(d) => { if (d) { setExpenseDate(d); setIsExpenseDateOpen(false); } }} initialFocus />
                    </PopoverContent>
                  </Popover>
                </div>
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
                <Button onClick={handleSubmitExpense} disabled={isExpenseSubmitting} className="w-full bg-destructive text-destructive-foreground font-black py-8 rounded-2xl hover:bg-destructive/90 uppercase tracking-widest shadow-lg">
                  {isExpenseSubmitting ? <Loader2 className="animate-spin" /> : <><Plus className="mr-2" size={16} /> {t.submit}</>}
                </Button>
              </CardContent>
            </Card>

            <Card className="glass-morphism border-t-4 border-secondary shadow-xl">
              <CardHeader>
                <CardTitle className="text-lg font-black uppercase tracking-widest flex items-center gap-2">
                  <Wallet className="text-secondary" /> {t.dailyAudit}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-muted-foreground">{t.selectDate}</Label>
                  <Popover open={isAuditDateOpen} onOpenChange={setIsAuditDateOpen}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left font-bold h-12 rounded-xl bg-muted/30 border-border">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {auditDate ? format(auditDate, "PPP") : <span>Pick a date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar mode="single" selected={auditDate} onSelect={(d) => { if (d) { setAuditDate(d); setIsAuditDateOpen(false); } }} initialFocus />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-muted-foreground flex items-center gap-2">
                    <Wallet size={12} /> {t.cashbox}
                  </Label>
                  <Input 
                    type="number" 
                    value={cashbox} 
                    onChange={(e) => setCashbox(e.target.value)} 
                    placeholder="Closing Balance" 
                    className="bg-muted/30 border-border h-12 rounded-xl font-black text-secondary" 
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-muted-foreground flex items-center gap-2">
                      <ArrowDownCircle size={12} /> {t.joma}
                    </Label>
                    <Input 
                      type="number" 
                      value={joma} 
                      onChange={(e) => setJoma(e.target.value)} 
                      placeholder="Total Deposits" 
                      className="bg-muted/30 border-border h-12 rounded-xl font-black text-primary" 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-muted-foreground flex items-center gap-2">
                      <ArrowUpCircle size={12} /> {t.due}
                    </Label>
                    <Input 
                      type="number" 
                      value={due} 
                      onChange={(e) => setDue(e.target.value)} 
                      placeholder="Outstanding" 
                      className="bg-muted/30 border-border h-12 rounded-xl font-black text-destructive" 
                    />
                  </div>
                </div>
                <Button 
                  onClick={handleSubmitDailyAudit} 
                  disabled={isAccountSubmitting}
                  className="w-full bg-secondary text-secondary-foreground font-black py-8 rounded-2xl hover:bg-secondary/90 uppercase tracking-widest shadow-lg"
                >
                  {isAccountSubmitting ? <Loader2 className="animate-spin" /> : <><CheckCircle2 className="mr-2" size={16} /> Sync Daily Accounts</>}
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="expense_history">
          <div className="space-y-6 max-w-3xl mx-auto">
            <div className="grid grid-cols-2 gap-4">
              <LedgerStatCard label={lang === "bn" ? "৭ দিনের খরচ" : "7D Expenses"} value={stats.weekExpenses} icon={<TrendingDown />} color="destructive" />
              <LedgerStatCard label={t.allTimeExpenses} value={totalAllExpenses} icon={<Banknote />} color="destructive" />
            </div>

            <Card className="glass-morphism border-t-4 border-destructive shadow-xl overflow-hidden">
              <CardHeader className="border-b bg-destructive/5 py-4">
                <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                  <Receipt className="text-destructive" size={18} /> {t.expenseHistory}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="max-h-[600px] overflow-y-auto">
                  {allExpenses.map((exp: any) => (
                    <div key={exp.id} className="flex flex-col p-5 border-b border-border/30 hover:bg-muted/30 transition-all">
                      <div className="flex justify-between items-start gap-4">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-11 h-11 rounded-2xl bg-destructive/10 text-destructive flex items-center justify-center shrink-0">
                            <Banknote size={18} />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="text-sm font-black uppercase tracking-tight truncate">{exp.description || exp.category}</p>
                              {exp.updatedAt && <span className="text-[8px] bg-secondary/10 text-secondary px-2 py-0.5 rounded-full font-black border border-secondary/20 flex items-center gap-1 shrink-0"><Edit3 size={8} /> MODIFIED</span>}
                            </div>
                            <p className="text-[10px] font-bold text-muted-foreground uppercase mt-1 flex items-center gap-1.5 flex-wrap">
                              <Tags size={10} /> {exp.category} | <CalendarIcon size={10} /> {exp.timestamp?.toDate ? exp.timestamp.toDate().toLocaleString() : ""}
                            </p>
                          </div>
                        </div>
                        <p className="text-lg font-black text-destructive tracking-tighter shrink-0">৳{(Number(exp.amount) || 0).toLocaleString()}</p>
                      </div>
                      <div className="flex gap-2 justify-end mt-3">
                        <Button variant="ghost" size="sm" className="h-8 text-[9px] font-black uppercase text-secondary hover:bg-secondary/10 rounded-lg px-3" onClick={() => {
                          setEditingRecord({ ...exp, type: 'expense' });
                          setEditValue(String(exp.amount ?? 0));
                          setEditDate(exp.timestamp?.toDate ? exp.timestamp.toDate() : new Date());
                          setEditDescription(exp.description || "");
                        }}>{t.edit}</Button>
                        <Button variant="ghost" size="sm" className="h-8 text-[9px] font-black uppercase text-destructive hover:bg-destructive/10 rounded-lg px-3" onClick={() => setPendingDelete({ type: 'expense', id: exp.id })}>{t.delete}</Button>
                      </div>
                    </div>
                  ))}
                  {!allExpenses.length && (
                    <p className="text-center py-12 text-[10px] uppercase font-bold text-muted-foreground">{t.noExpenses}</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
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
                    <div key={p.id} className="flex justify-between items-center p-4 border-b border-border/30 hover:bg-muted/50 transition-colors gap-4">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-black uppercase truncate">{p.name}</p>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase">{p.category}</p>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        {editingStockId === p.id ? (
                          <div className="flex items-center gap-2">
                            <Input
                              type="number"
                              value={editStockValue}
                              onChange={(e) => setEditStockValue(e.target.value)}
                              className="w-20 h-8 text-[10px] font-black bg-white"
                              autoFocus
                              onKeyDown={(e) => { if (e.key === 'Enter') handleUpdateStock(p.id); if (e.key === 'Escape') setEditingStockId(null); }}
                            />
                            <Button size="sm" onClick={() => handleUpdateStock(p.id)} className="h-8 text-[9px] bg-primary font-black uppercase px-3">Save</Button>
                            <Button size="sm" variant="ghost" onClick={() => setEditingStockId(null)} className="h-8 text-[9px] font-black uppercase px-2">✕</Button>
                          </div>
                        ) : (
                          <button
                            onClick={() => { setEditingStockId(p.id); setEditStockValue(String(p.stock ?? 0)); }}
                            className={`text-[9px] font-black uppercase border px-2 py-1 rounded-lg transition-colors ${
                              (p.stock ?? 0) === 0
                                ? 'text-destructive border-destructive/30 bg-destructive/5 hover:bg-destructive/10'
                                : 'text-muted-foreground border-border/50 hover:border-primary/50 hover:text-primary'
                            }`}
                          >
                            Stock: {p.stock ?? 0}
                          </button>
                        )}
                        <p className="text-sm font-black text-primary">৳{p.price}</p>
                        <Button variant="ghost" size="icon" onClick={() => handleDeleteProduct(p.id)} className="text-destructive h-10 w-10"><Trash2 size={16} /></Button>
                      </div>
                    </div>
                  ))}
                  {!products?.length && (
                    <p className="text-center py-12 text-[10px] uppercase font-bold text-muted-foreground">No products in catalog. Add one to get started.</p>
                  )}
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
                        <Popover open={isPastEntryDateOpen} onOpenChange={setIsPastEntryDateOpen}>
                          <PopoverTrigger asChild>
                            <Button variant="outline" className="w-full justify-start text-left font-bold h-12 rounded-xl">
                              <CalendarIcon className="mr-2 h-4 w-4" /> 
                              {pastEntryDate ? format(pastEntryDate, "PPP") : <span>Select date</span>}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0">
                            <Calendar mode="single" selected={pastEntryDate} onSelect={(d) => { if (d) { setPastEntryDate(d); setIsPastEntryDateOpen(false); } }} initialFocus />
                          </PopoverContent>
                        </Popover>
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
                  {mergedHistory.map((record: any) => (
                      <div key={record.id} className="flex flex-col p-6 border-b border-border/30 hover:bg-muted/30 transition-all group">
                        <div className="flex justify-between items-start mb-4">
                          <div className="flex items-center gap-4">
                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                              record.type === 'sale' ? 'bg-primary/10 text-primary' : 
                              record.type === 'expense' ? 'bg-destructive/10 text-destructive' : 
                              'bg-secondary/10 text-secondary'
                            }`}>
                              {record.type === 'sale' ? <ShoppingCart size={20} /> : record.type === 'expense' ? <Banknote size={20} /> : <ClipboardCheck size={20} />}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-black uppercase tracking-tight">
                                  {record.type === 'sale' ? 'Sales Entry' : record.type === 'expense' ? record.description : 'Daily Account Audit'}
                                </p>
                                {record.updatedAt && <span className="text-[8px] bg-secondary/10 text-secondary px-2 py-0.5 rounded-full font-black border border-secondary/20 flex items-center gap-1"><Edit3 size={8} /> MODIFIED</span>}
                              </div>
                              <p className="text-[10px] font-bold text-muted-foreground uppercase mt-1 flex items-center gap-1.5"><CalendarIcon size={10} /> {record.timestamp?.toDate()?.toLocaleString()}</p>
                            </div>
                          </div>
                          <div className="text-right">
                             {record.type !== 'audit' ? (
                               <p className={`text-lg font-black tracking-tighter ${record.type === 'sale' ? 'text-primary' : 'text-destructive'}`}>
                                 ৳{(Number(record.total ?? record.amount ?? 0)).toLocaleString()}
                               </p>
                             ) : (
                               <div className="flex items-center gap-2 bg-secondary/5 px-3 py-1 rounded-full border border-secondary/10">
                                  <CheckCircle2 className="text-secondary" size={14} />
                                  <span className="text-[10px] font-black text-secondary uppercase tracking-widest">Verified</span>
                               </div>
                             )}
                          </div>
                        </div>

                        {record.type === 'audit' && (
                          <div 
                            onClick={() => setViewingAudit(record)}
                            className="grid grid-cols-3 gap-3 bg-muted/30 p-4 rounded-xl border border-border/50 mb-2 cursor-pointer hover:bg-secondary/5 hover:border-secondary/30 transition-all relative overflow-hidden"
                          >
                            <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Eye size={12} className="text-secondary" />
                            </div>
                            <div className="space-y-1">
                              <p className="text-[8px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-1.5"><Wallet size={10} className="text-secondary" /> Cashbox</p>
                              <p className="text-xs font-black text-foreground">৳{record.cashbox?.toLocaleString()}</p>
                            </div>
                            <div className="space-y-1 border-x border-border/50 px-3">
                              <p className="text-[8px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-1.5"><ArrowDownCircle size={10} className="text-primary" /> Joma</p>
                              <p className="text-xs font-black text-foreground">৳{record.joma?.toLocaleString()}</p>
                            </div>
                            <div className="space-y-1 pl-3">
                              <p className="text-[8px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-1.5"><ArrowUpCircle size={10} className="text-destructive" /> Due</p>
                              <p className="text-xs font-black text-foreground">৳{record.due?.toLocaleString()}</p>
                            </div>
                          </div>
                        )}

                        <div className="flex gap-2 justify-end">
                          <Button variant="ghost" size="sm" className="h-8 text-[9px] font-black uppercase text-secondary hover:bg-secondary/10 rounded-lg px-3" onClick={() => {
                            setEditingRecord(record);
                            setEditValue(String(record.total ?? record.amount ?? record.cashbox ?? 0));
                            setEditDate(record.timestamp?.toDate() || new Date());
                            setEditDescription(record.description || "");
                          }}>Edit</Button>
                          <Button variant="ghost" size="sm" className="h-8 text-[9px] font-black uppercase text-destructive hover:bg-destructive/10 rounded-lg px-3" onClick={() => setPendingDelete({ type: record.type, id: record.id })}>Delete</Button>
                        </div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="profile">
          <ProfileTab lang={lang} role="seller" />
        </TabsContent>
      </Tabs>

      {/* Audit Detail Dialog */}
      <Dialog open={!!viewingAudit} onOpenChange={() => setViewingAudit(null)}>
        <DialogContent className="glass-morphism border-t-4 border-secondary max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
              <ClipboardCheck className="text-secondary" />
              Daily Intelligence Detail: {viewingAudit && format((viewingAudit.timestamp as Timestamp).toDate(), "PPP")}
            </DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4 max-h-[60vh] overflow-y-auto pr-2">
            <div className="space-y-4">
              <h4 className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2 border-b border-primary/20 pb-2">
                <ShoppingCart size={14} /> Daily Sales Feed
              </h4>
              <div className="space-y-2">
                {auditDetailData.sales.map((sale: any) => (
                  <div key={sale.id} className="p-3 bg-muted/30 rounded-xl border border-border flex justify-between items-center group hover:bg-primary/5 hover:border-primary/20 transition-all">
                    <div>
                      <p className="text-[10px] font-black uppercase">Order #{sale.id.slice(-4).toUpperCase()}</p>
                      <p className="text-[8px] font-bold text-muted-foreground uppercase">{format((sale.timestamp as Timestamp).toDate(), "hh:mm a")}</p>
                    </div>
                    <p className="text-xs font-black text-primary">৳{sale.total.toLocaleString()}</p>
                  </div>
                ))}
                {!auditDetailData.sales.length && <p className="text-[9px] text-muted-foreground italic uppercase text-center py-6">No sales recorded on this date.</p>}
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="text-[10px] font-black uppercase tracking-widest text-destructive flex items-center gap-2 border-b border-destructive/20 pb-2">
                <Banknote size={14} /> Operational Burn
              </h4>
              <div className="space-y-2">
                {auditDetailData.expenses.map((exp: any) => (
                  <div key={exp.id} className="p-3 bg-muted/30 rounded-xl border border-border flex justify-between items-center group hover:bg-destructive/5 hover:border-destructive/20 transition-all">
                    <div>
                      <p className="text-[10px] font-black uppercase">{exp.description}</p>
                      <p className="text-[8px] font-bold text-muted-foreground uppercase">{exp.category}</p>
                    </div>
                    <p className="text-xs font-black text-destructive">৳{exp.amount.toLocaleString()}</p>
                  </div>
                ))}
                {!auditDetailData.expenses.length && <p className="text-[9px] text-muted-foreground italic uppercase text-center py-6">No expenses recorded on this date.</p>}
              </div>
            </div>
          </div>
          <div className="bg-secondary/5 border border-secondary/20 p-4 rounded-xl flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-secondary/10 flex items-center justify-center">
                <Wallet className="text-secondary" size={18} />
              </div>
              <div>
                <p className="text-[8px] font-black text-muted-foreground uppercase tracking-widest">Verified Closing Cash</p>
                <p className="text-lg font-black text-secondary tracking-tighter">৳{viewingAudit?.cashbox?.toLocaleString()}</p>
              </div>
            </div>
            <ArrowRight className="text-secondary/30" />
            <div className="text-right">
              <p className="text-[8px] font-black text-muted-foreground uppercase tracking-widest">Calculated Balance</p>
              <p className="text-lg font-black text-foreground tracking-tighter">
                ৳{(auditDetailData.sales.reduce((a, b) => a + (b.total || 0), 0) - auditDetailData.expenses.reduce((a, b) => a + (b.amount || 0), 0)).toLocaleString()}
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!pendingDelete} onOpenChange={() => setPendingDelete(null)}>
        <DialogContent className="glass-morphism border-t-4 border-destructive max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
              <AlertCircle className="text-destructive" size={16} /> Confirm Delete
            </DialogTitle>
          </DialogHeader>
          <p className="text-[11px] font-bold text-muted-foreground uppercase leading-relaxed py-2">
            This record will be permanently removed. This cannot be undone.
          </p>
          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={() => setPendingDelete(null)} className="flex-1 font-black uppercase text-[10px] rounded-xl h-12">Cancel</Button>
            <Button
              onClick={() => { if (pendingDelete) { handleDeleteRecord(pendingDelete.type, pendingDelete.id); setPendingDelete(null); } }}
              className="flex-1 bg-destructive text-destructive-foreground font-black uppercase text-[10px] rounded-xl h-12"
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingRecord} onOpenChange={() => setEditingRecord(null)}>
        <DialogContent className="glass-morphism border-t-4 border-secondary">
          <DialogHeader><DialogTitle className="text-sm font-black uppercase tracking-widest">Adjust Verified Entry</DialogTitle></DialogHeader>
          <div className="py-4 space-y-6">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase text-muted-foreground">Adjust Entry Date</Label>
              <Popover open={isEditDateOpen} onOpenChange={setIsEditDateOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-bold h-12 rounded-xl bg-muted/30 border-border">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {editDate ? format(editDate, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar mode="single" selected={editDate} onSelect={(d) => { if (d) { setEditDate(d); setIsEditDateOpen(false); } }} initialFocus />
                </PopoverContent>
              </Popover>
            </div>
            {editingRecord?.type === 'expense' && (
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-muted-foreground">Description</Label>
                <Input value={editDescription} onChange={(e) => setEditDescription(e.target.value)} className="bg-muted font-black h-12 rounded-xl" />
              </div>
            )}
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase text-muted-foreground">
                {editingRecord?.type === 'audit' ? 'Rectified Cashbox Amount (৳)' : 'New Rectified Amount (৳)'}
              </Label>
              <Input type="number" value={editValue} onChange={(e) => setEditValue(e.target.value)} className="bg-muted font-black h-12 rounded-xl text-secondary" />
            </div>
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
