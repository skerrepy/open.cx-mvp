import { createServerClient } from "@/lib/supabaseServer";
import { NextResponse } from "next/server";

// Validate and sanitize email
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Sanitize text input
function sanitizeText(text: string): string {
  return text.trim().slice(0, 255); // Limit length and trim whitespace
}

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { firstName, lastName, email } = await req.json();

    // Validate required fields
    if (!firstName || !lastName || !email) {
      return NextResponse.json(
        { error: "First name, last name, and email are required" },
        { status: 400 }
      );
    }

    // Validate and sanitize
    if (!isValidEmail(email)) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 }
      );
    }

    const sanitizedFirstName = sanitizeText(firstName);
    const sanitizedLastName = sanitizeText(lastName);
    const sanitizedEmail = email.toLowerCase().trim();

    if (!sanitizedFirstName || !sanitizedLastName || !sanitizedEmail) {
      return NextResponse.json(
        { error: "All fields must contain valid content" },
        { status: 400 }
      );
    }

    const supabase = await createServerClient();

    // Update ticket with customer info
    const { error: updateError } = await supabase
      .from("tickets")
      .update({
        customer_first_name: sanitizedFirstName,
        customer_last_name: sanitizedLastName,
        customer_email: sanitizedEmail,
      })
      .eq("id", params.id);

    if (updateError) {
      console.error("Error updating customer info:", updateError);
      return NextResponse.json(
        { error: "Failed to save customer information" },
        { status: 500 }
      );
    }

    // Check if ticket was waiting for customer info before transfer
    const { data: latestStatus } = await supabase
      .from("ticket_statuses")
      .select("status")
      .eq("ticket_id", params.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    // If ticket is still open, AI was waiting for customer info to transfer
    // Now that we have the info, automatically transfer the ticket
    if (latestStatus?.status === "open") {
      // Transfer to human agent
      await supabase
        .from("ticket_statuses")
        .insert({
          ticket_id: params.id,
          status: "needs_human_assistance",
        });

      // Add a system message indicating transfer
      await supabase.from("messages").insert({
        ticket_id: params.id,
        sender: "system",
        text: "This conversation has been transferred to a human support agent. An agent will respond shortly.",
      });

      // Log the transfer
      await supabase.from("audit_logs").insert({
        ticket_id: params.id,
        action_type: "status_change",
        actor_type: "system",
        details: {
          status: "needs_human_assistance",
          reason: "customer_info_completed",
        },
      });
    }

    return NextResponse.json({
      success: true,
      transferred: latestStatus?.status === "open",
    });
  } catch (error) {
    console.error("Error saving customer info:", error);
    return NextResponse.json(
      { error: "Failed to process customer information" },
      { status: 500 }
    );
  }
}

