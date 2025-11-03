"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { Ticket } from "@/lib/hooks/useTickets";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

interface TicketsListProps {
  tickets: Ticket[];
  isLoading: boolean;
}

export default function TicketsList({ tickets, isLoading }: TicketsListProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const filteredTickets = useMemo(() => {
    let filtered = tickets;

    // Filter by status
    if (statusFilter !== "all") {
      filtered = filtered.filter((ticket) => ticket.status === statusFilter);
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (ticket) =>
          ticket.subject?.toLowerCase().includes(query) ||
          ticket.id.toLowerCase().includes(query)
      );
    }

    return filtered.sort((a, b) => {
      // Sort by date, newest first
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [tickets, statusFilter, searchQuery]);

  const statusCounts = useMemo(() => {
    return {
      all: tickets.length,
      open: tickets.filter((t) => t.status === "open").length,
      needs_human_assistance: tickets.filter((t) => t.status === "needs_human_assistance").length,
      closed: tickets.filter((t) => t.status === "closed").length,
    };
  }, [tickets]);

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="p-4 border-b bg-gray-50">
          <Skeleton className="h-6 w-48 mb-2" />
          <Skeleton className="h-4 w-64" />
        </div>
        <div className="p-4 space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="p-4 border-b bg-gray-50">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">All Tickets</h2>
        
        {/* Search and Filters */}
        <div className="space-y-3">
          <Input
            placeholder="Search tickets by subject or ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="max-w-md"
          />
          
          <div className="flex gap-2 flex-wrap">
            {[
              { value: "all", label: "All", count: statusCounts.all },
              { value: "open", label: "Open", count: statusCounts.open },
              { value: "needs_human_assistance", label: "Needs Human", count: statusCounts.needs_human_assistance },
              { value: "closed", label: "Closed", count: statusCounts.closed },
            ].map((filter) => (
              <motion.button
                key={filter.value}
                onClick={() => setStatusFilter(filter.value)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  statusFilter === filter.value
                    ? "bg-blue-600 text-white"
                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                }`}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                {filter.label} ({filter.count})
              </motion.button>
            ))}
          </div>
        </div>
      </div>

      <div className="divide-y divide-gray-200">
        {filteredTickets.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No tickets found matching your filters.
          </div>
        ) : (
          filteredTickets.map((ticket, index) => (
            <motion.div
              key={ticket.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Link href={`/dashboard/tickets/${ticket.id}`}>
                <div className="p-4 hover:bg-gray-50 transition-colors cursor-pointer">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 mb-1">
                        {ticket.subject || "No subject"}
                      </h3>
                      <p className="text-sm text-gray-500">
                        {new Date(ticket.created_at).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      {ticket.language && (
                        <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded-full">
                          {ticket.language}
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
                        {ticket.status === "needs_human_assistance"
                          ? "Needs Human ⚠️"
                          : ticket.status}
                      </span>
                      <span className="text-sm text-gray-500">
                        {ticket.messages?.length || 0} messages
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}

