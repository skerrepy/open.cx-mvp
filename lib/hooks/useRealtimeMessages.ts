import { useEffect } from "react";
import { RealtimePostgresChangesPayload } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabaseClient";
import { Message, Ticket } from "./useTickets";
import { useQueryClient } from "@tanstack/react-query";

export const useRealtimeMessages = (ticketId: string) => {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!ticketId) return;

    const channel = supabase
      .channel(`messages:${ticketId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `ticket_id=eq.${ticketId}`,
        },
        (payload: RealtimePostgresChangesPayload<Message>) => {
          const newMessage = payload.new as Message;
          
          // Update the ticket query data directly with the new message
          queryClient.setQueryData<Ticket & { messages: Message[] }>(
            ["ticket", ticketId],
            (old) => {
              if (!old) {
                // If no existing data, invalidate to trigger a full fetch
                queryClient.invalidateQueries({ queryKey: ["ticket", ticketId] });
                return old;
              }
              
              // Check for duplicates
              if (old.messages?.some((m) => m.id === newMessage.id)) {
                return old;
              }
              
              // Add new message to the messages array and sort by created_at
              const updatedMessages = [...(old.messages || []), newMessage];
              updatedMessages.sort((a, b) => 
                new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
              );
              
              return {
                ...old,
                messages: updatedMessages,
              };
            }
          );
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "messages",
          filter: `ticket_id=eq.${ticketId}`,
        },
        (payload: RealtimePostgresChangesPayload<Message>) => {
          const updatedMessage = payload.new as Message;
          
          // Update the ticket query data directly with the updated message
          queryClient.setQueryData<Ticket & { messages: Message[] }>(
            ["ticket", ticketId],
            (old) => {
              if (!old) {
                queryClient.invalidateQueries({ queryKey: ["ticket", ticketId] });
                return old;
              }
              
              // Update the message in the array
              return {
                ...old,
                messages: (old.messages || []).map((m) =>
                  m.id === updatedMessage.id ? updatedMessage : m
                ),
              };
            }
          );
        }
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "ticket_statuses",
          filter: `ticket_id=eq.${ticketId}`,
        },
        (payload: any) => {
          // Update ticket status in real-time
          queryClient.setQueryData<Ticket & { messages: Message[] }>(
            ["ticket", ticketId],
            (old) => {
              if (!old) {
                queryClient.invalidateQueries({ queryKey: ["ticket", ticketId] });
                return old;
              }
              
              return {
                ...old,
                status: payload.new.status,
              };
            }
          );
        }
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          console.debug(`Subscribed to messages for ticket ${ticketId}`);
        } else if (status === "CHANNEL_ERROR") {
          console.error(`Channel error for ticket ${ticketId}`);
          // On error, invalidate to trigger a refetch
          queryClient.invalidateQueries({ queryKey: ["ticket", ticketId] });
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [ticketId, queryClient]);
};

export const useRealtimeTickets = () => {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel("tickets")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "tickets",
        },
        () => {
          // Invalidate tickets query to refetch
          queryClient.invalidateQueries({ queryKey: ["tickets"] });
        }
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "ticket_statuses",
        },
        () => {
          // Invalidate tickets query when status changes
          queryClient.invalidateQueries({ queryKey: ["tickets"] });
          queryClient.invalidateQueries({ queryKey: ["ticket"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);
};

