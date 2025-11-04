import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { Message } from "./useTickets";

export const useMessages = (ticketId: string) => {
  return useQuery<Message[]>({
    queryKey: ["messages", ticketId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("ticket_id", ticketId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      return data || [];
    },
    enabled: !!ticketId,
  });
};

export const useSendMessage = (ticketId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ text, sender }: { text: string; sender: string }) => {
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
    onMutate: async (newMessage) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["ticket", ticketId] });
      await queryClient.cancelQueries({ queryKey: ["messages", ticketId] });

      // Snapshot previous value for ticket query
      const previousTicket = queryClient.getQueryData<{ messages: Message[] }>([
        "ticket",
        ticketId,
      ]);

      // Optimistically update ticket query (the one actually used by the component)
      if (previousTicket) {
        const optimisticMessage: Message = {
          id: `temp-${Date.now()}`,
          ticket_id: ticketId,
          sender: newMessage.sender,
          text: newMessage.text,
          created_at: new Date().toISOString(),
        };
        queryClient.setQueryData<{ messages: Message[] }>(["ticket", ticketId], {
          ...previousTicket,
          messages: [...(previousTicket.messages || []), optimisticMessage],
        });
      }

      return { previousTicket };
    },
    onError: (err, newMessage, context) => {
      // Rollback on error
      if (context?.previousTicket) {
        queryClient.setQueryData(
          ["ticket", ticketId],
          context.previousTicket
        );
      }
    },
    onSettled: () => {
      // Refetch after mutation to ensure consistency
      queryClient.invalidateQueries({ queryKey: ["ticket", ticketId] });
      queryClient.invalidateQueries({ queryKey: ["messages", ticketId] });
    },
  });
};

