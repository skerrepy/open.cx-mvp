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
    let customerInfoExtracted = false;
    
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

      // Check if customer info is missing and try to extract it from the latest message
      const { data: ticket } = await supabase
        .from("tickets")
        .select("customer_first_name, customer_last_name, customer_email")
        .eq("id", ticketId)
        .single();

      if (!ticket?.customer_first_name || !ticket?.customer_last_name || !ticket?.customer_email) {
        // Get the latest customer message (last user message in the array)
        const latestUserMessage = messages
          .filter((m: any) => m.role === "user")
          .slice(-1)[0];

        if (latestUserMessage?.content) {
          // Try to extract customer info using AI
          try {
            const extractionCompletion = await openai.chat.completions.create({
              model: "gpt-4o-mini",
              messages: [
                {
                  role: "system",
                  content: `Extract customer information from the following message. Look for:
- First name (could be a single word like "sam" or "john")
- Last name (could be a single word like "alt" or "smith")
- Email address (must be a valid email format like "user@example.com")

Return ONLY a JSON object with this exact format:
{
  "firstName": "extracted first name or null",
  "lastName": "extracted last name or null",
  "email": "extracted email or null"
}

If any field is not found, set it to null. Only extract if you're confident about the information.`,
                },
                {
                  role: "user",
                  content: latestUserMessage.content,
                },
              ],
              temperature: 0.1,
              max_tokens: 150,
            });

            const extractionResult = extractionCompletion.choices?.[0]?.message?.content || "{}";
            let extractedInfo;
            try {
              // Try to parse JSON, handle cases where AI wraps it in markdown
              const cleaned = extractionResult.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
              extractedInfo = JSON.parse(cleaned);
            } catch {
              // If parsing fails, try to extract manually with regex
              const emailMatch = latestUserMessage.content.match(/[\w\.-]+@[\w\.-]+\.\w+/);
              const words = latestUserMessage.content.split(/\s+/);
              extractedInfo = {
                firstName: words[0] || null,
                lastName: words[1] || null,
                email: emailMatch ? emailMatch[0] : null,
              };
            }

            // Validate and save if we have all required fields
            if (extractedInfo.firstName && extractedInfo.lastName && extractedInfo.email) {
              const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
              if (emailRegex.test(extractedInfo.email)) {
                await supabase
                  .from("tickets")
                  .update({
                    customer_first_name: extractedInfo.firstName.trim().slice(0, 255),
                    customer_last_name: extractedInfo.lastName.trim().slice(0, 255),
                    customer_email: extractedInfo.email.toLowerCase().trim(),
                  })
                  .eq("id", ticketId);

                customerInfoExtracted = true;
              }
            }
          } catch (extractError) {
            // Silently fail - extraction is optional
            console.debug("Failed to extract customer info:", extractError);
          }
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

    // Track token usage
    const tokensUsed = completion.usage?.total_tokens || 0;
    const promptTokens = completion.usage?.prompt_tokens || 0;
    const completionTokens = completion.usage?.completion_tokens || 0;

    let reply = completion.choices?.[0]?.message?.content || "Sorry, I'm not sure.";

    // Check if AI decided to transfer (look for the marker in the response)
    let wantsHumanAgent = reply.includes("[[TRANSFER_TO_AGENT]]");
    
    // Remove the marker from the reply before saving/displaying
    if (wantsHumanAgent) {
      reply = reply.replace("[[TRANSFER_TO_AGENT]]", "").trim();
    }

    // Check if customer info is missing before transfer (re-check after extraction)
    let needsCustomerInfo = false;
    
    if (ticketId) {
      // Re-check ticket info after potential extraction
      const { data: ticket } = await supabase
        .from("tickets")
        .select("customer_first_name, customer_last_name, customer_email")
        .eq("id", ticketId)
        .single();

      // If we just extracted customer info and we have all required fields, we should transfer
      // This means the customer provided info in response to our request for it
      // If ticket status is still "open", it means we were waiting for info before transferring
      if (customerInfoExtracted && 
          ticket?.customer_first_name && 
          ticket?.customer_last_name && 
          ticket?.customer_email &&
          ticketStatus === "open") {
        // We were waiting for info, now we have it, so transfer
        wantsHumanAgent = true;
        reply = "Thank you for providing your information! I'm connecting you with a human support agent now.";
      }

      if (wantsHumanAgent) {
        if (!ticket?.customer_first_name || !ticket?.customer_last_name || !ticket?.customer_email) {
          needsCustomerInfo = true;
          // Modify reply to ask for customer info instead of transferring
          reply = "Before I connect you with a human agent, I'd like to collect a few details to ensure we can assist you effectively.\n\nCould you please provide:\n- Your first name\n- Your last name\n- Your email address\n\nThis will help our team serve you better!";
          // Don't transfer yet - we need customer info first
        }
        // If we have all the info (either from extraction or already saved), needsCustomerInfo stays false
        // and we can proceed with transfer
      }
    }

    // Check if conversation is complete and suggest closing
    let suggestEndChat = false;
    if (ticketId && !wantsHumanAgent && !needsCustomerInfo) {
      // Use AI to determine if the conversation is complete
      try {
        const completionCheck = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content: "You are analyzing a customer support conversation. Determine if the customer's issue has been fully resolved and they are satisfied. Return ONLY 'YES' if the conversation is complete and the customer is satisfied, or 'NO' if more assistance is needed.",
            },
            {
              role: "user",
              content: `Based on this conversation, is the customer's issue resolved and are they satisfied?\n\nConversation:\n${messages.map((m: any) => `${m.role}: ${m.content}`).join('\n')}\n\nAI Response: ${reply}`,
            },
          ],
          temperature: 0.1,
          max_tokens: 10,
        });

        const isComplete = completionCheck.choices?.[0]?.message?.content?.trim().toUpperCase() === "YES";
        if (isComplete) {
          suggestEndChat = true;
          // Modify reply to include suggestion to end chat
          reply = reply + "\n\nIf you're all set, feel free to end the chat using the button below!";
        }
      } catch (error) {
        // If check fails, don't suggest closing
        console.error("Error checking conversation completion:", error);
      }
    }

    // Save AI reply to database if ticketId is provided
    if (ticketId) {
      await supabase.from("messages").insert({
        ticket_id: ticketId,
        sender: "ai",
        text: reply,
      });

      // Update token usage
      try {
        const { error: rpcError } = await supabase.rpc('increment_token_usage', { 
          ticket_id: ticketId, 
          tokens: tokensUsed 
        });
        
        if (rpcError) {
          throw rpcError; // Fall through to fallback
        }
      } catch {
        // If RPC doesn't exist, use direct update
        const { data: currentTicket } = await supabase
          .from("tickets")
          .select("ai_token_usage")
          .eq("id", ticketId)
          .single();
        
        await supabase
          .from("tickets")
          .update({ ai_token_usage: (currentTicket?.ai_token_usage || 0) + tokensUsed })
          .eq("id", ticketId);
      }

      // Create audit log entry
      await supabase.from("audit_logs").insert({
        ticket_id: ticketId,
        action_type: "ai_response",
        actor_type: "ai",
        details: {
          tokens_used: tokensUsed,
          prompt_tokens: promptTokens,
          completion_tokens: completionTokens,
          model: "gpt-4o-mini",
        },
      });

      // If AI decided to transfer to human agent and we have customer info
      if (wantsHumanAgent && !needsCustomerInfo) {
        await supabase
          .from("ticket_statuses")
          .insert({
            ticket_id: ticketId,
            status: "needs_human_assistance",
          });

        // Add a system message indicating transfer
        await supabase.from("messages").insert({
          ticket_id: ticketId,
          sender: "system",
          text: "This conversation has been transferred to a human support agent. An agent will respond shortly.",
        });

        // Log the transfer
        await supabase.from("audit_logs").insert({
          ticket_id: ticketId,
          action_type: "status_change",
          actor_type: "ai",
          details: {
            status: "needs_human_assistance",
            reason: "ai_transfer",
          },
        });
      }
    }

    return NextResponse.json({ 
      reply, 
      text: reply,
      transferToAgent: wantsHumanAgent && !needsCustomerInfo,
      needsCustomerInfo: needsCustomerInfo,
      suggestEndChat: suggestEndChat
    });
  } catch (error) {
    console.error("OpenAI API error:", error);
    return NextResponse.json(
      { error: "Failed to generate AI response" },
      { status: 500 }
    );
  }
}
