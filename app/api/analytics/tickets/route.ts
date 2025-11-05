import { createServerClient } from "@/lib/supabaseServer";
import { NextResponse } from "next/server";

// GPT-4o-mini pricing (as of 2024)
const PROMPT_TOKEN_COST = 0.00015 / 1000; // $0.15 per 1M tokens
const COMPLETION_TOKEN_COST = 0.0006 / 1000; // $0.60 per 1M tokens

function calculateCost(promptTokens: number, completionTokens: number): number {
  return promptTokens * PROMPT_TOKEN_COST + completionTokens * COMPLETION_TOKEN_COST;
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const period = searchParams.get("period") || "30"; // days
    const customFrom = searchParams.get("from");
    const customTo = searchParams.get("to");

    // Validate custom date period
    if (period === "custom" && !customFrom) {
      return NextResponse.json(
        { error: "from parameter is required for custom period" },
        { status: 400 }
      );
    }

    const supabase = await createServerClient();
    
    let ticketsQuery = supabase
      .from("tickets")
      .select("id, ai_token_usage, created_at");

    if (period === "custom" && customFrom) {
      // For custom date range, filter for the specified range
      const startDate = new Date(customFrom);
      if (isNaN(startDate.getTime())) {
        return NextResponse.json(
          { error: "Invalid from date format" },
          { status: 400 }
        );
      }
      startDate.setHours(0, 0, 0, 0);
      
      const endDate = customTo ? new Date(customTo) : new Date(customFrom);
      if (isNaN(endDate.getTime())) {
        return NextResponse.json(
          { error: "Invalid to date format" },
          { status: 400 }
        );
      }
      endDate.setHours(23, 59, 59, 999);
      
      ticketsQuery = ticketsQuery
        .gte("created_at", startDate.toISOString())
        .lte("created_at", endDate.toISOString());
    } else {
      // For regular periods, use days ago
      const daysAgo = new Date();
      daysAgo.setDate(daysAgo.getDate() - parseInt(period));
      ticketsQuery = ticketsQuery.gte("created_at", daysAgo.toISOString());
    }

    // Get all tickets in the period
    const { data: tickets, error: ticketsError } = await ticketsQuery;

    if (ticketsError) throw ticketsError;

    // Get all statuses for tickets in period
    const ticketIds = tickets?.map((t) => t.id) || [];
    
    let statusData: any[] = [];
    if (ticketIds.length > 0) {
      const { data: statuses, error: statusesError } = await supabase
        .from("ticket_statuses")
        .select("ticket_id, status, created_at")
        .in("ticket_id", ticketIds);

      if (statusesError) throw statusesError;
      statusData = statuses || [];
    }

    // Get all messages for tickets in period to calculate AI message percentage
    let messagesData: any[] = [];
    if (ticketIds.length > 0) {
      const { data: messages, error: messagesError } = await supabase
        .from("messages")
        .select("ticket_id, sender")
        .in("ticket_id", ticketIds);

      if (!messagesError) {
        messagesData = messages || [];
      }
    }

    // Get audit logs for token breakdown and cost calculation
    let auditLogs: any[] = [];
    if (ticketIds.length > 0) {
      // Calculate the start date for audit logs based on period
      let auditLogsStartDate: Date;
      if (period === "custom" && customFrom) {
        // For custom date range, use the start of the range
        auditLogsStartDate = new Date(customFrom);
        auditLogsStartDate.setHours(0, 0, 0, 0);
      } else {
        // For regular periods, use days ago
        auditLogsStartDate = new Date();
        auditLogsStartDate.setDate(auditLogsStartDate.getDate() - parseInt(period));
      }

      let auditLogsEndDate: Date | undefined;
      if (period === "custom" && customTo) {
        auditLogsEndDate = new Date(customTo);
        auditLogsEndDate.setHours(23, 59, 59, 999);
      }

      let auditLogsQuery = supabase
        .from("audit_logs")
        .select("ticket_id, details, action_type, created_at")
        .in("ticket_id", ticketIds)
        .in("action_type", ["ai_response", "ticket_summarized"])
        .gte("created_at", auditLogsStartDate.toISOString());
      
      if (auditLogsEndDate) {
        auditLogsQuery = auditLogsQuery.lte("created_at", auditLogsEndDate.toISOString());
      }

      const { data: logs, error: logsError } = await auditLogsQuery;

      if (!logsError) {
        auditLogs = logs || [];
      }
    }

    // Calculate resolution stats - get latest status for each ticket
    const ticketStatusMap = new Map<string, { status: string; created_at: string }>();
    statusData.forEach((status) => {
      const existing = ticketStatusMap.get(status.ticket_id);
      if (!existing || new Date(status.created_at) > new Date(existing.created_at)) {
        ticketStatusMap.set(status.ticket_id, { status: status.status, created_at: status.created_at });
      }
    });

    let aiResolvedCount = 0;
    let humanResolvedCount = 0;
    let mixedCount = 0;
    let totalClosed = 0;

    ticketStatusMap.forEach((statusInfo, ticketId) => {
      const currentStatus = statusInfo.status;
      if (currentStatus === "closed") {
        totalClosed++;
        
        // Get all statuses for this ticket
        const ticketStatuses = statusData.filter((s) => s.ticket_id === ticketId);
        
        // Check if ticket had "needs_human_assistance" status at any point
        const hadHumanAssistance = ticketStatuses.some(
          (s) => s.status === "needs_human_assistance"
        );
        
        // Get all messages for this ticket
        const ticketMessages = messagesData.filter((m) => m.ticket_id === ticketId);
        const totalMessages = ticketMessages.length;
        const aiMessages = ticketMessages.filter((m) => m.sender === "ai").length;
        
        // Calculate AI message percentage
        const aiMessagePercentage = totalMessages > 0 ? (aiMessages / totalMessages) * 100 : 0;
        
        // Determine resolution type based on new logic:
        // 1. If NO "needs_human_assistance" → AI fully resolved
        // 2. If YES "needs_human_assistance" AND AI >= 40% messages → Mixed/Hybrid
        // 3. If YES "needs_human_assistance" AND AI < 40% messages → Human resolved
        if (!hadHumanAssistance) {
          // No human assistance requested → AI fully resolved
          aiResolvedCount++;
        } else {
          // Human assistance was requested
          if (aiMessagePercentage >= 40) {
            // AI sent 40% or more messages → Mixed/Hybrid
            mixedCount++;
          } else {
            // AI sent less than 40% messages → Human resolved
            humanResolvedCount++;
          }
        }
      }
    });

    // Calculate token usage
    const totalTokens = tickets?.reduce((sum, t) => sum + (t.ai_token_usage || 0), 0) || 0;
    const avgTokensPerTicket = tickets?.length ? totalTokens / tickets.length : 0;

    // Calculate costs from audit logs
    let totalPromptTokens = 0;
    let totalCompletionTokens = 0;

    auditLogs.forEach((log) => {
      if (log.details?.prompt_tokens) {
        totalPromptTokens += log.details.prompt_tokens;
      }
      if (log.details?.completion_tokens) {
        totalCompletionTokens += log.details.completion_tokens;
      }
    });

    const estimatedCost = calculateCost(totalPromptTokens, totalCompletionTokens);

    // Get customer satisfaction ratings and reviews
    const { data: reviews, error: reviewsError } = await supabase
      .from("ticket_reviews")
      .select("id, ticket_id, rating, comment, created_at")
      .eq("reviewer_type", "customer")
      .in("ticket_id", ticketIds.length > 0 ? ticketIds : [""])
      .order("created_at", { ascending: false });

    const avgSatisfaction = reviews && reviews.length > 0
      ? reviews.reduce((sum, r) => sum + (r.rating || 0), 0) / reviews.length
      : null;

    const totalTickets = tickets?.length || 0;

    // Generate time-series data for charts
    const chartData: any[] = [];
    let periodDays: number;
    let startDate: Date;
    
    if (period === "custom" && customFrom) {
      // For custom date range, calculate the number of days
      const start = new Date(customFrom);
      const end = customTo ? new Date(customTo) : new Date(customFrom);
      periodDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      startDate = new Date(customFrom);
    } else {
      periodDays = parseInt(period);
      startDate = new Date();
    }
    
    // Create data points for each day in the period
    for (let i = periodDays - 1; i >= 0; i--) {
      const date = new Date(startDate);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      // Get tickets that were closed on this day
      // We need to find tickets where the "closed" status was created on this date
      const closedTicketsForDay = new Set<string>();
      statusData.forEach((status) => {
        const statusDate = new Date(status.created_at).toISOString().split('T')[0];
        if (statusDate === dateStr && status.status === "closed") {
          closedTicketsForDay.add(status.ticket_id);
        }
      });

      let dayAiResolved = 0;
      let dayHumanResolved = 0;
      let dayMixed = 0;
      let dayTokens = 0;
      let dayCost = 0;

      closedTicketsForDay.forEach((ticketId) => {
        const ticketStatuses = statusData.filter((s) => s.ticket_id === ticketId);
        const hadHumanAssistance = ticketStatuses.some(
          (s) => s.status === "needs_human_assistance"
        );
        const ticketMessages = messagesData.filter((m) => m.ticket_id === ticketId);
        const totalMessages = ticketMessages.length;
        const aiMessages = ticketMessages.filter((m) => m.sender === "ai").length;
        const aiMessagePercentage = totalMessages > 0 ? (aiMessages / totalMessages) * 100 : 0;

        if (!hadHumanAssistance) {
          dayAiResolved++;
        } else if (aiMessagePercentage >= 40) {
          dayMixed++;
        } else {
          dayHumanResolved++;
        }
      });

      // Get tokens and cost for this day from audit logs
      // Filter audit logs by the date they were created (when API calls happened)
      const dayLogs = auditLogs.filter(log => {
        if (!log.created_at) return false;
        const logDate = new Date(log.created_at).toISOString().split('T')[0];
        return logDate === dateStr;
      });

      // Calculate tokens and cost from audit logs for this day
      dayLogs.forEach(log => {
        if (log.details?.tokens_used) {
          dayTokens += log.details.tokens_used;
        }
        
        if (log.details?.prompt_tokens !== undefined && log.details?.completion_tokens !== undefined) {
          dayCost += calculateCost(log.details.prompt_tokens, log.details.completion_tokens);
        } else if (log.details?.tokens_used) {
          // Fallback: estimate cost from total tokens if prompt/completion breakdown not available
          // Assuming 70% prompt, 30% completion ratio
          const estimatedPromptTokens = log.details.tokens_used * 0.7;
          const estimatedCompletionTokens = log.details.tokens_used * 0.3;
          dayCost += calculateCost(estimatedPromptTokens, estimatedCompletionTokens);
        }
      });

      chartData.push({
        date: dateStr,
        day: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        aiResolved: dayAiResolved,
        humanResolved: dayHumanResolved,
        mixed: dayMixed,
        tokens: dayTokens,
        cost: dayCost,
      });
    }

    return NextResponse.json({
      period: period === "custom" ? (customDate ? 1 : 0) : parseInt(period),
      totals: {
        tickets: totalTickets,
        closed: totalClosed,
      },
      resolution: {
        aiResolved: aiResolvedCount,
        humanResolved: humanResolvedCount,
        mixed: mixedCount,
        aiResolvedPercentage: totalClosed > 0 ? (aiResolvedCount / totalClosed) * 100 : 0,
        humanResolvedPercentage: totalClosed > 0 ? (humanResolvedCount / totalClosed) * 100 : 0,
        mixedPercentage: totalClosed > 0 ? (mixedCount / totalClosed) * 100 : 0,
      },
      tokenUsage: {
        total: totalTokens,
        average: avgTokensPerTicket,
      },
      cost: {
        estimated: estimatedCost,
        promptTokens: totalPromptTokens,
        completionTokens: totalCompletionTokens,
      },
      satisfaction: {
        average: avgSatisfaction,
        totalRatings: reviews?.length || 0,
        reviews: reviews || [],
      },
      chartData: chartData,
    });
  } catch (error) {
    console.error("Error fetching analytics:", error);
    return NextResponse.json(
      { error: "Failed to fetch analytics" },
      { status: 500 }
    );
  }
}


