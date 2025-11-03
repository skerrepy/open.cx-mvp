import { useEffect } from "react";
import { RealtimePostgresChangesPayload } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabaseClient";
import { Message } from "./useTickets";
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
          // Update the query cache with the new message
          queryClient.setQueryData<Message[]>(["messages", ticketId], (old) => {
            // Avoid duplicates
            if (old?.some((m) => m.id === payload.new.id)) {
              return old;
            }
            return [...(old || []), payload.new as Message];
          });
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
          queryClient.setQueryData<Message[]>(["messages", ticketId], (old) => {
            return (
              old?.map((m) => (m.id === payload.new.id ? (payload.new as Message) : m)) || []
            );
          });
        }
      )
      .subscribe();

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

