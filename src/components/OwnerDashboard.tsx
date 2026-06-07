
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
  RefreshCw,
  LayoutGrid
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  AreaChart, 
  Area 
} from "recharts";
import { receiveWeeklyProfitSummary } from "@/ai/flows/owner-receives-weekly-profit-summary";

const MOCK_DATA = [
  { name: 'Mon', revenue: 4000, expenses: 2400 },
  { name: 'Tue', revenue: 3000, expenses: 1398 },
  { name: 'Wed', revenue: 2000, expenses: 9800 },
  { name: 'Thu', revenue: 2780, expenses: 3908 },
  { name: 'Fri', revenue: 1890, expenses: 4800 },
  { name: 'Sat', revenue: 2390, expenses: 3800 },
  { name: 'Sun', revenue: 3490, expenses: 4300 },
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
          <h2 className="font-headline text-2xl text-accent flex items-center gap-2">
            <LayoutGrid /> COMMAND CENTER
          </h2>
          <p className="text-muted-foreground text-sm">Real-time financial overview & leakage detection.</p>
        </div>
        <div className="flex gap-2">
           <Button variant="outline" className="border-accent text-accent hover:bg-accent/10">
              <RefreshCw className="mr-2" size={16} /> Export PDF
           </Button>
           <Button 
            className="bg-accent text-black font-headline neon-border-cyan hover:scale-105 transition-transform"
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
          color="secondary" 
          icon={<TrendingDown size={20} />} 
        />
        <StatCard 
          title="NET PROFIT" 
          value="৳24,300" 
          change="+18.1%" 
          trend="up" 
          color="accent" 
          icon={<TrendingUp size={20} />} 
        />
        <StatCard 
          title="CASH DRIFT" 
          value="-৳450" 
          change="DISCREPANCY" 
          trend="none" 
          color="warning" 
          icon={<AlertTriangle size={20} />} 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sales Chart */}
        <Card className="lg:col-span-2 glass-morphism border-white/10">
          <CardHeader>
            <CardTitle className="font-headline text-sm tracking-widest text-primary">REVENUE PERFORMANCE</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={MOCK_DATA}>
                <defs>
                  <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00FF41" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#00FF41" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                <XAxis dataKey="name" stroke="#666" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#666" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `৳${value}`} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0a0a0a', borderColor: '#00FF41', borderRadius: '8px' }}
                  itemStyle={{ color: '#00FF41' }}
                />
                <Area type="monotone" dataKey="revenue" stroke="#00FF41" fillOpacity={1} fill="url(#colorRev)" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* AI Insight Box */}
        <Card className="glass-morphism neon-border-cyan border-accent/20">
          <CardHeader>
            <CardTitle className="font-headline text-sm flex items-center gap-2 text-accent">
              <BrainCircuit size={18} /> PROFIT ANALYTICS
            </CardTitle>
            <CardDescription className="text-xs">Natural Language Summary</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {aiSummary ? (
              <div className="text-xs leading-relaxed text-white font-medium animate-in fade-in slide-in-from-bottom-2">
                {aiSummary.split('\n').map((line, i) => (
                  <p key={i} className="mb-2">{line}</p>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-[200px] text-center space-y-4">
                <BrainCircuit className="text-accent/20 w-12 h-12" />
                <p className="text-xs text-muted-foreground max-w-[150px]">Click 'AI INSIGHTS' to generate weekly performance report</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Fraud Detection & Inventory Tracking */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="glass-morphism border-red-500/20">
          <CardHeader>
            <CardTitle className="font-headline text-sm text-red-500 flex items-center gap-2">
              <AlertTriangle size={18} /> FRAUD DETECTION LOG
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              { date: "May 24", desc: "Cash Mismatch @ Shift End", amt: "-৳120", severity: "low" },
              { date: "May 22", desc: "Unexpected Return Entry", amt: "৳500", severity: "high" },
              { date: "May 20", desc: "Drawer Void Exception", amt: "৳0", severity: "med" },
            ].map((log, i) => (
              <div key={i} className="flex justify-between items-center p-2 rounded bg-red-500/5 border border-red-500/10">
                <div>
                  <p className="text-xs font-headline">{log.desc}</p>
                  <p className="text-[10px] text-muted-foreground">{log.date}</p>
                </div>
                <span className={`text-xs font-headline ${log.amt.startsWith('-') ? 'text-red-500' : 'text-green-500'}`}>
                  {log.amt}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="glass-morphism border-primary/20">
          <CardHeader>
            <CardTitle className="font-headline text-sm text-primary flex items-center gap-2">
              <Activity size={18} /> STOCK VELOCITY
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
             <div className="space-y-3">
                <VelocityItem label="Essential Oils" value={85} color="bg-primary" />
                <VelocityItem label="Packaged Grain" value={42} color="bg-accent" />
                <VelocityItem label="Cosmetics" value={18} color="bg-secondary" />
                <VelocityItem label="Cleaning Supplies" value={64} color="bg-primary" />
             </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({ title, value, change, trend, color, icon }: any) {
  const colors: any = {
    primary: "neon-border-green text-primary",
    secondary: "neon-border-magenta text-secondary",
    accent: "neon-border-cyan text-accent",
    warning: "border-orange-500 text-orange-500 shadow-[0_0_10px_rgba(255,145,0,0.3)]",
  };

  return (
    <Card className={`glass-morphism border border-white/5 ${colors[color] || ''} p-4`}>
      <div className="flex justify-between items-start">
        <div className="bg-white/5 p-2 rounded-lg">{icon}</div>
        <div className={`text-[10px] font-headline px-2 py-0.5 rounded-full ${trend === 'up' ? 'bg-green-500/20 text-green-500' : trend === 'down' ? 'bg-red-500/20 text-red-500' : 'bg-orange-500/20 text-orange-500'}`}>
          {change}
        </div>
      </div>
      <div className="mt-4">
        <p className="text-[10px] font-headline text-muted-foreground tracking-widest">{title}</p>
        <h3 className="text-xl font-headline mt-1 tracking-tight text-white">{value}</h3>
      </div>
    </Card>
  );
}

function VelocityItem({ label, value, color }: any) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-[10px] font-headline">
        <span>{label}</span>
        <span className="text-muted-foreground">{value}% turnover</span>
      </div>
      <Progress value={value} className={`h-1.5 bg-white/5 [&>div]:${color}`} />
    </div>
  );
}
