import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, X, Send } from "lucide-react";

import api from "../services/api";

interface ChatMessage {
  role: "user" | "bot";
  text: string;
}

export default function FloatingChatButton() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: "bot", text: "Hi! 👋 I'm your Interview Prep AI. Ask me about OOP, SQL, JavaScript, behavioral questions, and more!" },
  ]);
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;
    const userText = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", text: userText }]);
    setLoading(true);

    try {
      const res = await api.post("/chat", { message: userText });
      const reply = res.data?.data?.reply || "Sorry, I couldn't process that.";
      setMessages((prev) => [...prev, { role: "bot", text: reply }]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "bot", text: "Oops! Something went wrong. Try again." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Chat Panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: "spring", damping: 25, stiffness: 350 }}
            className="
              fixed bottom-24 right-6 z-50 w-[360px] max-h-[500px]
              rounded-2xl overflow-hidden
              bg-white dark:bg-[#1a1528]
              border border-brand-100/60 dark:border-brand-800/30
              shadow-card-hover flex flex-col
            "
          >
            {/* Header */}
            <div className="gradient-primary px-5 py-4 flex items-center justify-between">
              <div>
                <h4 className="text-white font-semibold text-sm">Interview Assistant</h4>
                <p className="text-white/70 text-xs mt-0.5">Ask me anything</p>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="p-1.5 rounded-lg hover:bg-white/20 transition-colors"
              >
                <X size={16} className="text-white" />
              </button>
            </div>

            {/* Messages */}
            <div
              ref={scrollRef}
              className="flex-1 overflow-y-auto px-4 py-4 space-y-3 max-h-[340px]"
            >
              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`
                      max-w-[80%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed
                      ${
                        msg.role === "user"
                          ? "gradient-primary text-white rounded-br-md"
                          : "bg-brand-50 dark:bg-brand-900/20 text-gray-700 dark:text-gray-300 rounded-bl-md"
                      }
                    `}
                  >
                    {msg.text}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="bg-brand-50 dark:bg-brand-900/20 px-4 py-3 rounded-2xl rounded-bl-md">
                    <div className="flex gap-1.5">
                      <div className="w-2 h-2 rounded-full bg-brand-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                      <div className="w-2 h-2 rounded-full bg-brand-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                      <div className="w-2 h-2 rounded-full bg-brand-400 animate-bounce" style={{ animationDelay: "300ms" }} />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Input */}
            <div className="border-t border-brand-100/40 dark:border-brand-800/20 px-4 py-3">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                  placeholder="Type a question..."
                  className="
                    flex-1 bg-brand-50 dark:bg-brand-900/20
                    text-sm text-gray-700 dark:text-gray-300
                    placeholder:text-gray-400
                    rounded-xl px-4 py-2.5 outline-none
                    focus:ring-2 focus:ring-brand-400/40
                    transition-all
                  "
                />
                <button
                  onClick={sendMessage}
                  disabled={!input.trim() || loading}
                  className="
                    w-10 h-10 rounded-xl gradient-primary
                    flex items-center justify-center
                    text-white shadow-lg
                    hover:shadow-glow/40 disabled:opacity-40
                    transition-all duration-200
                  "
                >
                  <Send size={16} />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* FAB */}
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setOpen((o) => !o)}
        className="
          fixed bottom-6 right-6 z-50
          w-14 h-14 rounded-full gradient-primary
          flex items-center justify-center text-white
          shadow-glow hover:shadow-glow
          transition-shadow duration-300
        "
      >
        <AnimatePresence mode="wait">
          {open ? (
            <motion.div key="close" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.15 }}>
              <X size={22} />
            </motion.div>
          ) : (
            <motion.div key="chat" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }} transition={{ duration: 0.15 }}>
              <MessageCircle size={22} />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>
    </>
  );
}
