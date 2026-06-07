
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
  FileText,
  LayoutGrid,
  Calendar,
  Filter
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
import { collection, query, orderBy, where, Timestamp } from "firebase/firestore";
import { startOfWeek, startOfMonth, startOfYear, isAfter } from "date-fns";

type AnalysisPeriod = "weekly" | "monthly" | "yearly" | "all";

export function OwnerDashboard() {
  const [period, setPeriod] = useState<AnalysisPeriod>("weekly");
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const { firestore } = useFirestore();

  // Fetch all recent data for processing
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

  // Filter data based on selected period
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

    return { 
      totalRevenue, 
      totalExpenses, 
      netProfit, 
      salesCount: filteredSales.length,
      expensesCount: filteredExpenses.length,
      sales: filteredSales,
      expenses: filteredExpenses
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
          <h2 className="text-2xl font-bold flex items-center gap-2 text-foreground">
            <LayoutGrid className="text-primary" /> OWNER COMMAND CENTER
          </h2>
          <p className="text-muted-foreground text-sm font-medium">Global business oversight and financial forensics.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-muted px-3 py-1.5 rounded-xl border border-border">
            <Filter size={14} className="text-muted-foreground" />
            <Select value={period} onValueChange={(v: any) => setPeriod(v)}>
              <SelectTrigger className="w-[130px] h-8 border-none bg-transparent shadow-none font-bold text-xs uppercase focus:ring-0">
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
            className="bg-primary text-primary-foreground font-semibold shadow-md hover:bg-primary/90 transition-all rounded-xl h-11"
            onClick={handleGenerateAI}
            disabled={isAiLoading}
           >
              <BrainCircuit className="mr-2" size={16} /> 
              {isAiLoading ? "Processing Intelligence..." : "GENERATE AI REPORT"}
           </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          title="GROSS REVENUE" 
          value={`৳${stats.totalRevenue.toLocaleString()}`} 
          subtitle={`${stats.salesCount} Transactions`}
          trend="up" 
          icon={<DollarSign size={20} />} 
        />
        <StatCard 
          title="TOTAL EXPENDITURE" 
          value={`৳${stats.totalExpenses.toLocaleString()}`} 
          subtitle={`${stats.expensesCount} Records`}
          trend="down" 
          icon={<TrendingDown size={20} />} 
        />
        <StatCard 
          title="NET PROFIT MARGIN" 
          value={`৳${stats.netProfit.toLocaleString()}`} 
          subtitle={`${period.toUpperCase()} PERFORMANCE`}
          trend={stats.netProfit >= 0 ? "up" : "down"} 
          icon={<TrendingUp size={20} />} 
        />
        <StatCard 
          title="OPERATIONAL STATUS" 
          value="SECURE" 
          subtitle="All Nodes Synchronized"
          trend="none" 
          icon={<Activity size={20} />} 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 glass-morphism overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between border-b border-border/50 pb-4">
            <div>
              <CardTitle className="text-sm font-bold tracking-widest text-primary uppercase">Financial Feed</CardTitle>
              <CardDescription className="text-[10px] font-bold uppercase mt-1">Live transaction monitoring for {period}</CardDescription>
            </div>
            <Calendar className="text-muted-foreground/30" size={18} />
          </CardHeader>
          <CardContent className="p-0">
            <div className="max-h-[400px] overflow-y-auto">
               {stats.sales.map((sale, i) => (
                  <div key={i} className="flex justify-between items-center p-4 border-b border-border/30 hover:bg-muted/10 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                        <DollarSign size={14} />
                      </div>
                      <div>
                        <p className="text-sm font-bold">Sale by {sale.sellerName || 'Verified Seller'}</p>
                        <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">
                          {sale.timestamp?.toDate()?.toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <span className="text-sm font-black text-primary">+৳{sale.total?.toLocaleString()}</span>
                  </div>
               ))}
               {!stats.sales.length && (
                 <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                   <Activity className="mb-2 opacity-20" size={40} />
                   <p className="text-xs font-bold uppercase tracking-widest">No activity in this period</p>
                 </div>
               )}
            </div>
          </CardContent>
        </Card>

        <Card className="glass-morphism border-primary/10 flex flex-col">
          <CardHeader>
            <CardTitle className="text-sm font-bold flex items-center gap-2 text-primary uppercase tracking-widest">
              <BrainCircuit size={18} /> Intelligence Report
            </CardTitle>
            <CardDescription className="text-[10px] font-bold uppercase">Automated period analysis</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto">
            {aiSummary ? (
              <div className="text-sm leading-relaxed text-foreground/80 font-medium space-y-4 animate-in fade-in slide-in-from-bottom-2">
                {aiSummary.split('\n').map((line, i) => (
                  <p key={i}>{line}</p>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center space-y-4 py-12">
                <div className="w-16 h-16 rounded-full bg-primary/5 flex items-center justify-center">
                  <BrainCircuit className="text-primary/20 w-10 h-10" />
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Data Awaiting Analysis</p>
                  <p className="text-[10px] text-muted-foreground/60 max-w-[200px] font-medium leading-normal">
                    Generate an AI Insight to extract patterns and leakages from your {period} records.
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="glass-morphism overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between border-b border-border/50 pb-4">
            <div>
              <CardTitle className="text-sm font-bold text-destructive uppercase tracking-widest flex items-center gap-2">
                <AlertTriangle size={18} /> Outflow Tracker
              </CardTitle>
              <CardDescription className="text-[10px] font-bold uppercase mt-1">Categorized business costs</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="max-h-[300px] overflow-y-auto">
              {stats.expenses.map((exp, i) => (
                <div key={i} className="flex justify-between items-center p-4 border-b border-border/30 hover:bg-destructive/5 transition-colors">
                  <div>
                    <p className="text-sm font-bold text-foreground">{exp.description || exp.category}</p>
                    <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">
                      {exp.category} • {exp.timestamp?.toDate()?.toLocaleDateString()}
                    </p>
                  </div>
                  <span className="text-sm font-black text-destructive">-৳{exp.amount?.toLocaleString()}</span>
                </div>
              ))}
              {!stats.expenses.length && (
                <p className="text-center text-muted-foreground text-[10px] font-bold uppercase tracking-widest py-20">No expenses logged in {period}.</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="glass-morphism">
          <CardHeader>
            <CardTitle className="text-sm font-bold text-primary flex items-center gap-2 uppercase tracking-widest">
              <Activity size={18} /> Performance Metrics
            </CardTitle>
            <CardDescription className="text-[10px] font-bold uppercase mt-1">Relative business velocity</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 pt-4">
             <VelocityItem label="Inventory Turnover" value={72} subtext="High velocity on essentials" />
             <VelocityItem label="Profit Target" value={Math.min(100, Math.floor((stats.netProfit / 50000) * 100))} subtext="Towards 50k goal" />
             <VelocityItem label="Expense Ratio" value={stats.totalRevenue > 0 ? Math.floor((stats.totalExpenses / stats.totalRevenue) * 100) : 0} subtext="Cost to Revenue efficiency" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({ title, value, subtitle, trend, icon }: any) {
  const getTrendColor = () => {
    if (trend === 'up') return 'text-primary bg-primary/10';
    if (trend === 'down') return 'text-destructive bg-destructive/10';
    return 'text-amber-600 bg-amber-50/50';
  };

  return (
    <Card className="glass-morphism p-5 transition-transform hover:translate-y-[-4px] shadow-sm relative overflow-hidden group">
      <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full -mr-12 -mt-12 transition-transform group-hover:scale-150 duration-500" />
      <div className="flex justify-between items-start relative z-10">
        <div className="bg-muted p-2.5 rounded-xl text-primary shadow-inner border border-border/50">{icon}</div>
        <div className={`text-[9px] font-black px-2.5 py-1 rounded-full uppercase tracking-widest ${getTrendColor()}`}>
          {trend === 'up' ? 'Increase' : trend === 'down' ? 'Decrease' : 'Stable'}
        </div>
      </div>
      <div className="mt-6 relative z-10">
        <p className="text-[10px] font-black text-muted-foreground tracking-widest uppercase mb-1">{title}</p>
        <h3 className="text-2xl font-black text-foreground tracking-tight">{value}</h3>
        <p className="text-[9px] font-bold text-muted-foreground/60 uppercase mt-1">{subtitle}</p>
      </div>
    </Card>
  );
}

function VelocityItem({ label, value, subtext }: any) {
  return (
    <div className="space-y-2">
      <div className="flex justify-between text-xs font-bold uppercase tracking-wider">
        <span className="text-foreground/80">{label}</span>
        <span className="text-primary">{value}%</span>
      </div>
      <Progress value={value} className="h-2 bg-muted rounded-full" />
      <p className="text-[9px] font-medium text-muted-foreground/60 italic">{subtext}</p>
    </div>
  );
}
