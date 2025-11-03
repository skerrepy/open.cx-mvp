import OpenAI from "openai";
import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabaseServer";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

export async function POST(req: Request) {
  try {
    const { ticketId, messages } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: "Invalid messages format" }, { status: 400 });
    }

    const supabase = await createServerClient();
    
    // Check if ticket status is already pending_agent or closed
    let ticketStatus = "open";
    if (ticketId) {
      const { data: ticket } = await supabase
        .from("tickets")
        .select("status")
        .eq("id", ticketId)
        .single();
      
      if (ticket) {
        ticketStatus = ticket.status;
        
        // If ticket is already with agent or closed, don't generate AI response
        if (ticket.status === "pending_agent" || ticket.status === "closed") {
          return NextResponse.json({ 
            reply: "A human agent will assist you shortly.", 
            text: "A human agent will assist you shortly.",
            transferToAgent: false
          });
        }
      }
    }

    // Enhanced system prompt - AI should provide helpful answers and only transfer when necessary
    const enhancedMessages = [
      {
        role: "system",
        content: `You are a helpful AI support assistant. Your primary role is to answer customer questions confidently and provide helpful information.

IMPORTANT GUIDELINES:
1. ALWAYS provide helpful, detailed answers to customer questions first
2. When asked about policies (refunds, returns, shipping, etc.), provide the actual policy information clearly
3. Be confident in your answers - you should handle most common questions
4. ONLY transfer to a human agent in these specific cases:
   - Customer EXPLICITLY requests: "I want to speak to a human", "can I talk to a real person", "transfer me to an agent", "I need a human agent"
   - Customer shows CLEAR dissatisfaction AFTER your answer: "that doesn't help", "I'm not satisfied with that", "this isn't what I need", "that's not helpful"
   - Customer asks something you genuinely cannot answer or are unsure about

DO NOT transfer to human agent when:
- Customer asks a general question that you can answer (even if it's about refunds, returns, policies)
- Customer asks for information you can provide
- Customer seems to want an answer, not necessarily a human (provide the answer first)

Example good response to "How do I return a product?":
"Our return policy allows returns within 30 days of purchase. Items must be unused and in original packaging. To initiate a return, please visit your account orders page and click 'Request Return' on the item. You'll receive a prepaid shipping label. Is there anything specific about the return process you'd like to know?"

Example of when to transfer:
Customer: "I want to speak to a human agent" → Transfer
Customer: "That answer doesn't help me at all" → Transfer
Customer: "I'm not satisfied with this" → Transfer

Be helpful, confident, and informative. Only escalate when truly necessary.`,
      },
      ...messages.filter((m: any) => m.role !== "system"),
    ];

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: enhancedMessages,
    });

    const reply = completion.choices?.[0]?.message?.content || "Sorry, I'm not sure.";

    // Check if customer wants human agent - only detect explicit requests or clear dissatisfaction
    // Look at the conversation context, not just keywords
    const conversationHistory = messages
      .filter((m: any) => m.role === "user")
      .map((m: any) => m.content?.toLowerCase() || "");
    
    const lastUserMessage = conversationHistory[conversationHistory.length - 1] || "";
    const secondLastUserMessage = conversationHistory[conversationHistory.length - 2] || "";

    // Explicit requests for human agent
    const explicitRequest = 
      lastUserMessage.includes("i want to speak to a human") ||
      lastUserMessage.includes("can i talk to a real person") ||
      lastUserMessage.includes("can i speak to a human") ||
      lastUserMessage.includes("transfer me to an agent") ||
      lastUserMessage.includes("i need a human agent") ||
      lastUserMessage.includes("connect me with a human") ||
      lastUserMessage.includes("let me talk to a person");

    // Clear dissatisfaction indicators (usually after AI has responded)
    const dissatisfaction = 
      lastUserMessage.includes("that doesn't help") ||
      lastUserMessage.includes("that's not helpful") ||
      lastUserMessage.includes("i'm not satisfied with that") ||
      lastUserMessage.includes("this isn't what i need") ||
      lastUserMessage.includes("that didn't help") ||
      lastUserMessage.includes("not helpful") ||
      (lastUserMessage.includes("not satisfied") && conversationHistory.length > 1) ||
      (lastUserMessage.includes("dissatisfied") && conversationHistory.length > 1);

    // Only transfer if there's an explicit request OR clear dissatisfaction after AI response
    const wantsHumanAgent = explicitRequest || dissatisfaction;

    // Save AI reply to database if ticketId is provided
    if (ticketId) {
      await supabase.from("messages").insert({
        ticket_id: ticketId,
        sender: "ai",
        text: reply,
      });

      // If customer wants human agent, update ticket status
      if (wantsHumanAgent) {
        await supabase
          .from("tickets")
          .update({ status: "pending_agent" })
          .eq("id", ticketId);

        // Add a system message indicating transfer
        await supabase.from("messages").insert({
          ticket_id: ticketId,
          sender: "system",
          text: "This conversation has been transferred to a human support agent. An agent will respond shortly.",
        });

        return NextResponse.json({ 
          reply, 
          text: reply,
          transferToAgent: true 
        });
      }
    }

    return NextResponse.json({ reply, text: reply, transferToAgent: false });
  } catch (error) {
    console.error("OpenAI API error:", error);
    return NextResponse.json(
      { error: "Failed to generate AI response" },
      { status: 500 }
    );
  }
}
