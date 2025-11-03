"use client";

import { useState, useEffect } from "react";
import MessageList from "./MessageList";
import Composer from "./Composer";
import SuggestionChips from "./SuggestionChips";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { Message } from "@/lib/hooks/useTickets";
import axios from "@/lib/axios";
// Language detection is now done server-side in the API route

interface WidgetMessage {
  sender: string;
  text: string;
  createdAt?: string;
}

export default function Widget() {
  const [messages, setMessages] = useState<WidgetMessage[]>([
    {
      sender: "ai",
      text: "Hello! I'm your AI support assistant. How can I help you today?",
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [ticketId, setTicketId] = useState<string | null>(null);
  const [ticketLanguage, setTicketLanguage] = useState<string | null>(null);
  const [isAgentTyping, setIsAgentTyping] = useState(false);
  const [isConnected, setIsConnected] = useState(true);
  const queryClient = useQueryClient();

  // Load existing messages and subscribe to real-time updates for this ticket
  useEffect(() => {
    if (!ticketId) return;

    // Load existing messages and ticket language for this ticket
    const loadMessages = async () => {
      const { data: existingMessages, error } = await supabase
        .from("messages")
        .select("*")
        .eq("ticket_id", ticketId)
        .order("created_at", { ascending: true });

      if (!error && existingMessages) {
        // Replace welcome message with actual messages from database
        setMessages(
          existingMessages.map((msg) => ({
            sender: msg.sender,
            text: msg.text,
            createdAt: msg.created_at,
            id: msg.id,
          }))
        );
      }

      // Load ticket language
      const { data: ticket } = await supabase
        .from("tickets")
        .select("language")
        .eq("id", ticketId)
        .single();

      if (ticket?.language) {
        setTicketLanguage(ticket.language);
      }
    };

    loadMessages();

            // Subscribe to new messages, typing indicators, and ticket updates
            const channel = supabase
              .channel(`widget-messages:${ticketId}`)
              .on(
                "postgres_changes",
                {
                  event: "INSERT",
                  schema: "public",
                  table: "messages",
                  filter: `ticket_id=eq.${ticketId}`,
                },
                (payload) => {
                  const newMessage = payload.new as Message;
                  setMessages((prev) => {
                    // Avoid duplicates by checking message ID (most reliable)
                    // Also check text + sender + timestamp as fallback
                    const isDuplicate = prev.some(
                      (m) =>
                        (m as any).id === newMessage.id ||
                        (m.text === newMessage.text &&
                          m.sender === newMessage.sender &&
                          Math.abs(
                            new Date(m.createdAt || "").getTime() -
                              new Date(newMessage.created_at).getTime()
                          ) < 2000) // Within 2 seconds
                    );

                    if (isDuplicate) {
                      return prev;
                    }

                    // Add new message
                    const widgetMessage: WidgetMessage & { id?: string } = {
                      sender: newMessage.sender,
                      text: newMessage.text,
                      createdAt: newMessage.created_at,
                      id: newMessage.id, // Store ID for better duplicate detection
                    };

                    // Stop loading when we receive AI or system messages
                    if (newMessage.sender === "ai" || newMessage.sender === "system") {
                      setIsLoading(false);
                    }

                    // Stop typing indicator when agent sends a message
                    if (newMessage.sender === "agent") {
                      setIsAgentTyping(false);
                    }

                    return [...prev, widgetMessage];
                  });
                }
              )
              .on(
                "postgres_changes",
                {
                  event: "UPDATE",
                  schema: "public",
                  table: "tickets",
                  filter: `id=eq.${ticketId}`,
                },
                (payload) => {
                  const updatedTicket = payload.new as any;
                  if (updatedTicket.language) {
                    setTicketLanguage(updatedTicket.language);
                  }
                }
              )
      .subscribe((status) => {
        // Track connection status
        if (status === "SUBSCRIBED") {
          setIsConnected(true);
        } else if (status === "CLOSED" || status === "CHANNEL_ERROR") {
          setIsConnected(false);
        }
      });

    // Subscribe to typing indicators on a separate channel
    const typingChannel = supabase
      .channel(`typing:${ticketId}`)
      .on(
        "broadcast",
        { event: "typing" },
        (payload) => {
          setIsAgentTyping(payload.payload.isTyping);
        }
      )
      .subscribe();

    return () => {
      setIsConnected(false);
      setIsAgentTyping(false);
      supabase.removeChannel(channel);
      supabase.removeChannel(typingChannel);
    };
  }, [ticketId]);

  const createTicketMutation = useMutation({
    mutationFn: async ({ subject, firstMessage }: { subject: string; firstMessage: string }) => {
      // Use API route for ticket creation (language detection happens server-side)
      const response = await axios.post("/api/tickets", {
        subject,
        firstMessage,
      });

      return response.data;
    },
  });

  const sendMessageMutation = useMutation({
    mutationFn: async ({ text, sender }: { text: string; sender: string }) => {
      if (!ticketId) throw new Error("No ticket ID");

      // Use API route for message creation (language detection happens server-side)
      const response = await axios.post(`/api/tickets/${ticketId}/messages`, {
        text,
        sender,
      });

      return response.data;
    },
  });

  const sendMessage = async (text?: string) => {
    const messageText = text || input;
    if (!messageText.trim()) return;

    setInput("");
    setIsLoading(true);

    try {
      let currentTicketId = ticketId;
      let ticketStatus = "open";

      // If this is the first message, create a ticket
      if (!currentTicketId) {
        const ticket = await createTicketMutation.mutateAsync({
          subject: messageText.substring(0, 50),
          firstMessage: messageText,
        });
        currentTicketId = ticket.id;
        // Status is always "open" for new tickets
        ticketStatus = "open";
        setTicketId(ticket.id);
        
        // Detect language on first message (non-blocking - fire and forget)
        axios.post("/api/detect-language", {
          ticketId: currentTicketId,
          text: messageText,
        }).catch((err) => {
          console.error("Language detection error:", err);
          // Fail silently - don't block message sending
        });
        
        // Optimistically add user message only for first message (before realtime subscription is active)
        const userMsg: WidgetMessage = { sender: "customer", text: messageText };
        setMessages((m) => [...m, userMsg]);
      } else {
        // Add message to existing ticket - realtime subscription will add it
        await sendMessageMutation.mutateAsync({
          text: messageText,
          sender: "customer",
        });

        // Check current ticket status from status log
        const { data: latestStatus } = await supabase
          .from("ticket_statuses")
          .select("status")
          .eq("ticket_id", currentTicketId)
          .order("created_at", { ascending: false })
          .limit(1)
          .single();
        
        if (latestStatus) {
          ticketStatus = latestStatus.status;
        }
      }

          // Only get AI response if ticket is still open (not needs_human_assistance or closed)
          if (ticketStatus === "open") {
            // Get AI response using axios
            // The API route saves AI reply and system message (if transfer) to database
            // Real-time subscription will automatically add them - don't add manually
            await axios.post("/api/ai/reply", {
              ticketId: currentTicketId,
              messages: [
                {
                  role: "system",
                  content: "You are a helpful AI support assistant. Be concise and friendly.",
                },
                ...messages.map((m) => ({
                  role: m.sender === "customer" ? "user" : "assistant",
                  content: m.text,
                })),
                { role: "user", content: messageText },
              ],
            });

            // Don't manually add messages - let realtime subscription handle everything
            // This prevents duplicates. The realtime subscription will:
            // 1. Add customer message (if not first message)
            // 2. Add AI reply message
            // 3. Add system transfer message (if transfer happened)
          } else {
            // Ticket is with agent or closed, realtime will add the customer message
            setIsLoading(false);
          }
    } catch (error: any) {
      console.error("Error sending message:", error);
      setMessages((m) => [
        ...m,
        { sender: "ai", text: error.message || "Sorry, I encountered an error. Please try again." },
      ]);
      setIsLoading(false);
    }
    // Note: setIsLoading(false) is handled by realtime subscription when message arrives
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const requestHumanSupport = async () => {
    if (!ticketId) return;

    // Add status to status log
    await supabase
      .from("ticket_statuses")
      .insert({
        ticket_id: ticketId,
        status: "needs_human_assistance",
      });

    // Add system message to database - realtime subscription will add it to UI
    await supabase.from("messages").insert({
      ticket_id: ticketId,
      sender: "system",
      text: "Your request has been transferred to a human support agent. An agent will respond shortly.",
    });
  };

  return (
    <div className="w-full h-full bg-white flex flex-col rounded-lg shadow-lg overflow-hidden">
      <div className="bg-blue-600 text-white p-4">
        <h2 className="text-lg font-semibold">Support Chat</h2>
        {ticketId && messages.some((m) => m.sender === "system" && m.text.includes("agent")) && (
          <p className="text-sm text-blue-100 mt-1">
            ✓ An agent will respond shortly
          </p>
        )}
      </div>

             <MessageList messages={messages} isLoading={isLoading} isAgentTyping={isAgentTyping} ticketLanguage={ticketLanguage || undefined} />
      {!isConnected && (
        <div className="px-4 py-2 bg-yellow-50 border-t border-yellow-200">
          <p className="text-xs text-yellow-800">
            ⚠️ Connection lost. Reconnecting...
          </p>
        </div>
      )}

      {messages.length === 1 && (
        <div className="px-4 pb-2">
          <SuggestionChips
            suggestions={[
              "What are your business hours?",
              "How do I reset my password?",
              "I need help with my account",
            ]}
            onSelect={sendMessage}
          />
        </div>
      )}

      <div className="mt-auto border-t bg-gray-50">
        <Composer
          input={input}
          setInput={setInput}
          onSend={() => sendMessage()}
          onKeyPress={handleKeyPress}
          isLoading={isLoading}
        />
        {ticketId && (
          <button
            onClick={requestHumanSupport}
            className="w-full px-4 py-2 text-sm text-blue-600 hover:bg-blue-50 border-t"
          >
            Request human support
          </button>
        )}
      </div>
    </div>
  );
}
