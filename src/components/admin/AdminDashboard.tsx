"use client";

import { useState, useMemo } from "react";
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
  Coins
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
import { receiveWeeklyProfitSummary } from "@/ai/flows/owner-receives-weekly-profit-summary";
import { useFirestore, useCollection, useUser } from "@/firebase";
import { collection, query, orderBy, Timestamp, addDoc, deleteDoc, doc, serverTimestamp } from "firebase/firestore";
import { startOfWeek, startOfMonth, startOfYear, isAfter, format, isSameDay } from "date-fns";
import { 
  Bar, 
  BarChart, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid
} from "recharts";
import { ChartContainer, ChartTooltipContent } from "@/components/ui/chart";
import { FirestorePermissionError } from "@/firebase/errors";
import { errorEmitter } from "@/firebase/error-emitter";

type AnalysisPeriod = "weekly" | "monthly" | "yearly" | "all";

export function AdminDashboard() {
  const [period, setPeriod] = useState<AnalysisPeriod>("monthly");
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);
  
  const [newProductName, setNewProductName] = useState("");
  const [newProductPrice, setNewProductPrice] = useState("");
  const [newProductCategory, setNewProductCategory] = useState("Essentials");

  // Detail view state
  const [viewingAudit, setViewingAudit] = useState<any>(null);

  const { firestore } = useFirestore();
  const { user } = useUser();

  const salesQuery = useMemo(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, "sales"), orderBy("timestamp", "desc"));
  }, [firestore, user]);

  const expensesQuery = useMemo(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, "expenses"), orderBy("timestamp", "desc"));
  }, [firestore, user]);

  const productsQuery = useMemo(() => {
    if (!firestore) return null;
    return query(collection(firestore, "products"), orderBy("name", "asc"));
  }, [firestore]);

  const accountLogsQuery = useMemo(() => {
    if (!firestore) return null;
    return query(collection(firestore, "account_logs"), orderBy("timestamp", "desc"));
  }, [firestore]);

  const { data: rawSales } = useCollection(salesQuery);
  const { data: rawExpenses } = useCollection(expensesQuery);
  const { data: products } = useCollection(productsQuery);
  const { data: accountLogs } = useCollection(accountLogsQuery);

  const stats = useMemo(() => {
    const now = new Date();
    let filterDate: Date;

    switch (period) {
      case "weekly": filterDate = startOfWeek(now); break;
      case "monthly": filterDate = startOfMonth(now); break;
      case "yearly": filterDate = startOfYear(now); break;
      default: filterDate = new Date(0);
    }

    const filteredSales = rawSales?.filter(s => {
      const date = (s.timestamp as Timestamp)?.toDate();
      return date && isAfter(date, filterDate);
    }) || [];

    const filteredExpenses = rawExpenses?.filter(e => {
      const date = (e.timestamp as Timestamp)?.toDate();
      return date && isAfter(date, filterDate);
    }) || [];

    const filteredLogs = accountLogs?.filter(l => {
      const date = (l.timestamp as Timestamp)?.toDate();
      return date && isAfter(date, filterDate);
    }) || [];

    const totalRevenue = filteredSales.reduce((acc, s) => acc + (s.total || 0), 0);
    const totalExpenses = filteredExpenses.reduce((acc, e) => acc + (e.amount || 0), 0);
    const netProfit = totalRevenue - totalExpenses;

    const totalJoma = filteredLogs.reduce((acc, l) => acc + (l.joma || 0), 0);
    const totalBuy = filteredExpenses
      .filter(e => e.category?.toLowerCase() === 'buy' || e.category?.toLowerCase() === 'purchase')
      .reduce((acc, e) => acc + (e.amount || 0), 0);

    const chartDataMap: Record<string, { name: string; sales: number; expenses: number }> = {};
    filteredSales.forEach(s => {
      const d = (s.timestamp as Timestamp)?.toDate();
      const key = d ? format(d, period === 'yearly' ? 'MMM' : 'dd MMM') : 'Unknown';
      if (!chartDataMap[key]) chartDataMap[key] = { name: key, sales: 0, expenses: 0 };
      chartDataMap[key].sales += s.total || 0;
    });

    const chartData = Object.values(chartDataMap).sort((a, b) => a.name.localeCompare(b.name));

    return { 
      totalRevenue, 
      totalExpenses, 
      netProfit, 
      totalJoma, 
      totalBuy,
      sales: filteredSales, 
      expenses: filteredExpenses, 
      logs: filteredLogs,
      chartData 
    };
  }, [rawSales, rawExpenses, accountLogs, period]);

  // Derived data for detail view
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

  const handleDeleteProduct = (id: string) => {
    if (!firestore) return;
    deleteDoc(doc(firestore, "products", id))
      .catch(async () => {
        errorEmitter.emit("permission-error", new FirestorePermissionError({ path: `products/${id}`, operation: "delete" }));
      });
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
    <div className="space-y-6 pb-12 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <ShieldCheck className="text-secondary" size={20} />
            <h2 className="text-2xl font-black font-headline tracking-tighter uppercase">SUPER ADMIN <span className="text-primary">COMMAND CENTER</span></h2>
          </div>
          <p className="text-muted-foreground text-xs font-bold uppercase tracking-widest">Global Shop Forensics & Supply Intelligence</p>
        </div>
        
        <div className="flex items-center gap-3">
          <Select value={period} onValueChange={(v: any) => setPeriod(v)}>
            <SelectTrigger className="w-[140px] h-10 rounded-2xl border-border bg-muted font-black text-[10px] uppercase"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="weekly">Weekly Analysis</SelectItem><SelectItem value="monthly">Monthly Cycle</SelectItem><SelectItem value="yearly">Annual Overview</SelectItem></SelectContent>
          </Select>
          <Button className="bg-primary text-primary-foreground font-black shadow-lg rounded-2xl h-10 px-6 uppercase tracking-widest text-[10px]" onClick={handleGenerateAI} disabled={isAiLoading}>
            <BrainCircuit className="mr-2" size={16} /> {isAiLoading ? "Processing..." : "Neural Forecast"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Revenue In" value={`৳${stats.totalRevenue.toLocaleString()}`} trend="up" icon={<DollarSign size={20} />} color="primary" />
        <StatCard title="Operational Burn" value={`৳${stats.totalExpenses.toLocaleString()}`} trend="down" icon={<TrendingDown size={20} />} color="destructive" />
        <StatCard title="Liquidity" value={`৳${stats.netProfit.toLocaleString()}`} trend={stats.netProfit >= 0 ? "up" : "down"} icon={<TrendingUp size={20} />} color="secondary" />
        <StatCard title="Active Catalog" value={products?.length || 0} trend="none" icon={<Package size={20} />} color="muted" />
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="bg-muted border border-border p-1 h-12 rounded-2xl grid grid-cols-5 w-full md:w-[950px]">
          <TabsTrigger value="overview" className="rounded-xl font-black text-[10px] uppercase tracking-widest data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Intelligence</TabsTrigger>
          <TabsTrigger value="inventory" className="rounded-xl font-black text-[10px] uppercase tracking-widest data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Inventory</TabsTrigger>
          <TabsTrigger value="history" className="rounded-xl font-black text-[10px] uppercase tracking-widest data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Transactions</TabsTrigger>
          <TabsTrigger value="buy_joma" className="rounded-xl font-black text-[10px] uppercase tracking-widest data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Buy & Joma</TabsTrigger>
          <TabsTrigger value="closing" className="rounded-xl font-black text-[10px] uppercase tracking-widest data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Closing Ledger</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2 glass-morphism border-t-4 border-primary">
              <CardHeader><CardTitle className="text-sm font-black text-primary uppercase tracking-widest">Financial Velocity</CardTitle></CardHeader>
              <CardContent className="h-[350px] pt-4">
                <ChartContainer config={{ sales: { label: "Sales", color: "hsl(var(--primary))" } }}>
                  <BarChart data={stats.chartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--muted))" />
                    <XAxis dataKey="name" fontSize={10} fontWeight="bold" axisLine={false} tickLine={false} />
                    <YAxis fontSize={10} fontWeight="bold" axisLine={false} tickLine={false} tickFormatter={(v) => `৳${v}`} />
                    <Tooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="sales" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
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

        <TabsContent value="inventory" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
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

        <TabsContent value="history" className="space-y-6">
          <Card className="glass-morphism">
            <CardHeader className="flex flex-row items-center justify-between border-b bg-muted/20 py-4"><div><CardTitle className="text-sm font-black uppercase tracking-widest">Transaction Forensic Log</CardTitle></div><TableIcon className="text-muted-foreground/30" size={24} /></CardHeader>
            <CardContent className="p-0">
              <div className="max-h-[600px] overflow-y-auto">
                {stats.sales.map((sale: any) => (
                  <div key={sale.id} className="p-6 border-b border-border/30 hover:bg-muted/30 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-secondary/10 flex items-center justify-center"><History className="text-secondary" size={20} /></div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-black uppercase tracking-tight">TXN#{sale.id.slice(-6).toUpperCase()}</p>
                          {sale.updatedAt && <span className="text-[8px] bg-secondary/10 text-secondary px-2 py-0.5 rounded-full font-black border border-secondary/20 flex items-center gap-1"><Edit3 size={8} /> MODIFIED BY {sale.updatedBy?.toUpperCase()}</span>}
                        </div>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase mt-1 flex items-center gap-1.5"><UserIcon size={10} /> {sale.sellerName} | <Clock size={10} /> {sale.timestamp?.toDate()?.toLocaleString()}</p>
                      </div>
                    </div>
                    <div className="text-right"><p className="text-lg font-black text-primary tracking-tighter">৳{sale.total.toLocaleString()}</p></div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="buy_joma" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="glass-morphism border-t-4 border-primary">
              <CardHeader className="flex flex-row items-center justify-between border-b bg-primary/5 py-4">
                <div>
                  <CardTitle className="text-sm font-black uppercase tracking-widest text-primary">Joma (Deposits) Summary</CardTitle>
                  <CardDescription className="text-[10px] font-bold uppercase mt-1">Total capital collected from sellers</CardDescription>
                </div>
                <Coins className="text-primary/30" size={24} />
              </CardHeader>
              <CardContent className="pt-6">
                <div className="text-center py-6 border-b border-border mb-6">
                  <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Aggregate Joma</p>
                  <h3 className="text-4xl font-black text-primary tracking-tighter">৳{stats.totalJoma.toLocaleString()}</h3>
                </div>
                <div className="max-h-[400px] overflow-y-auto">
                  {stats.logs.map((log: any) => (
                    <div key={log.id} className="flex justify-between items-center p-4 border-b border-border/30 hover:bg-primary/5 transition-colors">
                      <div>
                        <p className="text-sm font-black uppercase">{log.sellerName}</p>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase">{log.timestamp?.toDate()?.toLocaleString()}</p>
                      </div>
                      <span className="text-sm font-black text-primary">৳{log.joma?.toLocaleString()}</span>
                    </div>
                  ))}
                  {(!stats.logs || stats.logs.length === 0) && (
                    <div className="text-center py-12 opacity-30">
                      <Coins size={40} className="mx-auto mb-2" />
                      <p className="text-[10px] font-black uppercase tracking-widest">No Joma entries found</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="glass-morphism border-t-4 border-destructive">
              <CardHeader className="flex flex-row items-center justify-between border-b bg-destructive/5 py-4">
                <div>
                  <CardTitle className="text-sm font-black uppercase tracking-widest text-destructive">Buy (Purchases) Summary</CardTitle>
                  <CardDescription className="text-[10px] font-bold uppercase mt-1">Capital spent on inventory and stock</CardDescription>
                </div>
                <Tags className="text-destructive/30" size={24} />
              </CardHeader>
              <CardContent className="pt-6">
                <div className="text-center py-6 border-b border-border mb-6">
                  <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Aggregate Purchases</p>
                  <h3 className="text-4xl font-black text-destructive tracking-tighter">৳{stats.totalBuy.toLocaleString()}</h3>
                </div>
                <div className="max-h-[400px] overflow-y-auto">
                  {stats.expenses
                    .filter(e => e.category?.toLowerCase() === 'buy' || e.category?.toLowerCase() === 'purchase')
                    .map((exp: any) => (
                      <div key={exp.id} className="flex justify-between items-center p-4 border-b border-border/30 hover:bg-destructive/5 transition-colors">
                        <div>
                          <p className="text-sm font-black uppercase">{exp.description}</p>
                          <p className="text-[10px] font-bold text-muted-foreground uppercase">{exp.timestamp?.toDate()?.toLocaleString()}</p>
                        </div>
                        <span className="text-sm font-black text-destructive">৳{exp.amount?.toLocaleString()}</span>
                      </div>
                  ))}
                  {(!stats.expenses.filter(e => e.category?.toLowerCase() === 'buy' || e.category?.toLowerCase() === 'purchase').length) && (
                    <div className="text-center py-12 opacity-30">
                      <Tags size={40} className="mx-auto mb-2" />
                      <p className="text-[10px] font-black uppercase tracking-widest">No Buy records found</p>
                    </div>
                  )}
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
                {accountLogs?.map((log: any) => (
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
                        <p className="text-sm font-black uppercase tracking-tight">Closing Audit Report</p>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase mt-1 flex items-center gap-1.5">
                          <UserIcon size={10} /> {log.sellerName} | <Clock size={10} /> {log.timestamp?.toDate()?.toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-6 text-center">
                      <div className="space-y-1">
                        <p className="text-[8px] font-black text-muted-foreground uppercase tracking-widest flex items-center justify-center gap-1"><Wallet size={10} className="text-secondary" /> Cashbox</p>
                        <p className="text-xs font-black text-foreground">৳{log.cashbox?.toLocaleString()}</p>
                      </div>
                      <div className="space-y-1 border-x border-border/50 px-4">
                        <p className="text-[8px] font-black text-muted-foreground uppercase tracking-widest flex items-center justify-center gap-1"><ArrowDownCircle size={10} className="text-primary" /> Joma</p>
                        <p className="text-xs font-black text-foreground">৳{log.joma?.toLocaleString()}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[8px] font-black text-muted-foreground uppercase tracking-widest flex items-center justify-center gap-1"><ArrowUpCircle size={10} className="text-destructive" /> Due</p>
                        <p className="text-xs font-black text-foreground">৳{log.due?.toLocaleString()}</p>
                      </div>
                    </div>
                  </div>
                ))}
                {(!accountLogs || accountLogs.length === 0) && (
                  <div className="flex flex-col items-center justify-center py-20 opacity-40">
                    <ClipboardCheck size={40} className="mb-4" />
                    <p className="text-[10px] font-black uppercase tracking-widest">No audit reports submitted</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

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
                    <p className="text-xs font-black text-primary">৳{(sale.total || 0).toLocaleString()}</p>
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
                    <p className="text-xs font-black text-destructive">৳{(exp.amount || 0).toLocaleString()}</p>
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
                <p className="text-lg font-black text-secondary tracking-tighter">৳{viewingAudit?.cashbox?.toLocaleString()}</p>
              </div>
            </div>
            <ArrowRight className="text-secondary/30" />
            <div className="text-right">
              <p className="text-[8px] font-black text-muted-foreground uppercase tracking-widest">System Net Balance</p>
              <p className="text-lg font-black text-foreground tracking-tighter">
                ৳{(auditDetailData.sales.reduce((a, b) => a + (b.total || 0), 0) - auditDetailData.expenses.reduce((a, b) => a + (b.amount || 0), 0)).toLocaleString()}
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatCard({ title, value, subtitle, trend, icon, color }: any) {
  const colors: Record<string, string> = { primary: "text-primary border-primary/20", secondary: "text-secondary border-secondary/20", destructive: "text-destructive border-destructive/20", muted: "text-muted-foreground border-border/50" };
  return (
    <Card className="glass-morphism p-6 group relative overflow-hidden transition-all hover:translate-y-[-4px] border-none shadow-lg">
      <div className={`absolute top-0 right-0 w-24 h-24 bg-${color}/5 rounded-full -mr-12 -mt-12 group-hover:scale-150 transition-all duration-500`} />
      <div className="flex justify-between items-start relative z-10"><div className={`p-2.5 rounded-xl ${colors[color]} bg-muted border shadow-inner`}>{icon}</div>{trend !== 'none' && <div className={`text-[8px] font-black px-2 py-1 rounded-full uppercase tracking-widest ${trend === 'up' ? 'bg-primary/10 text-primary' : 'bg-destructive/10 text-destructive'}`}>{trend === 'up' ? 'Gain' : 'Loss'}</div>}</div>
      <div className="mt-6 relative z-10"><p className="text-[8px] font-black text-muted-foreground tracking-[0.2em] uppercase mb-1">{title}</p><h3 className="text-2xl font-black tracking-tighter">{value}</h3>{subtitle && <p className="text-[8px] font-bold text-muted-foreground/50 uppercase mt-1">{subtitle}</p>}</div>
    </Card>
  );
}
