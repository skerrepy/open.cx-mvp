import { createServerClient } from "@/lib/supabaseServer";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const ticketId = searchParams.get("ticketId");
    const period = searchParams.get("period") || "30"; // days
    const customDate = searchParams.get("date");

    const supabase = await createServerClient();
    
    let query = supabase
      .from("audit_logs")
      .select("*");

    if (period === "custom" && customDate) {
      // For custom date, filter for that specific day
      const startOfDay = new Date(customDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(customDate);
      endOfDay.setHours(23, 59, 59, 999);
      
      query = query
        .gte("created_at", startOfDay.toISOString())
        .lte("created_at", endOfDay.toISOString());
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
  } catch (error) {
    console.error("Error fetching audit logs:", error);
    return NextResponse.json(
      { error: "Failed to fetch audit logs" },
      { status: 500 }
    );
  }
}

