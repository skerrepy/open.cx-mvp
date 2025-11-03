"use client";

import { useState, useEffect } from "react";
import MessageList from "./MessageList";
import Composer from "./Composer";
import SuggestionChips from "./SuggestionChips";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { Message } from "@/lib/hooks/useTickets";
import axios from "@/lib/axios";

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
  const queryClient = useQueryClient();

  // Subscribe to real-time messages for this ticket
  useEffect(() => {
    if (!ticketId) return;

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
            // Avoid duplicates
            if (prev.some((m) => m.text === newMessage.text && m.sender === newMessage.sender)) {
              return prev;
            }
            return [
              ...prev,
              {
                sender: newMessage.sender,
                text: newMessage.text,
                createdAt: newMessage.created_at,
              },
            ];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [ticketId]);

  const createTicketMutation = useMutation({
    mutationFn: async ({ subject, firstMessage }: { subject: string; firstMessage: string }) => {
      const { data, error } = await supabase
        .from("tickets")
        .insert({
          subject,
          status: "open",
        })
        .select()
        .single();

      if (error) throw error;

      // Add first message
      const { error: msgError } = await supabase.from("messages").insert({
        ticket_id: data.id,
        sender: "customer",
        text: firstMessage,
      });

      if (msgError) throw msgError;

      return data;
    },
  });

  const sendMessageMutation = useMutation({
    mutationFn: async ({ text, sender }: { text: string; sender: string }) => {
      if (!ticketId) throw new Error("No ticket ID");

      const { data, error } = await supabase
        .from("messages")
        .insert({
          ticket_id: ticketId,
          sender,
          text,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
  });

  const sendMessage = async (text?: string) => {
    const messageText = text || input;
    if (!messageText.trim()) return;

    const userMsg: WidgetMessage = { sender: "customer", text: messageText };
    setMessages((m) => [...m, userMsg]);
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
        ticketStatus = ticket.status || "open";
        setTicketId(ticket.id);
      } else {
        // Add message to existing ticket
        await sendMessageMutation.mutateAsync({
          text: messageText,
          sender: "customer",
        });

        // Check current ticket status
        const { data: ticketData } = await supabase
          .from("tickets")
          .select("status")
          .eq("id", currentTicketId)
          .single();
        
        if (ticketData) {
          ticketStatus = ticketData.status;
        }
      }

      // Only get AI response if ticket is still open (not pending_agent or closed)
      if (ticketStatus === "open") {
        // Get AI response using axios
        const { data: aiData } = await axios.post("/api/ai/reply", {
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

        const aiMsg: WidgetMessage = { sender: "ai", text: aiData.reply || aiData.text };
        setMessages((m) => [...m, aiMsg]);

        // If AI transferred to agent, show notification
        if (aiData.transferToAgent) {
          const transferMsg: WidgetMessage = {
            sender: "system",
            text: "This conversation has been transferred to a human support agent. An agent will respond shortly.",
          };
          setTimeout(() => {
            setMessages((m) => [...m, transferMsg]);
          }, 1000);
        }
      } else {
        // Ticket is with agent or closed, just show message sent
        setIsLoading(false);
      }
    } catch (error: any) {
      console.error("Error sending message:", error);
      setMessages((m) => [
        ...m,
        { sender: "ai", text: error.message || "Sorry, I encountered an error. Please try again." },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const requestHumanSupport = async () => {
    if (!ticketId) return;

    const supportMsg: WidgetMessage = {
      sender: "system",
      text: "Your request has been transferred to a human support agent. An agent will respond shortly.",
    };
    setMessages((m) => [...m, supportMsg]);

    // Update ticket status
    await supabase
      .from("tickets")
      .update({ status: "pending_agent" })
      .eq("id", ticketId);
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

      <MessageList messages={messages} isLoading={isLoading} />

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
