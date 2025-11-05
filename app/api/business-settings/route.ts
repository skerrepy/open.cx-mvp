import { createAdminClient } from "@/lib/supabaseAdmin";
import { NextResponse } from "next/server";

// GET - Fetch the single business settings (bypasses RLS)
export async function GET() {
  try {
    const adminClient = createAdminClient();
    if (!adminClient) {
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      );
    }

    // In single-tenant system, get the only business
    const { data, error } = await adminClient
      .from("business_settings")
      .select("*")
      .limit(1)
      .maybeSingle();

    if (error && error.code !== "PGRST116") {
      console.error("Error fetching business settings:", error);
      return NextResponse.json(
        { error: "Failed to fetch business settings" },
        { status: 500 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error in business settings API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PUT - Update the single business settings
export async function PUT(req: Request) {
  try {
    const adminClient = createAdminClient();
    if (!adminClient) {
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      );
    }

    const body = await req.json();
    const { business_name, primary_language, ai_tone, business_context, owner_user_id } = body;

    // First, check if business exists
    const { data: existing } = await adminClient
      .from("business_settings")
      .select("id")
      .limit(1)
      .maybeSingle();

    const settingsData = {
      owner_user_id,
      business_name,
      primary_language,
      ai_tone,
      business_context,
    };

    let result;
    if (existing?.id) {
      // Update existing business
      const { data, error } = await adminClient
        .from("business_settings")
        .update(settingsData)
        .eq("id", existing.id)
        .select()
        .single();

      if (error) throw error;
      result = data;
    } else {
      // Insert new business
      const { data, error } = await adminClient
        .from("business_settings")
        .insert(settingsData)
        .select()
        .single();

      if (error) throw error;
      result = data;
    }

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Error updating business settings:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update business settings" },
      { status: 500 }
    );
  }
}

