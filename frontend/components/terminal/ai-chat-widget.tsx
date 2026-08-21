/* eslint-disable react-hooks/purity */
'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  MessageSquare,
  Send,
  Sparkles,
  Bot,
  User,
  Copy,
  Check,
  RotateCcw,
  Zap,
} from 'lucide-react';
import { StructuredLLMOutput } from '@/types/terminal';
import { AppStorageEngine, StoredChatMessage } from '@/lib/storage/app-db';

interface AIChatWidgetProps {
  symbol: string;
  analysisSummary?: StructuredLLMOutput | null;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

export const AIChatWidget: React.FC<AIChatWidgetProps> = ({ symbol, analysisSummary }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // Load chat history from SQLite / LocalStorage
  useEffect(() => {
    const updateMessages = (stored = AppStorageEngine.getChats(symbol)) => {
      if (stored && stored.length > 0) {
        setMessages(stored.map((c) => ({ id: c.id, role: c.role, content: c.content })));
      } else {
        setMessages([
          {
            id: '1',
            role: 'assistant',
            content: `**AI Terminal Assistant**\n\nAsk questions in **English** or **Persian (فارسی)** regarding ${symbol}'s trade setup, indicators, risk levels, or leverage bounds.`,
          },
        ]);
      }
    };

    updateMessages();
    AppStorageEngine.fetchChatsFromDb(symbol).then((chats) => {
      updateMessages(chats);
    });

    window.addEventListener('storage', () => updateMessages());
    window.addEventListener('app-storage-updated', () => updateMessages());
    return () => {
      window.removeEventListener('storage', () => updateMessages());
      window.removeEventListener('app-storage-updated', () => updateMessages());
    };
  }, [symbol]);

  // Scroll ONLY inside the chat container (never scroll the main window page!)
  const scrollToBottom = useCallback(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading, scrollToBottom]);

  const quickQuestions = useMemo(
    () => [
      { en: `Why ${analysisSummary?.signal || 'BUY'}?`, fa: 'چرا سیگنال خرید/فروش است؟' },
      { en: 'Explain RSI & MACD', fa: 'تحلیل اندیکاتور RSI و MACD' },
      { en: 'Is 10x leverage safe?', fa: 'آیا استفاده از اهرم ۱۰x مناسب است؟' },
      { en: 'Stop loss & Invalidation?', fa: 'حد ضرر و نقطه ابطال کجاست؟' },
    ],
    [analysisSummary?.signal]
  );

  const handleSend = async (questionText?: string) => {
    const q = (questionText || input).trim();
    if (!q || isLoading) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: q,
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!questionText) setInput('');
    setIsLoading(true);

    // Save to persistent storage
    AppStorageEngine.saveChat({
      id: userMsg.id,
      symbol,
      role: 'user',
      content: q,
      timestamp: new Date().toISOString(),
    });

    try {
      // Model selected in Terminal Settings — send it so the chat uses the
      // same engine the trader chose (route falls back to env/default).
      const selectedModel = AppStorageEngine.getSession().llmModel?.trim() || undefined;

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbol,
          question: q,
          analysisSummary,
          ...(selectedModel ? { model: selectedModel } : {}),
        }),
      });

      if (!response.ok) {
        throw new Error('Chat API returned ' + response.status);
      }

      const data = await response.json();
      const assistantContent = data.answer || 'No response generated.';

      const assistantMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: assistantContent,
      };

      setMessages((prev) => [...prev, assistantMsg]);
      AppStorageEngine.saveChat({
        id: assistantMsg.id,
        symbol,
        role: 'assistant',
        content: assistantContent,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      console.error('[AIChatWidget] Error sending chat message:', err);
      const errorMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: '⚠️ Failed to connect to AI assistant. Please retry.',
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearHistory = () => {
    AppStorageEngine.clearChats(symbol);
    setMessages([
      {
        id: Date.now().toString(),
        role: 'assistant',
        content: `Chat history cleared for ${symbol}. Ask another question!`,
      },
    ]);
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="bg-[#040406] border border-[#1c1d22] rounded-[10px] p-4 md:p-6 text-[#e2e3e9] flex flex-col h-[480px] shadow-xl space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#1c1d22] pb-3 shrink-0">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-[#cc9166]" />
          <span className="eyebrow-copper">AI QUANT ASSISTANT ({symbol})</span>
        </div>

        <button
          onClick={handleClearHistory}
          className="flex items-center gap-1 text-[11px] text-[#5e616e] hover:text-rose-400 font-mono transition-colors cursor-pointer"
          title="Clear Chat History"
        >
          <RotateCcw className="w-3 h-3" />
          <span>Clear</span>
        </button>
      </div>

      {/* Quick Question Chips */}
      <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar pb-1 shrink-0">
        {quickQuestions.map((chip, idx) => (
          <button
            key={idx}
            onClick={() => handleSend(chip.en)}
            className="px-3 py-1 rounded-[9999px] bg-[#121317] hover:bg-[#1c1d22] border border-[#1c1d22] text-[11px] text-[#cc9166] transition-all cursor-pointer flex items-center gap-1 font-mono shrink-0"
            dir="auto"
          >
            <Sparkles className="w-3 h-3 text-[#cc9166]" />
            <span>{chip.en}</span>
          </button>
        ))}
      </div>

      {/* Message List — Scroll container */}
      <div
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto space-y-4 pr-1 my-2 font-sans custom-scrollbar"
      >
        {messages.map((m) => {
          const isUser = m.role === 'user';
          const isCopied = copiedId === m.id;

          return (
            <div
              key={m.id}
              className={`group flex items-start gap-2.5 text-xs ${
                isUser ? 'flex-row-reverse' : 'flex-row'
              }`}
            >
              {/* Avatar Icon */}
              <div
                className={`w-7 h-7 rounded-[9999px] flex items-center justify-center shrink-0 mt-0.5 ${
                  isUser
                    ? 'bg-[#ffffff] text-[#08080a]'
                    : 'bg-[#121317] border border-[#cc9166] text-[#cc9166]'
                }`}
              >
                {isUser ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
              </div>

              {/* Message Bubble */}
              <div
                className={`max-w-[85%] rounded-[10px] p-3.5 relative ${
                  isUser
                    ? 'bg-[#1c1d22] text-[#ffffff] border border-[#777a88]/30 font-sans'
                    : 'bg-[#08080a] border border-[#1c1d22] text-[#e2e3e9] font-sans'
                }`}
              >
                <div className="prose prose-invert max-w-none text-xs leading-relaxed prose-p:my-1 prose-headings:text-[#ffffff] prose-strong:text-[#cc9166] prose-code:text-[#cc9166] prose-code:bg-[#121317] prose-code:px-1 prose-code:py-0.5 prose-code:rounded">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.content}</ReactMarkdown>
                </div>

                {/* Copy action for assistant messages */}
                {!isUser && (
                  <button
                    onClick={() => handleCopy(m.id, m.content)}
                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-[#121317] text-[#5e616e] hover:text-[#e2e3e9] transition-all"
                    title="Copy response"
                  >
                    {isCopied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  </button>
                )}
              </div>
            </div>
          );
        })}

        {isLoading && (
          <div className="flex items-center gap-2 text-xs text-[#cc9166] font-mono p-2">
            <Zap className="w-4 h-4 animate-spin text-[#cc9166]" />
            <span>AI Quant Assistant is reasoning...</span>
          </div>
        )}
      </div>

      {/* Input Box */}
      <div className="flex items-center gap-2 pt-2 border-t border-[#1c1d22] shrink-0">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder={`Ask about ${symbol}'s setup or indicators (English / فارسی)...`}
          disabled={isLoading}
          className="flex-1 bg-[#121317] border border-[#1c1d22] focus:border-[#cc9166] text-[#e2e3e9] placeholder-[#5e616e] px-3.5 py-2 text-xs rounded-[8px] outline-none font-sans transition-colors"
        />
        <button
          onClick={() => handleSend()}
          disabled={!input.trim() || isLoading}
          className="p-2 bg-[#cc9166] hover:bg-[#d6a27e] text-[#08080a] rounded-[8px] transition-colors cursor-pointer disabled:opacity-40 shrink-0"
          title="Send Question"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
