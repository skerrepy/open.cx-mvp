"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Ticket } from "@/lib/hooks/useTickets";
import { useTicket, useSendMessage, useRealtimeMessages } from "@/lib/hooks";
import { supabase } from "@/lib/supabaseClient";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import MessageBubble from "./MessageBubble";
import { Message } from "@/lib/hooks/useTickets";

interface MessengerViewProps {
  tickets: Ticket[];
  isLoading: boolean;
}

export default function MessengerView({ tickets, isLoading }: MessengerViewProps) {
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  // Get tickets that need human assistance
  const activeTickets = tickets.filter(
    (ticket) => ticket.status === "needs_human_assistance"
  );

  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden flex h-[calc(100vh-12rem)] min-h-0">
      {/* Sidebar - Ticket List */}
      <div className="w-80 border-r bg-gray-50 flex flex-col min-h-0">
        <div className="p-4 border-b bg-white">
          <h2 className="text-lg font-semibold text-gray-900">Active Conversations</h2>
          <p className="text-sm text-gray-500 mt-1">
            {activeTickets.length} ticket{activeTickets.length !== 1 ? "s" : ""} needing assistance
          </p>
        </div>

        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="p-4 space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          ) : activeTickets.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <p>No tickets need human assistance at the moment.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {activeTickets.map((ticket) => (
                <motion.button
                  key={ticket.id}
                  onClick={() => setSelectedTicketId(ticket.id)}
                  className={`w-full text-left p-4 hover:bg-gray-100 transition-colors ${
                    selectedTicketId === ticket.id ? "bg-blue-50 border-l-4 border-blue-600" : ""
                  }`}
                  whileHover={{ x: 2 }}
                  transition={{ type: "spring", stiffness: 300 }}
                >
                  <div className="flex justify-between items-start mb-1">
                    <h3 className="font-medium text-gray-900 text-sm truncate flex-1">
                      {ticket.subject || "No subject"}
                    </h3>
                    <span className="ml-2 flex-shrink-0 w-2 h-2 bg-yellow-500 rounded-full"></span>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-gray-500 truncate">
                      {ticket.messages?.length || 0} messages
                    </p>
                    {ticket.language && (
                      <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full">
                        {ticket.language}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    {new Date(ticket.created_at).toLocaleDateString()}
                  </p>
                </motion.button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-h-0">
        {selectedTicketId ? (
          <TicketChat
            ticketId={selectedTicketId}
            onClose={() => setSelectedTicketId(null)}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            <div className="text-center">
              <p className="text-lg mb-2">Select a conversation to start</p>
              <p className="text-sm">Choose a ticket from the sidebar to view and respond</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function TicketChat({
  ticketId,
  onClose,
}: {
  ticketId: string;
  onClose: () => void;
}) {
  const { data: ticket, isLoading: ticketLoading } = useTicket(ticketId);
  const { mutate: sendMessage, isPending: isSending } = useSendMessage(ticketId);
  const [input, setInput] = useState("");
  const queryClient = useQueryClient();
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const typingChannelRef = useRef<any>(null);

  // Enable real-time updates
  useRealtimeMessages(ticketId);

  // Set up typing indicator channel
  useEffect(() => {
    if (!ticketId) return;

    // Create a channel for typing indicators
    const typingChannel = supabase.channel(`typing:${ticketId}`);
    typingChannelRef.current = typingChannel;

    return () => {
      // Send stop typing when component unmounts
      typingChannel.send({
        type: "broadcast",
        event: "typing",
        payload: { isTyping: false },
      });
      supabase.removeChannel(typingChannel);
    };
  }, [ticketId]);

  // Broadcast typing status
  const broadcastTyping = (isTyping: boolean) => {
    if (!typingChannelRef.current) return;

    // Make sure channel is subscribed before sending
    typingChannelRef.current.send({
      type: "broadcast",
      event: "typing",
      payload: { isTyping },
    }).then((status) => {
      if (status === "error") {
        console.error("Failed to send typing indicator");
      }
    });
  };

  // Handle input change with typing indicator
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);

    // Broadcast typing started
    broadcastTyping(true);

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Broadcast typing stopped after 2 seconds of no input
    typingTimeoutRef.current = setTimeout(() => {
      broadcastTyping(false);
    }, 2000);
  };

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollAreaRef.current && ticket?.messages) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [ticket?.messages?.length]);

  const handleSendMessage = async () => {
    if (!input.trim() || !ticket) return;

    if (ticket.status === "closed") {
      alert("This ticket is closed. You cannot send messages.");
      return;
    }

    // Stop typing indicator
    broadcastTyping(false);
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
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

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (ticketLoading) {
    return (
      <div className="flex-1 flex flex-col">
        <div className="p-4 border-b">
          <Skeleton className="h-6 w-48 mb-2" />
          <Skeleton className="h-4 w-32" />
        </div>
        <div className="flex-1 p-4 space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 w-3/4" />
          ))}
        </div>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-500">
        Ticket not found
      </div>
    );
  }

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
    <div className="flex-1 flex flex-col min-h-0">
      {/* Header */}
      <div className="flex-shrink-0 p-4 border-b bg-white">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-gray-900">
              {ticket.subject || "No subject"}
            </h2>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className="px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
                Needs Human Assistance
              </span>
              <span className="text-sm text-gray-500">
                {messages.length} message{messages.length !== 1 ? "s" : ""}
              </span>
              {ticket.language && (
                <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-700">
                  {ticket.language}
                </span>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            {ticket.status !== "closed" && (
              <Button
                onClick={handleCloseTicket}
                variant="outline"
                size="sm"
              >
                Close Ticket
              </Button>
            )}
            <Button
              onClick={onClose}
              variant="ghost"
              size="sm"
            >
              Close
            </Button>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 min-h-0">
        <ScrollArea ref={scrollAreaRef} className="h-full p-4 bg-gray-50">
          <div className="space-y-3">
            <AnimatePresence>
              {messages.map((message, index) => (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.02 }}
                >
                  <MessageBubble message={message} />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </ScrollArea>
      </div>

      {/* Input */}
      {ticket.status !== "closed" ? (
        <div className="flex-shrink-0 border-t bg-white p-4">
          <div className="flex gap-2 items-end">
            <Textarea
              value={input}
              onChange={handleInputChange}
              onKeyDown={handleKeyPress}
              placeholder="Type your response to the customer... (Markdown supported)"
              disabled={isSending}
              className="flex-1 min-h-[80px] max-h-[200px] resize-y"
              rows={3}
            />
            <Button
              onClick={handleSendMessage}
              disabled={!input.trim() || isSending}
              className="self-end"
            >
              {isSending ? "Sending..." : "Send"}
            </Button>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            You can use Markdown formatting: **bold**, *italic*, `code`, lists, etc.
          </p>
        </div>
      ) : (
        <div className="flex-shrink-0 border-t bg-gray-100 p-4 text-center text-gray-500">
          This ticket is closed. No further messages can be sent.
        </div>
      )}
    </div>
  );
}

