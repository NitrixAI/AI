/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useRef, useEffect, useMemo } from 'react';
import { Message, ChatThread } from './types';
import { ChatMessage } from './components/ChatMessage';
import { ChatInput } from './components/ChatInput';
import { sendMessageStream } from './services/gemini';
import { Plus, Settings, MessageSquare, ShieldCheck, Bot } from 'lucide-react';
import { cn } from './lib/utils';

export default function App() {
  const [threads, setThreads] = useState<ChatThread[]>(() => {
    try {
      const saved = localStorage.getItem('chat_threads');
      if (saved) {
        const parsed = JSON.parse(saved);
        return Array.isArray(parsed) ? parsed : [];
      }
      return [];
    } catch {
      return [];
    }
  });

  const [activeThreadId, setActiveThreadId] = useState<string | null>(() => {
    return localStorage.getItem('active_thread_id') || null;
  });

  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Sync threads to localStorage
  useEffect(() => {
    localStorage.setItem('chat_threads', JSON.stringify(threads));
    if (activeThreadId) {
      localStorage.setItem('active_thread_id', activeThreadId);
    } else {
      localStorage.removeItem('active_thread_id');
    }
  }, [threads, activeThreadId]);

  const activeThread = useMemo(() => {
    return threads.find(t => t.id === activeThreadId) || null;
  }, [threads, activeThreadId]);

  const messages = activeThread?.messages || [];

  const scrollToBottom = (instant = false) => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ 
        behavior: instant ? 'auto' : 'smooth', 
        block: 'end' 
      });
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const startNewChat = () => {
    const newId = Date.now().toString();
    const newThread: ChatThread = {
      id: newId,
      title: 'New Chat',
      messages: [],
      updatedAt: Date.now()
    };
    setThreads(prev => [newThread, ...prev]);
    setActiveThreadId(newId);
  };

  const handleSendMessage = async (content: string, imagePreview?: string) => {
    let currentThreadId = activeThreadId;
    let currentThreads = [...threads];

    // Create a thread if none exists
    if (!currentThreadId) {
      const newId = Date.now().toString();
      const newThread: ChatThread = {
        id: newId,
        title: content.slice(0, 30) || 'New Chat',
        messages: [],
        updatedAt: Date.now()
      };
      currentThreads = [newThread, ...currentThreads];
      setThreads(currentThreads);
      setActiveThreadId(newId);
      currentThreadId = newId;
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content,
      imagePreview,
      timestamp: Date.now(),
    };

    // Update thread title if it's the first message
    const threadToUpdate = currentThreads.find(t => t.id === currentThreadId);
    if (threadToUpdate && threadToUpdate.messages.length === 0) {
      threadToUpdate.title = content.slice(0, 40) || 'Chat';
    }

    const updatedThreadsWithUser = currentThreads.map(t => 
      t.id === currentThreadId 
        ? { ...t, messages: [...t.messages, userMessage], updatedAt: Date.now() }
        : t
    );

    setThreads(updatedThreadsWithUser);
    setIsLoading(true);

    const assistantMessageId = (Date.now() + 1).toString();
    const assistantMessage: Message = {
      id: assistantMessageId,
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
    };

    setThreads(prev => prev.map(t => 
      t.id === currentThreadId
        ? { ...t, messages: [...t.messages, assistantMessage] }
        : t
    ));

    try {
      let fullContent = '';
      const threadMessages = updatedThreadsWithUser.find(t => t.id === currentThreadId)?.messages || [];
      
      for await (const chunk of sendMessageStream(threadMessages)) {
        fullContent += chunk;
        setThreads(prev => 
          prev.map(t => 
            t.id === currentThreadId 
              ? {
                  ...t,
                  messages: t.messages.map(msg => 
                    msg.id === assistantMessageId ? { ...msg, content: fullContent } : msg
                  )
                }
              : t
          )
        );
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-screen bg-chat-bg text-gray-100 overflow-hidden">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-64 bg-sidebar-bg flex-col border-r border-border-subtle">
        <div className="p-4">
          <button 
            onClick={startNewChat}
            className="w-full flex items-center justify-center gap-3 px-4 py-2.5 bg-sidebar-bg border border-border-subtle hover:bg-white/5 rounded-lg transition-colors text-sm font-medium"
          >
            <Plus size={16} />
            New Chat
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1 scrollbar-thin scrollbar-thumb-white/10">
          <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest px-3 py-2 mt-2 mb-1">
            Recent
          </div>
          {threads.length === 0 && (
            <div className="px-3 py-2 text-xs text-gray-600 italic">No threads yet</div>
          )}
          {threads.map(thread => (
            <button 
              key={thread.id}
              onClick={() => {
                setActiveThreadId(thread.id);
                setTimeout(() => scrollToBottom(true), 10);
              }}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2 group rounded-lg text-sm transition-colors text-left truncate group relative",
                activeThreadId === thread.id ? "bg-white/10 text-white" : "text-gray-400 hover:bg-white/5"
              )}
            >
              <MessageSquare size={14} className={cn("shrink-0", activeThreadId === thread.id ? "text-brand-primary" : "text-gray-600")} />
              <span className="truncate flex-1">{thread.title}</span>
            </button>
          ))}
        </div>

        <div className="p-4 space-y-1">
          <button className="w-full flex items-center gap-3 px-3 py-2 hover:bg-white/5 rounded-lg transition-colors text-xs text-gray-400">
            <ShieldCheck size={14} className="text-gray-600" />
            Security
          </button>
          <button className="w-full flex items-center gap-3 px-3 py-2 hover:bg-white/5 rounded-lg transition-colors text-xs text-gray-400">
            <Settings size={14} className="text-gray-600" />
            Settings
          </button>
        </div>
      </aside>

      {/* Main Chat Area */}
      <main className="flex-1 flex flex-col relative overflow-hidden">
        {/* Header */}
        <header className="h-14 flex items-center px-4 justify-between bg-chat-bg/80 backdrop-blur-md sticky top-0 z-10 border-b border-border-subtle/30">
          <div className="flex items-center gap-2">
            <div className="md:hidden">
              <button 
                onClick={startNewChat}
                className="p-2 hover:bg-white/5 rounded-lg transition-colors text-gray-400"
              >
                <Plus size={20} />
              </button>
            </div>
            <h2 className="font-semibold text-sm text-gray-200">
              {activeThread ? activeThread.title : 'ChatGPT Clean'}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-brand-primary" />
            <span className="text-[10px] font-medium text-gray-500 uppercase tracking-tight">Lite v1.0</span>
          </div>
        </header>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto scroll-smooth pb-32">
          {!activeThread || activeThread.messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center p-8 max-w-2xl mx-auto text-center animate-in fade-in duration-500">
              <div className="w-12 h-12 bg-white/5 border border-border-subtle text-gray-500 rounded-xl flex items-center justify-center mb-6">
                <Bot size={24} />
              </div>
              <h1 className="text-2xl font-semibold mb-6 tracking-tight text-white">How can I help you?</h1>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-xl">
                {[
                  "Explain quantum computing",
                  "Write a poem about rain",
                  "Tips for exam prep",
                  "Basic accounting concepts"
                ].map((suggestion, i) => (
                  <button
                    key={i}
                    onClick={() => handleSendMessage(suggestion)}
                    className="p-3 bg-transparent border border-border-subtle hover:bg-white/5 rounded-xl text-left text-xs transition-colors text-gray-400"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex flex-col w-full">
              {activeThread.messages.map((message) => (
                <ChatMessage key={message.id} message={message} />
              ))}
              {isLoading && messages.length > 0 && messages[messages.length - 1].content === '' && (
                <div className="flex w-full py-6 px-4 md:px-8">
                  <div className="max-w-3xl mx-auto flex gap-4 md:gap-6 w-full">
                    <div className="w-8 h-8 rounded-lg bg-white/10 border border-border-subtle text-gray-500 flex items-center justify-center shrink-0">
                      <Bot size={18} />
                    </div>
                    <div className="flex gap-1.5 items-center mt-2">
                      <div className="w-1.5 h-1.5 bg-gray-600 rounded-full animate-pulse" />
                      <div className="w-1.5 h-1.5 bg-gray-600 rounded-full animate-pulse delay-75" />
                      <div className="w-1.5 h-1.5 bg-gray-600 rounded-full animate-pulse delay-150" />
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} className="h-4" />
            </div>
          )}
        </div>

        {/* Input area */}
        <div className="absolute bottom-0 left-0 w-full bg-gradient-to-t from-chat-bg via-chat-bg to-transparent pb-6 pt-12 px-4">
          <ChatInput onSendMessage={handleSendMessage} isLoading={isLoading} />
        </div>
      </main>
    </div>
  );
}
