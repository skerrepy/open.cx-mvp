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
    
    // Check if ticket status is already needs_human_assistance or closed
    let ticketStatus = "open";
    if (ticketId) {
      // Get latest status from status log
      const { data: latestStatus } = await supabase
        .from("ticket_statuses")
        .select("status")
        .eq("ticket_id", ticketId)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();
      
      if (latestStatus) {
        ticketStatus = latestStatus.status;
        
        // If ticket is already with agent or closed, don't generate AI response
        if (ticketStatus === "needs_human_assistance" || ticketStatus === "closed") {
          return NextResponse.json({ 
            reply: "A human agent will assist you shortly.", 
            text: "A human agent will assist you shortly.",
            transferToAgent: false
          });
        }
      }
    }

    // Enhanced system prompt - AI decides when to transfer based on context
    const enhancedMessages = [
      {
        role: "system",
        content: `You are a helpful AI support assistant. Your primary role is to answer customer questions confidently and provide helpful information.

IMPORTANT GUIDELINES:
1. ALWAYS provide helpful, detailed answers to customer questions first
2. When asked about policies (refunds, returns, shipping, etc.), provide the actual policy information clearly
3. Be confident in your answers - you should handle most common questions
4. ONLY indicate transfer to human agent in these specific cases:
   - Customer EXPLICITLY requests to speak with a human agent
   - Customer shows CLEAR dissatisfaction AFTER your answer (e.g., "that doesn't help", "I'm not satisfied")
   - You genuinely cannot answer or are unsure about something that requires human judgment

DO NOT transfer to human agent when:
- Customer asks a general question that you can answer (even if it's about refunds, returns, policies)
- Customer asks for information you can provide
- Customer seems to want an answer, not necessarily a human (provide the answer first)

RESPONSE FORMAT:
- Provide your normal helpful response to the customer
- At the END of your response, if you determine the customer needs human assistance, add exactly this marker on a new line: "[[TRANSFER_TO_AGENT]]"
- If no transfer is needed, do NOT include this marker

Example responses:

Customer: "How do I return a product?"
Your response: "Our return policy allows returns within 30 days of purchase. Items must be unused and in original packaging. To initiate a return, please visit your account orders page and click 'Request Return' on the item. You'll receive a prepaid shipping label. Is there anything specific about the return process you'd like to know?"

Customer: "I want to speak to a human agent"
Your response: "I understand you'd like to speak with a human agent. Let me connect you with one right away.
[[TRANSFER_TO_AGENT]]"

Customer: "That answer doesn't help me at all"
Your response: "I apologize that my previous response wasn't helpful. Let me connect you with a human agent who can better assist you.
[[TRANSFER_TO_AGENT]]"

Be helpful, confident, and informative. Only add the transfer marker when truly necessary.`,
      },
      ...messages.filter((m: any) => m.role !== "system"),
    ];

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: enhancedMessages,
    });

    let reply = completion.choices?.[0]?.message?.content || "Sorry, I'm not sure.";

    // Check if AI decided to transfer (look for the marker in the response)
    const wantsHumanAgent = reply.includes("[[TRANSFER_TO_AGENT]]");
    
    // Remove the marker from the reply before saving/displaying
    if (wantsHumanAgent) {
      reply = reply.replace("[[TRANSFER_TO_AGENT]]", "").trim();
    }

    // Save AI reply to database if ticketId is provided
    if (ticketId) {
      await supabase.from("messages").insert({
        ticket_id: ticketId,
        sender: "ai",
        text: reply,
      });

      // If AI decided to transfer to human agent, add status to log
      if (wantsHumanAgent) {
        await supabase
          .from("ticket_statuses")
          .insert({
            ticket_id: ticketId,
            status: "needs_human_assistance",
          });

        // Add a system message indicating transfer (only once in database)
        await supabase.from("messages").insert({
          ticket_id: ticketId,
          sender: "system",
          text: "This conversation has been transferred to a human support agent. An agent will respond shortly.",
        });
      }
    }

    return NextResponse.json({ 
      reply, 
      text: reply,
      transferToAgent: wantsHumanAgent 
    });
  } catch (error) {
    console.error("OpenAI API error:", error);
    return NextResponse.json(
      { error: "Failed to generate AI response" },
      { status: 500 }
    );
  }
}
