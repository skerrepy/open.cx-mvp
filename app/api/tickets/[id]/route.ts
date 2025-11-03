import { createServerClient } from "@/lib/supabaseServer";
import { NextResponse } from "next/server";

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createServerClient();

    const { data: ticket, error: ticketError } = await supabase
      .from("tickets")
      .select("*")
      .eq("id", params.id)
      .single();

    if (ticketError) throw ticketError;

    const { data: messages, error: messagesError } = await supabase
      .from("messages")
      .select("*")
      .eq("ticket_id", params.id)
      .order("created_at", { ascending: true });

    if (messagesError) throw messagesError;

    return NextResponse.json({
      ...ticket,
      messages: (messages || []).map((msg: any) => ({
        ...msg,
        createdAt: msg.created_at,
        ticketId: msg.ticket_id,
      })),
    });
  } catch (error) {
    console.error("Error fetching ticket:", error);
    return NextResponse.json(
      { error: "Failed to fetch ticket" },
      { status: 500 }
    );
  }
}
