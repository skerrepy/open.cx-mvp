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
      await queryClient.cancelQueries({ queryKey: ["messages", ticketId] });

      // Snapshot previous value
      const previousMessages = queryClient.getQueryData<Message[]>([
        "messages",
        ticketId,
      ]);

      // Optimistically update
      queryClient.setQueryData<Message[]>(["messages", ticketId], (old) => {
        const optimisticMessage: Message = {
          id: `temp-${Date.now()}`,
          ticket_id: ticketId,
          sender: newMessage.sender,
          text: newMessage.text,
          created_at: new Date().toISOString(),
        };
        return [...(old || []), optimisticMessage];
      });

      return { previousMessages };
    },
    onError: (err, newMessage, context) => {
      // Rollback on error
      queryClient.setQueryData(
        ["messages", ticketId],
        context?.previousMessages
      );
    },
    onSettled: () => {
      // Refetch after mutation
      queryClient.invalidateQueries({ queryKey: ["messages", ticketId] });
    },
  });
};

