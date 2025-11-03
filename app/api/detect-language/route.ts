import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabaseServer";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
  try {
    const { ticketId, text } = await req.json();

    if (!text || !ticketId) {
      return NextResponse.json(
        { error: "Text and ticketId are required" },
        { status: 400 }
      );
    }

    const supabase = await createServerClient();

    // Verify ticket exists and doesn't already have a language set
    const { data: ticket, error: ticketError } = await supabase
      .from("tickets")
      .select("id, language")
      .eq("id", ticketId)
      .single();

    if (ticketError || !ticket) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }

    // If language is already set, return it
    if (ticket.language) {
      return NextResponse.json({ language: ticket.language });
    }

    // Use OpenAI to detect language
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are a language detection assistant. Given a text, return ONLY the full language name in English (e.g., 'English', 'Spanish', 'French', 'German', 'Italian', 'Portuguese', 'Russian', 'Japanese', 'Korean', 'Chinese', 'Arabic', 'Hindi', 'Turkish', 'Polish', 'Dutch', 'Swedish', 'Danish', 'Norwegian', 'Finnish'). If the language cannot be determined, return 'Unknown'. Return ONLY the language name, nothing else.",
        },
        {
          role: "user",
          content: `What language is this text in? Return only the full language name:\n\n${text}`,
        },
      ],
      temperature: 0.3,
      max_tokens: 15,
    });

    const detectedLanguage = completion.choices[0]?.message?.content?.trim() || "Unknown";

    // Update ticket with detected language
    if (detectedLanguage && detectedLanguage !== "Unknown") {
      await supabase
        .from("tickets")
        .update({ language: detectedLanguage })
        .eq("id", ticketId);
    }

    return NextResponse.json({ language: detectedLanguage });
  } catch (error) {
    console.error("Error detecting language:", error);
    return NextResponse.json(
      { error: "Failed to detect language" },
      { status: 500 }
    );
  }
}

