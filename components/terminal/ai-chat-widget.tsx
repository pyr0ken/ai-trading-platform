'use client';

import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { MessageSquare, Send, Bot, User, Loader2, Trash2, Sparkles, Download, Copy, Check } from 'lucide-react';
import { StructuredLLMOutput } from '@/types/terminal';
import { AppStorageEngine } from '@/lib/storage/app-db';

interface AIChatWidgetProps {
  symbol: string;
  analysisSummary?: StructuredLLMOutput | null;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

const getUniqueId = () => {
  return typeof window !== 'undefined' && window.crypto && window.crypto.randomUUID 
    ? window.crypto.randomUUID() 
    : Math.random().toString(36).substring(2, 15);
};

export const AIChatWidget: React.FC<AIChatWidgetProps> = ({ symbol, analysisSummary }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Restore chat history from local storage engine
  useEffect(() => {
    const stored = AppStorageEngine.getChats(symbol);
    if (stored && stored.length > 0) {
      queueMicrotask(() => {
        setMessages(stored.map((c) => ({ id: c.id, role: c.role, content: c.content })));
      });
    } else {
      queueMicrotask(() => {
        setMessages([
          {
            id: '1',
            role: 'assistant',
            content: `**AI Terminal Assistant**

Ask questions in **English** or **Persian (فارسی)** regarding ${symbol}'s trade setup, indicators, risk levels, or leverage bounds.`,
          },
        ]);
      });
    }
  }, [symbol]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const quickQuestions = [
    { en: `Why ${analysisSummary?.signal || 'BUY'}?`, fa: 'چرا سیگنال خرید/فروش است؟' },
    { en: 'Explain RSI & MACD', fa: 'تحلیل اندیکاتور RSI و MACD' },
    { en: 'Is 10x leverage safe?', fa: 'آیا استفاده از اهرم ۱۰x مناسب است؟' },
    { en: 'Stop loss & Invalidation?', fa: 'حد ضرر و نقطه ابطال کجاست؟' },
  ];

  const handleSend = async (questionText?: string) => {
    const q = (questionText || input).trim();
    if (!q || isLoading) return;

    const userMsg: Message = { id: getUniqueId(), role: 'user', content: q };
    setMessages((prev) => [...prev, userMsg]);
    AppStorageEngine.saveChat({
      id: userMsg.id,
      symbol,
      role: 'user',
      content: q,
      timestamp: new Date().toISOString(),
    });

    setInput('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: q,
          symbol,
          analysisSummary,
        }),
      });

      const data = await res.json();
      const botMsg: Message = {
        id: getUniqueId(),
        role: 'assistant',
        content: data.answer || 'No response returned.',
      };
      setMessages((prev) => [...prev, botMsg]);
      AppStorageEngine.saveChat({
        id: botMsg.id,
        symbol,
        role: 'assistant',
        content: botMsg.content,
        timestamp: new Date().toISOString(),
      });
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: getUniqueId(),
          role: 'assistant',
          content: 'Connection error to local LLM server.',
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearHistory = () => {
    AppStorageEngine.clearChats(symbol);
    setMessages([
      {
        id: getUniqueId(),
        role: 'assistant',
        content: `Chat history cleared. Ready for queries on **${symbol}**.`,
      },
    ]);
  };

  const handleExportChat = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(messages, null, 2));
    const link = document.createElement('a');
    link.setAttribute('href', dataStr);
    link.setAttribute('download', `Chat_${symbol.replace('/', '')}.json`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const handleCopyMessage = async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {}
  };

  return (
    <div className="bg-[#040406] border border-[#1c1d22] rounded-[10px] p-6 text-[#e2e3e9] flex flex-col h-[580px] relative">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#1c1d22] pb-3 shrink-0">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-[#cc9166]" />
          <span className="text-xs text-[#5e616e] font-normal tracking-wide uppercase">
            AI WORKSPACE • INTELLIGENCE ASSISTANT
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportChat}
            title="Export Conversation"
            className="p-1 rounded-[9999px] text-[#5e616e] hover:text-[#e2e3e9] hover:bg-[#121317] transition-all cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleClearHistory}
            title="Clear Chat History"
            className="p-1 rounded-[9999px] text-[#5e616e] hover:text-[#e2e3e9] hover:bg-[#121317] transition-all cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Quick Suggestion Chips */}
      <div className="flex flex-wrap gap-1.5 py-3 shrink-0">
        {quickQuestions.map((chip, idx) => (
          <button
            key={idx}
            onClick={() => handleSend(chip.en)}
            className="px-3 py-1 rounded-[9999px] bg-[#121317] hover:bg-[#1c1d22] border border-[#1c1d22] text-[11px] text-[#cc9166] transition-all cursor-pointer flex items-center gap-1 font-mono"
            dir="auto"
          >
            <Sparkles className="w-3 h-3 text-[#cc9166]" />
            <span>{chip.en}</span>
          </button>
        ))}
      </div>

      {/* Message List */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-1 my-2 font-sans scrollbar-thin">
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
                {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>

              {/* Message Bubble */}
              <div
                dir="auto"
                className={`relative p-3.5 rounded-[10px] max-w-[85%] leading-relaxed ${
                  isUser
                    ? 'bg-[#ffffff] text-[#08080a] font-medium'
                    : 'bg-[#121317] border border-[#1c1d22] text-[#e2e3e9]'
                }`}
              >
                {isUser ? (
                  <p className="whitespace-pre-wrap">{m.content}</p>
                ) : (
                  <div>
                    <div className="prose prose-invert max-w-none prose-headings:font-serif prose-headings:font-normal prose-headings:text-[#e2e3e9] prose-h3:text-xs prose-p:text-[#e2e3e9] prose-p:text-xs prose-p:leading-relaxed prose-li:text-xs prose-strong:text-[#cc9166] prose-code:text-[#cc9166] prose-code:bg-[#1c1d22] prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.content}</ReactMarkdown>
                    </div>
                    <button
                      onClick={() => handleCopyMessage(m.id, m.content)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity absolute top-2 right-2 p-1 rounded bg-[#08080a] border border-[#1c1d22] text-[#5e616e] hover:text-[#e2e3e9]"
                      title="Copy text"
                    >
                      {isCopied ? <Check className="w-3 h-3 text-[#cc9166]" /> : <Copy className="w-3 h-3" />}
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {isLoading && (
          <div className="flex items-center gap-2 text-xs text-[#9194a1] py-2 px-2 font-mono">
            <Loader2 className="w-4 h-4 animate-spin text-[#cc9166]" />
            <span dir="auto">Streaming response...</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Composer */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend();
        }}
        className="flex items-center gap-2 pt-3 border-t border-[#1c1d22] shrink-0"
      >
        <input
          type="text"
          dir="auto"
          placeholder="Ask a question in English or فارسی..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="flex-1 bg-[#121317] border border-[#1c1d22] focus:border-[#777a88] rounded-[9999px] px-4 py-2.5 text-xs text-[#e2e3e9] placeholder-[#777a88] focus:outline-none transition-all"
        />
        <button
          type="submit"
          disabled={isLoading || !input.trim()}
          className="w-9 h-9 rounded-[9999px] bg-[#ffffff] hover:bg-[#e2e3e9] text-[#08080a] flex items-center justify-center cursor-pointer disabled:opacity-40 shrink-0 transition-all"
        >
          <Send className="w-4 h-4 text-[#08080a]" />
        </button>
      </form>
    </div>
  );
};
