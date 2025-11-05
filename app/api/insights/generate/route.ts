import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabaseServer";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

export async function POST(req: Request) {
  try {
    const supabase = await createServerClient();

    // Check if insights were generated today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const { data: recentInsights } = await supabase
      .from("product_insights")
      .select("*")
      .gte("created_at", today.toISOString())
      .lt("created_at", tomorrow.toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (recentInsights) {
      return NextResponse.json({
        message: "Insights already generated today",
        insights: recentInsights,
        cached: true,
      });
    }

    // Fetch last ~100 resolved tickets
    const { data: tickets, error: ticketsError } = await supabase
      .from("tickets")
      .select("id, subject, summary, created_at")
      .order("created_at", { ascending: false })
      .limit(100);

    if (ticketsError) throw ticketsError;

    // Get latest status for each ticket to find resolved ones
    const resolvedTickets = await Promise.all(
      (tickets || []).map(async (ticket) => {
        const { data: latestStatus } = await supabase
          .from("ticket_statuses")
          .select("status")
          .eq("ticket_id", ticket.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .single();

        return {
          ...ticket,
          status: latestStatus?.status || "open",
        };
      })
    );

    // Filter for resolved/closed tickets
    const closedTickets = resolvedTickets.filter(
      (t) => t.status === "closed" && t.summary
    );

    if (closedTickets.length === 0) {
      return NextResponse.json({
        message: "No resolved tickets with summaries found",
        insights: null,
      });
    }

    // Prepare ticket summaries for OpenAI
    const ticketSummaries = closedTickets
      .map((ticket, index) => {
        return `Ticket ${index + 1}:
Subject: ${ticket.subject || "No subject"}
Summary: ${ticket.summary || "No summary"}`;
      })
      .join("\n\n");

    // Generate insights using OpenAI
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You are a product management assistant. Analyze customer support ticket summaries and extract key insights.",
        },
        {
          role: "user",
          content: `Given the following resolved support ticket summaries, extract:

1) The 5 most common issues customers are facing
2) The 5 most requested feature improvements
3) A one-paragraph trend summary

Return your response as a valid JSON object with this exact structure:
{
  "recurring_issues": ["issue 1", "issue 2", ...],
  "requested_features": ["feature 1", "feature 2", ...],
  "summary": "one paragraph summary"
}

Ticket Summaries:
${ticketSummaries}`,
        },
      ],
      temperature: 0.7,
      response_format: { type: "json_object" },
    });

    const responseContent = completion.choices[0]?.message?.content;
    if (!responseContent) {
      throw new Error("No response from OpenAI");
    }

    const insights = JSON.parse(responseContent);

    // Validate the response structure
    if (
      !insights.recurring_issues ||
      !insights.requested_features ||
      !insights.summary
    ) {
      throw new Error("Invalid response structure from OpenAI");
    }

    // Generate tags for each ticket using OpenAI
    const tagPromises = closedTickets.map(async (ticket) => {
      try {
        const tagCompletion = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content:
                "You are a tagging assistant. Generate 1-3 short, relevant tags for support tickets.",
            },
            {
              role: "user",
              content: `Generate 1-3 short tags (single words or short phrases) for this support ticket. Return as a JSON array of strings.

Subject: ${ticket.subject || "No subject"}
Summary: ${ticket.summary || "No summary"}

Return JSON:
{
  "tags": ["tag1", "tag2", "tag3"]
}`,
            },
          ],
          temperature: 0.5,
          response_format: { type: "json_object" },
        });

        const tagResponse = tagCompletion.choices[0]?.message?.content;
        if (tagResponse) {
          const tagData = JSON.parse(tagResponse);
          return {
            ticketId: ticket.id,
            tags: tagData.tags || [],
          };
        }
      } catch (error) {
        console.error(`Error generating tags for ticket ${ticket.id}:`, error);
      }
      return { ticketId: ticket.id, tags: [] };
    });

    // Generate tags for all tickets (with rate limiting in mind)
    const tagResults = await Promise.all(tagPromises);

    // Update tickets with tags
    for (const { ticketId, tags } of tagResults) {
      if (tags.length > 0) {
        await supabase
          .from("tickets")
          .update({ tags })
          .eq("id", ticketId);
      }
    }

    // Save insights to database
    const { data: savedInsights, error: insertError } = await supabase
      .from("product_insights")
      .insert({
        summary: insights.summary,
        recurring_issues: insights.recurring_issues,
        requested_features: insights.requested_features,
      })
      .select()
      .single();

    if (insertError) throw insertError;

    return NextResponse.json({
      message: "Insights generated successfully",
      insights: savedInsights,
      ticketsProcessed: closedTickets.length,
      tagsGenerated: tagResults.filter((r) => r.tags.length > 0).length,
    });
  } catch (error: any) {
    console.error("Error generating insights:", error);
    return NextResponse.json(
      { error: "Failed to generate insights", details: error.message },
      { status: 500 }
    );
  }
}

