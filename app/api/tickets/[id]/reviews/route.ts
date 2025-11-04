import { createServerClient } from "@/lib/supabaseServer";
import { NextResponse } from "next/server";

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createServerClient();

    const { data: reviews, error } = await supabase
      .from("ticket_reviews")
      .select("*")
      .eq("ticket_id", params.id)
      .order("created_at", { ascending: false });

    if (error) throw error;

    return NextResponse.json({ reviews: reviews || [] });
  } catch (error) {
    console.error("Error fetching reviews:", error);
    return NextResponse.json(
      { error: "Failed to fetch reviews" },
      { status: 500 }
    );
  }
}

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { reviewerType, rating, comment, reviewerId } = await req.json();

    if (!reviewerType || !["admin", "customer"].includes(reviewerType)) {
      return NextResponse.json(
        { error: "Invalid reviewer type" },
        { status: 400 }
      );
    }

    if (rating !== null && (rating < 1 || rating > 5)) {
      return NextResponse.json(
        { error: "Rating must be between 1 and 5" },
        { status: 400 }
      );
    }

    const supabase = await createServerClient();

    // Check if review already exists for this reviewer type
    const { data: existing } = await supabase
      .from("ticket_reviews")
      .select("id")
      .eq("ticket_id", params.id)
      .eq("reviewer_type", reviewerType)
      .single();

    if (existing) {
      // Update existing review
      const { data, error } = await supabase
        .from("ticket_reviews")
        .update({
          rating: rating || null,
          comment: comment || null,
          reviewer_id: reviewerId || null,
        })
        .eq("id", existing.id)
        .select()
        .single();

      if (error) throw error;

      return NextResponse.json({ review: data });
    } else {
      // Create new review
      const { data, error } = await supabase
        .from("ticket_reviews")
        .insert({
          ticket_id: params.id,
          reviewer_type: reviewerType,
          rating: rating || null,
          comment: comment || null,
          reviewer_id: reviewerId || null,
        })
        .select()
        .single();

      if (error) throw error;

      return NextResponse.json({ review: data });
    }
  } catch (error) {
    console.error("Error saving review:", error);
    return NextResponse.json(
      { error: "Failed to save review" },
      { status: 500 }
    );
  }
}

