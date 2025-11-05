"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Ticket } from "@/lib/hooks/useTickets";
import { useTicket, useSendMessage, useRealtimeMessages } from "@/lib/hooks";
import { supabase } from "@/lib/supabaseClient";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import MessageBubble from "./MessageBubble";
import AgentSuggestionChips from "./AgentSuggestionChips";
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
    <div className="bg-white rounded-lg shadow-lg overflow-hidden flex h-[calc(100vh-8rem)] min-h-0">
      {/* Sidebar - Ticket List */}
      <div className="w-80 border-r bg-gray-50 flex flex-col min-h-0">
        <div className="p-4 border-b bg-white">
          <h2 className="text-lg font-semibold text-gray-900">Active Conversations</h2>
          <p className="text-sm text-gray-500 mt-1">
            {activeTickets.length} ticket{activeTickets.length !== 1 ? "s" : ""} needing assistance
          </p>
        </div>

        <div className="flex-1 overflow-y-auto overflow-x-hidden">
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
                  transition={{ type: "spring", stiffness: 300 }}
                >
                  <div className="flex justify-between items-start mb-1">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <h3 className="font-medium text-gray-900 text-sm truncate flex-1">
                        {ticket.subject || "No subject"}
                      </h3>
                      {ticket.language && (
                        <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full flex-shrink-0">
                          {ticket.language}
                        </span>
                      )}
                    </div>
                    <span className="ml-2 flex-shrink-0 w-2 h-2 bg-yellow-500 rounded-full"></span>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-gray-500 truncate">
                      {ticket.messages?.length || 0} messages
                    </p>
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
  const [summary, setSummary] = useState<string | null>(null);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [agentName, setAgentName] = useState<string>("");
  const [showCloseDialog, setShowCloseDialog] = useState(false);
  const queryClient = useQueryClient();
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const typingChannelRef = useRef<any>(null);

  // Enable real-time updates
  useRealtimeMessages(ticketId);

  // Get current agent info
  useEffect(() => {
    const getAgentInfo = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // Get display name from user metadata (full_name or name)
        const name = user.user_metadata?.full_name || user.user_metadata?.name || "Support Agent";
        setAgentName(name);
      }
    };
    getAgentInfo();
  }, []);

  // Load summary from ticket if it exists and show it automatically
  useEffect(() => {
    if (ticket?.summary) {
      setSummary(ticket.summary);
      setShowSummary(true);
    }
  }, [ticket?.summary]);

  // Set up typing indicator channel
  useEffect(() => {
    if (!ticketId) return;

    // Create a channel for typing indicators
    const typingChannel = supabase.channel(`typing:${ticketId}`);
    typingChannelRef.current = typingChannel;
    
    // Subscribe to the channel
    typingChannel.subscribe();

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
        // Use setTimeout to ensure DOM is updated
        setTimeout(() => {
          scrollContainer.scrollTop = scrollContainer.scrollHeight;
        }, 100);
      }
    }
  }, [ticket?.messages?.length, isSending]);

  const handleSendMessage = async () => {
    if (!input.trim() || !ticket) return;

    if (ticket.status === "closed") {
      alert("This ticket is closed. You cannot send messages.");
      return;
    }

    // Get current user for assignment
    const { data: { user } } = await supabase.auth.getUser();
    const userId = user?.id;

    // Auto-assign ticket if not already assigned
    if (userId && !ticket.assignee_id) {
      await supabase
        .from("tickets")
        .update({ assignee_id: userId })
        .eq("id", ticketId);
      
      queryClient.invalidateQueries({ queryKey: ["ticket", ticketId] });
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
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

  const handleChipSelect = (text: string) => {
    setInput(text);
  };

  const handleCloseTicket = async () => {
    setShowCloseDialog(false);

    // Add "closed" status to status log
    await supabase
      .from("ticket_statuses")
      .insert({
        ticket_id: ticketId,
        status: "closed",
      });

    // Log the closure
    await supabase.from("audit_logs").insert({
      ticket_id: ticketId,
      action_type: "ticket_closed",
      actor_type: "agent",
      details: {
        closed_by: "agent", // Could be enhanced with actual user ID
      },
    });

    // Trigger auto-summarization in background (don't wait for it)
    fetch(`/api/tickets/${ticketId}/auto-summarize`, {
      method: "POST",
    }).catch((error) => {
      console.error("Error triggering auto-summarization:", error);
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

  const handleSummarize = async () => {
    if (!ticket?.messages || ticket.messages.length === 0) {
      alert("No messages to summarize");
      return;
    }

    setIsSummarizing(true);
    try {
      const response = await fetch("/api/ai/summarize", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ticketId,
          messages: ticket.messages.map((msg: any) => ({
            sender: msg.sender,
            text: msg.text,
          })),
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate summary");
      }

      const data = await response.json();
      setSummary(data.summary);
      setShowSummary(true);
      
      // Refresh ticket data to get the saved summary
      queryClient.invalidateQueries({ queryKey: ["ticket", ticketId] });
    } catch (error) {
      console.error("Error summarizing ticket:", error);
      alert("Failed to generate summary. Please try again.");
    } finally {
      setIsSummarizing(false);
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
              {/* Customer info */}
              {(ticket.customer_first_name || ticket.customer_last_name || ticket.customer_email) && (
                <span className="text-sm text-gray-600">
                  {ticket.customer_first_name || ticket.customer_last_name 
                    ? `${ticket.customer_first_name || ""} ${ticket.customer_last_name || ""}`.trim()
                    : ""}
                  {ticket.customer_email && (
                    <span className="text-gray-500">
                      {ticket.customer_first_name || ticket.customer_last_name ? " • " : ""}
                      {ticket.customer_email}
                    </span>
                  )}
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
              {ticket.language && (
                <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-700">
                  {ticket.language}
                </span>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={handleSummarize}
              variant="default"
              size="sm"
              disabled={isSummarizing || !ticket?.messages || ticket.messages.length === 0}
            >
              {isSummarizing ? "Summarizing..." : "Summarize Ticket"}
            </Button>
            {ticket.status !== "closed" && (
              <Button
                onClick={() => setShowCloseDialog(true)}
                variant="destructive"
                size="sm"
              >
                Close Ticket
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Summary Section */}
      {showSummary && summary && (
        <div className="flex-shrink-0 border-b bg-blue-50 border-blue-200">
          <div className="p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-blue-900 flex items-center gap-2">
                <span>📋</span>
                Conversation Summary
              </h3>
              <Button
                onClick={() => setShowSummary(false)}
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
              >
                ×
              </Button>
            </div>
            <div className="text-sm text-blue-800 prose prose-sm max-w-none">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                  ul: ({ children }) => <ul className="list-disc list-inside mb-2 space-y-1">{children}</ul>,
                  ol: ({ children }) => <ol className="list-decimal list-inside mb-2 space-y-1">{children}</ol>,
                  li: ({ children }) => <li className="ml-2">{children}</li>,
                  strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                  em: ({ children }) => <em className="italic">{children}</em>,
                }}
              >
                {summary}
              </ReactMarkdown>
            </div>
          </div>
        </div>
      )}

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
        <>
          <AgentSuggestionChips
            customerName={ticket.customer_first_name ? `${ticket.customer_first_name} ${ticket.customer_last_name || ""}`.trim() : undefined}
            customerEmail={ticket.customer_email || undefined}
            agentName={agentName}
            onSelect={handleChipSelect}
          />
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
        </>
      ) : (
        <div className="flex-shrink-0 border-t bg-gray-100 p-4 text-center text-gray-500">
          This ticket is closed. No further messages can be sent.
        </div>
      )}

      <Dialog open={showCloseDialog} onOpenChange={setShowCloseDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Close Ticket</DialogTitle>
            <DialogDescription>
              Are you sure you want to close this ticket? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowCloseDialog(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleCloseTicket}
            >
              Close Ticket
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

