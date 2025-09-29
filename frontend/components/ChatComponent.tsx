// frontend/components/ChatComponent.tsx (Complete, Updated File)

'use client';
import { useState, useRef, useEffect } from 'react';
import { askQuestion } from '@/lib/api';
import { Send, LoaderCircle, User, Bot } from 'lucide-react';

interface Message {
  text: string;
  isUser: boolean;
}

export default function ChatComponent({ documentId }: { documentId: string }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<null | HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };
  useEffect(scrollToBottom, [messages]);

  const handleAsk = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    const userMessage: Message = { text: query, isUser: true };
    setMessages((prev) => [...prev, userMessage]);
    setQuery('');
    setIsLoading(true);

    try {
      const response = await askQuestion(documentId, query);
      const botMessage: Message = { text: response.data.answer, isUser: false };
      setMessages((prev) => [...prev, botMessage]);
    } catch (error) {
      const errorMessage: Message = { text: "Sorry, I couldn't get an answer. Please try again.", isUser: false };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[75vh] bg-slate-800 border border-slate-700 rounded-xl shadow-2xl">
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {messages.map((msg, index) => (
          <div key={index} className={`flex items-start gap-4 ${msg.isUser ? 'justify-end' : ''}`}>
            {!msg.isUser && (
              <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center flex-shrink-0">
                <Bot size={20} />
              </div>
            )}
            <div className={`max-w-md p-4 rounded-xl whitespace-pre-wrap ${msg.isUser ? 'bg-indigo-600 text-white rounded-br-none' : 'bg-slate-700 text-slate-200 rounded-bl-none'}`}>
              {msg.text}
            </div>
             {msg.isUser && (
              <div className="w-8 h-8 rounded-full bg-slate-600 flex items-center justify-center flex-shrink-0">
                <User size={20} />
              </div>
            )}
          </div>
        ))}
         {isLoading && (
          <div className="flex items-start gap-4">
            <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center flex-shrink-0">
              <Bot size={20} />
            </div>
            <div className="bg-slate-700 rounded-xl p-4">
              <LoaderCircle className="animate-spin" />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      <form onSubmit={handleAsk} className="border-t border-slate-700 p-4 flex items-center gap-4 bg-slate-800 rounded-b-xl">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Ask anything about your document..."
          className="flex-1 p-3 bg-slate-700 border border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
          disabled={isLoading}
        />
        <button type="submit" className="p-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-slate-600 transition-colors" disabled={isLoading}>
          <Send />
        </button>
      </form>
    </div>
  );
}