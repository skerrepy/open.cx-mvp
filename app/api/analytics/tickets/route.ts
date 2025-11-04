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

    const supabase = await createServerClient();
    const daysAgo = new Date();
    daysAgo.setDate(daysAgo.getDate() - parseInt(period));

    // Get all tickets in the period
    const { data: tickets, error: ticketsError } = await supabase
      .from("tickets")
      .select("id, ai_token_usage, created_at")
      .gte("created_at", daysAgo.toISOString());

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

    // Get audit logs for token breakdown
    let auditLogs: any[] = [];
    if (ticketIds.length > 0) {
      const { data: logs, error: logsError } = await supabase
        .from("audit_logs")
        .select("ticket_id, details, action_type")
        .in("ticket_id", ticketIds)
        .in("action_type", ["ai_response", "ticket_summarized"]);

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
        
        // Get all statuses for this ticket, sorted by date
        const ticketStatuses = statusData
          .filter((s) => s.ticket_id === ticketId)
          .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        
        // Check if ticket had human assistance at any point
        const hadHumanAssistance = ticketStatuses.some(
          (s) => s.status === "needs_human_assistance"
        );
        
        // Check if ticket was ever in "ai_resolved" status
        const wasAiResolved = ticketStatuses.some(
          (s) => s.status === "ai_resolved"
        );
        
        // Determine resolution type
        if (hadHumanAssistance && wasAiResolved) {
          // Ticket went through both AI and human - mixed
          mixedCount++;
        } else if (hadHumanAssistance && !wasAiResolved) {
          // Ticket went directly to human without AI resolution - human resolved
          humanResolvedCount++;
        } else if (wasAiResolved && !hadHumanAssistance) {
          // Ticket was resolved by AI without human assistance - AI resolved
          aiResolvedCount++;
        } else {
          // Ticket was closed without going through ai_resolved or needs_human_assistance
          // This could be closed directly (e.g., by customer), count as human resolved
          humanResolvedCount++;
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

    // Get customer satisfaction ratings
    const { data: reviews, error: reviewsError } = await supabase
      .from("ticket_reviews")
      .select("rating")
      .eq("reviewer_type", "customer")
      .in("ticket_id", ticketIds.length > 0 ? ticketIds : [""]);

    const avgSatisfaction = reviews && reviews.length > 0
      ? reviews.reduce((sum, r) => sum + (r.rating || 0), 0) / reviews.length
      : null;

    const totalTickets = tickets?.length || 0;

    return NextResponse.json({
      period: parseInt(period),
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
      },
    });
  } catch (error) {
    console.error("Error fetching analytics:", error);
    return NextResponse.json(
      { error: "Failed to fetch analytics" },
      { status: 500 }
    );
  }
}

