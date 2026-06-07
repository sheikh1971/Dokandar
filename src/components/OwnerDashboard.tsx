"use client";

import { useState } from "react";
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

const MOCK_DATA = [
  { name: 'Mon', revenue: 4000, expenses: 2400 },
  { name: 'Tue', revenue: 3000, expenses: 1398 },
  { name: 'Wed', revenue: 5000, expenses: 2800 },
  { name: 'Thu', revenue: 2780, expenses: 1908 },
  { name: 'Fri', revenue: 4890, expenses: 2800 },
  { name: 'Sat', revenue: 5390, expenses: 3800 },
  { name: 'Sun', revenue: 6490, expenses: 4300 },
];

export function OwnerDashboard() {
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);

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
          value="৳42,500" 
          change="+12.5%" 
          trend="up" 
          color="primary" 
          icon={<DollarSign size={20} />} 
        />
        <StatCard 
          title="EXPENSES" 
          value="৳18,200" 
          change="+2.4%" 
          trend="down" 
          color="destructive" 
          icon={<TrendingDown size={20} />} 
        />
        <StatCard 
          title="NET PROFIT" 
          value="৳24,300" 
          change="+18.1%" 
          trend="up" 
          color="success" 
          icon={<TrendingUp size={20} />} 
        />
        <StatCard 
          title="CASH DISCREPANCY" 
          value="-৳450" 
          change="UNVERIFIED" 
          trend="none" 
          color="destructive" 
          icon={<AlertTriangle size={20} />} 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sales Chart */}
        <Card className="lg:col-span-2 glass-morphism">
          <CardHeader>
            <CardTitle className="text-sm font-semibold tracking-wide text-primary">REVENUE PERFORMANCE</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={MOCK_DATA}>
                <defs>
                  <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(value) => `৳${value}`} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'white', borderColor: 'hsl(var(--border))', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  itemStyle={{ color: 'hsl(var(--primary))' }}
                />
                <Area type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" strokeWidth={2} fillOpacity={1} fill="url(#colorRev)" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* AI Insight Box */}
        <Card className="glass-morphism border-primary/10">
          <CardHeader>
            <CardTitle className="text-sm font-semibold flex items-center gap-2 text-primary">
              <BrainCircuit size={18} /> PROFIT ANALYTICS
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
              <AlertTriangle size={18} /> ANOMALY DETECTION
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { date: "May 24", desc: "Cash Mismatch @ Shift End", amt: "-৳120", type: "low" },
              { date: "May 22", desc: "Unexpected Return Entry", amt: "৳500", type: "high" },
              { date: "May 20", desc: "Drawer Void Exception", amt: "৳0", type: "med" },
            ].map((log, i) => (
              <div key={i} className="flex justify-between items-center p-3 rounded-lg bg-muted/20 border border-border hover:bg-muted/40 transition-colors">
                <div>
                  <p className="text-sm font-semibold text-foreground">{log.desc}</p>
                  <p className="text-[10px] text-muted-foreground font-medium uppercase">{log.date}</p>
                </div>
                <span className={`text-sm font-bold ${log.amt.startsWith('-') ? 'text-destructive' : 'text-primary'}`}>
                  {log.amt}
                </span>
              </div>
            ))}
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
