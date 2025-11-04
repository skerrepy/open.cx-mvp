"use client";

import { useState, useEffect } from "react";
import { useTickets } from "@/lib/hooks";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";

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
  };
}

export default function AdminDashboard() {
  const { data: tickets = [], isLoading } = useTickets();
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);
  const [period, setPeriod] = useState("30");
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [logsLoading, setLogsLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
    fetchAuditLogs();
  }, [period]);

  const fetchAnalytics = async () => {
    setAnalyticsLoading(true);
    try {
      const response = await fetch(`/api/analytics/tickets?period=${period}`);
      const data = await response.json();
      setAnalytics(data);
    } catch (error) {
      console.error("Error fetching analytics:", error);
    } finally {
      setAnalyticsLoading(false);
    }
  };

  const fetchAuditLogs = async () => {
    setLogsLoading(true);
    try {
      const response = await fetch(`/api/analytics/audit-logs?period=${period}`);
      const data = await response.json();
      setAuditLogs(data.logs || []);
    } catch (error) {
      console.error("Error fetching audit logs:", error);
    } finally {
      setLogsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
        {/* Period Filter */}
        <div className="mb-6 flex gap-2">
          {[
            { value: "7", label: "Last 7 days" },
            { value: "30", label: "Last 30 days" },
            { value: "90", label: "Last 90 days" },
          ].map((p) => (
            <button
              key={p.value}
              onClick={() => setPeriod(p.value)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                period === p.value
                  ? "bg-blue-600 text-white"
                  : "bg-white text-gray-700 hover:bg-gray-100"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        <Tabs defaultValue="analytics" className="space-y-4">
          <TabsList className="bg-white">
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="insights">Ticket Insights</TabsTrigger>
            <TabsTrigger value="audit">Audit Logs</TabsTrigger>
          </TabsList>

          <TabsContent value="analytics" className="mt-0">
            {analyticsLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-32" />
                ))}
              </div>
            ) : analytics ? (
              <div className="space-y-6">
                {/* Key Metrics */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm font-medium text-gray-500">
                        Total Tickets
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold">{analytics.totals.tickets}</div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm font-medium text-gray-500">
                        Closed Tickets
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold">{analytics.totals.closed}</div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm font-medium text-gray-500">
                        Total Tokens
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold">
                        {analytics.tokenUsage.total.toLocaleString()}
                      </div>
                      <p className="text-sm text-gray-500 mt-1">
                        Avg: {Math.round(analytics.tokenUsage.average).toLocaleString()}/ticket
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm font-medium text-gray-500">
                        Estimated Cost
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold">
                        ${analytics.cost.estimated.toFixed(4)}
                      </div>
                      <p className="text-sm text-gray-500 mt-1">
                        {analytics.cost.promptTokens.toLocaleString()} prompt +{" "}
                        {analytics.cost.completionTokens.toLocaleString()} completion tokens
                      </p>
                    </CardContent>
                  </Card>
                </div>

                {/* Resolution Breakdown */}
                <Card>
                  <CardHeader>
                    <CardTitle>Resolution Breakdown</CardTitle>
                    <CardDescription>
                      How tickets were resolved in the selected period
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <div className="flex justify-between mb-2">
                          <span className="text-sm font-medium">AI Resolved</span>
                          <span className="text-sm font-bold">
                            {analytics.resolution.aiResolved} (
                            {analytics.resolution.aiResolvedPercentage.toFixed(1)}%)
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-green-500 h-2 rounded-full"
                            style={{
                              width: `${analytics.resolution.aiResolvedPercentage}%`,
                            }}
                          />
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between mb-2">
                          <span className="text-sm font-medium">Human Resolved</span>
                          <span className="text-sm font-bold">
                            {analytics.resolution.humanResolved} (
                            {analytics.resolution.humanResolvedPercentage.toFixed(1)}%)
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-blue-500 h-2 rounded-full"
                            style={{
                              width: `${analytics.resolution.humanResolvedPercentage}%`,
                            }}
                          />
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between mb-2">
                          <span className="text-sm font-medium">Mixed (AI + Human)</span>
                          <span className="text-sm font-bold">
                            {analytics.resolution.mixed} (
                            {analytics.resolution.mixedPercentage.toFixed(1)}%)
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-yellow-500 h-2 rounded-full"
                            style={{
                              width: `${analytics.resolution.mixedPercentage}%`,
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Customer Satisfaction */}
                {analytics.satisfaction.average !== null && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Customer Satisfaction</CardTitle>
                      <CardDescription>
                        Based on {analytics.satisfaction.totalRatings} ratings
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-4">
                        <div className="text-5xl font-bold">
                          {analytics.satisfaction.average.toFixed(1)}
                        </div>
                        <div className="text-2xl">⭐</div>
                        <div className="text-sm text-gray-500">
                          out of 5.0
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            ) : null}
          </TabsContent>

          <TabsContent value="insights" className="mt-0">
            <Card>
              <CardHeader>
                <CardTitle>Ticket Insights Overview</CardTitle>
                <CardDescription>
                  Key metrics and performance indicators
                </CardDescription>
              </CardHeader>
              <CardContent>
                {analyticsLoading ? (
                  <Skeleton className="h-64" />
                ) : analytics ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h3 className="font-semibold mb-4">AI Performance</h3>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span>AI Resolved:</span>
                          <span className="font-bold">
                            {analytics.resolution.aiResolvedPercentage.toFixed(1)}%
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Human Resolved:</span>
                          <span className="font-bold">
                            {analytics.resolution.humanResolvedPercentage.toFixed(1)}%
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Mixed Resolution:</span>
                          <span className="font-bold">
                            {analytics.resolution.mixedPercentage.toFixed(1)}%
                          </span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h3 className="font-semibold mb-4">Cost Analysis</h3>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span>Total Cost:</span>
                          <span className="font-bold">
                            ${analytics.cost.estimated.toFixed(4)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Total Tokens:</span>
                          <span className="font-bold">
                            {analytics.tokenUsage.total.toLocaleString()}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Avg Tokens/Ticket:</span>
                          <span className="font-bold">
                            {Math.round(analytics.tokenUsage.average).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : null}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="audit" className="mt-0">
            <Card>
              <CardHeader>
                <CardTitle>Audit Logs</CardTitle>
                <CardDescription>
                  All system interactions and ticket activities
                </CardDescription>
              </CardHeader>
              <CardContent>
                {logsLoading ? (
                  <div className="space-y-2">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <Skeleton key={i} className="h-16" />
                    ))}
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[600px] overflow-y-auto">
                    {auditLogs.length === 0 ? (
                      <p className="text-gray-500 text-center py-8">
                        No audit logs found for the selected period
                      </p>
                    ) : (
                      auditLogs.map((log) => (
                        <div
                          key={log.id}
                          className="p-4 border rounded-lg bg-white hover:bg-gray-50"
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <div className="font-medium">{log.action_type}</div>
                              <div className="text-sm text-gray-500">
                                {log.actor_type} •{" "}
                                {new Date(log.created_at).toLocaleString()}
                              </div>
                              {log.details?.tokens_used && (
                                <div className="text-xs text-gray-400 mt-1">
                                  Tokens: {log.details.tokens_used}
                                </div>
                              )}
                            </div>
                            {log.ticket_id && (
                              <Link
                                href={`/dashboard/tickets/${log.ticket_id}`}
                                className="text-blue-600 hover:underline text-sm"
                              >
                                View Ticket
                              </Link>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
    </div>
  );
}

