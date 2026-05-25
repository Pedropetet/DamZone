import { useEffect, useRef, useState } from "react";
import type { Socket } from "socket.io-client";

interface ChatMessage {
  username: string;
  message: string;
  timestamp: string;
}

interface ChatProps {
  gameId: string;
  socket: Socket | null;
  currentUsername: string;
}

export function Chat({ gameId, socket, currentUsername }: ChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!socket) return;

    const handler = (msg: ChatMessage) => {
      setMessages((prev) => [...prev, msg]);
    };

    socket.on("chat:message", handler);
    return () => { socket.off("chat:message", handler); };
  }, [socket]);

  // Scroll naar nieuwste bericht
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function handleSend(e: React.FormEvent) {
    e.preventDefault();
    const msg = input.trim();
    if (!msg || !socket) return;
    socket.emit("chat:send", { gameId, message: msg });
    setInput("");
  }

  return (
    <div className="flex flex-col h-full border rounded-lg overflow-hidden bg-background">
      {/* Header */}
      <div className="px-3 py-2 border-b bg-muted/30 text-sm font-medium shrink-0">
        Chat
      </div>

      {/* Berichtenlijst */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2 min-h-0">
        {messages.length === 0 && (
          <p className="text-xs text-muted-foreground text-center mt-6">
            Nog geen berichten. Zeg hallo!
          </p>
        )}
        {messages.map((msg, i) => {
          const isSelf = msg.username === currentUsername;
          return (
            <div
              key={i}
              className={`flex flex-col gap-0.5 ${isSelf ? "items-end" : "items-start"}`}
            >
              <span className="text-xs text-muted-foreground">{msg.username}</span>
              <div
                className={`max-w-[85%] px-3 py-1.5 rounded-lg text-sm break-words ${
                  isSelf
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-foreground"
                }`}
              >
                {msg.message}
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Invoer */}
      <form onSubmit={handleSend} className="p-2 border-t flex gap-2 shrink-0">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Typ een bericht…"
          maxLength={200}
          className="flex-1 text-sm border rounded px-2 py-1.5 bg-background focus:outline-none focus:ring-1 focus:ring-ring"
        />
        <button
          type="submit"
          disabled={!input.trim()}
          className="text-sm px-3 py-1.5 bg-primary text-primary-foreground rounded-md disabled:opacity-40 hover:bg-primary/90 transition-colors"
        >
          Stuur
        </button>
      </form>
    </div>
  );
}
