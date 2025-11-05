import { createAdminClient } from "@/lib/supabaseAdmin";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const ticketId = searchParams.get("ticketId");
    const period = searchParams.get("period") || "30"; // days
    const customFrom = searchParams.get("from");
    const customTo = searchParams.get("to");
    const flowView = searchParams.get("flow") === "true"; // New parameter for flow view

    // Use admin client to bypass RLS for analytics (server-side only)
    const supabase = createAdminClient();
    if (!supabase) {
      console.error("[AUDIT LOGS] Admin client not available");
      return NextResponse.json(
        { error: "Server configuration error: Admin client unavailable" },
        { status: 500 }
      );
    }

    // Test query to verify RLS bypass
    console.log("[AUDIT LOGS] Testing admin client access...");
    const { data: testData, error: testError } = await supabase
      .from("tickets")
      .select("id")
      .limit(1);
    
    if (testError) {
      console.error("[AUDIT LOGS] Admin client test failed:", {
        code: testError.code,
        message: testError.message,
        details: testError.details,
        hint: testError.hint,
      });
      return NextResponse.json(
        { error: "Database access error", details: testError.message, code: testError.code },
        { status: 500 }
      );
    }
    
    console.log("[AUDIT LOGS] Admin client test passed, proceeding with query");
    
    if (flowView) {
      // Flow view: Get ticket status history grouped by ticket
      let ticketQuery = supabase
        .from("tickets")
        .select("id, subject, created_at");

      if (period === "custom" && customFrom) {
        const startDate = new Date(customFrom);
        startDate.setHours(0, 0, 0, 0);
        const endDate = customTo ? new Date(customTo) : new Date(customFrom);
        endDate.setHours(23, 59, 59, 999);
        
        ticketQuery = ticketQuery
          .gte("created_at", startDate.toISOString())
          .lte("created_at", endDate.toISOString());
      } else {
        const daysAgo = new Date();
        daysAgo.setDate(daysAgo.getDate() - parseInt(period));
        ticketQuery = ticketQuery.gte("created_at", daysAgo.toISOString());
      }

      if (ticketId) {
        ticketQuery = ticketQuery.eq("id", ticketId);
      }

      const { data: tickets, error: ticketsError } = await ticketQuery;

      if (ticketsError) throw ticketsError;

      // Get status history and messages for each ticket
      const ticketFlows = await Promise.all(
        (tickets || []).map(async (ticket) => {
          // Get status history
          const { data: statuses, error: statusError } = await supabase
            .from("ticket_statuses")
            .select("*")
            .eq("ticket_id", ticket.id)
            .order("created_at", { ascending: true });

          if (statusError) throw statusError;

          // Ensure ticket always starts with "open" status
          // If first status is not "open" or no statuses exist, add an "open" status at ticket creation time
          let normalizedStatuses = statuses || [];
          if (normalizedStatuses.length === 0 || normalizedStatuses[0].status !== "open") {
            // Insert "open" status at the beginning with ticket creation timestamp
            normalizedStatuses = [
              {
                id: "synthetic-open",
                ticket_id: ticket.id,
                status: "open",
                created_at: ticket.created_at,
              },
              ...normalizedStatuses,
            ];
          }

          // Get audit logs for this ticket
          const { data: auditLogs, error: logsError } = await supabase
            .from("audit_logs")
            .select("*")
            .eq("ticket_id", ticket.id)
            .order("created_at", { ascending: true });

          if (logsError) throw logsError;

          // Get messages for this ticket
          const { data: messages, error: messagesError } = await supabase
            .from("messages")
            .select("*")
            .eq("ticket_id", ticket.id)
            .order("created_at", { ascending: true });

          if (messagesError) throw messagesError;

          // Calculate ticket statistics
          const messageCount = (messages || []).length;
          
          // Get token usage from ticket
          const { data: ticketData, error: ticketDataError } = await supabase
            .from("tickets")
            .select("ai_token_usage")
            .eq("id", ticket.id)
            .single();
          
          const totalTokens = ticketData?.ai_token_usage || 0;
          
          // Calculate cost from audit logs (more accurate than estimating from total tokens)
          let totalCost = 0;
          let tokensFromAuditLogs = 0;
          const PROMPT_TOKEN_COST = 0.00015 / 1000; // $0.15 per 1M tokens = $0.00000015 per token
          const COMPLETION_TOKEN_COST = 0.0006 / 1000; // $0.60 per 1M tokens = $0.0000006 per token
          
          // Include both ai_response and ticket_summarized actions
          (auditLogs || []).forEach((log) => {
            if ((log.action_type === "ai_response" || log.action_type === "ticket_summarized") && log.details) {
              const promptTokens = log.details.prompt_tokens || 0;
              const completionTokens = log.details.completion_tokens || 0;
              const tokensUsed = log.details.tokens_used || 0;
              
              if (promptTokens > 0 || completionTokens > 0) {
                // Use exact prompt/completion breakdown if available
                totalCost += promptTokens * PROMPT_TOKEN_COST + completionTokens * COMPLETION_TOKEN_COST;
                tokensFromAuditLogs += tokensUsed || (promptTokens + completionTokens);
              } else if (tokensUsed > 0) {
                // Fallback: estimate cost from total tokens if prompt/completion breakdown not available
                // Assuming 70% prompt, 30% completion ratio (typical for chat conversations)
                const estimatedPromptTokens = tokensUsed * 0.7;
                const estimatedCompletionTokens = tokensUsed * 0.3;
                totalCost += estimatedPromptTokens * PROMPT_TOKEN_COST + estimatedCompletionTokens * COMPLETION_TOKEN_COST;
                tokensFromAuditLogs += tokensUsed;
              }
            }
          });
          
          // If we have total tokens but no cost calculated (missing audit logs or old tickets),
          // estimate cost from total tokens
          if (totalTokens > 0 && totalCost === 0) {
            const estimatedPromptTokens = totalTokens * 0.7;
            const estimatedCompletionTokens = totalTokens * 0.3;
            totalCost = estimatedPromptTokens * PROMPT_TOKEN_COST + estimatedCompletionTokens * COMPLETION_TOKEN_COST;
          } else if (totalTokens > tokensFromAuditLogs && tokensFromAuditLogs > 0) {
            // If total tokens is higher than what we found in audit logs, calculate cost for the difference
            const missingTokens = totalTokens - tokensFromAuditLogs;
            const estimatedPromptTokens = missingTokens * 0.7;
            const estimatedCompletionTokens = missingTokens * 0.3;
            totalCost += estimatedPromptTokens * PROMPT_TOKEN_COST + estimatedCompletionTokens * COMPLETION_TOKEN_COST;
          }

          // Build status flow with triggers
          const statusFlow = normalizedStatuses.map((status, index) => {
            const statusTime = new Date(status.created_at).getTime();
            const previousStatus = index > 0 ? normalizedStatuses[index - 1] : null;
            
            // Find the trigger (message or audit log) that happened just before this status change
            // Look for messages/actions within 30 seconds before the status change (to catch customer messages that trigger AI responses)
            const triggerWindow = 30000; // 30 seconds in milliseconds
            const triggerStart = statusTime - triggerWindow;

            // Find the last customer message before this status change (most likely trigger)
            const customerMessage = (messages || [])
              .filter((msg) => {
                const msgTime = new Date(msg.created_at).getTime();
                return msg.sender === "customer" && msgTime >= triggerStart && msgTime <= statusTime;
              })
              .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];

            // Find any message before this status change
            const triggeringMessage = (messages || [])
              .filter((msg) => {
                const msgTime = new Date(msg.created_at).getTime();
                return msgTime >= triggerStart && msgTime <= statusTime;
              })
              .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];

            // Find related audit log (usually happens around the same time or slightly after)
            const relatedAuditLog = (auditLogs || [])
              .filter((log) => {
                const logTime = new Date(log.created_at).getTime();
                return logTime >= triggerStart && logTime <= statusTime + 5000; // Allow 5s after
              })
              .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];

            // Determine trigger type and description
            let trigger = null;
            
            // Priority 1: If there's an audit log for status_change, use it with customer message
            if (relatedAuditLog && relatedAuditLog.action_type === "status_change") {
              const messageToShow = customerMessage || triggeringMessage;
              trigger = {
                type: relatedAuditLog.actor_type,
                description: relatedAuditLog.details?.reason || 
                  (relatedAuditLog.actor_type === "ai" ? "AI decided to transfer" : "Status changed"),
                message: messageToShow?.text || null,
                sender: messageToShow?.sender || null,
              };
            }
            // Priority 2: If there's an AI response audit log, it likely triggered a status change
            else if (relatedAuditLog && relatedAuditLog.action_type === "ai_response") {
              // Find customer message that triggered this AI response
              const customerMsgBeforeAI = (messages || [])
                .filter((msg) => {
                  const msgTime = new Date(msg.created_at).getTime();
                  const aiTime = new Date(relatedAuditLog.created_at).getTime();
                  return msg.sender === "customer" && msgTime >= triggerStart && msgTime <= aiTime;
                })
                .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
              
              trigger = {
                type: "ai",
                description: "AI response triggered status change",
                message: customerMsgBeforeAI?.text || null,
                sender: customerMsgBeforeAI?.sender || "customer",
              };
            }
            // Priority 3: If there's a ticket_closed audit log
            else if (relatedAuditLog && relatedAuditLog.action_type === "ticket_closed") {
              trigger = {
                type: relatedAuditLog.actor_type,
                description: relatedAuditLog.details?.reason || "Ticket closed",
                message: customerMessage?.text || triggeringMessage?.text || null,
                sender: customerMessage?.sender || triggeringMessage?.sender || null,
              };
            }
            // Priority 4: If there's a customer message, use it as trigger
            else if (customerMessage) {
              trigger = {
                type: "customer",
                description: "Customer message",
                message: customerMessage.text,
                sender: customerMessage.sender,
              };
            }
            // Priority 5: If there's any message, use it
            else if (triggeringMessage) {
              trigger = {
                type: triggeringMessage.sender,
                description: `${triggeringMessage.sender === "customer" ? "Customer" : triggeringMessage.sender === "agent" ? "Agent" : "System"} message`,
                message: triggeringMessage.text,
                sender: triggeringMessage.sender,
              };
            }

            // If still no trigger, check if this is the initial status
            if (!trigger && index === 0) {
              trigger = {
                type: "system",
                description: "Ticket created",
                message: null,
                sender: null,
              };
            }

            return {
              status: status.status,
              fromStatus: previousStatus?.status || null,
              timestamp: status.created_at,
              trigger: trigger || {
                type: "unknown",
                description: "Status changed",
                message: null,
                sender: null,
              },
            };
          });

          return {
            ticketId: ticket.id,
            ticketSubject: ticket.subject,
            ticketCreated: ticket.created_at,
            statusFlow,
            stats: {
              messageCount,
              totalTokens,
              totalCost,
            },
          };
        })
      );

      // Filter out tickets with no status flow
      const validFlows = ticketFlows.filter((flow) => flow.statusFlow.length > 0);

      return NextResponse.json({ flows: validFlows });
    } else {
      // Original audit logs view
      let query = supabase
        .from("audit_logs")
        .select("*");

      if (period === "custom" && customFrom) {
        // For custom date range, filter for the specified range
        const startDate = new Date(customFrom);
        startDate.setHours(0, 0, 0, 0);
        const endDate = customTo ? new Date(customTo) : new Date(customFrom);
        endDate.setHours(23, 59, 59, 999);
        
        query = query
          .gte("created_at", startDate.toISOString())
          .lte("created_at", endDate.toISOString());
      } else {
        // For regular periods, use days ago
        const daysAgo = new Date();
        daysAgo.setDate(daysAgo.getDate() - parseInt(period));
        query = query.gte("created_at", daysAgo.toISOString());
      }

      query = query
        .order("created_at", { ascending: false })
        .limit(1000);

      if (ticketId) {
        query = query.eq("ticket_id", ticketId);
      }

      const { data: logs, error } = await query;

      if (error) throw error;

      return NextResponse.json({ logs: logs || [] });
    }
  } catch (error) {
    console.error("Error fetching audit logs:", error);
    return NextResponse.json(
      { error: "Failed to fetch audit logs" },
      { status: 500 }
    );
  }
}

