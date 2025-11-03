"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface Message {
  id: string;
  sender: string;
  text: string;
  createdAt: string;
}

interface MessageBubbleProps {
  message: Message;
  ticketLanguage?: string;
}

export default function MessageBubble({ message, ticketLanguage }: MessageBubbleProps) {
  const isAgent = message.sender === "agent";
  const isAI = message.sender === "ai";
  const isCustomer = message.sender === "customer";

  return (
    <div className={`flex ${isAgent ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[75%] rounded-lg p-3 ${
          isAgent
            ? "bg-blue-600 text-white"
            : isAI
            ? "bg-purple-100 text-purple-900"
            : "bg-white text-gray-900 border border-gray-200"
        }`}
      >
        <div className="flex items-center gap-2 text-sm font-medium mb-1 opacity-75">
          <span>{isAgent ? "Agent" : isAI ? "AI Assistant" : "Customer"}</span>
          {isCustomer && ticketLanguage && (
            <span className="text-xs px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded-full">
              {ticketLanguage}
            </span>
          )}
        </div>
        {isAI || isAgent ? (
          <div className={`text-sm prose prose-sm max-w-none break-words ${isAgent ? "prose-invert" : ""}`}>
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                // Style markdown elements for chat
                p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                ul: ({ children }) => <ul className="list-disc list-inside mb-2 space-y-1">{children}</ul>,
                ol: ({ children }) => <ol className="list-decimal list-inside mb-2 space-y-1">{children}</ol>,
                li: ({ children }) => <li className="ml-2">{children}</li>,
                strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                em: ({ children }) => <em className="italic">{children}</em>,
                code: ({ children, className }) => {
                  const isInline = !className;
                  return isInline ? (
                    <code className={`${isAgent ? "bg-blue-800" : "bg-gray-200"} px-1 py-0.5 rounded text-xs font-mono`}>
                      {children}
                    </code>
                  ) : (
                    <code className={`block ${isAgent ? "bg-blue-800" : "bg-gray-200"} p-2 rounded text-xs font-mono overflow-x-auto my-2`}>
                      {children}
                    </code>
                  );
                },
                pre: ({ children }) => (
                  <pre className={`${isAgent ? "bg-blue-800" : "bg-gray-200"} p-2 rounded text-xs font-mono overflow-x-auto my-2`}>
                    {children}
                  </pre>
                ),
                a: ({ children, href }) => (
                  <a 
                    href={href} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className={isAgent ? "text-blue-200 underline" : "text-purple-700 underline"}
                  >
                    {children}
                  </a>
                ),
                h1: ({ children }) => <h1 className="text-lg font-bold mb-2 mt-3 first:mt-0">{children}</h1>,
                h2: ({ children }) => <h2 className="text-base font-bold mb-2 mt-3 first:mt-0">{children}</h2>,
                h3: ({ children }) => <h3 className="text-sm font-bold mb-1 mt-2 first:mt-0">{children}</h3>,
                blockquote: ({ children }) => (
                  <blockquote className={`border-l-4 ${isAgent ? "border-blue-400" : "border-gray-300"} pl-3 italic my-2`}>
                    {children}
                  </blockquote>
                ),
                hr: () => <hr className={`my-3 ${isAgent ? "border-blue-400" : "border-gray-300"}`} />,
              }}
            >
              {message.text}
            </ReactMarkdown>
          </div>
        ) : (
          <div className="text-sm whitespace-pre-wrap break-words">{message.text}</div>
        )}
        <div className="text-xs opacity-60 mt-1">
          {new Date(message.createdAt).toLocaleTimeString()}
        </div>
      </div>
    </div>
  );
}

