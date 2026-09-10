import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Pin, MessageSquare } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

export interface ChatMessage {
  id: string;
  sender_id: string;
  sender_name?: string;
  channel: string;
  content: string;
  is_pinned: boolean;
  created_at: string;
}

interface IncubationChatProps {
  startupId: string;
  currentUserId: string;
  currentUserName?: string;
  messages: ChatMessage[];
  onSend?: (content: string, channel: string) => Promise<void>;
}

const CHANNELS = [
  { id: "general", label: "Général", emoji: "💬" },
  { id: "coach", label: "Coach", emoji: "🎯" },
  { id: "fablab", label: "Fablab", emoji: "⚙️" },
  { id: "finance", label: "Finance", emoji: "💰" },
];

export default function IncubationChat({ startupId, currentUserId, currentUserName, messages, onSend }: IncubationChatProps) {
  const [activeChannel, setActiveChannel] = useState("general");
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const channelMessages = messages.filter(m => m.channel === activeChannel);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [channelMessages.length]);

  const handleSend = async () => {
    if (!input.trim() || sending) return;
    setSending(true);
    await onSend?.(input.trim(), activeChannel);
    setInput("");
    setSending(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const pinnedMessages = channelMessages.filter(m => m.is_pinned);

  return (
    <div className="flex h-[500px] border rounded-xl overflow-hidden bg-background">
      {/* Sidebar canaux */}
      <div className="w-36 border-r bg-muted/30 flex flex-col">
        <div className="p-3 border-b">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Canaux</p>
        </div>
        <div className="flex-1 p-2 space-y-1">
          {CHANNELS.map(channel => (
            <button
              key={channel.id}
              onClick={() => setActiveChannel(channel.id)}
              className={cn(
                "w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex items-center gap-2",
                activeChannel === channel.id
                  ? "bg-emerald-100 text-emerald-800 font-semibold"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <span>{channel.emoji}</span>
              <span className="truncate">{channel.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Zone messages */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header canal */}
        <div className="px-4 py-2.5 border-b flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-emerald-600" />
          <span className="font-semibold text-sm">
            {CHANNELS.find(c => c.id === activeChannel)?.emoji} {CHANNELS.find(c => c.id === activeChannel)?.label}
          </span>
          {pinnedMessages.length > 0 && (
            <Badge variant="outline" className="ml-auto text-xs gap-1">
              <Pin className="w-3 h-3" /> {pinnedMessages.length}
            </Badge>
          )}
        </div>

        {/* Messages */}
        <ScrollArea className="flex-1 px-4 py-3" ref={scrollRef as any}>
          {channelMessages.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-30" />
              Aucun message dans ce canal. Soyez le premier !
            </div>
          ) : (
            <div className="space-y-3">
              {channelMessages.map(msg => {
                const isOwn = msg.sender_id === currentUserId;
                return (
                  <div key={msg.id} className={cn("flex gap-3", isOwn && "flex-row-reverse")}>
                    {/* Avatar */}
                    <div className={cn(
                      "w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5",
                      isOwn ? "bg-emerald-500 text-white" : "bg-blue-100 text-blue-700"
                    )}>
                      {(msg.sender_name || "?")[0].toUpperCase()}
                    </div>
                    <div className={cn("max-w-[75%]", isOwn && "items-end flex flex-col")}>
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="text-xs font-semibold text-muted-foreground">
                          {isOwn ? "Vous" : msg.sender_name}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(msg.created_at), "HH:mm")}
                        </span>
                        {msg.is_pinned && <Pin className="w-2.5 h-2.5 text-amber-500" />}
                      </div>
                      <div className={cn(
                        "px-3 py-2 rounded-xl text-sm",
                        isOwn
                          ? "bg-emerald-600 text-white rounded-tr-sm"
                          : "bg-muted text-foreground rounded-tl-sm"
                      )}>
                        {msg.content}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>

        {/* Input */}
        <div className="px-4 py-3 border-t flex gap-2">
          <Input
            placeholder={`Message dans #${CHANNELS.find(c => c.id === activeChannel)?.label}...`}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1"
            disabled={sending}
          />
          <Button
            onClick={handleSend}
            disabled={!input.trim() || sending}
            size="icon"
            className="bg-emerald-600 hover:bg-emerald-700 shrink-0"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
