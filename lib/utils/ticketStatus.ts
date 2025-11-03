import { supabase } from "@/lib/supabaseClient";

/**
 * Get the latest status for a ticket from the status log
 */
export async function getLatestTicketStatus(ticketId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from("ticket_statuses")
    .select("status")
    .eq("ticket_id", ticketId)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (error || !data) {
    // Fallback to "open" if no status found
    return "open";
  }

  return data.status;
}

/**
 * Add a new status entry to the ticket status log
 */
export async function addTicketStatus(ticketId: string, status: string): Promise<void> {
  const { error } = await supabase
    .from("ticket_statuses")
    .insert({
      ticket_id: ticketId,
      status,
    });

  if (error) {
    console.error("Error adding ticket status:", error);
    throw error;
  }
}

