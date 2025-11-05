import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabaseServer";

export async function GET() {
  try {
    const supabase = await createServerClient();

    // Check if insights were generated today first
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const { data: todayInsights, error: todayError } = await supabase
      .from("product_insights")
      .select("*")
      .gte("created_at", today.toISOString())
      .lt("created_at", tomorrow.toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (todayError && todayError.code !== "PGRST116") {
      throw todayError;
    }

    // If we have today's insights, return them
    if (todayInsights) {
      return NextResponse.json({ insights: todayInsights, isToday: true });
    }

    // Otherwise, fetch the latest insights (could be from previous days)
    const { data: latestInsights, error: latestError } = await supabase
      .from("product_insights")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (latestError && latestError.code !== "PGRST116") {
      throw latestError;
    }

    return NextResponse.json({ 
      insights: latestInsights || null, 
      isToday: false,
      needsGeneration: !todayInsights && !latestInsights 
    });
  } catch (error: any) {
    console.error("Error fetching insights:", error);
    return NextResponse.json(
      { error: "Failed to fetch insights", details: error.message },
      { status: 500 }
    );
  }
}

