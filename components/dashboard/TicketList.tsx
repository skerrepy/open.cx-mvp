"use client";

interface Ticket {
  id: string;
  subject: string | null;
  status: string;
  createdAt: Date;
  messages: Array<{ id: string }>;
}

interface TicketListProps {
  tickets: Ticket[];
}

export default function TicketList({ tickets }: TicketListProps) {
  return (
    <div className="space-y-2">
      {tickets.map((ticket) => (
        <div
          key={ticket.id}
          className="p-4 bg-white rounded-lg shadow hover:shadow-md transition-shadow"
        >
          <div className="flex justify-between items-start">
            <div>
              <h3 className="font-semibold text-gray-900">
                {ticket.subject || "No subject"}
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                {ticket.messages.length} message{ticket.messages.length !== 1 ? "s" : ""}
              </p>
            </div>
            <span
              className={`px-2 py-1 text-xs font-semibold rounded-full ${
                ticket.status === "open"
                  ? "bg-green-100 text-green-800"
                  : ticket.status === "closed"
                  ? "bg-gray-100 text-gray-800"
                  : "bg-yellow-100 text-yellow-800"
              }`}
            >
              {ticket.status}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

