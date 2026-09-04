export type ReflectionMode = 'reflect' | 'summarize' | 'brainstorm' | 'chat';

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  content: string;
  timestamp: string; // ISO string
  mode?: ReflectionMode;
}

export interface JournalEntry {
  id: string;
  userId: string;
  title: string;
  content: string;
  messages: ChatMessage[];
  mood?: 'reflective' | 'optimistic' | 'grateful' | 'anxious' | 'energized' | 'calm' | 'creative';
  tags?: string[];
  summary?: string;
  createdAt: string; // ISO string
  updatedAt: string; // ISO string
  isPinned?: boolean;
}

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  isAnonymous?: boolean;
}

export interface GenerateReflectionRequest {
  prompt: string;
  history?: Array<{ role: 'user' | 'model'; content: string }>;
  mode: ReflectionMode;
  entryContext?: {
    title?: string;
    content?: string;
    mood?: string;
  };
}

export interface GenerateReflectionResponse {
  reply: string;
  suggestedTitle?: string;
  summary?: string;
  suggestedMood?: string;
  modelUsed: string;
}
