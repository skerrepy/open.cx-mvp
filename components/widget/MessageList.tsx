"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import EndChatButton from "./EndChatButton";

interface Message {
  sender: string;
  text: string;
  createdAt?: string;
  suggestEndChat?: boolean;
}

interface MessageListProps {
  messages: Message[];
  isLoading: boolean;
  isAgentTyping?: boolean;
  onEndChat?: () => void;
}

export default function MessageList({ messages, isLoading, isAgentTyping = false, onEndChat }: MessageListProps) {
  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-3">
      {messages.map((m, i) => {
        const isAI = m.sender === "ai";
        const isCustomer = m.sender === "customer";
        const isSystem = m.sender === "system";
        const isLastMessage = i === messages.length - 1;
        const showEndChatButton = isAI && m.suggestEndChat && isLastMessage && !isLoading && onEndChat;

        return (
          <div key={i}>
            <div
              className={`flex ${
                isCustomer ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`max-w-[80%] p-3 rounded-lg ${
                  isCustomer
                    ? "bg-blue-600 text-white"
                    : isSystem
                    ? "bg-yellow-50 text-yellow-800 border border-yellow-200"
                    : "bg-gray-100 text-gray-800"
                }`}
              >
                {isAI ? (
                  <div className="text-sm prose prose-sm max-w-none break-words">
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
                            <code className="bg-gray-200 px-1 py-0.5 rounded text-xs font-mono">{children}</code>
                          ) : (
                            <code className="block bg-gray-200 p-2 rounded text-xs font-mono overflow-x-auto my-2">{children}</code>
                          );
                        },
                        pre: ({ children }) => <pre className="bg-gray-200 p-2 rounded text-xs font-mono overflow-x-auto my-2">{children}</pre>,
                        a: ({ children, href }) => (
                          <a href={href} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">
                            {children}
                          </a>
                        ),
                        h1: ({ children }) => <h1 className="text-lg font-bold mb-2 mt-3 first:mt-0">{children}</h1>,
                        h2: ({ children }) => <h2 className="text-base font-bold mb-2 mt-3 first:mt-0">{children}</h2>,
                        h3: ({ children }) => <h3 className="text-sm font-bold mb-1 mt-2 first:mt-0">{children}</h3>,
                        blockquote: ({ children }) => (
                          <blockquote className="border-l-4 border-gray-300 pl-3 italic my-2">{children}</blockquote>
                        ),
                        hr: () => <hr className="my-3 border-gray-300" />,
                      }}
                    >
                      {m.text}
                    </ReactMarkdown>
                  </div>
                ) : (
                  <div className="text-sm whitespace-pre-wrap break-words">{m.text}</div>
                )}
              </div>
            </div>
            {showEndChatButton && <EndChatButton onClick={onEndChat} />}
          </div>
        );
      })}
      {isLoading && (
        <div className="flex justify-start">
          <div className="bg-gray-100 p-3 rounded-lg">
            <div className="flex space-x-1">
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></div>
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></div>
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></div>
            </div>
          </div>
        </div>
      )}
      {isAgentTyping && (
        <div className="flex justify-start">
          <div className="bg-blue-100 p-3 rounded-lg">
            <div className="flex items-center space-x-2">
              <span className="text-xs text-blue-800 font-medium">Agent</span>
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></div>
                <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></div>
                <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

