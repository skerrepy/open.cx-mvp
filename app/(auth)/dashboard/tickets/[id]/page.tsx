"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import TicketView from "@/components/dashboard/TicketView";

export default function TicketPage() {
  const params = useParams();
  const router = useRouter();
  const ticketId = params.id as string;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto p-6">
        <button
          onClick={() => router.push("/dashboard")}
          className="mb-4 text-blue-600 hover:text-blue-800"
        >
          ← Back to Tickets
        </button>
        <TicketView ticketId={ticketId} />
      </div>
    </div>
  );
}

