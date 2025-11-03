"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useTickets, useRealtimeTickets } from "@/lib/hooks";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import TicketsList from "@/components/dashboard/TicketsList";
import MessengerView from "@/components/dashboard/MessengerView";

export default function Dashboard() {
  const { data: tickets = [], isLoading } = useTickets();
  const router = useRouter();
  
  // Enable real-time updates for tickets list
  useRealtimeTickets();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  const needsHumanCount = tickets.filter(
    (t) => t.status === "needs_human_assistance"
  ).length;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex justify-between items-center mb-6"
        >
          <div>
            <h1 className="text-3xl font-bold">Support Dashboard</h1>
            <p className="text-gray-500 mt-1">
              Manage customer support tickets and conversations
            </p>
          </div>
          <div className="flex gap-4 items-center">
            <Link
              href="/"
              className="text-blue-600 hover:text-blue-800 font-medium"
            >
              Home
            </Link>
            <button
              onClick={handleLogout}
              className="px-4 py-2 text-sm bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Logout
            </button>
          </div>
        </motion.div>

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
    </div>
  );
}

