import { createServerClient } from "@/lib/supabaseServer";
import { NextResponse } from "next/server";

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { text, sender } = await req.json();

    if (!text || !sender) {
      return NextResponse.json(
        { error: "Text and sender are required" },
        { status: 400 }
      );
    }

    const supabase = await createServerClient();

    // Get current user for assignment
    const { data: { user } } = await supabase.auth.getUser();
    const userId = user?.id;

    // Verify ticket exists and get its current status
    const { data: ticket, error: ticketError } = await supabase
      .from("tickets")
      .select("id, assignee_id")
      .eq("id", params.id)
      .single();

    if (ticketError || !ticket) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }

    // Auto-assign ticket if agent is sending a message and ticket is not assigned
    if (sender === "agent" && userId && !ticket.assignee_id) {
      // Assign the ticket to the agent
      await supabase
        .from("tickets")
        .update({ assignee_id: userId })
        .eq("id", params.id);
    }

    const { data: msg, error } = await supabase
      .from("messages")
      .insert({
        ticket_id: params.id,
        sender,
        text,
      })
      .select()
      .single();

    if (error) throw error;

    // Create audit log for agent message (just store agent ID, no redundant user info)
    if (sender === "agent" && userId) {
      await supabase.from("audit_logs").insert({
        ticket_id: params.id,
        action_type: "agent_response",
        actor_type: "agent",
        actor_id: userId,
      });
    }

    return NextResponse.json({
      ...msg,
      createdAt: msg.created_at,
      ticketId: msg.ticket_id,
    });
  } catch (error) {
    console.error("Error creating message:", error);
    return NextResponse.json(
      { error: "Failed to create message" },
      { status: 500 }
    );
  }
}
