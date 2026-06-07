
"use client";

import { useState, useMemo } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Activity, 
  AlertTriangle, 
  BrainCircuit, 
  Filter,
  BarChart3,
  PieChart as PieChartIcon,
  ShieldCheck,
  ArrowUpRight,
  ArrowDownRight,
  Users,
  Briefcase,
  History,
  Package,
  Plus,
  Trash2,
  Table as TableIcon
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
import { receiveWeeklyProfitSummary } from "@/ai/flows/owner-receives-weekly-profit-summary";
import { useFirestore, useCollection, useUser } from "@/firebase";
import { collection, query, orderBy, Timestamp, addDoc, deleteDoc, doc, serverTimestamp } from "firebase/firestore";
import { startOfWeek, startOfMonth, startOfYear, isAfter, format } from "date-fns";
import { 
  Bar, 
  BarChart, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid
} from "recharts";
import { ChartContainer, ChartTooltipContent } from "@/components/ui/chart";

type AnalysisPeriod = "weekly" | "monthly" | "yearly" | "all";

export function AdminDashboard() {
  const [period, setPeriod] = useState<AnalysisPeriod>("monthly");
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);
  
  // Product Management State
  const [newProductName, setNewProductName] = useState("");
  const [newProductPrice, setNewProductPrice] = useState("");
  const [newProductCategory, setNewProductCategory] = useState("Essentials");

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

  const { data: rawSales } = useCollection(salesQuery);
  const { data: rawExpenses } = useCollection(expensesQuery);
  const { data: products } = useCollection(productsQuery);

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

    const totalRevenue = filteredSales.reduce((acc, s) => acc + (s.total || 0), 0);
    const totalExpenses = filteredExpenses.reduce((acc, e) => acc + (e.amount || 0), 0);
    const netProfit = totalRevenue - totalExpenses;

    const teamMap: Record<string, { name: string; total: number; count: number }> = {};
    filteredSales.forEach(s => {
      const id = s.sellerId || "unknown";
      if (!teamMap[id]) teamMap[id] = { name: s.sellerName || "Anonymous Seller", total: 0, count: 0 };
      teamMap[id].total += s.total || 0;
      teamMap[id].count += 1;
    });
    const teamStats = Object.values(teamMap).sort((a, b) => b.total - a.total);

    const chartDataMap: Record<string, { name: string; sales: number; expenses: number }> = {};
    filteredSales.forEach(s => {
      const d = (s.timestamp as Timestamp)?.toDate();
      const key = d ? format(d, period === 'yearly' ? 'MMM' : 'dd MMM') : 'Unknown';
      if (!chartDataMap[key]) chartDataMap[key] = { name: key, sales: 0, expenses: 0 };
      chartDataMap[key].sales += s.total || 0;
    });

    const chartData = Object.values(chartDataMap).sort((a, b) => a.name.localeCompare(b.name));

    return { 
      totalRevenue, totalExpenses, netProfit, 
      salesCount: filteredSales.length,
      expensesCount: filteredExpenses.length,
      sales: filteredSales,
      expenses: filteredExpenses,
      chartData, teamStats
    };
  }, [rawSales, rawExpenses, period]);

  const handleAddProduct = () => {
    if (!firestore || !newProductName || !newProductPrice) return;
    addDoc(collection(firestore, "products"), {
      name: newProductName,
      price: parseFloat(newProductPrice),
      category: newProductCategory,
      stock: 100,
      timestamp: serverTimestamp()
    });
    setNewProductName("");
    setNewProductPrice("");
  };

  const handleDeleteProduct = (id: string) => {
    if (!firestore) return;
    deleteDoc(doc(firestore, "products", id));
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
            <h2 className="text-2xl font-black font-headline tracking-tighter uppercase">SUPER ADMIN <span className="text-primary">PORTAL</span></h2>
          </div>
          <p className="text-muted-foreground text-xs font-bold uppercase tracking-widest">Global Shop Forensics & Supply Intelligence</p>
        </div>
        
        <div className="flex items-center gap-3">
          <Select value={period} onValueChange={(v: any) => setPeriod(v)}>
            <SelectTrigger className="w-[140px] h-10 rounded-2xl border-border bg-muted font-black text-[10px] uppercase">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="weekly">Weekly Analysis</SelectItem>
              <SelectItem value="monthly">Monthly Cycle</SelectItem>
              <SelectItem value="yearly">Annual Overview</SelectItem>
            </SelectContent>
          </Select>

           <Button 
            className="bg-primary text-primary-foreground font-black shadow-lg rounded-2xl h-10 px-6 uppercase tracking-widest text-[10px]"
            onClick={handleGenerateAI}
            disabled={isAiLoading}
           >
              <BrainCircuit className="mr-2" size={16} /> 
              {isAiLoading ? "Processing..." : "Neural Forecast"}
           </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Revenue In" value={`৳${stats.totalRevenue.toLocaleString()}`} trend="up" icon={<DollarSign size={20} />} color="primary" />
        <StatCard title="Operational Burn" value={`৳${stats.totalExpenses.toLocaleString()}`} trend="down" icon={<TrendingDown size={20} />} color="destructive" />
        <StatCard title="Liquidity" value={`৳${stats.netProfit.toLocaleString()}`} trend={stats.netProfit >= 0 ? "up" : "down"} icon={<TrendingUp size={20} />} color="secondary" />
        <StatCard title="Active Catalog" value={products?.length || 0} trend="none" icon={<Package size={20} />} color="muted" subtitle="Live Inventory Items" />
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="bg-muted border border-border p-1 h-12 rounded-2xl grid grid-cols-3 w-full md:w-[600px]">
          <TabsTrigger value="overview" className="rounded-xl font-black text-[10px] uppercase tracking-widest data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <BarChart3 className="mr-2" size={14} /> Intelligence
          </TabsTrigger>
          <TabsTrigger value="inventory" className="rounded-xl font-black text-[10px] uppercase tracking-widest data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Package className="mr-2" size={14} /> Inventory
          </TabsTrigger>
          <TabsTrigger value="history" className="rounded-xl font-black text-[10px] uppercase tracking-widest data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <History className="mr-2" size={14} /> Transactions
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2 glass-morphism border-t-4 border-primary">
              <CardHeader>
                <CardTitle className="text-sm font-black text-primary uppercase tracking-widest">Financial Velocity</CardTitle>
              </CardHeader>
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
              <CardHeader>
                <CardTitle className="text-sm font-black text-secondary uppercase tracking-widest flex items-center gap-2">
                  <BrainCircuit size={18} /> AI Insight Engine
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {aiSummary ? (
                  <div className="text-[11px] leading-relaxed font-bold border-l-2 border-secondary/20 pl-4 py-1">
                    {aiSummary.split('\n').map((line, i) => <p key={i} className="mb-2">{line}</p>)}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-20 text-center opacity-40">
                    <BrainCircuit size={40} className="mb-4" />
                    <p className="text-[10px] font-black uppercase tracking-widest">Engine Standby</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="inventory" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="glass-morphism border-t-4 border-primary">
              <CardHeader>
                <CardTitle className="text-sm font-black text-primary uppercase">Add Product</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase">Item Name</Label>
                  <Input value={newProductName} onChange={(e) => setNewProductName(e.target.value)} placeholder="e.g., Luxury Coffee" className="bg-muted border-border" />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase">Price (৳)</Label>
                  <Input type="number" value={newProductPrice} onChange={(e) => setNewProductPrice(e.target.value)} placeholder="0.00" className="bg-muted border-border" />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase">Category</Label>
                  <Select value={newProductCategory} onValueChange={setNewProductCategory}>
                    <SelectTrigger className="bg-muted border-border">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Essentials">Essentials</SelectItem>
                      <SelectItem value="Premium">Premium</SelectItem>
                      <SelectItem value="Beverage">Beverage</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={handleAddProduct} className="w-full bg-primary font-black uppercase tracking-widest">
                  <Plus className="mr-2" size={16} /> Deploy Product
                </Button>
              </CardContent>
            </Card>

            <Card className="lg:col-span-2 glass-morphism">
              <CardHeader>
                <CardTitle className="text-sm font-black uppercase">Live Inventory Management</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="max-h-[500px] overflow-y-auto">
                  {products?.map((p: any) => (
                    <div key={p.id} className="flex justify-between items-center p-4 border-b border-border/30 hover:bg-muted/50 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-black text-[10px] uppercase">
                          {p.category?.[0] || 'P'}
                        </div>
                        <div>
                          <p className="text-sm font-black text-foreground uppercase">{p.name}</p>
                          <p className="text-[10px] font-bold text-muted-foreground uppercase">{p.category}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-6">
                        <div className="text-right">
                          <p className="text-sm font-black text-primary">৳{p.price}</p>
                          <p className="text-[9px] font-black text-muted-foreground uppercase">{p.stock} In Stock</p>
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => handleDeleteProduct(p.id)} className="text-destructive hover:bg-destructive/10">
                          <Trash2 size={16} />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="history" className="space-y-6">
          <Card className="glass-morphism">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-black uppercase tracking-widest">Global Transaction Forensic Log</CardTitle>
                <CardDescription className="text-[10px] font-bold uppercase">Audit trail of all shop activity</CardDescription>
              </div>
              <TableIcon className="text-muted-foreground/30" size={24} />
            </CardHeader>
            <CardContent className="p-0">
              <div className="max-h-[600px] overflow-y-auto">
                {stats.sales.map((sale: any) => (
                  <div key={sale.id} className="p-6 border-b border-border/30 hover:bg-muted/30 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-secondary/10 flex items-center justify-center">
                        <History className="text-secondary" size={20} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-black uppercase">TXN#{sale.id.slice(-6).toUpperCase()}</p>
                          <span className="text-[9px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-black uppercase">VERIFIED</span>
                        </div>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase mt-1">
                          Processed by {sale.sellerName} • {sale.timestamp?.toDate()?.toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {sale.items?.map((item: any, i: number) => (
                        <span key={i} className="text-[9px] font-black bg-muted border border-border px-3 py-1 rounded-lg uppercase">
                          {item.name} x{item.qty}
                        </span>
                      ))}
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-black text-primary">৳{sale.total.toLocaleString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function StatCard({ title, value, subtitle, trend, icon, color }: any) {
  const colors: Record<string, string> = {
    primary: "text-primary border-primary/20",
    secondary: "text-secondary border-secondary/20",
    destructive: "text-destructive border-destructive/20",
    muted: "text-muted-foreground border-border/50"
  };

  return (
    <Card className="glass-morphism p-6 group relative overflow-hidden">
      <div className={`absolute top-0 right-0 w-24 h-24 bg-${color}/5 rounded-full -mr-12 -mt-12 group-hover:scale-150 transition-all duration-500`} />
      <div className="flex justify-between items-start relative z-10">
        <div className={`p-2.5 rounded-xl ${colors[color]} bg-muted border`}>{icon}</div>
        {trend !== 'none' && (
          <div className={`text-[8px] font-black px-2 py-1 rounded-full uppercase tracking-widest ${
            trend === 'up' ? 'bg-primary/10 text-primary' : 'bg-destructive/10 text-destructive'
          }`}>
            {trend === 'up' ? 'Gain' : 'Loss'}
          </div>
        )}
      </div>
      <div className="mt-6 relative z-10">
        <p className="text-[8px] font-black text-muted-foreground tracking-[0.2em] uppercase mb-1">{title}</p>
        <h3 className="text-2xl font-black tracking-tighter">{value}</h3>
        {subtitle && <p className="text-[8px] font-bold text-muted-foreground/50 uppercase mt-1">{subtitle}</p>}
      </div>
    </Card>
  );
}
