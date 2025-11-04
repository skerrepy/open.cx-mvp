import OpenAI from "openai";
import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabaseServer";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

export async function POST(req: Request) {
  try {
    const { ticketId, messages } = await req.json();

    if (!ticketId) {
      return NextResponse.json({ error: "ticketId is required" }, { status: 400 });
    }

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: "Invalid messages format" }, { status: 400 });
    }

    // Filter only customer messages for summarization
    const customerMessages = messages.filter((msg: any) => msg.sender === "customer");

    if (customerMessages.length === 0) {
      return NextResponse.json({ error: "No customer messages to summarize" }, { status: 400 });
    }

    // Build conversation context for OpenAI
    const conversationText = customerMessages
      .map((msg: any) => `Customer: ${msg.text}`)
      .join("\n\n");

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

    // Track token usage
    const tokensUsed = completion.usage?.total_tokens || 0;
    const promptTokens = completion.usage?.prompt_tokens || 0;
    const completionTokens = completion.usage?.completion_tokens || 0;

    // Save summary to database
    const supabase = await createServerClient();
    
    // Update token usage
    const { data: currentTicket } = await supabase
      .from("tickets")
      .select("ai_token_usage")
      .eq("id", ticketId)
      .single();
    
    const { error: updateError } = await supabase
      .from("tickets")
      .update({ 
        summary,
        ai_token_usage: (currentTicket?.ai_token_usage || 0) + tokensUsed
      })
      .eq("id", ticketId);

    if (updateError) {
      console.error("Error saving summary to database:", updateError);
      // Still return the summary even if saving fails
    }

    // Log the summarization
    await supabase.from("audit_logs").insert({
      ticket_id: ticketId,
      action_type: "ticket_summarized",
      actor_type: "ai",
      details: {
        tokens_used: tokensUsed,
        prompt_tokens: promptTokens,
        completion_tokens: completionTokens,
        model: "gpt-4o-mini",
      },
    });

    return NextResponse.json({ summary, tokensUsed });
  } catch (error) {
    console.error("OpenAI API error:", error);
    return NextResponse.json(
      { error: "Failed to generate summary" },
      { status: 500 }
    );
  }
}

