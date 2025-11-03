import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";

export interface Ticket {
  id: string;
  subject: string | null;
  status: string;
  created_at: string;
  customer_id: string | null;
  assignee_id: string | null;
  messages?: Message[];
}

export interface Message {
  id: string;
  ticket_id: string;
  sender: string;
  text: string;
  created_at: string;
}

export const useTickets = () => {
  return useQuery<Ticket[]>({
    queryKey: ["tickets"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tickets")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
  });
};

export const useTicket = (ticketId: string) => {
  return useQuery<Ticket & { messages: Message[] }>({
    queryKey: ["ticket", ticketId],
    queryFn: async () => {
      const { data: ticket, error: ticketError } = await supabase
        .from("tickets")
        .select("*")
        .eq("id", ticketId)
        .single();

      if (ticketError) throw ticketError;

      const { data: messages, error: messagesError } = await supabase
        .from("messages")
        .select("*")
        .eq("ticket_id", ticketId)
        .order("created_at", { ascending: true });

      if (messagesError) throw messagesError;

      return {
        ...ticket,
        messages: messages || [],
      };
    },
    enabled: !!ticketId,
  });
};

