import { createServerClient } from "@/lib/supabaseServer";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const ticketId = searchParams.get("ticketId");
    const period = searchParams.get("period") || "30"; // days

    const supabase = await createServerClient();
    const daysAgo = new Date();
    daysAgo.setDate(daysAgo.getDate() - parseInt(period));

    let query = supabase
      .from("audit_logs")
      .select("*")
      .gte("created_at", daysAgo.toISOString())
      .order("created_at", { ascending: false })
      .limit(1000);

    if (ticketId) {
      query = query.eq("ticket_id", ticketId);
    }

    const { data: logs, error } = await query;

    if (error) throw error;

    return NextResponse.json({ logs: logs || [] });
  } catch (error) {
    console.error("Error fetching audit logs:", error);
    return NextResponse.json(
      { error: "Failed to fetch audit logs" },
      { status: 500 }
    );
  }
}

