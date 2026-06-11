
"use client";

import { useState, useMemo, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  BrainCircuit, 
  Filter,
  BarChart3,
  ShieldCheck,
  Package,
  Plus,
  Trash2,
  Table as TableIcon,
  History,
  AlertTriangle,
  Clock,
  User as UserIcon,
  Edit3,
  Wallet,
  ArrowDownCircle,
  ArrowUpCircle,
  ClipboardCheck,
  Eye,
  ArrowRight,
  ShoppingCart,
  Banknote,
  Tags,
  Coins,
  Calendar as CalendarIcon,
  PlusCircle,
  Loader2,
  Building2,
  Users,
  CheckCircle2,
  Search,
  Settings,
  Target,
  Zap
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { receiveWeeklyProfitSummary } from "@/ai/flows/owner-receives-weekly-profit-summary";
import { useFirestore, useCollection, useUser } from "@/firebase";
import { collection, query, orderBy, Timestamp, addDoc, deleteDoc, doc, serverTimestamp, getDocs, where, updateDoc } from "firebase/firestore";
import { startOfWeek, startOfMonth, startOfYear, isAfter, format, isSameDay, startOfDay } from "date-fns";
import { 
  Bar, 
  BarChart, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid,
  Legend
} from "recharts";
import { ChartContainer, ChartTooltipContent } from "@/components/ui/chart";
import { FirestorePermissionError, type SecurityRuleContext } from "@/firebase/errors";
import { errorEmitter } from "@/firebase/error-emitter";
import { useToast } from "@/hooks/use-toast";
import { ProfileTab } from "@/components/shared/ProfileTab";

type AnalysisPeriod = "weekly" | "monthly" | "yearly" | "all";

export function AdminDashboard() {
  const { toast } = useToast();
  const [lang, setLang] = useState<"bn" | "en">("en");
  const [period, setPeriod] = useState<AnalysisPeriod>("monthly");
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);
  
  const [newProductName, setNewProductName] = useState("");
  const [newProductPrice, setNewProductPrice] = useState("");
  const [newProductCategory, setNewProductCategory] = useState("Essentials");

  // Overhead Config State
  const [newOverheadLabel, setNewOverheadLabel] = useState("");
  const [newOverheadAmount, setNewOverheadAmount] = useState("");

  // Buy Entry State
  const [buyDesc, setBuyDesc] = useState("");
  const [buyAmount, setBuyAmount] = useState("");
  const [buyDate, setBuyDate] = useState<Date>(new Date());
  const [isBuyDateOpen, setIsBuyDateOpen] = useState(false);
  const [isBuySubmitting, setIsBuySubmitting] = useState(false);

  // Detail view states
  const [viewingAudit, setViewingAudit] = useState<any>(null);
  const [isBurnDetailOpen, setIsBurnDetailOpen] = useState(false);
  
  // Guard to prevent multiple overhead additions in one session
  const [hasCheckedOverheads, setHasCheckedOverheads] = useState(false);

  // Product edit state
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [editProductName, setEditProductName] = useState("");
  const [editProductPrice, setEditProductPrice] = useState("");
  const [editProductStock, setEditProductStock] = useState("");

  // Manual Joma entry state
  const [jomaSellerName, setJomaSellerName] = useState("");
  const [jomaAmount, setJomaAmount] = useState("");
  const [jomaDate, setJomaDate] = useState<Date>(new Date());
  const [isJomaDateOpen, setIsJomaDateOpen] = useState(false);
  const [isJomaSubmitting, setIsJomaSubmitting] = useState(false);

  // Admin record edit state
  const [editingAdminRecord, setEditingAdminRecord] = useState<any>(null);
  const [editAdminValue, setEditAdminValue] = useState("");
  const [editAdminDesc, setEditAdminDesc] = useState("");

  // Transaction search
  const [searchQuery, setSearchQuery] = useState("");

  const { firestore } = useFirestore();
  const { user } = useUser();

  const salesQuery = useMemo(() => {
    if (!firestore) return null;
    return query(collection(firestore, "sales"), orderBy("timestamp", "desc"));
  }, [firestore]);

  const expensesQuery = useMemo(() => {
    if (!firestore) return null;
    return query(collection(firestore, "expenses"), orderBy("timestamp", "desc"));
  }, [firestore]);

  const productsQuery = useMemo(() => {
    if (!firestore) return null;
    return query(collection(firestore, "products"), orderBy("name", "asc"));
  }, [firestore]);

  const accountLogsQuery = useMemo(() => {
    if (!firestore) return null;
    return query(collection(firestore, "account_logs"), orderBy("timestamp", "desc"));
  }, [firestore]);

  const overheadConfigsQuery = useMemo(() => {
    if (!firestore) return null;
    return query(collection(firestore, "overhead_configs"), orderBy("label", "asc"));
  }, [firestore]);

  const { data: rawSales } = useCollection(salesQuery);
  const { data: rawExpenses, loading: expensesLoading } = useCollection(expensesQuery);
  const { data: products } = useCollection(productsQuery);
  const { data: accountLogs } = useCollection(accountLogsQuery);
  const { data: overheadConfigs, loading: configsLoading } = useCollection(overheadConfigsQuery);

  // Autonomous Overheads Engine
  useEffect(() => {
    if (expensesLoading || configsLoading || !rawExpenses || !overheadConfigs || !firestore || hasCheckedOverheads) return;

    const syncOverheads = async () => {
      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();

      setHasCheckedOverheads(true);

      for (const config of overheadConfigs) {
        const existing = rawExpenses.find(e => {
          let date: Date | null = null;
          if (e.timestamp instanceof Timestamp) date = e.timestamp.toDate();
          else if (e.timestamp instanceof Date) date = e.timestamp;
          
          return e.configId === config.id && 
                 date && 
                 date.getMonth() === currentMonth && 
                 date.getFullYear() === currentYear;
        });

        if (!existing) {
          const data = {
            description: `Fixed Overhead: ${config.label}`,
            amount: Number(config.amount),
            category: "Fixed Cost",
            timestamp: serverTimestamp(),
            isOverhead: true,
            addedAutomatically: true,
            configId: config.id
          };
          addDoc(collection(firestore, "expenses"), data);
        }
      }
    };

    syncOverheads();
  }, [rawExpenses, expensesLoading, overheadConfigs, configsLoading, firestore, hasCheckedOverheads]);

  const stats = useMemo(() => {
    const now = new Date();
    let filterDate: Date;

    switch (period) {
      case "weekly": filterDate = startOfWeek(now); break;
      case "monthly": filterDate = startOfMonth(now); break;
      case "yearly": filterDate = startOfYear(now); break;
      default: filterDate = new Date(0);
    }

    const filteredSales = (rawSales || []).filter(s => {
      if (!s.timestamp) return true;
      const date = (s.timestamp as Timestamp).toDate();
      return isAfter(date, filterDate);
    });

    const filteredExpenses = (rawExpenses || []).filter(e => {
      if (!e.timestamp) return true;
      const date = (e.timestamp as Timestamp).toDate();
      return isAfter(date, filterDate);
    });

    const filteredLogs = (accountLogs || []).filter(l => {
      if (!l.timestamp) return true;
      const date = (l.timestamp as Timestamp).toDate();
      return isAfter(date, filterDate);
    });

    const totalRevenue = filteredSales.reduce((acc, s) => acc + (Number(s.total) || 0), 0);
    const totalExpenses = filteredExpenses.reduce((acc, e) => acc + (Number(e.amount) || 0), 0);
    const netProfit = totalRevenue - totalExpenses;

    const totalJoma = filteredLogs.reduce((acc, l) => acc + (Number(l.joma) || 0), 0);
    const totalDue = filteredLogs.reduce((acc, l) => acc + (Number(l.due) || 0), 0);
    
    const buyCategories = ['procurement', 'buy', 'purchase', 'shopping', 'stock'];
    const totalBuy = filteredExpenses
      .filter(e => {
        const cat = (e.category || "").toLowerCase();
        const desc = (e.description || "").toLowerCase();
        return buyCategories.some(c => cat.includes(c) || desc.includes(c));
      })
      .reduce((acc, e) => acc + (Number(e.amount) || 0), 0);

    const chartDataMap: Record<string, { name: string; sales: number; expenses: number; buy: number; overheads: number }> = {};
    
    filteredSales.forEach(s => {
      const d = s.timestamp ? (s.timestamp as Timestamp).toDate() : new Date();
      const key = format(d, period === 'yearly' ? 'MMM' : 'dd MMM');
      if (!chartDataMap[key]) chartDataMap[key] = { name: key, sales: 0, expenses: 0, buy: 0, overheads: 0 };
      chartDataMap[key].sales += Number(s.total) || 0;
    });

    filteredExpenses.forEach(e => {
      const d = e.timestamp ? (e.timestamp as Timestamp).toDate() : new Date();
      const key = format(d, period === 'yearly' ? 'MMM' : 'dd MMM');
      if (!chartDataMap[key]) chartDataMap[key] = { name: key, sales: 0, expenses: 0, buy: 0, overheads: 0 };
      
      const amt = Number(e.amount) || 0;
      chartDataMap[key].expenses += amt;
      
      if (e.isOverhead) {
        chartDataMap[key].overheads += amt;
      }
      
      const cat = (e.category || "").toLowerCase();
      const desc = (e.description || "").toLowerCase();
      if (buyCategories.some(c => cat.includes(c) || desc.includes(c))) {
        chartDataMap[key].buy += amt;
      }
    });

    const chartData = Object.values(chartDataMap).sort((a, b) => a.name.localeCompare(b.name));

    return {
      totalRevenue,
      totalExpenses,
      netProfit,
      totalJoma,
      totalDue,
      totalBuy,
      sales: filteredSales,
      expenses: filteredExpenses,
      logs: filteredLogs,
      chartData
    };
  }, [rawSales, rawExpenses, accountLogs, period]);

  const targetStats = useMemo(() => {
    const now = new Date();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const totalMonthlyOverhead = overheadConfigs?.reduce((acc: number, c: any) => acc + (Number(c.amount) || 0), 0) || 0;
    const dailyTarget = totalMonthlyOverhead / daysInMonth;
    
    const today = startOfDay(now);
    const todaySales = (rawSales || []).filter(s => {
      const ts = s.timestamp as Timestamp;
      return ts && isAfter(ts.toDate(), today);
    }).reduce((acc, s) => acc + (Number(s.total) || 0), 0);

    const progress = dailyTarget > 0 ? Math.min(100, Math.round((todaySales / dailyTarget) * 100)) : 0;
    
    return { dailyTarget, todaySales, progress };
  }, [overheadConfigs, rawSales]);

  // Per-day sales/expenses map for discrepancy calculation
  const dailyTotals = useMemo(() => {
    const map: Record<string, { sales: number; expenses: number }> = {};
    (rawSales || []).forEach(s => {
      if (!s.timestamp) return;
      const key = format((s.timestamp as Timestamp).toDate(), 'yyyy-MM-dd');
      if (!map[key]) map[key] = { sales: 0, expenses: 0 };
      map[key].sales += Number(s.total) || 0;
    });
    (rawExpenses || []).forEach(e => {
      if (!e.timestamp) return;
      const key = format((e.timestamp as Timestamp).toDate(), 'yyyy-MM-dd');
      if (!map[key]) map[key] = { sales: 0, expenses: 0 };
      map[key].expenses += Number(e.amount) || 0;
    });
    return map;
  }, [rawSales, rawExpenses]);

  // Per-seller money summary
  const sellerSummary = useMemo(() => {
    const sellers: Record<string, { name: string; id: string; totalSales: number; salesCount: number; totalJoma: number; totalDue: number; totalCashbox: number; auditCount: number }> = {};
    (rawSales || []).forEach(s => {
      const id = s.sellerId || 'unknown';
      if (!sellers[id]) sellers[id] = { name: s.sellerName || id, id, totalSales: 0, salesCount: 0, totalJoma: 0, totalDue: 0, totalCashbox: 0, auditCount: 0 };
      sellers[id].totalSales += Number(s.total) || 0;
      sellers[id].salesCount++;
    });
    (accountLogs || []).forEach(l => {
      const id = l.sellerId || 'unknown';
      if (!sellers[id]) sellers[id] = { name: l.sellerName || id, id, totalSales: 0, salesCount: 0, totalJoma: 0, totalDue: 0, totalCashbox: 0, auditCount: 0 };
      sellers[id].totalJoma += Number(l.joma) || 0;
      sellers[id].totalDue += Number(l.due) || 0;
      sellers[id].totalCashbox += Number(l.cashbox) || 0;
      sellers[id].auditCount++;
    });
    return Object.values(sellers).sort((a, b) => b.totalSales - a.totalSales);
  }, [rawSales, accountLogs]);

  const auditDetailData = useMemo(() => {
    if (!viewingAudit || !rawSales || !rawExpenses) return { sales: [], expenses: [] };
    const date = (viewingAudit.timestamp as Timestamp).toDate();
    
    const sales = (rawSales || []).filter(s => {
      const ts = s.timestamp as Timestamp;
      return ts && isSameDay(ts.toDate(), date);
    });

    const expenses = (rawExpenses || []).filter(e => {
      const ts = e.timestamp as Timestamp;
      return ts && isSameDay(ts.toDate(), date);
    });

    return { sales, expenses };
  }, [viewingAudit, rawSales, rawExpenses]);

  const handleAddProduct = () => {
    if (!firestore || !newProductName || !newProductPrice) return;
    const productData = { name: newProductName, price: parseFloat(newProductPrice), category: newProductCategory, stock: 0, timestamp: serverTimestamp() };
    addDoc(collection(firestore, "products"), productData)
      .then(() => { setNewProductName(""); setNewProductPrice(""); })
      .catch(async () => {
        errorEmitter.emit("permission-error", new FirestorePermissionError({ path: "products", operation: "create", requestResourceData: productData }));
      });
  };

  const handleAddOverheadConfig = () => {
    if (!firestore || !newOverheadLabel || !newOverheadAmount) return;
    const configData = { label: newOverheadLabel, amount: parseFloat(newOverheadAmount) };
    addDoc(collection(firestore, "overhead_configs"), configData)
      .then(() => {
        setNewOverheadLabel("");
        setNewOverheadAmount("");
        toast({ title: "Overhead Added", description: `${configData.label} is now part of the monthly engine.` });
      })
      .catch(async () => {
        errorEmitter.emit("permission-error", new FirestorePermissionError({ path: "overhead_configs", operation: "create", requestResourceData: configData }));
      });
  };

  const handleAddBuyRecord = async () => {
    if (!firestore || !buyAmount || !buyDesc) return;
    setIsBuySubmitting(true);
    const buyData = {
      description: buyDesc,
      amount: parseFloat(buyAmount),
      category: "Procurement",
      timestamp: Timestamp.fromDate(buyDate),
      addedByAdmin: true
    };

    addDoc(collection(firestore, "expenses"), buyData)
      .then(() => {
        toast({ title: "Purchase Recorded", description: "Buy ledger updated." });
        setBuyDesc("");
        setBuyAmount("");
      })
      .catch(async () => {
        errorEmitter.emit("permission-error", new FirestorePermissionError({
          path: "expenses", operation: "create", requestResourceData: buyData
        }));
      })
      .finally(() => setIsBuySubmitting(false));
  };

  const handleDeleteProduct = (id: string) => {
    if (!firestore) return;
    deleteDoc(doc(firestore, "products", id))
      .catch(async () => {
        errorEmitter.emit("permission-error", new FirestorePermissionError({ path: `products/${id}`, operation: "delete" }));
      });
  };

  const handleDeleteOverheadConfig = (id: string) => {
    if (!firestore) return;
    deleteDoc(doc(firestore, "overhead_configs", id))
      .then(() => toast({ title: "Overhead Config Removed" }))
      .catch(async () => {
        errorEmitter.emit("permission-error", new FirestorePermissionError({ path: `overhead_configs/${id}`, operation: "delete" }));
      });
  };

  const handleDeleteRecord = (type: string, id: string) => {
    if (!firestore) return;
    const collectionName = type === 'sale' ? 'sales' : type === 'expense' ? 'expenses' : 'account_logs';
    deleteDoc(doc(firestore, collectionName, id))
      .then(() => toast({ title: "Record Deleted" }))
      .catch(async () => {
        errorEmitter.emit("permission-error", new FirestorePermissionError({ path: `${collectionName}/${id}`, operation: "delete" }));
      });
  };

  const handleUpdateProduct = () => {
    if (!firestore || !editingProduct || !editProductName || !editProductPrice) return;
    const updates = {
      name: editProductName,
      price: parseFloat(editProductPrice) || 0,
      stock: parseInt(editProductStock) || 0,
    };
    updateDoc(doc(firestore, "products", editingProduct.id), updates)
      .then(() => {
        toast({ title: "Product Updated", description: `${editProductName} catalog entry refreshed.` });
        setEditingProduct(null);
      })
      .catch(async () => {
        errorEmitter.emit("permission-error", new FirestorePermissionError({ path: `products/${editingProduct.id}`, operation: "update", requestResourceData: updates }));
      });
  };

  const handleAddJomaRecord = async () => {
    if (!firestore || !jomaAmount || !jomaSellerName) return;
    setIsJomaSubmitting(true);
    const jomaData = {
      joma: parseFloat(jomaAmount),
      cashbox: 0,
      due: 0,
      timestamp: Timestamp.fromDate(jomaDate),
      sellerId: "admin-manual",
      sellerName: jomaSellerName,
      addedByAdmin: true
    };
    addDoc(collection(firestore, "account_logs"), jomaData)
      .then(() => {
        toast({ title: "Joma Recorded", description: "Deposit logged to account ledger." });
        setJomaSellerName("");
        setJomaAmount("");
      })
      .catch(async () => {
        errorEmitter.emit("permission-error", new FirestorePermissionError({ path: "account_logs", operation: "create", requestResourceData: jomaData }));
      })
      .finally(() => setIsJomaSubmitting(false));
  };

  const handleAdminUpdateRecord = async () => {
    if (!firestore || !editingAdminRecord || !editAdminValue || !user) return;
    const type = editingAdminRecord.type === 'sale' ? 'sales' : 'expenses';
    const ref = doc(firestore, type, editingAdminRecord.id);
    const updates: any = { updatedAt: serverTimestamp(), updatedBy: user.email };
    if (type === 'sales') updates.total = parseFloat(editAdminValue);
    else { updates.amount = parseFloat(editAdminValue); if (editAdminDesc.trim()) updates.description = editAdminDesc.trim(); }
    updateDoc(ref, updates)
      .then(() => { toast({ title: "Record Updated" }); setEditingAdminRecord(null); })
      .catch(async () => { errorEmitter.emit("permission-error", new FirestorePermissionError({ path: `${type}/${editingAdminRecord.id}`, operation: "update", requestResourceData: updates })); });
  };

  const handleGenerateAI = async () => {
    setIsAiLoading(true);
    try {
      const result = await receiveWeeklyProfitSummary({});
      setAiSummary(result.summary);
    } catch (error) {
      console.error(error);
    } finally {
      setIsAiLoading(false);
    }
  };

  return (
    <div className="space-y-4 md:space-y-6 pb-12 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 md:gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <ShieldCheck className="text-secondary shrink-0" size={18} />
            <h2 className="text-lg md:text-2xl font-black font-headline tracking-tighter uppercase">SUPER ADMIN <span className="text-primary">COMMAND CENTER</span></h2>
          </div>
          <p className="text-muted-foreground text-[9px] md:text-xs font-bold uppercase tracking-widest">Global Shop Forensics & Supply Intelligence</p>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <Select value={period} onValueChange={(v: any) => setPeriod(v)}>
            <SelectTrigger className="flex-1 md:flex-none md:w-[140px] h-10 rounded-2xl border-border bg-muted font-black text-[10px] uppercase"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="weekly">Weekly</SelectItem><SelectItem value="monthly">Monthly</SelectItem><SelectItem value="yearly">Yearly</SelectItem><SelectItem value="all">All Time</SelectItem></SelectContent>
          </Select>
          <Button className="bg-primary text-primary-foreground font-black shadow-lg rounded-2xl h-10 px-4 md:px-6 uppercase tracking-widest text-[10px] shrink-0" onClick={handleGenerateAI} disabled={isAiLoading}>
            <BrainCircuit size={16} className="md:mr-2" />
            <span className="hidden md:inline">{isAiLoading ? "Processing..." : "Neural Forecast"}</span>
          </Button>
          <Button variant="outline" size="sm" onClick={() => setLang(lang === "bn" ? "en" : "bn")} className="rounded-2xl font-black text-[9px] uppercase border-border h-10 px-4 shrink-0">
            {lang === "bn" ? "EN" : "বাং"}
          </Button>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-4 md:space-y-6">
        <div className="fixed inset-x-0 bottom-0 z-40 overflow-x-auto border-t border-border bg-card pb-[env(safe-area-inset-bottom)] shadow-[0_-2px_10px_rgba(0,0,0,0.06)] md:static md:-mx-0 md:w-full md:border-0 md:bg-transparent md:pb-1 md:shadow-none">
          <TabsList className="flex h-16 w-max min-w-full gap-0 rounded-none bg-transparent p-0 md:inline-flex md:h-11 md:w-max md:gap-0.5 md:rounded-2xl md:border md:border-border md:bg-muted md:p-1 lg:h-12">
            <TabsTrigger value="overview" className="relative flex h-16 min-w-[72px] shrink-0 flex-col items-center justify-center gap-1 rounded-none font-black text-[8px] uppercase tracking-widest text-muted-foreground data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:shadow-none data-[state=active]:after:absolute data-[state=active]:after:top-0 data-[state=active]:after:left-1/2 data-[state=active]:after:-translate-x-1/2 data-[state=active]:after:h-1 data-[state=active]:after:w-8 data-[state=active]:after:rounded-full data-[state=active]:after:bg-primary data-[state=active]:after:content-[''] md:after:hidden md:h-auto md:min-w-[80px] md:flex-1 md:flex-row md:gap-0 md:rounded-xl md:px-4 md:py-1.5 md:text-[9px] md:data-[state=active]:bg-primary md:data-[state=active]:text-primary-foreground">
              <BarChart3 className="h-5 w-5 md:hidden" />
              <span className="leading-none">{lang === "bn" ? "এনালিটিক্স" : "Analytics"}</span>
            </TabsTrigger>
            <TabsTrigger value="inventory" className="relative flex h-16 min-w-[72px] shrink-0 flex-col items-center justify-center gap-1 rounded-none font-black text-[8px] uppercase tracking-widest text-muted-foreground data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:shadow-none data-[state=active]:after:absolute data-[state=active]:after:top-0 data-[state=active]:after:left-1/2 data-[state=active]:after:-translate-x-1/2 data-[state=active]:after:h-1 data-[state=active]:after:w-8 data-[state=active]:after:rounded-full data-[state=active]:after:bg-primary data-[state=active]:after:content-[''] md:after:hidden md:h-auto md:min-w-[80px] md:flex-1 md:flex-row md:gap-0 md:rounded-xl md:px-4 md:py-1.5 md:text-[9px] md:data-[state=active]:bg-primary md:data-[state=active]:text-primary-foreground">
              <Package className="h-5 w-5 md:hidden" />
              <span className="leading-none">{lang === "bn" ? "ইনভেন্টরি" : "Inventory"}</span>
            </TabsTrigger>
            <TabsTrigger value="history" className="relative flex h-16 min-w-[72px] shrink-0 flex-col items-center justify-center gap-1 rounded-none font-black text-[8px] uppercase tracking-widest text-muted-foreground data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:shadow-none data-[state=active]:after:absolute data-[state=active]:after:top-0 data-[state=active]:after:left-1/2 data-[state=active]:after:-translate-x-1/2 data-[state=active]:after:h-1 data-[state=active]:after:w-8 data-[state=active]:after:rounded-full data-[state=active]:after:bg-primary data-[state=active]:after:content-[''] md:after:hidden md:h-auto md:min-w-[80px] md:flex-1 md:flex-row md:gap-0 md:rounded-xl md:px-4 md:py-1.5 md:text-[9px] md:data-[state=active]:bg-primary md:data-[state=active]:text-primary-foreground">
              <History className="h-5 w-5 md:hidden" />
              <span className="leading-none">{lang === "bn" ? "লেনদেন" : "Transactions"}</span>
            </TabsTrigger>
            <TabsTrigger value="buy_joma" className="relative flex h-16 min-w-[72px] shrink-0 flex-col items-center justify-center gap-1 rounded-none font-black text-[8px] uppercase tracking-widest text-muted-foreground data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:shadow-none data-[state=active]:after:absolute data-[state=active]:after:top-0 data-[state=active]:after:left-1/2 data-[state=active]:after:-translate-x-1/2 data-[state=active]:after:h-1 data-[state=active]:after:w-8 data-[state=active]:after:rounded-full data-[state=active]:after:bg-primary data-[state=active]:after:content-[''] md:after:hidden md:h-auto md:min-w-[80px] md:flex-1 md:flex-row md:gap-0 md:rounded-xl md:px-4 md:py-1.5 md:text-[9px] md:data-[state=active]:bg-primary md:data-[state=active]:text-primary-foreground">
              <ShoppingCart className="h-5 w-5 md:hidden" />
              <span className="leading-none">{lang === "bn" ? "ক্রয় ও জমা" : "Buy & Joma"}</span>
            </TabsTrigger>
            <TabsTrigger value="closing" className="relative flex h-16 min-w-[72px] shrink-0 flex-col items-center justify-center gap-1 rounded-none font-black text-[8px] uppercase tracking-widest text-muted-foreground data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:shadow-none data-[state=active]:after:absolute data-[state=active]:after:top-0 data-[state=active]:after:left-1/2 data-[state=active]:after:-translate-x-1/2 data-[state=active]:after:h-1 data-[state=active]:after:w-8 data-[state=active]:after:rounded-full data-[state=active]:after:bg-primary data-[state=active]:after:content-[''] md:after:hidden md:h-auto md:min-w-[80px] md:flex-1 md:flex-row md:gap-0 md:rounded-xl md:px-4 md:py-1.5 md:text-[9px] md:data-[state=active]:bg-primary md:data-[state=active]:text-primary-foreground">
              <Wallet className="h-5 w-5 md:hidden" />
              <span className="leading-none">{lang === "bn" ? "হিসাব" : "Ledger"}</span>
            </TabsTrigger>
            <TabsTrigger value="overheads" className="relative flex h-16 min-w-[72px] shrink-0 flex-col items-center justify-center gap-1 rounded-none font-black text-[8px] uppercase tracking-widest text-muted-foreground data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:shadow-none data-[state=active]:after:absolute data-[state=active]:after:top-0 data-[state=active]:after:left-1/2 data-[state=active]:after:-translate-x-1/2 data-[state=active]:after:h-1 data-[state=active]:after:w-8 data-[state=active]:after:rounded-full data-[state=active]:after:bg-primary data-[state=active]:after:content-[''] md:after:hidden md:h-auto md:min-w-[80px] md:flex-1 md:flex-row md:gap-0 md:rounded-xl md:px-4 md:py-1.5 md:text-[9px] md:data-[state=active]:bg-primary md:data-[state=active]:text-primary-foreground">
              <Banknote className="h-5 w-5 md:hidden" />
              <span className="leading-none">{lang === "bn" ? "খরচ" : "Overheads"}</span>
            </TabsTrigger>
            <TabsTrigger value="sellers" className="relative flex h-16 min-w-[72px] shrink-0 flex-col items-center justify-center gap-1 rounded-none font-black text-[8px] uppercase tracking-widest text-muted-foreground data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:shadow-none data-[state=active]:after:absolute data-[state=active]:after:top-0 data-[state=active]:after:left-1/2 data-[state=active]:after:-translate-x-1/2 data-[state=active]:after:h-1 data-[state=active]:after:w-8 data-[state=active]:after:rounded-full data-[state=active]:after:bg-primary data-[state=active]:after:content-[''] md:after:hidden md:h-auto md:min-w-[80px] md:flex-1 md:flex-row md:gap-0 md:rounded-xl md:px-4 md:py-1.5 md:text-[9px] md:data-[state=active]:bg-primary md:data-[state=active]:text-primary-foreground">
              <Users className="h-5 w-5 md:hidden" />
              <span className="leading-none">{lang === "bn" ? "বিক্রেতা" : "Sellers"}</span>
            </TabsTrigger>
            <TabsTrigger value="profile" className="relative flex h-16 min-w-[72px] shrink-0 flex-col items-center justify-center gap-1 rounded-none font-black text-[8px] uppercase tracking-widest text-muted-foreground data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:shadow-none data-[state=active]:after:absolute data-[state=active]:after:top-0 data-[state=active]:after:left-1/2 data-[state=active]:after:-translate-x-1/2 data-[state=active]:after:h-1 data-[state=active]:after:w-8 data-[state=active]:after:rounded-full data-[state=active]:after:bg-primary data-[state=active]:after:content-[''] md:after:hidden md:h-auto md:min-w-[80px] md:flex-1 md:flex-row md:gap-0 md:rounded-xl md:px-4 md:py-1.5 md:text-[9px] md:data-[state=active]:bg-primary md:data-[state=active]:text-primary-foreground">
              <UserIcon className="h-5 w-5 md:hidden" />
              <span className="leading-none">{lang === "bn" ? "প্রোফাইল" : "Profile"}</span>
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="overview" className="space-y-4 md:space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 md:gap-4">
            <StatCard title="Revenue In" value={`৳${stats.totalRevenue.toLocaleString()}`} trend="up" icon={<DollarSign size={20} />} color="primary" />
            <div onClick={() => setIsBurnDetailOpen(true)} className="cursor-pointer">
              <StatCard title="Operational Burn" value={`৳${stats.totalExpenses.toLocaleString()}`} trend="down" icon={<TrendingDown size={20} />} color="destructive" />
            </div>
            <StatCard title="Liquidity" value={`৳${stats.netProfit.toLocaleString()}`} trend={stats.netProfit >= 0 ? "up" : "down"} icon={<TrendingUp size={20} />} color="secondary" />
            <StatCard title="Outstanding Due" value={`৳${stats.totalDue.toLocaleString()}`} subtitle="Total owed by customers" trend="none" icon={<AlertTriangle size={20} />} color={stats.totalDue > 0 ? "destructive" : "muted"} />
            <StatCard
              title="Target Efficiency"
              value={`${targetStats.progress}%`}
              subtitle={`৳${targetStats.todaySales.toLocaleString()} / ৳${Math.round(targetStats.dailyTarget).toLocaleString()} Goal`}
              trend={targetStats.progress >= 100 ? "up" : "none"}
              icon={<Target size={20} />}
              color={targetStats.progress >= 100 ? "primary" : "secondary"}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
            <Card className="lg:col-span-2 glass-morphism border-t-4 border-primary">
              <CardHeader><CardTitle className="text-sm font-black text-primary uppercase tracking-widest">Business Scenario Analysis</CardTitle></CardHeader>
              <CardContent className="h-[240px] md:h-[400px] pt-4">
                <ChartContainer config={{ 
                  sales: { label: "Revenue In (Sales)", color: "hsl(var(--primary))" },
                  expenses: { label: "Total Outflow (Burn)", color: "hsl(var(--destructive))" },
                  buy: { label: "Shopping / Procurement", color: "hsl(var(--secondary))" },
                  overheads: { label: "Monthly Overheads", color: "hsl(var(--muted-foreground))" }
                }}>
                  <BarChart data={stats.chartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--muted))" />
                    <XAxis dataKey="name" fontSize={10} fontWeight="bold" axisLine={false} tickLine={false} />
                    <YAxis fontSize={10} fontWeight="bold" axisLine={false} tickLine={false} tickFormatter={(v) => `৳${v}`} />
                    <Tooltip content={<ChartTooltipContent />} />
                    <Legend wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase', paddingTop: '20px' }} />
                    <Bar dataKey="sales" name="Revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="expenses" name="Total Outflow" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="buy" name="Procurement" fill="hsl(var(--secondary))" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="overheads" name="Overheads" fill="hsl(var(--muted-foreground))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ChartContainer>
              </CardContent>
            </Card>
            <Card className="glass-morphism border-t-4 border-secondary">
              <CardHeader><CardTitle className="text-sm font-black text-secondary uppercase tracking-widest flex items-center gap-2"><BrainCircuit size={18} /> AI Insight Engine</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                {aiSummary ? <div className="text-[11px] font-bold border-l-2 border-secondary/20 pl-4 py-1">{aiSummary.split('\n').map((line, i) => <p key={i} className="mb-2">{line}</p>)}</div> : <div className="flex flex-col items-center justify-center py-20 opacity-40"><BrainCircuit size={40} className="mb-4" /><p className="text-[10px] font-black uppercase tracking-widest">Engine Standby</p></div>}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="inventory" className="space-y-4 md:space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
            <Card className="glass-morphism border-t-4 border-primary shadow-xl">
              <CardHeader><CardTitle className="text-sm font-black text-primary uppercase tracking-widest">Add Product</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2"><Label className="text-[10px] font-black uppercase tracking-widest">Name</Label><Input value={newProductName} onChange={(e) => setNewProductName(e.target.value)} className="bg-muted border-border font-black h-12 rounded-xl" /></div>
                <div className="space-y-2"><Label className="text-[10px] font-black uppercase tracking-widest">Price (৳)</Label><Input type="number" value={newProductPrice} onChange={(e) => setNewProductPrice(e.target.value)} className="bg-muted border-border font-black h-12 rounded-xl" /></div>
                <Button onClick={handleAddProduct} className="w-full bg-primary font-black uppercase tracking-widest h-14 rounded-2xl shadow-xl">Deploy Product</Button>
              </CardContent>
            </Card>
            <Card className="lg:col-span-2 glass-morphism">
              <CardHeader><CardTitle className="text-sm font-black uppercase tracking-widest">Live Catalog</CardTitle></CardHeader>
              <CardContent className="p-0">
                <div className="max-h-[500px] overflow-y-auto">
                  {products?.map((p: any) => (
                    <div key={p.id} className="flex justify-between items-center p-4 border-b border-border/30 hover:bg-muted/50 transition-colors gap-4">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-black uppercase truncate">{p.name}</p>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase">{p.category}</p>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className={`text-[9px] font-black uppercase border px-2 py-1 rounded-lg ${(p.stock ?? 0) === 0 ? 'text-destructive border-destructive/30 bg-destructive/5' : 'text-muted-foreground border-border/50'}`}>
                          Stock: {p.stock ?? 0}
                        </span>
                        <p className="text-sm font-black text-primary">৳{p.price}</p>
                        <Button variant="ghost" size="icon" onClick={() => { setEditingProduct(p); setEditProductName(p.name); setEditProductPrice(String(p.price)); setEditProductStock(String(p.stock ?? 0)); }} className="text-secondary h-10 w-10"><Edit3 size={16} /></Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDeleteProduct(p.id)} className="text-destructive h-10 w-10"><Trash2 size={16} /></Button>
                      </div>
                    </div>
                  ))}
                  {!products?.length && <p className="text-center py-10 text-[10px] uppercase font-bold text-muted-foreground">No products. Add one above.</p>}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="history" className="space-y-6">
          <Card className="glass-morphism">
            <CardHeader className="flex flex-row items-center justify-between border-b bg-muted/20 py-4 gap-4">
              <CardTitle className="text-sm font-black uppercase tracking-widest shrink-0">Transaction Forensic Log</CardTitle>
              <div className="relative flex-1 max-w-xs">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search seller, description..."
                  className="pl-8 h-9 text-[10px] font-black bg-muted border-border rounded-xl"
                />
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="max-h-[600px] overflow-y-auto">
                <Tabs defaultValue="all_sales">
                   <div className="px-6 py-4 border-b">
                     <TabsList className="bg-muted/50 p-1">
                       <TabsTrigger value="all_sales" className="text-[9px] font-black uppercase px-4">Sales</TabsTrigger>
                       <TabsTrigger value="all_expenses" className="text-[9px] font-black uppercase px-4">Expenses</TabsTrigger>
                     </TabsList>
                   </div>
                   <TabsContent value="all_sales" className="mt-0">
                     {stats.sales.filter(sale =>
                       !searchQuery ||
                       (sale.sellerName || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
                       sale.id.toLowerCase().includes(searchQuery.toLowerCase())
                     ).map((sale: any) => (
                        <div key={sale.id} className="p-6 border-b border-border/30 hover:bg-muted/30 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-secondary/10 flex items-center justify-center"><History className="text-secondary" size={20} /></div>
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-black uppercase tracking-tight">TXN#{sale.id.slice(-6).toUpperCase()}</p>
                              </div>
                              <p className="text-[10px] font-bold text-muted-foreground uppercase mt-1 flex items-center gap-1.5"><UserIcon size={10} /> {sale.sellerName} | <Clock size={10} /> {sale.timestamp?.toDate()?.toLocaleString()}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <p className="text-lg font-black text-primary tracking-tighter">৳{(Number(sale.total) || 0).toLocaleString()}</p>
                            <Button variant="ghost" size="icon" onClick={() => { setEditingAdminRecord({ ...sale, type: 'sale' }); setEditAdminValue(String(sale.total || '')); setEditAdminDesc(''); }} className="text-secondary h-9 w-9"><Edit3 size={15} /></Button>
                            <Button variant="ghost" size="icon" onClick={() => handleDeleteRecord('sales', sale.id)} className="text-destructive h-9 w-9"><Trash2 size={15} /></Button>
                          </div>
                        </div>
                      ))}
                     {stats.sales.filter(sale => !searchQuery || (sale.sellerName || "").toLowerCase().includes(searchQuery.toLowerCase()) || sale.id.toLowerCase().includes(searchQuery.toLowerCase())).length === 0 && (
                       <p className="text-center py-10 text-[10px] uppercase font-bold text-muted-foreground">No sales match your search.</p>
                     )}
                   </TabsContent>
                   <TabsContent value="all_expenses" className="mt-0">
                     {stats.expenses.filter(exp =>
                       !searchQuery ||
                       (exp.description || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
                       (exp.category || "").toLowerCase().includes(searchQuery.toLowerCase())
                     ).map((exp: any) => (
                        <div key={exp.id} className="p-6 border-b border-border/30 hover:bg-muted/30 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-destructive/10 flex items-center justify-center"><Banknote className="text-destructive" size={20} /></div>
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-black uppercase tracking-tight">{exp.description}</p>
                                {exp.isOverhead && <span className="text-[8px] bg-secondary/10 text-secondary px-2 py-0.5 rounded-full font-black border border-secondary/20">FIXED OVERHEAD</span>}
                              </div>
                              <p className="text-[10px] font-bold text-muted-foreground uppercase mt-1 flex items-center gap-1.5"><Tags size={10} /> {exp.category} | <Clock size={10} /> {exp.timestamp?.toDate()?.toLocaleString()}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <p className="text-lg font-black text-destructive tracking-tighter">৳{(Number(exp.amount) || 0).toLocaleString()}</p>
                            <Button variant="ghost" size="icon" onClick={() => { setEditingAdminRecord({ ...exp, type: 'expense' }); setEditAdminValue(String(exp.amount || '')); setEditAdminDesc(exp.description || ''); }} className="text-secondary h-9 w-9"><Edit3 size={15} /></Button>
                            <Button variant="ghost" size="icon" onClick={() => handleDeleteRecord('expenses', exp.id)} className="text-destructive h-9 w-9"><Trash2 size={15} /></Button>
                          </div>
                        </div>
                      ))}
                     {stats.expenses.filter(exp => !searchQuery || (exp.description || "").toLowerCase().includes(searchQuery.toLowerCase()) || (exp.category || "").toLowerCase().includes(searchQuery.toLowerCase())).length === 0 && (
                       <p className="text-center py-10 text-[10px] uppercase font-bold text-muted-foreground">No expenses match your search.</p>
                     )}
                   </TabsContent>
                </Tabs>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="buy_joma" className="space-y-4 md:space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            <Card className="glass-morphism border-t-4 border-primary shadow-xl">
              <CardHeader className="flex flex-row items-center justify-between border-b bg-primary/5 py-4">
                <div>
                  <CardTitle className="text-sm font-black uppercase tracking-widest text-primary">Joma (Deposits) Summary</CardTitle>
                  <CardDescription className="text-[10px] font-bold uppercase mt-1">Total capital collected from sellers</CardDescription>
                </div>
                <Coins className="text-primary/30" size={24} />
              </CardHeader>
              <CardContent className="pt-6">
                <div className="bg-primary/5 p-4 rounded-xl border border-primary/10 mb-6 space-y-4">
                  <div className="flex items-center gap-2 mb-2">
                    <PlusCircle className="text-primary" size={14} />
                    <span className="text-[10px] font-black uppercase tracking-widest text-primary">Manual Joma Entry</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-[8px] font-black uppercase text-muted-foreground">Seller / Name</Label>
                      <Input value={jomaSellerName} onChange={(e) => setJomaSellerName(e.target.value)} placeholder="Seller name" className="h-10 rounded-xl bg-white/50 font-black text-[10px]" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[8px] font-black uppercase text-muted-foreground">Amount (৳)</Label>
                      <Input type="number" value={jomaAmount} onChange={(e) => setJomaAmount(e.target.value)} placeholder="0.00" className="h-10 rounded-xl bg-white/50 font-black text-[10px] text-primary" />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[8px] font-black uppercase text-muted-foreground">Entry Date</Label>
                    <div className="flex gap-2">
                      <Popover open={isJomaDateOpen} onOpenChange={setIsJomaDateOpen}>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className="flex-1 justify-start text-left font-bold h-10 rounded-xl bg-white/50 border-border text-[10px]">
                            <CalendarIcon className="mr-2 h-3 w-3" />
                            {format(jomaDate, "PP")}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar mode="single" selected={jomaDate} onSelect={(d) => { if (d) { setJomaDate(d); setIsJomaDateOpen(false); } }} initialFocus />
                        </PopoverContent>
                      </Popover>
                      <Button onClick={handleAddJomaRecord} disabled={isJomaSubmitting} className="bg-primary h-10 font-black uppercase text-[10px] px-6 rounded-xl">
                        {isJomaSubmitting ? <Loader2 className="animate-spin h-3 w-3" /> : "Commit"}
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="text-center py-4 border-b border-border mb-4">
                  <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Aggregate Joma Inflow</p>
                  <h3 className="text-4xl font-black text-primary tracking-tighter">৳{stats.totalJoma.toLocaleString()}</h3>
                </div>
                <div className="max-h-[300px] overflow-y-auto space-y-2 pr-2">
                  {stats.logs.map((log: any) => (
                    <div key={log.id} className="flex justify-between items-center p-4 rounded-xl border border-border/30 hover:bg-primary/5 transition-all group">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                          <Clock size={16} />
                        </div>
                        <div>
                          <p className="text-xs font-black uppercase tracking-tight flex items-center gap-2">
                            {log.sellerName}
                            {log.addedByAdmin && <span className="text-[8px] bg-secondary/10 text-secondary px-1.5 py-0.5 rounded-full border border-secondary/20">ADMIN</span>}
                          </p>
                          <p className="text-[9px] font-bold text-muted-foreground uppercase">{log.timestamp?.toDate()?.toLocaleString()}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-black text-primary">৳{(Number(log.joma) || 0).toLocaleString()}</p>
                        <p className="text-[8px] font-black text-muted-foreground uppercase tracking-widest">Verified</p>
                      </div>
                    </div>
                  ))}
                  {!stats.logs.length && <p className="text-center py-6 text-[10px] uppercase font-bold text-muted-foreground">No deposits recorded.</p>}
                </div>
              </CardContent>
            </Card>

            <Card className="glass-morphism border-t-4 border-destructive shadow-xl">
              <CardHeader className="flex flex-row items-center justify-between border-b bg-destructive/5 py-4">
                <div>
                  <CardTitle className="text-sm font-black uppercase tracking-widest text-destructive">Buy (Purchases) Summary</CardTitle>
                  <CardDescription className="text-[10px] font-bold uppercase mt-1">Capital spent on inventory and shop shopping</CardDescription>
                </div>
                <ShoppingCart className="text-destructive/30" size={24} />
              </CardHeader>
              <CardContent className="pt-6">
                <div className="bg-destructive/5 p-4 rounded-xl border border-destructive/10 mb-6 space-y-4">
                  <div className="flex items-center gap-2 mb-2">
                    <PlusCircle className="text-destructive" size={14} />
                    <span className="text-[10px] font-black uppercase tracking-widest text-destructive">Manual Procurement Entry</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-[8px] font-black uppercase text-muted-foreground">Entry Date</Label>
                      <Popover open={isBuyDateOpen} onOpenChange={setIsBuyDateOpen}>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className="w-full justify-start text-left font-bold h-10 rounded-xl bg-white/50 border-border text-[10px]">
                            <CalendarIcon className="mr-2 h-3 w-3" />
                            {buyDate ? format(buyDate, "PP") : "Pick date"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar mode="single" selected={buyDate} onSelect={(d) => { if (d) { setBuyDate(d); setIsBuyDateOpen(false); } }} initialFocus />
                        </PopoverContent>
                      </Popover>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[8px] font-black uppercase text-muted-foreground">Amount (৳)</Label>
                      <Input type="number" value={buyAmount} onChange={(e) => setBuyAmount(e.target.value)} placeholder="0.00" className="h-10 rounded-xl bg-white/50 font-black text-[10px] text-destructive" />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[8px] font-black uppercase text-muted-foreground">Purchase Detail</Label>
                    <div className="flex gap-2">
                      <Input value={buyDesc} onChange={(e) => setBuyDesc(e.target.value)} placeholder="e.g. Bulk Rice Stock" className="h-10 rounded-xl bg-white/50 font-black text-[10px] flex-1" />
                      <Button onClick={handleAddBuyRecord} disabled={isBuySubmitting} className="bg-destructive h-10 font-black uppercase text-[10px] px-6 rounded-xl">
                        {isBuySubmitting ? <Loader2 className="animate-spin h-3 w-3" /> : "Commit"}
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="text-center py-6 border-b border-border mb-6">
                  <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Aggregate Shopping Value</p>
                  <h3 className="text-4xl font-black text-destructive tracking-tighter">৳{stats.totalBuy.toLocaleString()}</h3>
                </div>
                <div className="max-h-[400px] overflow-y-auto space-y-2 pr-2">
                  {stats.expenses
                    .filter(e => {
                      const cat = (e.category || "").toLowerCase();
                      const desc = (e.description || "").toLowerCase();
                      return ['procurement', 'buy', 'purchase', 'shopping', 'stock'].some(c => cat.includes(c) || desc.includes(c));
                    })
                    .map((exp: any) => (
                      <div key={exp.id} className="flex justify-between items-center p-4 rounded-xl border border-border/30 hover:bg-destructive/5 transition-all group">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center group-hover:bg-destructive group-hover:text-destructive-foreground transition-colors">
                            <Clock size={16} />
                          </div>
                          <div>
                            <p className="text-xs font-black uppercase tracking-tight">{exp.description}</p>
                            <p className="text-[9px] font-bold text-muted-foreground uppercase">{exp.timestamp?.toDate()?.toLocaleString()}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-black text-destructive">৳{(Number(exp.amount) || 0).toLocaleString()}</p>
                          <p className="text-[8px] font-black text-muted-foreground uppercase tracking-widest">Burned</p>
                        </div>
                      </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="closing" className="space-y-6">
          <Card className="glass-morphism border-t-4 border-secondary shadow-xl overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between border-b bg-secondary/5 py-4">
              <div>
                <CardTitle className="text-sm font-black uppercase tracking-widest">Daily Closing Ledger</CardTitle>
                <CardDescription className="text-[10px] font-bold uppercase mt-1">Audit trail for Cashbox, Joma, and Due submissions</CardDescription>
              </div>
              <ClipboardCheck className="text-secondary/30" size={24} />
            </CardHeader>
            <CardContent className="p-0">
              <div className="max-h-[600px] overflow-y-auto">
                {accountLogs?.map((log: any) => {
                  const dayKey = log.timestamp ? format((log.timestamp as Timestamp).toDate(), 'yyyy-MM-dd') : null;
                  const dayData = dayKey ? dailyTotals[dayKey] : null;
                  const systemNet = dayData ? dayData.sales - dayData.expenses : null;
                  const reportedTotal = (Number(log.cashbox) || 0) + (Number(log.joma) || 0);
                  const discrepancy = systemNet !== null ? systemNet - reportedTotal : null;
                  const hasGap = discrepancy !== null && Math.abs(discrepancy) > 1;
                  return (
                  <div
                    key={log.id}
                    onClick={() => setViewingAudit(log)}
                    className="p-6 border-b border-border/30 hover:bg-secondary/5 transition-all flex flex-col md:flex-row md:items-center justify-between gap-6 cursor-pointer group relative overflow-hidden"
                  >
                    <div className="absolute right-4 top-4 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Eye size={16} className="text-secondary" />
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-secondary/10 flex items-center justify-center"><Wallet className="text-secondary" size={20} /></div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-black uppercase tracking-tight">Closing Audit Report</p>
                          {hasGap && (
                            <span className={`text-[8px] font-black px-2 py-0.5 rounded-full border ${discrepancy! < 0 ? 'bg-destructive/10 text-destructive border-destructive/20' : 'bg-amber-500/10 text-amber-500 border-amber-500/20'}`}>
                              {discrepancy! < 0 ? `SHORT ৳${Math.abs(discrepancy!).toLocaleString()}` : `EXCESS ৳${discrepancy!.toLocaleString()}`}
                            </span>
                          )}
                          {!hasGap && discrepancy !== null && (
                            <span className="text-[8px] font-black px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">BALANCED</span>
                          )}
                        </div>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase mt-1 flex items-center gap-1.5"><UserIcon size={10} /> {log.sellerName} | <Clock size={10} /> {log.timestamp?.toDate()?.toLocaleString()}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-6 text-center">
                      <div className="space-y-1">
                        <p className="text-[8px] font-black text-muted-foreground uppercase tracking-widest flex items-center justify-center gap-1"><Wallet size={10} className="text-secondary" /> Cashbox</p>
                        <p className="text-xs font-black text-foreground">৳{(Number(log.cashbox) || 0).toLocaleString()}</p>
                      </div>
                      <div className="space-y-1 border-x border-border/50 px-4">
                        <p className="text-[8px] font-black text-muted-foreground uppercase tracking-widest flex items-center justify-center gap-1"><ArrowDownCircle size={10} className="text-primary" /> Joma</p>
                        <p className="text-xs font-black text-foreground">৳{(Number(log.joma) || 0).toLocaleString()}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[8px] font-black text-muted-foreground uppercase tracking-widest flex items-center justify-center gap-1"><ArrowUpCircle size={10} className="text-destructive" /> Due</p>
                        <p className="text-xs font-black text-foreground">৳{(Number(log.due) || 0).toLocaleString()}</p>
                      </div>
                    </div>
                  </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sellers" className="space-y-6">
          <Card className="glass-morphism border-t-4 border-primary shadow-xl overflow-hidden">
            <CardHeader className="border-b bg-primary/5 py-4">
              <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                <Users size={16} className="text-primary" /> Seller Money Report
              </CardTitle>
              <CardDescription className="text-[10px] font-bold uppercase mt-1">All-time breakdown per seller — sales, deposits, outstanding dues</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-[10px] font-black uppercase">
                  <thead>
                    <tr className="border-b bg-muted/30">
                      <th className="text-left p-4 tracking-widest text-muted-foreground">Seller</th>
                      <th className="text-right p-4 tracking-widest text-primary">Sales</th>
                      <th className="text-right p-4 tracking-widest text-primary">Txns</th>
                      <th className="text-right p-4 tracking-widest text-secondary">Joma (Deposited)</th>
                      <th className="text-right p-4 tracking-widest text-destructive">Due (Owed)</th>
                      <th className="text-right p-4 tracking-widest text-muted-foreground">Cashbox Reported</th>
                      <th className="text-right p-4 tracking-widest">Audits</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sellerSummary.map((s) => (
                      <tr key={s.id} className="border-b border-border/30 hover:bg-muted/30 transition-colors">
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                              <UserIcon size={14} className="text-primary" />
                            </div>
                            <span className="font-black">{s.name}</span>
                          </div>
                        </td>
                        <td className="p-4 text-right text-primary font-black">৳{s.totalSales.toLocaleString()}</td>
                        <td className="p-4 text-right text-muted-foreground">{s.salesCount}</td>
                        <td className="p-4 text-right text-secondary font-black">৳{s.totalJoma.toLocaleString()}</td>
                        <td className="p-4 text-right">
                          <span className={s.totalDue > 0 ? 'text-destructive' : 'text-muted-foreground'}>
                            ৳{s.totalDue.toLocaleString()}
                          </span>
                        </td>
                        <td className="p-4 text-right text-muted-foreground">৳{s.totalCashbox.toLocaleString()}</td>
                        <td className="p-4 text-right text-muted-foreground">{s.auditCount}</td>
                      </tr>
                    ))}
                    {sellerSummary.length === 0 && (
                      <tr><td colSpan={7} className="text-center py-10 text-muted-foreground">No seller data yet.</td></tr>
                    )}
                  </tbody>
                  {sellerSummary.length > 0 && (
                    <tfoot>
                      <tr className="border-t-2 border-border bg-muted/20">
                        <td className="p-4 font-black text-muted-foreground">TOTAL</td>
                        <td className="p-4 text-right text-primary font-black">৳{sellerSummary.reduce((a, s) => a + s.totalSales, 0).toLocaleString()}</td>
                        <td className="p-4 text-right text-muted-foreground">{sellerSummary.reduce((a, s) => a + s.salesCount, 0)}</td>
                        <td className="p-4 text-right text-secondary font-black">৳{sellerSummary.reduce((a, s) => a + s.totalJoma, 0).toLocaleString()}</td>
                        <td className="p-4 text-right text-destructive font-black">৳{sellerSummary.reduce((a, s) => a + s.totalDue, 0).toLocaleString()}</td>
                        <td className="p-4 text-right text-muted-foreground">৳{sellerSummary.reduce((a, s) => a + s.totalCashbox, 0).toLocaleString()}</td>
                        <td className="p-4 text-right text-muted-foreground">{sellerSummary.reduce((a, s) => a + s.auditCount, 0)}</td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="overheads" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
             <Card className="glass-morphism border-t-4 border-secondary shadow-xl h-full">
                <CardHeader className="flex flex-row items-center justify-between border-b bg-secondary/5 py-4">
                  <div>
                    <CardTitle className="text-sm font-black uppercase tracking-widest text-secondary">Overhead Configurations</CardTitle>
                    <CardDescription className="text-[10px] font-bold uppercase mt-1">Manage dynamic monthly fixed costs</CardDescription>
                  </div>
                  <Settings className="text-secondary/30" size={24} />
                </CardHeader>
                <CardContent className="pt-6 space-y-6">
                  <div className="bg-secondary/5 p-4 rounded-xl border border-secondary/10 space-y-4">
                    <div className="flex items-center gap-2 mb-2">
                      <PlusCircle className="text-secondary" size={14} />
                      <span className="text-[10px] font-black uppercase tracking-widest text-secondary">Add New Overhead</span>
                    </div>
                    <div className="space-y-3">
                      <div className="space-y-1">
                        <Label className="text-[8px] font-black uppercase text-muted-foreground">Label</Label>
                        <Input value={newOverheadLabel} onChange={(e) => setNewOverheadLabel(e.target.value)} placeholder="e.g. Electricity Bill" className="h-10 rounded-xl bg-white/50 font-black text-[10px]" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[8px] font-black uppercase text-muted-foreground">Monthly Amount (৳)</Label>
                        <div className="flex gap-2">
                          <Input type="number" value={newOverheadAmount} onChange={(e) => setNewOverheadAmount(e.target.value)} placeholder="0.00" className="h-10 rounded-xl bg-white/50 font-black text-[10px] flex-1" />
                          <Button onClick={handleAddOverheadConfig} className="bg-secondary h-10 font-black uppercase text-[10px] px-6 rounded-xl">Add</Button>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-3">Active Overheads</p>
                    {overheadConfigs?.map((config: any) => (
                      <div key={config.id} className="flex justify-between items-center p-4 bg-muted/30 rounded-xl border border-border group">
                         <div>
                            <span className="text-xs font-black uppercase tracking-widest">{config.label}</span>
                            <p className="text-[8px] font-bold text-muted-foreground uppercase">Autonomous Fixed Cost</p>
                         </div>
                         <div className="flex items-center gap-4">
                            <span className="text-sm font-black text-secondary">৳{Number(config.amount).toLocaleString()}</span>
                            <Button variant="ghost" size="icon" onClick={() => handleDeleteOverheadConfig(config.id)} className="text-destructive h-8 w-8 opacity-0 group-hover:opacity-100 transition-all">
                              <Trash2 size={14} />
                            </Button>
                         </div>
                      </div>
                    ))}
                  </div>

                  <div className="p-4 bg-secondary/10 rounded-xl border border-secondary/20 flex flex-col items-center justify-center gap-2">
                    <div className="flex items-center gap-2 text-secondary">
                      <CheckCircle2 size={16} className="animate-pulse" />
                      <span className="text-[10px] font-black uppercase tracking-widest">Autonomous Engine Active</span>
                    </div>
                    <p className="text-lg font-black text-secondary tracking-tighter">
                      ৳{overheadConfigs?.reduce((acc: number, c: any) => acc + (Number(c.amount) || 0), 0).toLocaleString()} Total Monthly
                    </p>
                  </div>
                  <div className="p-4 bg-muted/20 border border-border/50 rounded-xl text-center">
                    <p className="text-[9px] text-muted-foreground uppercase font-bold leading-relaxed">
                      System automatically logs active overheads for the current month upon your first visit. Updates take effect immediately.
                    </p>
                  </div>
                </CardContent>
             </Card>

             <Card className="glass-morphism border-t-4 border-primary shadow-xl h-full">
                <CardHeader className="flex flex-row items-center justify-between border-b bg-primary/5 py-4">
                  <div>
                    <CardTitle className="text-sm font-black uppercase tracking-widest text-primary">Break-even Threshold</CardTitle>
                    <CardDescription className="text-[10px] font-bold uppercase mt-1">Minimum daily sales to cover overheads</CardDescription>
                  </div>
                  <Target className="text-primary/30" size={24} />
                </CardHeader>
                <CardContent className="pt-6 space-y-6">
                  <div className="text-center py-6">
                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-2">Calculated Daily Target</p>
                    <h3 className="text-4xl font-black text-primary tracking-tighter">৳{Math.round(targetStats.dailyTarget).toLocaleString()}</h3>
                    <p className="text-[9px] font-bold text-muted-foreground uppercase mt-2">Based on current month ({(new Date()).toLocaleString('default', { month: 'long' })})</p>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
                      <span className="text-muted-foreground">Today's Achievement</span>
                      <span className="text-primary">{targetStats.progress}%</span>
                    </div>
                    <div className="h-4 bg-muted rounded-full overflow-hidden border border-border">
                      <div 
                        className="h-full bg-primary transition-all duration-1000 ease-out flex items-center justify-end px-2"
                        style={{ width: `${targetStats.progress}%` }}
                      >
                         {targetStats.progress >= 20 && <Zap size={10} className="text-primary-foreground animate-pulse" />}
                      </div>
                    </div>
                    <p className="text-[9px] font-bold text-center uppercase text-muted-foreground leading-relaxed">
                      {targetStats.progress >= 100 
                        ? "THRESHOLD REACHED: FIXED COSTS COVERED FOR TODAY." 
                        : `৳${(Math.round(targetStats.dailyTarget) - targetStats.todaySales).toLocaleString()} MORE NEEDED TO BEAR TODAY'S MINIMUM EXPENSE.`
                      }
                    </p>
                  </div>
                </CardContent>
             </Card>
          </div>
        </TabsContent>

        <TabsContent value="profile">
          <ProfileTab lang={lang} role="admin" />
        </TabsContent>
      </Tabs>

      {/* Burn Detail Dialog */}
      <Dialog open={isBurnDetailOpen} onOpenChange={setIsBurnDetailOpen}>
        <DialogContent className="glass-morphism border-t-4 border-destructive max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2 text-destructive">
              <TrendingDown />
              Operational Burn: Calculation Factors
            </DialogTitle>
            <p className="text-[10px] font-bold uppercase text-muted-foreground">Detailed breakdown of all expenses for the selected period ({period})</p>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-y-auto pr-2 space-y-2 mt-4">
            {stats.expenses.map((exp: any) => (
              <div key={exp.id} className="p-4 bg-muted/30 rounded-xl border border-border flex justify-between items-center hover:bg-destructive/5 transition-all group">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-[10px] font-black uppercase">{exp.description}</p>
                    {exp.isOverhead && <span className="text-[8px] bg-secondary/10 text-secondary px-2 py-0.5 rounded-full font-black">FIXED OVERHEAD</span>}
                  </div>
                  <p className="text-[8px] font-bold text-muted-foreground uppercase mt-1">
                    Category: {exp.category} | {exp.timestamp?.toDate()?.toLocaleString()}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <p className="text-sm font-black text-destructive">৳{(Number(exp.amount) || 0).toLocaleString()}</p>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => handleDeleteRecord('expense', exp.id)} 
                    className="text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-all"
                  >
                    <Trash2 size={14} />
                  </Button>
                </div>
              </div>
            ))}
            {stats.expenses.length === 0 && <p className="text-center py-10 text-muted-foreground uppercase font-black text-[10px]">No expense factors found</p>}
          </div>
          <div className="bg-destructive/5 border border-destructive/20 p-4 rounded-xl flex justify-between items-center mt-4">
            <p className="text-[10px] font-black uppercase text-destructive">Total Aggregated Outflow</p>
            <p className="text-xl font-black text-destructive tracking-tighter">৳{stats.totalExpenses.toLocaleString()}</p>
          </div>
        </DialogContent>
      </Dialog>

      {/* Audit Detail Dialog */}
      <Dialog open={!!viewingAudit} onOpenChange={() => setViewingAudit(null)}>
        <DialogContent className="glass-morphism border-t-4 border-secondary max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
              <ClipboardCheck className="text-secondary" />
              Audit Forensic Detail: {viewingAudit && format((viewingAudit.timestamp as Timestamp).toDate(), "PPP")}
            </DialogTitle>
            <p className="text-[10px] font-bold uppercase text-muted-foreground">Reported by: {viewingAudit?.sellerName}</p>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4 max-h-[60vh] overflow-y-auto pr-2">
            <div className="space-y-4">
              <h4 className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2 border-b border-primary/20 pb-2">
                <ShoppingCart size={14} /> Total Sales Volume
              </h4>
              <div className="space-y-2">
                {auditDetailData.sales.map((sale: any) => (
                  <div key={sale.id} className="p-3 bg-muted/30 rounded-xl border border-border flex justify-between items-center group hover:bg-primary/5 hover:border-primary/20 transition-all">
                    <div>
                      <p className="text-[10px] font-black uppercase">Order #{sale.id.slice(-4).toUpperCase()}</p>
                      <p className="text-[8px] font-bold text-muted-foreground uppercase">{format((sale.timestamp as Timestamp).toDate(), "hh:mm a")}</p>
                    </div>
                    <p className="text-xs font-black text-primary">৳{(Number(sale.total) || 0).toLocaleString()}</p>
                  </div>
                ))}
                {!auditDetailData.sales.length && <p className="text-[9px] text-muted-foreground italic uppercase text-center py-6">No sales recorded.</p>}
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
                    <p className="text-xs font-black text-destructive">৳{(Number(exp.amount) || 0).toLocaleString()}</p>
                  </div>
                ))}
                {!auditDetailData.expenses.length && <p className="text-[9px] text-muted-foreground italic uppercase text-center py-6">No expenses recorded.</p>}
              </div>
            </div>
          </div>
          <div className="bg-secondary/5 border border-secondary/20 p-4 rounded-xl flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-secondary/10 flex items-center justify-center">
                <Wallet className="text-secondary" size={18} />
              </div>
              <div>
                <p className="text-[8px] font-black text-muted-foreground uppercase tracking-widest">Seller Reported Cash</p>
                <p className="text-lg font-black text-secondary tracking-tighter">৳{(Number(viewingAudit?.cashbox) || 0).toLocaleString()}</p>
              </div>
            </div>
            <ArrowRight className="text-secondary/30" />
            <div className="text-right">
              <p className="text-[8px] font-black text-muted-foreground uppercase tracking-widest">System Net Balance</p>
              <p className="text-lg font-black text-foreground tracking-tighter">
                ৳{(auditDetailData.sales.reduce((a, b) => a + (Number(b.total) || 0), 0) - auditDetailData.expenses.reduce((a, b) => a + (Number(b.amount) || 0), 0)).toLocaleString()}
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Admin Edit Record Dialog */}
      <Dialog open={!!editingAdminRecord} onOpenChange={() => setEditingAdminRecord(null)}>
        <DialogContent className="glass-morphism border-t-4 border-secondary max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
              <Edit3 className="text-secondary" size={16} />
              Edit {editingAdminRecord?.type === 'sale' ? 'Sale' : 'Expense'} Record
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {editingAdminRecord?.type === 'expense' && (
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Description</Label>
                <Input value={editAdminDesc} onChange={(e) => setEditAdminDesc(e.target.value)} className="bg-muted border-border font-black h-12 rounded-xl" />
              </div>
            )}
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                {editingAdminRecord?.type === 'sale' ? 'Sale Total (৳)' : 'Amount (৳)'}
              </Label>
              <Input type="number" value={editAdminValue} onChange={(e) => setEditAdminValue(e.target.value)} className="bg-muted border-border font-black h-12 rounded-xl text-secondary" />
            </div>
            <div className="bg-secondary/5 border border-secondary/20 p-3 rounded-xl flex gap-2 items-start">
              <AlertTriangle className="text-secondary shrink-0 mt-0.5" size={14} />
              <p className="text-[9px] font-bold text-muted-foreground uppercase leading-relaxed">Changes are logged with your identity and timestamp.</p>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleAdminUpdateRecord} className="w-full bg-secondary py-6 rounded-2xl font-black uppercase tracking-widest shadow-xl">
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Product Dialog */}
      <Dialog open={!!editingProduct} onOpenChange={() => setEditingProduct(null)}>
        <DialogContent className="glass-morphism border-t-4 border-secondary max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
              <Edit3 className="text-secondary" size={18} /> Edit Product
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Product Name</Label>
              <Input value={editProductName} onChange={(e) => setEditProductName(e.target.value)} className="bg-muted border-border font-black h-12 rounded-xl" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Price (৳)</Label>
                <Input type="number" value={editProductPrice} onChange={(e) => setEditProductPrice(e.target.value)} className="bg-muted border-border font-black h-12 rounded-xl text-primary" />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Stock Qty</Label>
                <Input type="number" value={editProductStock} onChange={(e) => setEditProductStock(e.target.value)} className="bg-muted border-border font-black h-12 rounded-xl" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleUpdateProduct} className="w-full bg-secondary py-6 rounded-2xl font-black uppercase tracking-widest shadow-xl">
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatCard({ title, value, subtitle, trend, icon, color }: any) {
  const colors: Record<string, string> = { primary: "text-primary border-primary/20", secondary: "text-secondary border-secondary/20", destructive: "text-destructive border-destructive/20", muted: "text-muted-foreground border-border/50" };
  return (
    <Card className="glass-morphism p-4 md:p-6 group relative overflow-hidden transition-all hover:translate-y-[-4px] border-none shadow-lg">
      <div className={`absolute top-0 right-0 w-20 h-20 md:w-24 md:h-24 bg-${color}/5 rounded-full -mr-10 -mt-10 md:-mr-12 md:-mt-12 group-hover:scale-150 transition-all duration-500`} />
      <div className="flex justify-between items-start relative z-10">
        <div className={`p-2 md:p-2.5 rounded-xl ${colors[color]} bg-muted border shadow-inner`}>{icon}</div>
        {trend !== 'none' && <div className={`text-[7px] md:text-[8px] font-black px-1.5 md:px-2 py-0.5 md:py-1 rounded-full uppercase tracking-widest ${trend === 'up' ? 'bg-primary/10 text-primary' : 'bg-destructive/10 text-destructive'}`}>{trend === 'up' ? 'Gain' : 'Loss'}</div>}
      </div>
      <div className="mt-3 md:mt-6 relative z-10">
        <p className="text-[7px] md:text-[8px] font-black text-muted-foreground tracking-[0.2em] uppercase mb-0.5">{title}</p>
        <h3 className="text-lg md:text-2xl font-black tracking-tighter truncate">{value}</h3>
        {subtitle && <p className="text-[7px] md:text-[8px] font-bold text-muted-foreground/50 uppercase mt-0.5 leading-tight">{subtitle}</p>}
      </div>
    </Card>
  );
}
