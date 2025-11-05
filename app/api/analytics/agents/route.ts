import { createAdminClient } from "@/lib/supabaseAdmin";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    // Use admin client to bypass RLS for analytics (server-side only)
    const supabase = createAdminClient();
    if (!supabase) {
      return NextResponse.json(
        { error: "Server configuration error: Admin client unavailable" },
        { status: 500 }
      );
    }

    // Get all unique assignees from tickets (including closed ones)
    // We need to check ticket statuses to find closed tickets
    const { data: allTickets, error: ticketsError } = await supabase
      .from("tickets")
      .select("id, assignee_id");
    
    if (ticketsError) throw ticketsError;

    // Get all closed tickets by checking statuses
    const { data: closedStatuses, error: closedError } = await supabase
      .from("ticket_statuses")
      .select("ticket_id")
      .eq("status", "closed");

    if (closedError) throw closedError;

    const closedTicketIds = new Set((closedStatuses || []).map((s) => s.ticket_id));
    const closedTickets = (allTickets || []).filter(
      (t) => t.assignee_id && closedTicketIds.has(t.id)
    );

    // Get all ticket statuses for closed tickets to calculate resolution time
    const { data: allStatuses, error: statusesError } = await supabase
      .from("ticket_statuses")
      .select("ticket_id, status, created_at")
      .in(
        "ticket_id",
        (closedTickets || []).map((t) => t.id)
      )
      .in("status", ["needs_human_assistance", "closed"])
      .order("created_at", { ascending: true });

    if (statusesError) throw statusesError;

    // Get all customer reviews
    const { data: reviews, error: reviewsError } = await supabase
      .from("ticket_reviews")
      .select("ticket_id, rating")
      .eq("reviewer_type", "customer")
      .not("rating", "is", null);

    if (reviewsError) throw reviewsError;

    // Group data by assignee
    const agentMap = new Map<string, {
      agentId: string;
      ticketsClosed: number;
      totalRating: number;
      ratingCount: number;
      totalResolutionTime: number;
      resolutionCount: number;
    }>();

    // Process each closed ticket
    (closedTickets || []).forEach((ticket) => {
      if (!ticket.assignee_id) return;

      const agentId = ticket.assignee_id;

      if (!agentMap.has(agentId)) {
        agentMap.set(agentId, {
          agentId,
          ticketsClosed: 0,
          totalRating: 0,
          ratingCount: 0,
          totalResolutionTime: 0,
          resolutionCount: 0,
        });
      }

      const agent = agentMap.get(agentId)!;
      agent.ticketsClosed++;

      // Find customer review for this ticket
      const ticketReview = reviews?.find((r) => r.ticket_id === ticket.id);
      if (ticketReview?.rating) {
        agent.totalRating += ticketReview.rating;
        agent.ratingCount++;
      }

      // Calculate resolution time (from needs_human_assistance to closed)
      const ticketStatuses = allStatuses?.filter((s) => s.ticket_id === ticket.id) || [];
      const needsHumanStatus = ticketStatuses.find((s) => s.status === "needs_human_assistance");
      const closedStatus = ticketStatuses.find((s) => s.status === "closed");

      if (needsHumanStatus && closedStatus) {
        const resolutionTime = new Date(closedStatus.created_at).getTime() - new Date(needsHumanStatus.created_at).getTime();
        if (resolutionTime > 0) {
          agent.totalResolutionTime += resolutionTime;
          agent.resolutionCount++;
        }
      }
    });

    // Get user information for each agent from Supabase auth
    const agentIds = Array.from(agentMap.keys());
    
    // Use admin client to query auth.users (only if available)
    const adminClient = createAdminClient();
    const userInfoMap = new Map<string, { email: string; name: string }>();
    
    // Fetch user info for each agent if admin client is available
    if (adminClient) {
      for (const agentId of agentIds) {
        try {
          const { data: user, error } = await adminClient.auth.admin.getUserById(agentId);
          if (!error && user?.user) {
            const email = user.user.email || "";
            const fullName = user.user.user_metadata?.full_name || 
                            user.user.user_metadata?.name || 
                            email.split("@")[0] || 
                            "Agent";
            userInfoMap.set(agentId, {
              email: email,
              name: fullName,
            });
          }
        } catch (error) {
          console.error(`Error fetching user info for ${agentId}:`, error);
        }
      }
    }

    const agentData = agentIds.map((agentId) => {
      const stats = agentMap.get(agentId)!;
      const userInfo = userInfoMap.get(agentId);
      
      const averageRating = stats.ratingCount > 0 
        ? stats.totalRating / stats.ratingCount 
        : null;
      
      const averageResolutionTime = stats.resolutionCount > 0
        ? stats.totalResolutionTime / stats.resolutionCount
        : null;

      return {
        agentId: agentId,
        ticketsClosed: stats.ticketsClosed,
        averageRating: averageRating,
        ratingCount: stats.ratingCount,
        averageResolutionTimeMs: averageResolutionTime,
        averageResolutionTimeMinutes: averageResolutionTime ? Math.round(averageResolutionTime / (1000 * 60)) : null,
        averageResolutionTimeHours: averageResolutionTime ? Math.round((averageResolutionTime / (1000 * 60 * 60)) * 10) / 10 : null,
        // Only include user info if we successfully fetched it
        email: userInfo?.email || null,
        name: userInfo?.name || null,
      };
    });

    // Sort by tickets closed (descending)
    agentData.sort((a, b) => b.ticketsClosed - a.ticketsClosed);

    return NextResponse.json({ agents: agentData });
  } catch (error) {
    console.error("Error fetching agent analytics:", error);
    return NextResponse.json(
      { error: "Failed to fetch agent analytics" },
      { status: 500 }
    );
  }
}

