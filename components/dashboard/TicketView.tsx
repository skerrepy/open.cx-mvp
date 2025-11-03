"use client";

import { useState } from "react";
import MessageBubble from "./MessageBubble";
import { useTicket, useSendMessage, useRealtimeMessages } from "@/lib/hooks";
import { Message } from "@/lib/hooks/useTickets";
import { supabase } from "@/lib/supabaseClient";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";

interface TicketViewProps {
  ticketId: string;
}

export default function TicketView({ ticketId }: TicketViewProps) {
  const { data: ticket, isLoading: ticketLoading } = useTicket(ticketId);
  const { mutate: sendMessage, isPending: isSending } = useSendMessage(ticketId);
  const [input, setInput] = useState("");
  const queryClient = useQueryClient();

  // Enable real-time updates
  useRealtimeMessages(ticketId);

  const handleSendMessage = async () => {
    if (!input.trim() || !ticket) return;

    // If ticket is closed, don't allow sending messages
    if (ticket.status === "closed") {
      alert("This ticket is closed. You cannot send messages.");
      return;
    }

    // Ticket should already be needs_human_assistance if agent is responding
    // But if for some reason it's still open, add status to log
    if (ticket.status === "open") {
      await supabase
        .from("ticket_statuses")
        .insert({
          ticket_id: ticketId,
          status: "needs_human_assistance",
        });
      
      queryClient.invalidateQueries({ queryKey: ["ticket", ticketId] });
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
    }

    sendMessage(
      {
        text: input,
        sender: "agent",
      },
      {
        onSuccess: () => {
          setInput("");
        },
      }
    );
  };

  const handleCloseTicket = async () => {
    if (!confirm("Are you sure you want to close this ticket?")) return;

    // Add "closed" status to status log
    await supabase
      .from("ticket_statuses")
      .insert({
        ticket_id: ticketId,
        status: "closed",
      });

    queryClient.invalidateQueries({ queryKey: ["ticket", ticketId] });
    queryClient.invalidateQueries({ queryKey: ["tickets"] });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (ticketLoading) {
    return (
      <div className="bg-white rounded-lg shadow p-8 text-center">
        <p className="text-gray-500">Loading ticket...</p>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="bg-white rounded-lg shadow p-8 text-center">
        <p className="text-gray-500">Ticket not found</p>
      </div>
    );
  }

  // Transform messages for MessageBubble component
  const messages: Array<{
    id: string;
    sender: string;
    text: string;
    createdAt: string;
  }> = (ticket.messages || []).map((msg) => ({
    id: msg.id,
    sender: msg.sender,
    text: msg.text,
    createdAt: msg.created_at,
  }));

  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden flex flex-col h-[calc(100vh-8rem)]">
      <div className="p-4 border-b bg-gray-50">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              {ticket.subject || "No subject"}
            </h2>
            <div className="flex items-center gap-2 mt-2">
              {ticket.language && (
                <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-700">
                  {ticket.language}
                </span>
              )}
              <span
                className={`px-2 py-1 text-xs font-semibold rounded-full ${
                  ticket.status === "open"
                    ? "bg-green-100 text-green-800"
                    : ticket.status === "closed"
                    ? "bg-gray-100 text-gray-800"
                    : "bg-yellow-100 text-yellow-800"
                }`}
              >
                {ticket.status === "needs_human_assistance" ? "Needs Human Assistance" : ticket.status}
              </span>
              <span className="text-sm text-gray-500">
                {messages.length} message{messages.length !== 1 ? "s" : ""}
              </span>
            </div>
          </div>
          {ticket.status !== "closed" && (
            <Button
              onClick={handleCloseTicket}
              variant="outline"
              className="bg-white hover:bg-gray-100"
            >
              Close Ticket
            </Button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
        {messages.map((message) => (
          <MessageBubble key={message.id} message={message} ticketLanguage={ticket.language || undefined} />
        ))}
      </div>

      {ticket.status !== "closed" ? (
        <div className="border-t bg-white p-4">
          <div className="flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your response to the customer..."
              disabled={isSending}
              className="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
            />
            <Button
              onClick={handleSendMessage}
              disabled={!input.trim() || isSending}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              {isSending ? "Sending..." : "Send"}
            </Button>
          </div>
        </div>
      ) : (
        <div className="border-t bg-gray-100 p-4 text-center text-gray-500">
          This ticket is closed. No further messages can be sent.
        </div>
      )}
    </div>
  );
}
