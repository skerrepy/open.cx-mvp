"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  Tooltip 
} from "recharts";
import { 
  Lightbulb,
  Download
} from "lucide-react";
import { format } from "date-fns";

export default function InsightsPage() {
  const [isGenerating, setIsGenerating] = useState(false);

  // Fetch latest insights
  const { data: insightsResponse, isLoading: insightsLoading, refetch } = useQuery({
    queryKey: ["insights"],
    queryFn: async () => {
      const response = await fetch("/api/insights/latest");
      const data = await response.json();
      return data;
    },
  });

  const insightsData = insightsResponse?.insights;
  const isToday = insightsResponse?.isToday;
  const needsGeneration = insightsResponse?.needsGeneration;

  // Auto-generate insights on page load if not generated today
  useEffect(() => {
    const generateIfNeeded = async () => {
      // Only generate if:
      // 1. Not currently loading
      // 2. Not currently generating
      // 3. Response has been loaded (not undefined)
      // 4. No insights for today (isToday is false or undefined)
      if (
        !insightsLoading && 
        !isGenerating && 
        insightsResponse !== undefined && 
        isToday === false
      ) {
        setIsGenerating(true);
        try {
          const response = await fetch("/api/insights/generate", { method: "POST" });
          const data = await response.json();
          if (data.insights) {
            // Refetch insights after generation
            await refetch();
          } else if (data.message) {
            // If it says insights already generated, refetch to get them
            if (data.message.includes("already generated")) {
              await refetch();
            }
          }
        } catch (error) {
          console.error("Error generating insights:", error);
        } finally {
          setIsGenerating(false);
        }
      }
    };

    generateIfNeeded();
  }, [insightsLoading, isToday, isGenerating, insightsResponse, refetch]);

  // Fetch tickets with tags for pie chart
  const { data: ticketsWithTags, isLoading: tagsLoading } = useQuery({
    queryKey: ["tickets-tags"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tickets")
        .select("tags")
        .not("tags", "is", null);
      
      if (error) throw error;
      return data || [];
    },
  });

  // Calculate tag frequencies for pie chart
  const tagFrequencies = ticketsWithTags?.reduce((acc: Record<string, number>, ticket: any) => {
    if (ticket.tags && Array.isArray(ticket.tags)) {
      ticket.tags.forEach((tag: string) => {
        acc[tag] = (acc[tag] || 0) + 1;
      });
    }
    return acc;
  }, {}) || {};

  const pieChartData = Object.entries(tagFrequencies)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => (b.value as number) - (a.value as number))
    .slice(0, 10); // Top 10 tags

  const COLORS = [
    "#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6",
    "#06b6d4", "#ec4899", "#84cc16", "#f97316", "#6366f1"
  ];

  // Export insights function
  const handleExportInsights = () => {
    if (!insightsData) return;

    const markdown = `# Product Insights Report
Generated: ${new Date(insightsData.created_at).toLocaleString()}

## Summary

${insightsData.summary}

## Recurring Issues

${insightsData.recurring_issues.map((issue: string, i: number) => `${i + 1}. ${issue}`).join("\n")}

## Requested Features

${insightsData.requested_features.map((feature: string, i: number) => `${i + 1}. ${feature}`).join("\n")}

## Tag Distribution

${Object.entries(tagFrequencies)
  .sort((a, b) => b[1] - a[1])
  .map(([tag, count]) => `- ${tag}: ${count}`)
  .join("\n")}
`;

    // Create and download file
    const blob = new Blob([markdown], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `product-insights-${format(new Date(insightsData.created_at), "yyyy-MM-dd")}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-purple-50/20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Export button */}
        {insightsData && (
          <div className="flex justify-end">
            <Button
              onClick={handleExportInsights}
              variant="outline"
              className="border-slate-300 hover:bg-slate-50"
            >
              <Download className="w-4 h-4 mr-2" />
              Export Insights
            </Button>
          </div>
        )}

        {(insightsLoading || isGenerating) ? (
          <div className="space-y-6">
            {/* Generating/Loading message */}
            {(isGenerating || insightsLoading) && (
              <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm">
                <CardContent className="flex flex-col items-center justify-center py-8">
                  <Lightbulb className="w-12 h-12 text-blue-500 mb-4 animate-pulse" />
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">
                    {isGenerating ? "Generating Insights..." : "Loading Insights..."}
                  </h3>
                  <p className="text-slate-600 text-center text-sm">
                    {isGenerating 
                      ? "Analyzing resolved tickets and extracting insights. This may take a moment..."
                      : "Please wait..."}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Summary Card Skeleton */}
            <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <Skeleton className="h-7 w-32" />
                  <Skeleton className="h-4 w-40" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-5/6" />
                </div>
              </CardContent>
            </Card>

            {/* Two Column Cards Skeleton */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Recurring Issues Skeleton */}
              <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm">
                <CardHeader>
                  <Skeleton className="h-6 w-40 mb-2" />
                  <Skeleton className="h-4 w-56" />
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <div key={i} className="flex items-start gap-3">
                        <Skeleton className="h-6 w-6 rounded-full flex-shrink-0" />
                        <Skeleton className="h-4 w-full" />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Requested Features Skeleton */}
              <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm">
                <CardHeader>
                  <Skeleton className="h-6 w-48 mb-2" />
                  <Skeleton className="h-4 w-52" />
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <div key={i} className="flex items-start gap-3">
                        <Skeleton className="h-6 w-6 rounded-full flex-shrink-0" />
                        <Skeleton className="h-4 w-full" />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Pie Chart Skeleton */}
            <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm">
              <CardHeader>
                <Skeleton className="h-6 w-56 mb-2" />
                <Skeleton className="h-4 w-64" />
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-center h-[300px]">
                  <Skeleton className="h-64 w-64 rounded-full" />
                </div>
              </CardContent>
            </Card>
          </div>
        ) : !insightsData ? (
          <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Lightbulb className="w-12 h-12 text-slate-400 mb-4" />
              <h3 className="text-lg font-semibold text-slate-900 mb-2">No Insights Available</h3>
              <p className="text-slate-600 text-center">
                No resolved tickets found to generate insights from. Insights will be generated automatically once you have resolved tickets.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Summary Card */}
            <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm lg:col-span-2">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-2xl font-bold text-slate-900">Summary</CardTitle>
                  <span className="text-sm text-slate-500">
                    {format(new Date(insightsData.created_at), "MMM dd, yyyy 'at' h:mm a")}
                  </span>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-slate-700 leading-relaxed">{insightsData.summary}</p>
              </CardContent>
            </Card>

            {/* Recurring Issues */}
            <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-xl font-bold text-slate-900">Recurring Issues</CardTitle>
                <CardDescription>Top issues customers are facing</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {insightsData.recurring_issues.map((issue: string, index: number) => (
                    <li key={index} className="flex items-start gap-3">
                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-red-100 text-red-600 flex items-center justify-center text-sm font-semibold">
                        {index + 1}
                      </span>
                      <span className="text-slate-700 pt-0.5">{issue}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            {/* Requested Features */}
            <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-xl font-bold text-slate-900">Requested Features</CardTitle>
                <CardDescription>Top feature improvements requested</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {insightsData.requested_features.map((feature: string, index: number) => (
                    <li key={index} className="flex items-start gap-3">
                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-semibold">
                        {index + 1}
                      </span>
                      <span className="text-slate-700 pt-0.5">{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            {/* Tag Distribution Pie Chart */}
            <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-xl font-bold text-slate-900">Ticket Tag Distribution</CardTitle>
                <CardDescription>Distribution of tickets by category tags</CardDescription>
              </CardHeader>
              <CardContent>
                {tagsLoading ? (
                  <Skeleton className="h-64 rounded-xl" />
                ) : pieChartData.length === 0 ? (
                  <div className="text-center py-12 text-slate-500">
                    No tags available yet. Tags will appear after generating insights.
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={pieChartData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }: any) => `${name} (${(percent * 100).toFixed(0)}%)`}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {pieChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}

