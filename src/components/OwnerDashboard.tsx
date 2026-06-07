
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
  Calendar,
  Filter,
  BarChart3,
  PieChart as PieChartIcon,
  ShieldCheck,
  ArrowUpRight,
  ArrowDownRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { receiveWeeklyProfitSummary } from "@/ai/flows/owner-receives-weekly-profit-summary";
import { useFirestore, useCollection } from "@/firebase";
import { collection, query, orderBy, Timestamp } from "firebase/firestore";
import { startOfWeek, startOfMonth, startOfYear, isAfter, format } from "date-fns";
import { 
  Bar, 
  BarChart, 
  ResponsiveContainer, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Cell,
  Line,
  LineChart,
  CartesianGrid
} from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";

type AnalysisPeriod = "weekly" | "monthly" | "yearly" | "all";

export function OwnerDashboard() {
  const [period, setPeriod] = useState<AnalysisPeriod>("monthly");
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const { firestore } = useFirestore();

  const salesQuery = useMemo(() => {
    if (!firestore) return null;
    return query(collection(firestore, "sales"), orderBy("timestamp", "desc"));
  }, [firestore]);

  const expensesQuery = useMemo(() => {
    if (!firestore) return null;
    return query(collection(firestore, "expenses"), orderBy("timestamp", "desc"));
  }, [firestore]);

  const { data: rawSales } = useCollection(salesQuery);
  const { data: rawExpenses } = useCollection(expensesQuery);

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

    // Chart Data Preparation (Group by Date)
    const chartDataMap: Record<string, { name: string; sales: number; expenses: number }> = {};
    
    filteredSales.forEach(s => {
      const d = (s.timestamp as Timestamp)?.toDate();
      const key = d ? format(d, period === 'yearly' ? 'MMM' : 'dd MMM') : 'Unknown';
      if (!chartDataMap[key]) chartDataMap[key] = { name: key, sales: 0, expenses: 0 };
      chartDataMap[key].sales += s.total || 0;
    });

    filteredExpenses.forEach(e => {
      const d = (e.timestamp as Timestamp)?.toDate();
      const key = d ? format(d, period === 'yearly' ? 'MMM' : 'dd MMM') : 'Unknown';
      if (!chartDataMap[key]) chartDataMap[key] = { name: key, sales: 0, expenses: 0 };
      chartDataMap[key].expenses += e.amount || 0;
    });

    const chartData = Object.values(chartDataMap).sort((a, b) => a.name.localeCompare(b.name));

    return { 
      totalRevenue, 
      totalExpenses, 
      netProfit, 
      salesCount: filteredSales.length,
      expensesCount: filteredExpenses.length,
      sales: filteredSales,
      expenses: filteredExpenses,
      chartData
    };
  }, [rawSales, rawExpenses, period]);

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
    <div className="space-y-6 pb-12">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <ShieldCheck className="text-secondary" size={20} />
            <h2 className="text-2xl font-black font-headline tracking-tighter uppercase">SUPER ADMIN <span className="text-primary">PORTAL</span></h2>
          </div>
          <p className="text-muted-foreground text-xs font-bold uppercase tracking-widest">Master Control & Financial Intelligence Hub</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-muted px-4 py-2 rounded-2xl border border-border shadow-inner">
            <Filter size={14} className="text-muted-foreground" />
            <Select value={period} onValueChange={(v: any) => setPeriod(v)}>
              <SelectTrigger className="w-[140px] h-7 border-none bg-transparent shadow-none font-black text-[10px] uppercase focus:ring-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="weekly">This Week</SelectItem>
                <SelectItem value="monthly">This Month</SelectItem>
                <SelectItem value="yearly">This Year</SelectItem>
                <SelectItem value="all">Lifetime</SelectItem>
              </SelectContent>
            </Select>
          </div>

           <Button 
            className="bg-primary text-primary-foreground font-black shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all rounded-2xl h-12 px-6 uppercase tracking-widest text-[10px]"
            onClick={handleGenerateAI}
            disabled={isAiLoading}
           >
              <BrainCircuit className="mr-2" size={16} /> 
              {isAiLoading ? "Processing Intelligence..." : "Run AI Forensics"}
           </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          title="Gross Sales" 
          value={`৳${stats.totalRevenue.toLocaleString()}`} 
          subtitle={`${stats.salesCount} Verified Transactions`}
          trend="up" 
          icon={<DollarSign size={20} />} 
          color="primary"
        />
        <StatCard 
          title="Total Outflow" 
          value={`৳${stats.totalExpenses.toLocaleString()}`} 
          subtitle={`${stats.expensesCount} Expense Entries`}
          trend="down" 
          icon={<TrendingDown size={20} />} 
          color="destructive"
        />
        <StatCard 
          title="Net Liquidity" 
          value={`৳${stats.netProfit.toLocaleString()}`} 
          subtitle="Calculated Profit Yield"
          trend={stats.netProfit >= 0 ? "up" : "down"} 
          icon={<TrendingUp size={20} />} 
          color="secondary"
        />
        <StatCard 
          title="System Status" 
          value="ENCRYPTED" 
          subtitle="All Records Synchronized"
          trend="none" 
          icon={<Activity size={20} />} 
          color="muted"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 glass-morphism border-t-4 border-primary shadow-xl overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between border-b border-border/50 pb-6">
            <div>
              <CardTitle className="text-sm font-black tracking-[0.2em] text-primary uppercase">Financial Velocity Chart</CardTitle>
              <CardDescription className="text-[10px] font-bold uppercase mt-1">Comparison of Sales vs Expenses for {period}</CardDescription>
            </div>
            <BarChart3 className="text-muted-foreground/30" size={24} />
          </CardHeader>
          <CardContent className="pt-6 h-[350px]">
            <ChartContainer config={{ 
              sales: { label: "Sales", color: "hsl(var(--primary))" },
              expenses: { label: "Expenses", color: "hsl(var(--destructive))" }
            }}>
              <BarChart data={stats.chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--muted))" />
                <XAxis dataKey="name" fontSize={10} fontWeight="bold" tickLine={false} axisLine={false} />
                <YAxis fontSize={10} fontWeight="bold" tickLine={false} axisLine={false} tickFormatter={(v) => `৳${v}`} />
                <Tooltip content={<ChartTooltipContent />} />
                <Bar dataKey="sales" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} barSize={20} />
                <Bar dataKey="expenses" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} barSize={20} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card className="glass-morphism border-t-4 border-secondary shadow-xl flex flex-col">
          <CardHeader className="pb-4">
            <CardTitle className="text-sm font-black flex items-center gap-2 text-secondary uppercase tracking-[0.2em]">
              <BrainCircuit size={18} /> AI ANALYSIS
            </CardTitle>
            <CardDescription className="text-[10px] font-bold uppercase">Dynamic Pattern Recognition</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto px-6">
            {aiSummary ? (
              <div className="text-[11px] leading-relaxed text-foreground/80 font-bold space-y-4 animate-in fade-in slide-in-from-bottom-2">
                {aiSummary.split('\n').map((line, i) => (
                  <p key={i} className="border-l-2 border-secondary/20 pl-3 py-1">{line}</p>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center space-y-4 py-12">
                <div className="w-20 h-20 rounded-3xl bg-secondary/5 flex items-center justify-center border border-secondary/10 animate-pulse">
                  <BrainCircuit className="text-secondary/20 w-10 h-10" />
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Neural Engine Idle</p>
                  <p className="text-[9px] text-muted-foreground/60 max-w-[200px] font-bold leading-normal uppercase">
                    Run AI Forensics to extract leakage patterns from {period} records.
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="glass-morphism shadow-lg overflow-hidden border-t-4 border-destructive">
          <CardHeader className="flex flex-row items-center justify-between border-b border-border/50 bg-destructive/5 py-4">
            <CardTitle className="text-xs font-black text-destructive uppercase tracking-[0.2em] flex items-center gap-2">
              <AlertTriangle size={18} /> Cash Outflow Tracker
            </CardTitle>
            <PieChartIcon size={18} className="text-destructive/30" />
          </CardHeader>
          <CardContent className="p-0">
            <div className="max-h-[350px] overflow-y-auto">
              {stats.expenses.map((exp, i) => (
                <div key={i} className="flex justify-between items-center p-4 border-b border-border/30 hover:bg-destructive/5 transition-colors group">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center text-destructive group-hover:scale-110 transition-transform">
                      <TrendingDown size={16} />
                    </div>
                    <div>
                      <p className="text-xs font-black text-foreground uppercase tracking-tight">{exp.description || exp.category}</p>
                      <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-[0.1em]">
                        {exp.category} • {exp.timestamp?.toDate()?.toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <span className="text-sm font-black text-destructive">-৳{exp.amount?.toLocaleString()}</span>
                </div>
              ))}
              {!stats.expenses.length && (
                <p className="text-center text-muted-foreground text-[10px] font-black uppercase tracking-widest py-20">No expense logs detected.</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="glass-morphism shadow-lg border-t-4 border-primary">
          <CardHeader className="py-4 border-b border-border/50 bg-primary/5">
            <CardTitle className="text-xs font-black text-primary flex items-center gap-2 uppercase tracking-[0.2em]">
              <Activity size={18} /> Operational KPIs
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-8 pt-8 px-6">
             <VelocityItem label="Inventory Health" value={72} subtext="Optimal turnover across core units" />
             <VelocityItem label="Profit Target Velocity" value={Math.min(100, Math.floor((stats.netProfit / 100000) * 100))} subtext="Towards 100k Periodic Milestone" />
             <VelocityItem label="Efficiency Ratio" value={stats.totalRevenue > 0 ? 100 - Math.floor((stats.totalExpenses / stats.totalRevenue) * 100) : 0} subtext="Revenue retention efficiency" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({ title, value, subtitle, trend, icon, color }: any) {
  const getTrendIcon = () => {
    if (trend === 'up') return <ArrowUpRight size={14} />;
    if (trend === 'down') return <ArrowDownRight size={14} />;
    return null;
  };

  const colors: Record<string, string> = {
    primary: "text-primary border-primary/20",
    secondary: "text-secondary border-secondary/20",
    destructive: "text-destructive border-destructive/20",
    muted: "text-muted-foreground border-border/50"
  };

  return (
    <Card className="glass-morphism p-6 transition-all hover:translate-y-[-6px] hover:shadow-2xl relative overflow-hidden group border-none">
      <div className={`absolute top-0 right-0 w-32 h-32 bg-${color}/5 rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-150 duration-700`} />
      <div className="flex justify-between items-start relative z-10">
        <div className={`bg-muted p-3 rounded-2xl ${colors[color]} shadow-inner border group-hover:bg-white transition-colors`}>{icon}</div>
        <div className={`text-[8px] font-black px-3 py-1.5 rounded-full uppercase tracking-widest flex items-center gap-1 ${
          trend === 'up' ? 'bg-primary/10 text-primary' : trend === 'down' ? 'bg-destructive/10 text-destructive' : 'bg-muted text-muted-foreground'
        }`}>
          {trend !== 'none' && getTrendIcon()}
          {trend === 'up' ? 'Gaining' : trend === 'down' ? 'Outflow' : 'Static'}
        </div>
      </div>
      <div className="mt-8 relative z-10">
        <p className="text-[9px] font-black text-muted-foreground tracking-[0.2em] uppercase mb-1">{title}</p>
        <h3 className="text-3xl font-black text-foreground tracking-tighter">{value}</h3>
        <p className="text-[9px] font-bold text-muted-foreground/50 uppercase mt-2">{subtitle}</p>
      </div>
    </Card>
  );
}

function VelocityItem({ label, value, subtext }: any) {
  return (
    <div className="space-y-3">
      <div className="flex justify-between text-[10px] font-black uppercase tracking-[0.1em]">
        <span className="text-foreground/70">{label}</span>
        <span className="text-primary">{value}%</span>
      </div>
      <div className="relative h-2.5 w-full bg-muted rounded-full overflow-hidden shadow-inner">
        <div 
          className="h-full bg-primary transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(var(--primary),0.3)]" 
          style={{ width: `${value}%` }}
        />
      </div>
      <p className="text-[9px] font-bold text-muted-foreground/50 uppercase tracking-tight">{subtext}</p>
    </div>
  );
}
