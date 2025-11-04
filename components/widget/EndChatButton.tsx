"use client";

interface EndChatButtonProps {
  onClick: () => void;
}

export default function EndChatButton({ onClick }: EndChatButtonProps) {
  return (
    <div className="mt-3 flex justify-start">
      <button
        onClick={onClick}
        className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
      >
        End Chat
      </button>
    </div>
  );
}

