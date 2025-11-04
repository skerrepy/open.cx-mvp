import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabaseServer";

/**
 * API endpoint to close ticket when customer closes tab/window
 * Uses sendBeacon or fetch with keepalive for reliable delivery during page unload
 */
export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createServerClient();

    // Check current ticket status
    const { data: latestStatus } = await supabase
      .from("ticket_statuses")
      .select("status")
      .eq("ticket_id", params.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    // Only close if ticket is still "open"
    if (latestStatus?.status === "open") {
      // Insert closed status
      await supabase
        .from("ticket_statuses")
        .insert({
          ticket_id: params.id,
          status: "closed",
        });

      // Log the closure
      await supabase.from("audit_logs").insert({
        ticket_id: params.id,
        action_type: "ticket_closed",
        actor_type: "customer",
        details: {
          closed_by: "customer",
          reason: "tab_closed",
        },
      });

      // Trigger auto-summarization in background (don't wait)
      fetch(`${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/tickets/${params.id}/auto-summarize`, {
        method: "POST",
      }).catch((error) => {
        console.error(`Error triggering auto-summarization for ticket ${params.id}:`, error);
      });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error closing ticket on unload:", error);
    return NextResponse.json(
      { error: "Failed to close ticket", details: error.message },
      { status: 500 }
    );
  }
}

