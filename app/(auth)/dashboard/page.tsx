"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useTickets, useRealtimeTickets } from "@/lib/hooks";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import TicketsList from "@/components/dashboard/TicketsList";
import MessengerView from "@/components/dashboard/MessengerView";
import { supabase } from "@/lib/supabaseClient";
import { useQuery } from "@tanstack/react-query";

export default function Dashboard() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const { data: tickets = [], isLoading } = useTickets();
  
  // Enable real-time updates for tickets list
  useRealtimeTickets();

  // Get current user
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUserId(user?.id || null);
    };
    getUser();
  }, []);

  // Check if business settings exist for onboarding redirect
  // In single-tenant system, there's only one business
  const { data: hasSettings } = useQuery({
    queryKey: ["business-settings-check"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("business_settings")
        .select("id")
        .limit(1)
        .maybeSingle();
      
      if (error && error.code !== "PGRST116") {
        console.error("Error checking business settings:", error);
        return true; // Don't redirect on error
      }
      return !!data; // Return true if settings exist
    },
  });

  // Redirect to settings if no business settings exist
  useEffect(() => {
    if (hasSettings === false) {
      router.push("/settings");
    }
  }, [hasSettings, router]);

  const needsHumanCount = tickets.filter(
    (t) => t.status === "needs_human_assistance"
  ).length;

  return (
    <div className="space-y-4">
      <Tabs defaultValue="messenger" className="space-y-4">
          <TabsList>
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

