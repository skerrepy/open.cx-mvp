import { createServerClient } from "@/lib/supabaseServer";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const supabase = await createServerClient();

    const { data: tickets, error } = await supabase
      .from("tickets")
      .select(`
        *,
        messages (
          id,
          ticket_id,
          sender,
          text,
          created_at
        )
      `)
      .order("created_at", { ascending: false })
      .limit(1);

    if (error) throw error;

    // Transform data to match expected format
    const formattedTickets = (tickets || []).map((ticket: any) => ({
      ...ticket,
      createdAt: ticket.created_at,
      customerId: ticket.customer_id,
      assigneeId: ticket.assignee_id,
      messages: (ticket.messages || []).slice(0, 1).map((msg: any) => ({
        ...msg,
        createdAt: msg.created_at,
        ticketId: msg.ticket_id,
      })),
    }));

    return NextResponse.json(formattedTickets);
  } catch (error) {
    console.error("Error fetching tickets:", error);
    return NextResponse.json(
      { error: "Failed to fetch tickets" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const { subject, firstMessage } = await req.json();

    if (!firstMessage) {
      return NextResponse.json(
        { error: "First message is required" },
        { status: 400 }
      );
    }

    const supabase = await createServerClient();

    // Create ticket
    const { data: ticket, error: ticketError } = await supabase
      .from("tickets")
      .insert({
        subject,
        status: "open",
      })
      .select()
      .single();

    if (ticketError) throw ticketError;

    // Create first message
    const { data: message, error: messageError } = await supabase
      .from("messages")
      .insert({
        ticket_id: ticket.id,
        sender: "customer",
        text: firstMessage,
      })
      .select()
      .single();

    if (messageError) throw messageError;

    return NextResponse.json({
      ...ticket,
      messages: [message],
    });
  } catch (error) {
    console.error("Error creating ticket:", error);
    return NextResponse.json(
      { error: "Failed to create ticket" },
      { status: 500 }
    );
  }
}
