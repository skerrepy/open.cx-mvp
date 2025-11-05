"use client";

import { useState, useEffect, useRef } from "react";
import { useTickets, useRealtimeTickets } from "@/lib/hooks";
import { supabase } from "@/lib/supabaseClient";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  ComposedChart,
  Bar,
  PieChart,
  Pie,
  Cell
} from "recharts";
import { 
  TrendingUp, 
  TrendingDown, 
  Ticket, 
  CheckCircle2, 
  DollarSign, 
  BarChart3,
  Star,
  Zap,
  Users,
  MessageSquare,
  Calendar as CalendarIcon
} from "lucide-react";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";

interface AnalyticsData {
  period: number;
  totals: {
    tickets: number;
    closed: number;
  };
  resolution: {
    aiResolved: number;
    humanResolved: number;
    mixed: number;
    aiResolvedPercentage: number;
    humanResolvedPercentage: number;
    mixedPercentage: number;
  };
  tokenUsage: {
    total: number;
    average: number;
  };
  cost: {
    estimated: number;
    promptTokens: number;
    completionTokens: number;
  };
  satisfaction: {
    average: number | null;
    totalRatings: number;
    reviews?: Array<{
      id: string;
      ticket_id: string;
      rating: number | null;
      comment: string | null;
      created_at: string;
    }>;
  };
  chartData?: Array<{
    date: string;
    day: string;
    aiResolved: number;
    humanResolved: number;
    mixed: number;
    tokens: number;
    cost: number;
  }>;
}

export default function AdminDashboard() {
  const { data: tickets = [], isLoading } = useTickets();
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);
  const [period, setPeriod] = useState("30");
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [logsLoading, setLogsLoading] = useState(true);
  const [ticketFlows, setTicketFlows] = useState<any[]>([]);
  const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [customDate, setCustomDate] = useState<Date | undefined>(undefined);
  const [firstTicketDate, setFirstTicketDate] = useState<Date | null>(null);
  const [activeTab, setActiveTab] = useState("analytics");
  const [agentsPerformance, setAgentsPerformance] = useState<any[]>([]);
  const [agentsLoading, setAgentsLoading] = useState(true);
  const [agentsMap, setAgentsMap] = useState<Map<string, { email: string; name: string }>>(new Map());

  // Enable real-time updates for tickets
  useRealtimeTickets();

  // Fetch first ticket date to disable dates before it
  useEffect(() => {
    const fetchFirstTicketDate = async () => {
      try {
        const { data, error } = await supabase
          .from("tickets")
          .select("created_at")
          .order("created_at", { ascending: true })
          .limit(1)
          .single();
        
        if (!error && data?.created_at) {
          setFirstTicketDate(new Date(data.created_at));
        }
      } catch (error) {
        console.error("Error fetching first ticket date:", error);
      }
    };
    
    fetchFirstTicketDate();
  }, []);

  // Fetch agents performance
  const fetchAgentsPerformance = async () => {
    setAgentsLoading(true);
    try {
      const response = await fetch("/api/analytics/agents");
      const data = await response.json();
      
      if (data.error) {
        console.error("Error from API:", data.error);
      } else {
        setAgentsPerformance(data.agents || []);
        
        // Map agent info from API response
        const agentInfoMap = new Map<string, { email: string; name: string }>();
        
        // Try to fetch user info for agents
        const agentIds = (data.agents || []).map((a: any) => a.agentId);
        try {
          const userInfoResponse = await fetch("/api/users/info", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userIds: agentIds }),
          });
          
          if (userInfoResponse.ok) {
            const userInfoData = await userInfoResponse.json();
            
            (data.agents || []).forEach((agent: any) => {
              const userInfo = userInfoData.users?.[agent.agentId];
              // Use name and email from API response (which now comes from Supabase auth)
              const email = agent.email || userInfo?.email || agent.agentId.substring(0, 8) + "...";
              const name = agent.name || userInfo?.name || agent.email?.split("@")[0] || `Agent ${agent.agentId.substring(0, 8)}`;
              
              agentInfoMap.set(agent.agentId, {
                email: email,
                name: name,
              });
            });
          } else {
            // Fallback if user info fetch fails - use data from API
            (data.agents || []).forEach((agent: any) => {
              const email = agent.email || agent.agentId.substring(0, 8) + "...";
              const name = agent.name || agent.email?.split("@")[0] || `Agent ${agent.agentId.substring(0, 8)}`;
              
              agentInfoMap.set(agent.agentId, {
                email: email,
                name: name,
              });
            });
          }
        } catch (error) {
          // Fallback if user info fetch fails - use data from API
          (data.agents || []).forEach((agent: any) => {
            const email = agent.email || agent.agentId.substring(0, 8) + "...";
            const name = agent.name || agent.email?.split("@")[0] || `Agent ${agent.agentId.substring(0, 8)}`;
            
            agentInfoMap.set(agent.agentId, {
              email: email,
              name: name,
            });
          });
        }
        
        setAgentsMap(agentInfoMap);
      }
    } catch (error) {
      console.error("Error fetching agents performance:", error);
    } finally {
      setAgentsLoading(false);
    }
  };

  // Fetch agents performance when tab is active
  useEffect(() => {
    if (activeTab === "performers") {
      fetchAgentsPerformance();
    }
  }, [activeTab]);

  const fetchAnalytics = async () => {
    // Don't fetch if period is custom but no date is selected
    // Keep previous analytics data visible
    if (period === "custom" && !customDate) {
      setAnalyticsLoading(false);
      // Don't clear analytics, keep previous data visible
      return;
    }

    setAnalyticsLoading(true);
    try {
      let url = `/api/analytics/tickets?period=${period}`;
      if (period === "custom" && customDate) {
        const dateStr = format(customDate, "yyyy-MM-dd");
        url = `/api/analytics/tickets?period=custom&date=${dateStr}`;
      }
      const response = await fetch(url);
      const data = await response.json();
      
      // Check if response has an error
      if (data.error) {
        console.error("Error from API:", data.error);
        setAnalyticsLoading(false);
        // Don't clear analytics on error, keep previous data
        return;
      }
      
      setAnalytics(data);
    } catch (error) {
      console.error("Error fetching analytics:", error);
      // Don't clear analytics on error, keep previous data
    } finally {
      setAnalyticsLoading(false);
    }
  };

  const fetchAuditLogs = async () => {
    // Don't fetch if period is custom but no date is selected
    if (period === "custom" && !customDate) {
      setLogsLoading(false);
      return;
    }

    setLogsLoading(true);
    try {
      // Fetch flow view for ticket status changes
      let flowUrl = `/api/analytics/audit-logs?period=${period}&flow=true`;
      if (period === "custom" && customDate) {
        const dateStr = format(customDate, "yyyy-MM-dd");
        flowUrl = `/api/analytics/audit-logs?period=custom&date=${dateStr}&flow=true`;
      }
      const flowResponse = await fetch(flowUrl);
      const flowData = await flowResponse.json();
      
      if (flowData.error) {
        console.error("Error from flow API:", flowData.error);
      } else {
        setTicketFlows(flowData.flows || []);
      }

      // Also fetch regular audit logs for backward compatibility
      let url = `/api/analytics/audit-logs?period=${period}`;
      if (period === "custom" && customDate) {
        const dateStr = format(customDate, "yyyy-MM-dd");
        url = `/api/analytics/audit-logs?period=custom&date=${dateStr}`;
      }
      const response = await fetch(url);
      const data = await response.json();
      
      // Check if response has an error
      if (data.error) {
        console.error("Error from API:", data.error);
      } else {
        setAuditLogs(data.logs || []);
      }
    } catch (error) {
      console.error("Error fetching audit logs:", error);
    } finally {
      setLogsLoading(false);
    }
  };

  // Initial fetch and fetch on period change
  useEffect(() => {
    // Only fetch if period is not custom, or if custom and date is selected
    if (period !== "custom" || customDate) {
      fetchAnalytics();
      fetchAuditLogs();
    }
  }, [period, customDate]);

  // Listen for ticket status changes and refresh analytics
  useEffect(() => {
    const channel = supabase
      .channel("admin-analytics-updates")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "ticket_statuses",
        },
        () => {
          // Debounce refresh to avoid too many API calls
          if (refreshTimeoutRef.current) {
            clearTimeout(refreshTimeoutRef.current);
          }
          
          refreshTimeoutRef.current = setTimeout(() => {
            fetchAnalytics();
            fetchAuditLogs();
          }, 1000);
        }
      )
      .subscribe();

    return () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
      supabase.removeChannel(channel);
    };
  }, [period]);

  const formatCurrency = (value: number) => {
    // For very small values, show more decimal places
    if (value < 0.01) {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 6,
        maximumFractionDigits: 6,
      }).format(value);
    }
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 4,
    }).format(value);
  };

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('en-US').format(value);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-purple-50/20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          {/* Period Filter and Tabs */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <TabsList className="bg-white/80 backdrop-blur-sm border border-slate-200/50 shadow-lg rounded-xl p-1.5">
              <TabsTrigger 
                value="analytics" 
                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-purple-600 data-[state=active]:text-white data-[state=active]:shadow-lg rounded-lg px-6 font-semibold transition-all"
              >
                Analytics
              </TabsTrigger>
              <TabsTrigger 
                value="audit" 
                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-purple-600 data-[state=active]:text-white data-[state=active]:shadow-lg rounded-lg px-6 font-semibold transition-all"
              >
                Audit Logs
              </TabsTrigger>
              <TabsTrigger 
                value="performers" 
                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-purple-600 data-[state=active]:text-white data-[state=active]:shadow-lg rounded-lg px-6 font-semibold transition-all"
              >
                Top Performers
              </TabsTrigger>
            </TabsList>
            
            <div className="flex gap-2 bg-white/80 backdrop-blur-sm rounded-xl p-1.5 shadow-lg border border-slate-200/50">
              {[
                { value: "7", label: "7D" },
                { value: "30", label: "30D" },
                { value: "90", label: "90D" },
              ].map((p) => (
                <button
                  key={p.value}
                  onClick={() => {
                    setPeriod(p.value);
                    setCustomDate(undefined);
                  }}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
                    period === p.value
                      ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg shadow-blue-500/30"
                      : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  {p.label}
                </button>
              ))}
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
                      period === "custom" && customDate
                        ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg shadow-blue-500/30 border-transparent"
                        : "text-slate-600 hover:bg-slate-100 border-slate-200"
                    }`}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {customDate ? format(customDate, "MMM dd, yyyy") : "Custom"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                  <Calendar
                    mode="single"
                    selected={customDate}
                    onSelect={(date) => {
                      if (date) {
                        setCustomDate(date);
                        setPeriod("custom");
                      }
                    }}
                    disabled={(date) => {
                      if (!firstTicketDate) return true;
                      const firstDate = new Date(firstTicketDate);
                      firstDate.setHours(0, 0, 0, 0);
                      const today = new Date();
                      today.setHours(23, 59, 59, 999);
                      return date < firstDate || date > today;
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <TabsContent value="analytics" className="mt-0 space-y-6">
            {analyticsLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-40 rounded-2xl" />
                ))}
              </div>
            ) : period === "custom" && !customDate ? (
              <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <CalendarIcon className="w-12 h-12 text-slate-400 mb-4" />
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">Select a Date</h3>
                  <p className="text-slate-600 text-center">Please select a date from the calendar to view analytics for that day.</p>
                </CardContent>
              </Card>
            ) : analytics ? (
              <>
                {/* Key Metrics Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <Card className="border-0 shadow-xl bg-gradient-to-br from-blue-500 to-blue-600 text-white overflow-hidden relative">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16"></div>
                    <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full -ml-12 -mb-12"></div>
                    <CardHeader className="relative z-10">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-blue-100 text-sm font-medium uppercase tracking-wide">
                          Total Tickets
                        </CardTitle>
                        <Ticket className="w-5 h-5 text-blue-200" />
                      </div>
                    </CardHeader>
                    <CardContent className="relative z-10">
                      <div className="text-4xl font-bold mb-1">{formatNumber(analytics.totals.tickets)}</div>
                      <p className="text-blue-100/80 text-sm">Created in period</p>
                    </CardContent>
                  </Card>

                  <Card className="border-0 shadow-xl bg-gradient-to-br from-emerald-500 to-emerald-600 text-white overflow-hidden relative">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16"></div>
                    <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full -ml-12 -mb-12"></div>
                    <CardHeader className="relative z-10">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-emerald-100 text-sm font-medium uppercase tracking-wide">
                          Closed Tickets
                        </CardTitle>
                        <CheckCircle2 className="w-5 h-5 text-emerald-200" />
                      </div>
                    </CardHeader>
                    <CardContent className="relative z-10">
                      <div className="text-4xl font-bold mb-1">{formatNumber(analytics.totals.closed)}</div>
                      <p className="text-emerald-100/80 text-sm">
                        {analytics.totals.tickets > 0 
                          ? `${((analytics.totals.closed / analytics.totals.tickets) * 100).toFixed(1)}% resolution rate`
                          : "No tickets"}
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="border-0 shadow-xl bg-gradient-to-br from-amber-500 to-amber-600 text-white overflow-hidden relative">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16"></div>
                    <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full -ml-12 -mb-12"></div>
                    <CardHeader className="relative z-10">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-amber-100 text-sm font-medium uppercase tracking-wide">
                          Total Tokens
                        </CardTitle>
                        <Zap className="w-5 h-5 text-amber-200" />
                      </div>
                    </CardHeader>
                    <CardContent className="relative z-10">
                      <div className="text-4xl font-bold mb-1">{formatNumber(analytics.tokenUsage.total)}</div>
                      <p className="text-amber-100/80 text-sm">
                        Avg: {formatNumber(Math.round(analytics.tokenUsage.average))}/ticket
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="border-0 shadow-xl bg-gradient-to-br from-purple-500 to-purple-600 text-white overflow-hidden relative">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16"></div>
                    <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full -ml-12 -mb-12"></div>
                    <CardHeader className="relative z-10">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-purple-100 text-sm font-medium uppercase tracking-wide">
                          Estimated Cost
                        </CardTitle>
                        <DollarSign className="w-5 h-5 text-purple-200" />
                      </div>
                    </CardHeader>
                    <CardContent className="relative z-10">
                      <div className="text-4xl font-bold mb-1">{formatCurrency(analytics.cost.estimated)}</div>
                      <p className="text-purple-100/80 text-sm">
                        {formatNumber(analytics.cost.promptTokens)} prompt + {formatNumber(analytics.cost.completionTokens)} completion
                      </p>
                    </CardContent>
                  </Card>
                </div>

                {/* Charts Row */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Tickets Closed Chart */}
                  <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm">
                    <CardHeader className="pb-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-2xl font-bold text-slate-900">Tickets Closed</CardTitle>
                          <CardDescription className="mt-1">Resolution breakdown over time</CardDescription>
                        </div>
                        <BarChart3 className="w-6 h-6 text-slate-400" />
                      </div>
                    </CardHeader>
                    <CardContent>
                      {analytics.chartData && analytics.chartData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={300}>
                          <LineChart data={analytics.chartData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                            <XAxis 
                              dataKey="day" 
                              stroke="#64748b"
                              style={{ fontSize: '12px' }}
                              tick={{ fill: '#64748b' }}
                            />
                            <YAxis 
                              stroke="#64748b"
                              style={{ fontSize: '12px' }}
                              tick={{ fill: '#64748b' }}
                            />
                            <Tooltip 
                              contentStyle={{ 
                                backgroundColor: 'white',
                                border: '1px solid #e2e8f0',
                                borderRadius: '12px',
                                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                              }}
                            />
                            <Legend 
                              wrapperStyle={{ paddingTop: '20px' }}
                              iconType="line"
                            />
                            <Line 
                              type="monotone" 
                              dataKey="aiResolved" 
                              stroke="#10b981" 
                              strokeWidth={3}
                              dot={{ fill: '#10b981', r: 4 }}
                              name="AI Resolved"
                            />
                            <Line 
                              type="monotone" 
                              dataKey="humanResolved" 
                              stroke="#3b82f6" 
                              strokeWidth={3}
                              dot={{ fill: '#3b82f6', r: 4 }}
                              name="Human Resolved"
                            />
                            <Line 
                              type="monotone" 
                              dataKey="mixed" 
                              stroke="#f59e0b" 
                              strokeWidth={3}
                              dot={{ fill: '#f59e0b', r: 4 }}
                              name="Hybrid"
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="h-[300px] flex items-center justify-center text-slate-400">
                          No data available
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Tokens & Cost Chart */}
                  <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm">
                    <CardHeader className="pb-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-2xl font-bold text-slate-900">Tokens & Cost</CardTitle>
                          <CardDescription className="mt-1">Usage and spending trends</CardDescription>
                        </div>
                        <TrendingUp className="w-6 h-6 text-slate-400" />
                      </div>
                    </CardHeader>
                    <CardContent>
                      {analytics.chartData && analytics.chartData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={300}>
                          <ComposedChart data={analytics.chartData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                            <XAxis 
                              dataKey="day" 
                              stroke="#64748b"
                              style={{ fontSize: '12px' }}
                              tick={{ fill: '#64748b' }}
                            />
                            <YAxis 
                              yAxisId="tokens"
                              orientation="left"
                              stroke="#64748b"
                              style={{ fontSize: '12px' }}
                              tick={{ fill: '#64748b' }}
                            />
                            <YAxis 
                              yAxisId="cost"
                              orientation="right"
                              stroke="#8b5cf6"
                              style={{ fontSize: '12px' }}
                              tick={{ fill: '#8b5cf6' }}
                            />
                            <Tooltip 
                              contentStyle={{ 
                                backgroundColor: 'white',
                                border: '1px solid #e2e8f0',
                                borderRadius: '12px',
                                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                              }}
                              formatter={(value: any, name: string) => {
                                if (name === 'Cost') return formatCurrency(value);
                                return formatNumber(value);
                              }}
                            />
                            <Legend 
                              wrapperStyle={{ paddingTop: '20px' }}
                            />
                            <Bar 
                              yAxisId="tokens"
                              dataKey="tokens" 
                              fill="#f59e0b" 
                              name="Tokens"
                              radius={[8, 8, 0, 0]}
                            />
                            <Line 
                              yAxisId="cost"
                              type="monotone" 
                              dataKey="cost" 
                              stroke="#8b5cf6" 
                              strokeWidth={3}
                              dot={{ fill: '#8b5cf6', r: 4 }}
                              name="Cost"
                            />
                          </ComposedChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="h-[300px] flex items-center justify-center text-slate-400">
                          No data available
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {/* Resolution Breakdown & Satisfaction */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Resolution Breakdown */}
                  <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm">
                    <CardHeader>
                      <CardTitle className="text-2xl font-bold text-slate-900">Resolution Breakdown</CardTitle>
                      <CardDescription>How tickets were resolved</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {analytics.resolution.aiResolved + analytics.resolution.humanResolved + analytics.resolution.mixed > 0 ? (
                        <div className="flex flex-col items-center gap-6">
                          {/* Donut Chart */}
                          <div className="w-full">
                            <ResponsiveContainer width="100%" height={280}>
                              <PieChart>
                                <Pie
                                  data={[
                                    { 
                                      name: "AI Resolved", 
                                      value: analytics.resolution.aiResolved,
                                      percentage: analytics.resolution.aiResolvedPercentage 
                                    },
                                    { 
                                      name: "Human Resolved", 
                                      value: analytics.resolution.humanResolved,
                                      percentage: analytics.resolution.humanResolvedPercentage 
                                    },
                                    { 
                                      name: "Hybrid", 
                                      value: analytics.resolution.mixed,
                                      percentage: analytics.resolution.mixedPercentage 
                                    },
                                  ]}
                                  cx="50%"
                                  cy="50%"
                                  innerRadius={70}
                                  outerRadius={110}
                                  paddingAngle={5}
                                  dataKey="value"
                                >
                                  {[
                                    { color: "#10b981" }, // emerald-500
                                    { color: "#3b82f6" }, // blue-500
                                    { color: "#f59e0b" }, // amber-500
                                  ].map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                  ))}
                                </Pie>
                                <Tooltip 
                                  contentStyle={{ 
                                    backgroundColor: 'white',
                                    border: '1px solid #e2e8f0',
                                    borderRadius: '12px',
                                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                                  }}
                                  formatter={(value: any, name: string, props: any) => {
                                    return [`${value} (${props.payload.percentage.toFixed(1)}%)`, name];
                                  }}
                                />
                              </PieChart>
                            </ResponsiveContainer>
                          </div>

                          {/* Legend */}
                          <div className="w-full flex flex-wrap items-center justify-center gap-4 md:gap-6">
                            <div className="flex items-center gap-2">
                              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500"></div>
                              <span className="text-sm font-medium text-slate-900">AI Resolved</span>
                              <span className="text-sm text-slate-600">
                                {analytics.resolution.aiResolved} ({analytics.resolution.aiResolvedPercentage.toFixed(1)}%)
                              </span>
                            </div>

                            <div className="flex items-center gap-2">
                              <div className="w-2.5 h-2.5 rounded-full bg-blue-500"></div>
                              <span className="text-sm font-medium text-slate-900">Human Resolved</span>
                              <span className="text-sm text-slate-600">
                                {analytics.resolution.humanResolved} ({analytics.resolution.humanResolvedPercentage.toFixed(1)}%)
                              </span>
                            </div>

                            <div className="flex items-center gap-2">
                              <div className="w-2.5 h-2.5 rounded-full bg-amber-500"></div>
                              <span className="text-sm font-medium text-slate-900">Hybrid (AI + Human)</span>
                              <span className="text-sm text-slate-600">
                                {analytics.resolution.mixed} ({analytics.resolution.mixedPercentage.toFixed(1)}%)
                              </span>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="h-[280px] flex items-center justify-center text-slate-400">
                          No resolution data available
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Customer Satisfaction */}
                  {analytics.satisfaction.average !== null && (
                    <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm">
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <div>
                            <CardTitle className="text-2xl font-bold text-slate-900">Customer Satisfaction</CardTitle>
                            <CardDescription>
                              Based on {analytics.satisfaction.totalRatings} ratings
                            </CardDescription>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="flex flex-col items-center">
                              <div className="flex items-center gap-2">
                                <div className="text-4xl font-bold bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 bg-clip-text text-transparent">
                                  {analytics.satisfaction.average.toFixed(1)}
                                </div>
                                <Star className="w-6 h-6 fill-amber-400 text-amber-400" />
                              </div>
                              <p className="text-slate-600 text-sm mt-1">out of 5.0</p>
                            </div>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-6">

                          {/* Reviews List */}
                          {analytics.satisfaction.reviews && analytics.satisfaction.reviews.length > 0 && (
                            <div className="border-t border-slate-200 pt-4">
                              <h3 className="text-sm font-semibold text-slate-900 mb-3">Recent Reviews</h3>
                              <div className="space-y-3 max-h-[400px] overflow-y-auto">
                                {analytics.satisfaction.reviews.map((review) => (
                                  <div
                                    key={review.id}
                                    className="p-4 bg-slate-50 rounded-lg border border-slate-200 hover:border-slate-300 transition-colors"
                                  >
                                    <div className="flex items-start justify-between gap-3">
                                      <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-2">
                                          <div className="flex items-center gap-1">
                                            {[1, 2, 3, 4, 5].map((star) => (
                                              <Star
                                                key={star}
                                                className={`w-4 h-4 ${
                                                  review.rating && star <= review.rating
                                                    ? "fill-amber-400 text-amber-400"
                                                    : "fill-slate-300 text-slate-300"
                                                }`}
                                              />
                                            ))}
                                          </div>
                                          <span className="text-xs text-slate-500">
                                            {new Date(review.created_at).toLocaleDateString('en-US', {
                                              month: 'short',
                                              day: 'numeric',
                                              year: 'numeric'
                                            })}
                                          </span>
                                        </div>
                                        {review.comment && (
                                          <p className="text-sm text-slate-700 mt-2 line-clamp-2">
                                            {review.comment}
                                          </p>
                                        )}
                                      </div>
                                      <Link
                                        href={`/dashboard/tickets/${review.ticket_id}`}
                                        className="ml-2 px-3 py-1.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white text-xs font-medium rounded-lg hover:shadow-lg transition-all duration-200 whitespace-nowrap"
                                      >
                                        View Ticket
                                      </Link>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </>
            ) : (
              <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <BarChart3 className="w-12 h-12 text-slate-400 mb-4" />
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">No Analytics Data</h3>
                  <p className="text-slate-600 text-center">No analytics data available for the selected period.</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="audit" className="mt-0">
            <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-2xl font-bold text-slate-900">Ticket Status Flow</CardTitle>
                <CardDescription>Status changes and triggers for each ticket</CardDescription>
              </CardHeader>
              <CardContent>
                {logsLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <Skeleton key={i} className="h-32 rounded-xl" />
                    ))}
                  </div>
                ) : (
                  <div className="space-y-6 max-h-[600px] overflow-y-auto overflow-x-visible">
                    {ticketFlows.length === 0 ? (
                      <div className="text-center py-12">
                        <MessageSquare className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                        <p className="text-slate-500">No ticket flows found for the selected period</p>
                      </div>
                    ) : (
                      ticketFlows.map((flow) => (
                        <div
                          key={flow.ticketId}
                          className="p-6 border border-slate-200 rounded-xl bg-white hover:shadow-lg transition-all duration-200 hover:border-blue-300 relative"
                        >
                          <div className="flex justify-between items-start mb-4">
                            <div className="flex-1">
                              <div className="font-semibold text-slate-900 mb-1">
                                {flow.ticketSubject || `Ticket ${flow.ticketId.slice(0, 8)}`}
                              </div>
                              <div className="text-sm text-slate-600 mb-2">
                                Created: {new Date(flow.ticketCreated).toLocaleString()}
                              </div>
                              {/* Ticket Stats */}
                              <div className="flex flex-wrap gap-4 mt-2">
                                <div className="flex items-center gap-2 text-sm">
                                  <MessageSquare className="w-4 h-4 text-slate-500" />
                                  <span className="text-slate-700">
                                    <span className="font-semibold">{flow.stats?.messageCount || 0}</span> messages
                                  </span>
                                </div>
                                <div className="flex items-center gap-2 text-sm">
                                  <Zap className="w-4 h-4 text-amber-500" />
                                  <span className="text-slate-700">
                                    <span className="font-semibold">{formatNumber(flow.stats?.totalTokens || 0)}</span> tokens
                                  </span>
                                </div>
                                <div className="flex items-center gap-2 text-sm">
                                  <DollarSign className="w-4 h-4 text-emerald-500" />
                                  <span className="text-slate-700">
                                    <span className="font-semibold">{formatCurrency(flow.stats?.totalCost || 0)}</span> cost
                                  </span>
                                </div>
                              </div>
                            </div>
                            <Link
                              href={`/dashboard/tickets/${flow.ticketId}`}
                              className="ml-4 px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white text-sm font-medium rounded-lg hover:shadow-lg transition-all duration-200"
                            >
                              View Ticket
                            </Link>
                          </div>

                          {/* Status Flow Visualization */}
                          <div className="mt-4">
                            <div className="flex flex-wrap items-center gap-4">
                              {flow.statusFlow.map((statusItem: any, index: number) => (
                                <div key={index} className="flex items-center gap-4">
                                  {/* Status Badge */}
                                  <div className="relative group">
                                    <div className="flex flex-col items-center">
                                      <div
                                        className={`px-4 py-2 rounded-lg font-semibold text-sm whitespace-nowrap cursor-help transition-all ${
                                          statusItem.status === "open"
                                            ? "bg-blue-100 text-blue-700 border-2 border-blue-300 hover:bg-blue-200"
                                            : statusItem.status === "needs_human_assistance"
                                            ? "bg-amber-100 text-amber-700 border-2 border-amber-300 hover:bg-amber-200"
                                            : statusItem.status === "closed"
                                            ? "bg-emerald-100 text-emerald-700 border-2 border-emerald-300 hover:bg-emerald-200"
                                            : "bg-slate-100 text-slate-700 border-2 border-slate-300 hover:bg-slate-200"
                                        }`}
                                      >
                                        {statusItem.status.replace(/_/g, " ").toUpperCase()}
                                      </div>
                                      <div className="text-xs text-slate-500 mt-1">
                                        {new Date(statusItem.timestamp).toLocaleTimeString()}
                                      </div>
                                    </div>

                                    {/* Trigger Info Tooltip - Show on hover from right */}
                                    {statusItem.trigger && (
                                      <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 w-72 z-[9999] opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                                        <div className="bg-slate-900 text-white rounded-lg p-3 shadow-xl text-xs border border-slate-700">
                                          <div className="font-semibold text-white mb-2 flex items-center gap-2">
                                            <span className="w-2 h-2 rounded-full bg-blue-400"></span>
                                            {statusItem.trigger.description}
                                          </div>
                                          {statusItem.trigger.message && (
                                            <div className="text-slate-200 italic mt-2 mb-2 line-clamp-3 border-l-2 border-slate-600 pl-2">
                                              "{statusItem.trigger.message}"
                                            </div>
                                          )}
                                          <div className="mt-2 pt-2 border-t border-slate-700 flex items-center justify-between">
                                            <span className="text-slate-400">
                                              Triggered by: <span className="text-white font-medium">{statusItem.trigger.type}</span>
                                            </span>
                                          </div>
                                        </div>
                                        {/* Arrow pointing left - centered */}
                                        <div className="absolute -left-1 top-1/2 -translate-y-1/2">
                                          <div className="w-2 h-2 bg-slate-900 rotate-45 border-l border-b border-slate-700"></div>
                                        </div>
                                      </div>
                                    )}
                                  </div>

                                  {/* Arrow */}
                                  {index < flow.statusFlow.length - 1 && (
                                    <div className="flex items-center">
                                      <svg
                                        className="w-8 h-8 text-slate-400"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                      >
                                        <path
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                          strokeWidth={2}
                                          d="M13 7l5 5m0 0l-5 5m5-5H6"
                                        />
                                      </svg>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="performers" className="mt-0">
            <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-2xl font-bold text-slate-900">Top Performers</CardTitle>
                <CardDescription>Agent performance metrics based on closed tickets</CardDescription>
              </CardHeader>
              <CardContent>
                {agentsLoading ? (
                  <div className="space-y-4">
                    {[1, 2, 3, 4].map((i) => (
                      <Skeleton key={i} className="h-24 rounded-xl" />
                    ))}
                  </div>
                ) : agentsPerformance.length === 0 ? (
                  <div className="text-center py-12">
                    <Users className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                    <p className="text-slate-500">No agent performance data available</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {agentsPerformance.map((agent, index) => {
                      const agentInfo = agentsMap.get(agent.agentId);
                      const formatTime = (minutes: number | null) => {
                        if (!minutes) return "N/A";
                        if (minutes < 60) return `${Math.round(minutes)}m`;
                        const hours = Math.floor(minutes / 60);
                        const mins = Math.round(minutes % 60);
                        return `${hours}h ${mins}m`;
                      };

                      return (
                        <div
                          key={agent.agentId}
                          className="p-6 border border-slate-200 rounded-xl bg-white hover:shadow-lg transition-all duration-200 hover:border-blue-300"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              {/* Rank Badge */}
                              <div className={`flex items-center justify-center w-12 h-12 rounded-full font-bold text-lg ${
                                index === 0 
                                  ? "bg-gradient-to-r from-yellow-400 to-yellow-500 text-white"
                                  : index === 1
                                  ? "bg-gradient-to-r from-slate-300 to-slate-400 text-white"
                                  : index === 2
                                  ? "bg-gradient-to-r from-amber-600 to-amber-700 text-white"
                                  : "bg-slate-100 text-slate-600"
                              }`}>
                                {index + 1}
                              </div>
                              
                              {/* Agent Info */}
                              <div>
                                <div className="font-semibold text-slate-900 text-lg">
                                  {agentInfo?.name || `Agent ${agent.agentId.substring(0, 8)}`}
                                </div>
                                <div className="text-sm text-slate-500">
                                  {agentInfo?.email || agent.agentId.substring(0, 8) + "..."}
                                </div>
                              </div>
                            </div>

                            {/* Metrics */}
                            <div className="flex items-center gap-8">
                              {/* Tickets Closed */}
                              <div className="text-center">
                                <div className="text-2xl font-bold text-slate-900">
                                  {agent.ticketsClosed}
                                </div>
                                <div className="text-xs text-slate-500 mt-1">Tickets Closed</div>
                              </div>

                              {/* Average Rating */}
                              <div className="text-center">
                                {agent.averageRating ? (
                                  <>
                                    <div className="flex items-center justify-center gap-1 text-2xl font-bold text-slate-900">
                                      <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                                      {agent.averageRating.toFixed(1)}
                                    </div>
                                    <div className="text-xs text-slate-500 mt-1">
                                      {agent.ratingCount} review{agent.ratingCount !== 1 ? "s" : ""}
                                    </div>
                                  </>
                                ) : (
                                  <>
                                    <div className="text-2xl font-bold text-slate-400">—</div>
                                    <div className="text-xs text-slate-500 mt-1">No reviews</div>
                                  </>
                                )}
                              </div>

                              {/* Average Resolution Time */}
                              <div className="text-center">
                                {agent.averageResolutionTimeMinutes ? (
                                  <>
                                    <div className="text-2xl font-bold text-slate-900">
                                      {formatTime(agent.averageResolutionTimeMinutes)}
                                    </div>
                                    <div className="text-xs text-slate-500 mt-1">Avg Resolution</div>
                                  </>
                                ) : (
                                  <>
                                    <div className="text-2xl font-bold text-slate-400">—</div>
                                    <div className="text-xs text-slate-500 mt-1">No data</div>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
