"use client";

import { motion } from "framer-motion";
import { useTickets, useRealtimeTickets } from "@/lib/hooks";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import TicketsList from "@/components/dashboard/TicketsList";
import MessengerView from "@/components/dashboard/MessengerView";

export default function Dashboard() {
  const { data: tickets = [], isLoading } = useTickets();
  
  // Enable real-time updates for tickets list
  useRealtimeTickets();

  const needsHumanCount = tickets.filter(
    (t) => t.status === "needs_human_assistance"
  ).length;

  return (
    <div className="space-y-4">
      <Tabs defaultValue="messenger" className="space-y-4">
          <TabsList className="bg-white">
            <TabsTrigger value="messenger" className="relative">
              Messenger
              {needsHumanCount > 0 && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="ml-2 bg-yellow-500 text-white text-xs font-bold px-2 py-0.5 rounded-full"
                >
                  {needsHumanCount}
                </motion.span>
              )}
            </TabsTrigger>
            <TabsTrigger value="tickets">All Tickets</TabsTrigger>
          </TabsList>

          <TabsContent value="messenger" className="mt-0">
            <MessengerView tickets={tickets} isLoading={isLoading} />
          </TabsContent>

          <TabsContent value="tickets" className="mt-0">
            <TicketsList tickets={tickets} isLoading={isLoading} />
          </TabsContent>
        </Tabs>
    </div>
  );
}

