"use client";

import { useEffect, useRef, useState } from "react";
import { MessageCircle, X, Send, Loader2, Bot, User } from "lucide-react";
import api from "@/lib/api";

interface Message {
  role: "user" | "model";
  text: string;
}

const SUGGESTED = [
  "How do I improve my resume?",
  "Tips for a tech interview",
  "How does job matching work?",
  "Negotiate my salary",
];

export function Chatbot() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [hasGreeted, setHasGreeted] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    if (open) {
      if (!hasGreeted) {
        setMessages([{
          role: "model",
          text: "Hi! I'm CareerBot 👋 I can help you with resume tips, interview prep, salary advice, and navigating CareerBuilder. What can I help you with today?",
        }]);
        setHasGreeted(true);
      }
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open, hasGreeted]);

  const sendMessage = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    const userMsg: Message = { role: "user", text: trimmed };
    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setInput("");
    setLoading(true);

    try {
      const { data: responseBody } = await api.post("/api/chat", {
        message: trimmed,
        history: nextMessages.slice(1, -1).map((m) => ({ role: m.role, text: m.text })),
      });
      const data = responseBody.data || responseBody;
      setMessages((prev) => [...prev, { role: "model", text: data.reply ?? responseBody.message ?? "Something went wrong." }]);
    } catch {
      setMessages((prev) => [...prev, { role: "model", text: "Unable to reach CareerBot. Make sure the backend is running." }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void sendMessage(input); }
  };

  return (
    <>
      {/* Chat window */}
      {open && (
        <div
          className="fixed inset-0 z-[60] md:inset-auto md:bottom-24 md:right-4 sm:right-6 md:z-50 w-full md:w-[350px] lg:w-[380px] h-[100dvh] md:h-[min(520px,calc(100vh-120px))] flex flex-col bg-white dark:bg-gray-900 md:rounded-2xl shadow-2xl md:border border-gray-200 dark:border-gray-700 overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-accent to-teal-400 shrink-0">
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
              <Bot className="w-4 h-4 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white font-bold text-sm leading-none">CareerBot</p>
              <p className="text-teal-100 text-xs mt-0.5">AI Career Assistant</p>
            </div>

            <button onClick={() => setOpen(false)} className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg hover:bg-white/20 transition-colors">
              <X className="w-5 h-5 text-white" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 scroll-smooth">
            {messages.map((msg, i) => (
              <div key={i} className={`flex gap-2 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}>
                <div className={`w-7 h-7 rounded-full shrink-0 flex items-center justify-center text-white text-xs font-bold mt-0.5 ${msg.role === "user" ? "bg-accent" : "bg-gray-700 dark:bg-gray-600"}`}>
                  {msg.role === "user" ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
                </div>
                <div className={`max-w-[78%] px-3 py-2 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${msg.role === "user" ? "bg-accent text-white rounded-tr-sm" : "bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-tl-sm"}`}>
                  {msg.text}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex gap-2 items-end">
                <div className="w-7 h-7 rounded-full bg-gray-700 dark:bg-gray-600 shrink-0 flex items-center justify-center">
                  <Bot className="w-3.5 h-3.5 text-white" />
                </div>
                <div className="bg-gray-100 dark:bg-gray-800 px-4 py-3 rounded-2xl rounded-tl-sm flex gap-1 items-center">
                  <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:0ms]" />
                  <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:150ms]" />
                  <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:300ms]" />
                </div>
              </div>
            )}

            {messages.length === 1 && !loading && (
              <div className="flex flex-col gap-2 pt-1">
                <p className="text-xs text-gray-400 dark:text-gray-500 font-medium px-1">Suggested</p>
                {SUGGESTED.map((s) => (
                  <button key={s} onClick={() => void sendMessage(s)}
                    className="text-left text-xs px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-accent hover:text-accent dark:hover:text-accent transition-colors bg-white dark:bg-gray-800">
                    {s}
                  </button>
                ))}
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="px-3 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] border-t border-gray-100 dark:border-gray-800 shrink-0 bg-white dark:bg-gray-900">
            <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-800 rounded-xl p-2 border border-gray-200 dark:border-gray-700 focus-within:border-accent transition-colors">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask me anything…"
                disabled={loading}
                className="flex-1 bg-transparent text-sm text-gray-800 dark:text-gray-200 placeholder-gray-400 outline-none disabled:opacity-50"
              />
              <button
                onClick={() => void sendMessage(input)}
                disabled={!input.trim() || loading}
                className="min-w-[44px] min-h-[44px] rounded-lg bg-accent hover:bg-accent-hover disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center transition-colors shrink-0"
              >
                {loading ? <Loader2 className="w-5 h-5 text-white animate-spin" /> : <Send className="w-5 h-5 text-white" />}
              </button>
            </div>
            <p className="text-center text-[10px] text-gray-400 dark:text-gray-600 mt-1.5">Powered by Groq AI</p>
          </div>
        </div>
      )}

      {/* Floating toggle button */}
      <button
        onClick={() => setOpen((v) => !v)}
        className={`fixed bottom-5 right-4 sm:right-6 z-50 w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all duration-300 hover:scale-110 active:scale-95 ${open ? "bg-gray-700 dark:bg-gray-600" : "bg-gradient-to-br from-accent to-teal-400 shadow-accent/40"}`}
        aria-label={open ? "Close chat" : "Open CareerBot"}
      >
        {open ? <X className="w-5 h-5 text-white" /> : <MessageCircle className="w-6 h-6 text-white" />}
        {!open && <span className="absolute inset-0 rounded-full bg-accent opacity-30 animate-ping" />}
      </button>
    </>
  );
}
