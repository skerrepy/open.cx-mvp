import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";

export interface Ticket {
  id: string;
  subject: string | null;
  status: string;
  created_at: string;
  customer_id: string | null;
  assignee_id: string | null;
  language?: string | null;
  summary?: string | null;
  customer_first_name?: string | null;
  customer_last_name?: string | null;
  customer_email?: string | null;
  ai_token_usage?: number | null;
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
      // Fetch tickets with messages count and latest status
      const { data: tickets, error } = await supabase
        .from("tickets")
        .select(`
          *,
          messages (
            id
          )
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      
      // Get latest status for each ticket
      const ticketsWithStatus = await Promise.all(
        (tickets || []).map(async (ticket: any) => {
          // Get latest status from status log
          const { data: latestStatus } = await supabase
            .from("ticket_statuses")
            .select("status")
            .eq("ticket_id", ticket.id)
            .order("created_at", { ascending: false })
            .limit(1)
            .single();

          return {
            ...ticket,
            status: latestStatus?.status || "open",
            messages: ticket.messages || [],
          };
        })
      );

      return ticketsWithStatus;
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

      // Get latest status from status log
      const { data: latestStatus } = await supabase
        .from("ticket_statuses")
        .select("status")
        .eq("ticket_id", ticketId)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      const { data: messages, error: messagesError } = await supabase
        .from("messages")
        .select("*")
        .eq("ticket_id", ticketId)
        .order("created_at", { ascending: true });

      if (messagesError) throw messagesError;

      return {
        ...ticket,
        status: latestStatus?.status || "open",
        messages: messages || [],
      };
    },
    enabled: !!ticketId,
    refetchOnMount: true, // Always refetch when component mounts (agent opens ticket)
    refetchOnWindowFocus: true, // Refetch when window regains focus
    staleTime: 0, // Consider data stale immediately so real-time updates are always fresh
  });
};

