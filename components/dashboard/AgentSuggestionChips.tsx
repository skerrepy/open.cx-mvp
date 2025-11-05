"use client";

import { Button } from "@/components/ui/button";
import { UserPlus, MessageCircle, X } from "lucide-react";

interface AgentSuggestionChipsProps {
  customerName?: string;
  customerEmail?: string;
  agentName?: string;
  onSelect: (text: string) => void;
}

export default function AgentSuggestionChips({
  customerName,
  customerEmail,
  agentName = "Support Agent",
  onSelect,
}: AgentSuggestionChipsProps) {
  // Extract only first name from agent name
  const agentFirstName = agentName.split(" ")[0] || "Support Agent";
  
  // Generate templates with customer and agent info
  const templates = [
    {
      icon: UserPlus,
      label: "Introduce yourself",
      text: `Hi${customerName ? ` ${customerName}` : ""}!\n\nThank you for contacting us. My name is ${agentFirstName}, and I'm here to assist you today. I understand you're reaching out regarding your inquiry, and I'll do my best to help resolve this for you.\n\nCould you please provide a bit more detail about your issue so I can better assist you?`,
    },
    {
      icon: MessageCircle,
      label: "Need more help?",
      text: `I want to make sure we've addressed everything you need today. Is there anything else I can help you with${customerName ? `, ${customerName}` : ""}?\n\nFeel free to ask any additional questions or let me know if you'd like further clarification on anything we've discussed.`,
    },
    {
      icon: X,
      label: "End conversation",
      text: `Thank you${customerName ? ` ${customerName}` : ""} for reaching out to us today. I'm glad we were able to assist you.\n\nIf you have any other questions or need further support in the future, please don't hesitate to reach out. We're here to help!\n\nHave a wonderful day!`,
    },
  ];

  return (
    <div className="flex flex-wrap gap-2 p-3 bg-gray-50 border-t">
      {templates.map((template, index) => {
        const Icon = template.icon;
        return (
          <Button
            key={index}
            variant="outline"
            size="sm"
            onClick={() => onSelect(template.text)}
            className="flex items-center gap-2 text-sm bg-white hover:bg-gray-50 rounded-full"
          >
            <Icon className="h-4 w-4" />
            {template.label}
          </Button>
        );
      })}
    </div>
  );
}

