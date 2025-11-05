import { createServerClient } from "@/lib/supabaseServer";
import { NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

// Background task to auto-summarize ticket when closed
export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createServerClient();

    // Get ticket and messages
    const { data: ticket, error: ticketError } = await supabase
      .from("tickets")
      .select("*")
      .eq("id", params.id)
      .single();

    if (ticketError || !ticket) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }

    // Skip if summary already exists
    if (ticket.summary) {
      return NextResponse.json({ 
        message: "Summary already exists",
        summary: ticket.summary 
      });
    }

    // Get all messages
    const { data: messages, error: messagesError } = await supabase
      .from("messages")
      .select("*")
      .eq("ticket_id", params.id)
      .order("created_at", { ascending: true });

    if (messagesError) {
      return NextResponse.json(
        { error: "Failed to fetch messages" },
        { status: 500 }
      );
    }

    if (!messages || messages.length === 0) {
      return NextResponse.json(
        { error: "No messages to summarize" },
        { status: 400 }
      );
    }

    // Filter only customer messages for summarization
    const customerMessages = messages.filter((msg: any) => msg.sender === "customer");

    if (customerMessages.length === 0) {
      return NextResponse.json(
        { error: "No customer messages to summarize" },
        { status: 400 }
      );
    }

    // Only summarize if there are at least 3 customer messages (optimize resources)
    if (customerMessages.length < 3) {
      return NextResponse.json({ 
        message: "Not enough customer messages to summarize (minimum 3 required)",
        skipped: true,
        customerMessageCount: customerMessages.length
      });
    }

    // Build conversation context
    const conversationText = customerMessages
      .map((msg: any) => `Customer: ${msg.text}`)
      .join("\n\n");

    // Generate summary
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "user",
          content: `Summarize the following customer support conversation in 3 concise sentences.

Focus on: the issue, the resolution, and any follow-up action.

Conversation:

${conversationText}`,
        },
      ],
      temperature: 0.7,
      max_tokens: 500,
    });

    const summary = completion.choices?.[0]?.message?.content || "Unable to generate summary.";
    const tokensUsed = completion.usage?.total_tokens || 0;
    const promptTokens = completion.usage?.prompt_tokens || 0;
    const completionTokens = completion.usage?.completion_tokens || 0;

    // Save summary and update token usage
    const { data: currentTicket } = await supabase
      .from("tickets")
      .select("ai_token_usage")
      .eq("id", params.id)
      .single();

    const { error: updateError } = await supabase
      .from("tickets")
      .update({
        summary,
        ai_token_usage: (currentTicket?.ai_token_usage || 0) + tokensUsed,
      })
      .eq("id", params.id);

    if (updateError) {
      console.error("Error saving summary:", updateError);
      return NextResponse.json(
        { error: "Failed to save summary" },
        { status: 500 }
      );
    }

    // Log the summarization
    await supabase.from("audit_logs").insert({
      ticket_id: params.id,
      action_type: "ticket_summarized",
      actor_type: "system",
      details: {
        tokens_used: tokensUsed,
        prompt_tokens: promptTokens,
        completion_tokens: completionTokens,
        model: "gpt-4o-mini",
        auto_generated: true,
      },
    });

    return NextResponse.json({ 
      success: true,
      summary,
      tokensUsed 
    });
  } catch (error) {
    console.error("Error auto-summarizing ticket:", error);
    return NextResponse.json(
      { error: "Failed to generate summary" },
      { status: 500 }
    );
  }
}

