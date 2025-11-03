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

    // Get latest status from status log
    const { data: latestStatus } = await supabase
      .from("ticket_statuses")
      .select("status")
      .eq("ticket_id", params.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    const { data: messages, error: messagesError } = await supabase
      .from("messages")
      .select("*")
      .eq("ticket_id", params.id)
      .order("created_at", { ascending: true });

    if (messagesError) throw messagesError;

    return NextResponse.json({
      ...ticket,
      status: latestStatus?.status || "open",
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
