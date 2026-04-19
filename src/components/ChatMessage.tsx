import React from 'react';
import ReactMarkdown from 'react-markdown';
import { Message } from '../types';
import { cn } from '../lib/utils';
import { User, Bot } from 'lucide-react';

interface ChatMessageProps {
  message: Message;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({ message }) => {
  const isAssistant = message.role === 'assistant';

  return (
    <div
      className={cn(
        "flex w-full py-6 px-4 md:px-8 transition-opacity duration-300",
        isAssistant ? "bg-transparent" : "bg-transparent"
      )}
    >
      <div className={cn(
        "max-w-3xl mx-auto flex gap-4 md:gap-6 w-full items-start"
      )}>
        <div className={cn(
          "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5",
          isAssistant ? "bg-brand-primary text-white" : "bg-message-user text-gray-300 border border-border-subtle"
        )}>
          {isAssistant ? <Bot size={18} /> : <User size={18} />}
        </div>
        
        <div className="flex-1 min-w-0 flex flex-col">
          <div className="font-bold text-[13px] mb-1 text-gray-200">
            {isAssistant ? "Assistant" : "You"}
          </div>
          <div className="markdown-body">
            {message.imagePreview && (
              <div className="mb-4 rounded-xl overflow-hidden border border-white/10 max-w-sm">
                <img 
                  src={message.imagePreview} 
                  alt="Attachment" 
                  className="max-h-80 w-full object-contain bg-black/20"
                  loading="lazy"
                  referrerPolicy="no-referrer"
                />
              </div>
            )}
            <ReactMarkdown>{message.content}</ReactMarkdown>
          </div>
        </div>
      </div>
    </div>
  );
};
