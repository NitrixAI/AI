export type Role = 'user' | 'assistant';

export interface Message {
  id: string;
  role: Role;
  content: string;
  imagePreview?: string; // Base64 for UI and API
  timestamp: number;
}

export interface ChatThread {
  id: string;
  title: string;
  messages: Message[];
  updatedAt: number;
}
