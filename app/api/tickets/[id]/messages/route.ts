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

    // Verify ticket exists
    const { data: ticket, error: ticketError } = await supabase
      .from("tickets")
      .select("id")
      .eq("id", params.id)
      .single();

    if (ticketError || !ticket) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
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
