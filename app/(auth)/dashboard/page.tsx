"use client";

import Link from "next/link";
import { useTickets, useRealtimeTickets } from "@/lib/hooks";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

export default function Dashboard() {
  const { data: tickets = [], isLoading } = useTickets();
  const router = useRouter();
  
  // Enable real-time updates for tickets list
  useRealtimeTickets();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Support Tickets</h1>
          <div className="flex gap-4 items-center">
            <Link
              href="/"
              className="text-blue-600 hover:text-blue-800"
            >
              Home
            </Link>
            <button
              onClick={handleLogout}
              className="px-4 py-2 text-sm bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
            >
              Logout
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
            Loading tickets...
          </div>
        ) : tickets.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
            No tickets yet. Create one through the chat widget.
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="p-4 border-b bg-gray-50">
              <h2 className="text-lg font-semibold text-gray-900">
                Tickets Awaiting Agent Response
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                Only tickets where customers have requested human support are shown here
              </p>
            </div>
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Subject
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Messages
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {tickets
                  .filter((ticket) => ticket.status === "pending_agent" || ticket.status === "closed")
                  .sort((a, b) => {
                    // Prioritize pending_agent tickets, then closed
                    const priority: Record<string, number> = {
                      pending_agent: 0,
                      closed: 1,
                    };
                    return (priority[a.status] ?? 2) - (priority[b.status] ?? 2);
                  })
                  .map((ticket) => (
                    <tr key={ticket.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Link
                          href={`/dashboard/tickets/${ticket.id}`}
                          className="text-blue-600 hover:text-blue-800 font-medium"
                        >
                          {ticket.subject || "No subject"}
                        </Link>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            ticket.status === "closed"
                              ? "bg-gray-100 text-gray-800"
                              : "bg-yellow-100 text-yellow-800"
                          }`}
                        >
                          {ticket.status === "pending_agent" ? "Needs Agent ⚠️" : "Closed"}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(ticket.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {ticket.messages?.length || 0}
                      </td>
                    </tr>
                  ))}
                {tickets.filter((ticket) => ticket.status === "pending_agent" || ticket.status === "closed").length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                      No tickets awaiting agent response. Tickets will appear here when customers request human support.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

