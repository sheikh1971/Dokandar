
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
  LayoutGrid
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  AreaChart, 
  Area,
  XAxis,
  YAxis
} from "recharts";
import { receiveWeeklyProfitSummary } from "@/ai/flows/owner-receives-weekly-profit-summary";
import { useFirestore, useCollection } from "@/firebase";
import { collection, query, orderBy, limit } from "firebase/firestore";

export function OwnerDashboard() {
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const { firestore } = useFirestore();

  const salesQuery = useMemo(() => {
    if (!firestore) return null;
    return query(collection(firestore, "sales"), orderBy("timestamp", "desc"), limit(50));
  }, [firestore]);

  const expensesQuery = useMemo(() => {
    if (!firestore) return null;
    return query(collection(firestore, "expenses"), orderBy("timestamp", "desc"), limit(50));
  }, [firestore]);

  const { data: sales } = useCollection(salesQuery);
  const { data: expenses } = useCollection(expensesQuery);

  const stats = useMemo(() => {
    const totalRevenue = sales?.reduce((acc, s) => acc + (s.total || 0), 0) || 0;
    const totalExpenses = expenses?.reduce((acc, e) => acc + (e.amount || 0), 0) || 0;
    const netProfit = totalRevenue - totalExpenses;
    return { totalRevenue, totalExpenses, netProfit };
  }, [sales, expenses]);

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
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2 text-foreground">
            <LayoutGrid className="text-primary" /> COMMAND CENTER
          </h2>
          <p className="text-muted-foreground text-sm font-medium">Real-time financial overview & insights.</p>
        </div>
        <div className="flex gap-2">
           <Button variant="outline" className="border-border text-foreground hover:bg-muted shadow-sm">
              <FileText className="mr-2" size={16} /> Export Report
           </Button>
           <Button 
            className="bg-primary text-primary-foreground font-semibold shadow-md hover:bg-primary/90 transition-all"
            onClick={handleGenerateAI}
            disabled={isAiLoading}
           >
              <BrainCircuit className="mr-2" size={16} /> 
              {isAiLoading ? "Analysing..." : "AI INSIGHTS"}
           </Button>
        </div>
      </div>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          title="REVENUE" 
          value={`৳${stats.totalRevenue.toLocaleString()}`} 
          change="LIVE" 
          trend="up" 
          color="primary" 
          icon={<DollarSign size={20} />} 
        />
        <StatCard 
          title="EXPENSES" 
          value={`৳${stats.totalExpenses.toLocaleString()}`} 
          change="LIVE" 
          trend="down" 
          color="destructive" 
          icon={<TrendingDown size={20} />} 
        />
        <StatCard 
          title="NET PROFIT" 
          value={`৳${stats.netProfit.toLocaleString()}`} 
          change="LIVE" 
          trend="up" 
          color="success" 
          icon={<TrendingUp size={20} />} 
        />
        <StatCard 
          title="SYSTEM STATUS" 
          value="STABLE" 
          change="SYNCED" 
          trend="none" 
          color="primary" 
          icon={<Activity size={20} />} 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 glass-morphism">
          <CardHeader>
            <CardTitle className="text-sm font-semibold tracking-wide text-primary">TRANSACTION FEED</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
             {sales?.slice(0, 5).map((sale, i) => (
                <div key={i} className="flex justify-between items-center p-3 rounded-lg bg-muted/20 border border-border">
                  <div>
                    <p className="text-sm font-semibold">Sale by {sale.sellerName || 'Staff'}</p>
                    <p className="text-[10px] text-muted-foreground uppercase">{sale.timestamp?.toDate()?.toLocaleString()}</p>
                  </div>
                  <span className="text-sm font-bold text-primary">+৳{sale.total}</span>
                </div>
             ))}
             {!sales?.length && <p className="text-center text-muted-foreground text-xs py-8">No recent transactions.</p>}
          </CardContent>
        </Card>

        <Card className="glass-morphism border-primary/10">
          <CardHeader>
            <CardTitle className="text-sm font-semibold flex items-center gap-2 text-primary">
              <BrainCircuit size={18} /> AI ANALYTICS
            </CardTitle>
            <CardDescription className="text-xs">Weekly Performance Review</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {aiSummary ? (
              <div className="text-sm leading-relaxed text-foreground/80 font-medium animate-in fade-in slide-in-from-bottom-2">
                {aiSummary.split('\n').map((line, i) => (
                  <p key={i} className="mb-2">{line}</p>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-[200px] text-center space-y-4">
                <BrainCircuit className="text-muted-foreground/30 w-12 h-12" />
                <p className="text-xs text-muted-foreground max-w-[180px]">Run AI Insights to generate your weekly performance report.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="glass-morphism">
          <CardHeader>
            <CardTitle className="text-sm font-semibold text-destructive flex items-center gap-2">
              <AlertTriangle size={18} /> RECENT EXPENSES
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {expenses?.slice(0, 3).map((exp, i) => (
              <div key={i} className="flex justify-between items-center p-3 rounded-lg bg-muted/20 border border-border hover:bg-muted/40 transition-colors">
                <div>
                  <p className="text-sm font-semibold text-foreground">{exp.description || exp.category}</p>
                  <p className="text-[10px] text-muted-foreground font-medium uppercase">{exp.timestamp?.toDate()?.toLocaleDateString()}</p>
                </div>
                <span className="text-sm font-bold text-destructive">-৳{exp.amount}</span>
              </div>
            ))}
            {!expenses?.length && <p className="text-center text-muted-foreground text-xs py-8">No expense records.</p>}
          </CardContent>
        </Card>

        <Card className="glass-morphism">
          <CardHeader>
            <CardTitle className="text-sm font-semibold text-primary flex items-center gap-2">
              <Activity size={18} /> STOCK VELOCITY
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
             <VelocityItem label="Essential Oils" value={85} />
             <VelocityItem label="Packaged Grain" value={42} />
             <VelocityItem label="Cosmetics" value={18} />
             <VelocityItem label="Cleaning Supplies" value={64} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({ title, value, change, trend, icon }: any) {
  const getTrendColor = () => {
    if (trend === 'up') return 'text-primary bg-primary/10';
    if (trend === 'down') return 'text-destructive bg-destructive/10';
    return 'text-amber-600 bg-amber-50/50';
  };

  return (
    <Card className="glass-morphism p-5 transition-transform hover:translate-y-[-2px] shadow-sm">
      <div className="flex justify-between items-start">
        <div className="bg-muted p-2.5 rounded-xl text-primary shadow-inner">{icon}</div>
        <div className={`text-[10px] font-bold px-2 py-1 rounded-full ${getTrendColor()}`}>
          {change}
        </div>
      </div>
      <div className="mt-5">
        <p className="text-[10px] font-bold text-muted-foreground tracking-widest uppercase">{title}</p>
        <h3 className="text-2xl font-bold mt-1 text-foreground">{value}</h3>
      </div>
    </Card>
  );
}

function VelocityItem({ label, value }: any) {
  return (
    <div className="space-y-2">
      <div className="flex justify-between text-xs font-semibold">
        <span className="text-foreground/80">{label}</span>
        <span className="text-muted-foreground">{value}% turnover</span>
      </div>
      <Progress value={value} className="h-1.5 bg-muted" />
    </div>
  );
}
