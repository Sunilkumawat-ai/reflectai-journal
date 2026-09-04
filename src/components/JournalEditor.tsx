import React, { useState, useEffect, useRef } from 'react';
import Markdown from 'react-markdown';
import { motion } from 'motion/react';
import { 
  Sparkles, 
  Send, 
  Save, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  Trash2, 
  Pin, 
  Bot, 
  User as UserIcon, 
  Copy, 
  Check, 
  Lightbulb, 
  ListTree, 
  Compass, 
  Smile,
  Clock,
  ArrowDown,
  MessageSquare
} from 'lucide-react';
import { JournalEntry, ChatMessage, ReflectionMode } from '../types';

interface JournalEditorProps {
  entry: JournalEntry;
  onSave: (entry: JournalEntry) => Promise<void>;
  onDelete: (entryId: string) => Promise<void>;
  isSaving: boolean;
  saveError: string | null;
  onClearSaveError: () => void;
}

const MOODS: Array<{ id: JournalEntry['mood']; label: string; emoji: string }> = [
  { id: 'reflective', label: 'Reflective', emoji: '🪞' },
  { id: 'calm', label: 'Calm', emoji: '🍃' },
  { id: 'grateful', label: 'Grateful', emoji: '✨' },
  { id: 'optimistic', label: 'Optimistic', emoji: '🌅' },
  { id: 'energized', label: 'Energized', emoji: '⚡' },
  { id: 'creative', label: 'Creative', emoji: '🎨' },
  { id: 'anxious', label: 'Anxious / Processing', emoji: '🌧️' },
];

export const JournalEditor: React.FC<JournalEditorProps> = ({
  entry,
  onSave,
  onDelete,
  isSaving,
  saveError,
  onClearSaveError,
}) => {
  const [currentEntry, setCurrentEntry] = useState<JournalEntry>(entry);
  const [activeMode, setActiveMode] = useState<ReflectionMode>('reflect');
  const [followUpPrompt, setFollowUpPrompt] = useState<string>('');
  const [isAiLoading, setIsAiLoading] = useState<boolean>(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<boolean>(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState<boolean>(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastFailedActionRef = useRef<{ mode: ReflectionMode; customText?: string } | null>(null);

  // Sync state when entry prop changes (e.g. user selected different entry from history)
  useEffect(() => {
    setCurrentEntry(entry);
    setHasUnsavedChanges(false);
    setAiError(null);
    lastFailedActionRef.current = null;
  }, [entry.id]);

  // Auto-scroll to bottom of conversation when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentEntry.messages, isAiLoading]);

  // Trigger debounced auto-save on title / content / mood change
  const triggerDebouncedSave = (updated: JournalEntry) => {
    setCurrentEntry(updated);
    setHasUnsavedChanges(true);

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = setTimeout(async () => {
      try {
        await onSave(updated);
        setHasUnsavedChanges(false);
      } catch (err) {
        console.error('Debounced save error:', err);
      }
    }, 1500);
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const updated: JournalEntry = {
      ...currentEntry,
      title: e.target.value,
      updatedAt: new Date().toISOString(),
    };
    triggerDebouncedSave(updated);
  };

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const updated: JournalEntry = {
      ...currentEntry,
      content: e.target.value,
      updatedAt: new Date().toISOString(),
    };
    triggerDebouncedSave(updated);
  };

  const handleMoodSelect = (mood: JournalEntry['mood']) => {
    const updated: JournalEntry = {
      ...currentEntry,
      mood,
      updatedAt: new Date().toISOString(),
    };
    triggerDebouncedSave(updated);
  };

  const handlePinToggle = async () => {
    const updated: JournalEntry = {
      ...currentEntry,
      isPinned: !currentEntry.isPinned,
      updatedAt: new Date().toISOString(),
    };
    setCurrentEntry(updated);
    await onSave(updated);
  };

  const handleManualSave = async () => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    await onSave(currentEntry);
    setHasUnsavedChanges(false);
  };

  // Submit reflection to Gemini API via backend proxy
  const executeGeminiReflection = async (
    mode: ReflectionMode,
    customText?: string,
    isRetry = false
  ) => {
    const textToSend = customText || followUpPrompt.trim() || currentEntry.content.trim();
    if (!textToSend && currentEntry.messages.length === 0) {
      setAiError('Please write your journal entry or enter a question first.');
      return;
    }

    setAiError(null);
    setIsAiLoading(true);

    let updatedMessagesWithUser = currentEntry.messages;
    if (!isRetry) {
      // Add user message to conversation
      const userMsg: ChatMessage = {
        id: 'msg-' + Date.now() + '-user',
        role: 'user',
        content: textToSend,
        timestamp: new Date().toISOString(),
        mode,
      };

      updatedMessagesWithUser = [...currentEntry.messages, userMsg];
      const interimEntry: JournalEntry = {
        ...currentEntry,
        messages: updatedMessagesWithUser,
        updatedAt: new Date().toISOString(),
      };
      setCurrentEntry(interimEntry);
      setFollowUpPrompt('');
    }

    try {
      // Build conversation history excluding current prompt
      const historyPayload = updatedMessagesWithUser.slice(0, -1).map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const res = await fetch('/api/gemini/reflect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: textToSend,
          history: historyPayload,
          mode,
          entryContext: {
            title: currentEntry.title,
            content: currentEntry.content,
            mood: currentEntry.mood,
          },
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Server responded with status ${res.status}`);
      }

      const data = await res.json();

      const modelMsg: ChatMessage = {
        id: 'msg-' + Date.now() + '-model',
        role: 'model',
        content: data.reply,
        timestamp: new Date().toISOString(),
        mode,
      };

      const finalMessages = [...updatedMessagesWithUser, modelMsg];
      const finalEntry: JournalEntry = {
        ...currentEntry,
        title:
          currentEntry.title === 'Untitled Reflection' && data.suggestedTitle
            ? data.suggestedTitle
            : currentEntry.title,
        summary: mode === 'summarize' ? data.reply : currentEntry.summary,
        messages: finalMessages,
        updatedAt: new Date().toISOString(),
      };

      setCurrentEntry(finalEntry);
      await onSave(finalEntry);
      setHasUnsavedChanges(false);
      lastFailedActionRef.current = null;
    } catch (err: any) {
      console.error('Gemini Reflection error:', err);
      lastFailedActionRef.current = { mode, customText: textToSend };
      setAiError(err.message || 'Failed to generate reflection with Gemini. Please try again.');
    } finally {
      setIsAiLoading(false);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedMessageId(id);
    setTimeout(() => setCopiedMessageId(null), 2000);
  };

  return (
    <motion.div
      key={currentEntry.id}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className="flex-1 flex flex-col h-full bg-stone-900 overflow-y-auto"
    >
      
      {/* Editor Header / Meta bar */}
      <div className="border-b border-stone-800/80 bg-stone-950/70 p-5 sm:px-8 sm:py-6 sticky top-0 z-10 backdrop-blur-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          
          {/* Title Input */}
          <div className="flex-1">
            <input
              id="entry-title-input"
              type="text"
              value={currentEntry.title}
              onChange={handleTitleChange}
              placeholder="Title of this reflection..."
              className="w-full bg-transparent font-serif text-2xl sm:text-3xl font-semibold text-stone-100 placeholder-stone-600 focus:outline-hidden focus:ring-0 border-none px-0 tracking-tight"
            />
            <div className="flex items-center space-x-3 text-xs text-stone-400 mt-1.5 font-sans">
              <span className="flex items-center space-x-1.5">
                <Clock className="w-3.5 h-3.5 text-stone-500" />
                <span>
                  {new Date(currentEntry.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} &bull; {new Date(currentEntry.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                </span>
              </span>
              <span className="text-stone-600">&bull;</span>
              <span className="font-mono text-stone-400">{currentEntry.content.split(/\s+/).filter(Boolean).length} words</span>
            </div>
          </div>

          {/* Controls: Pin, Save Status, Delete */}
          <div className="flex items-center space-x-2 shrink-0">
            
            {/* Save Status Pill */}
            <div className="mr-1">
              {isSaving ? (
                <span className="flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-[#50207A]/40 text-[#D6B9FC] border border-[#D6B9FC]/30 shadow-xs">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#838CE5]" />
                  <span>Saving...</span>
                </span>
              ) : saveError ? (
                <button
                  onClick={handleManualSave}
                  className="flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-rose-950/80 text-rose-300 border border-rose-800 hover:bg-rose-900 transition-colors cursor-pointer shadow-xs"
                  title={saveError}
                >
                  <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
                  <span>Save Failed (Retry)</span>
                </button>
              ) : (
                <span className="flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-emerald-950/60 text-emerald-300 border border-emerald-800/60 shadow-xs">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Saved to Firestore</span>
                </span>
              )}
            </div>

            {/* Pin Toggle */}
            <button
              id="entry-pin-btn"
              onClick={handlePinToggle}
              className={`p-2.5 rounded-xl border transition-all cursor-pointer ${
                currentEntry.isPinned
                  ? 'bg-[#50207A]/50 border-[#838CE5]/60 text-[#D6B9FC] shadow-xs'
                  : 'bg-stone-800/70 border-stone-700/70 text-stone-400 hover:text-stone-200 hover:bg-stone-800'
              }`}
              title={currentEntry.isPinned ? 'Unpin Reflection' : 'Pin Reflection'}
            >
              <Pin className="w-4 h-4" />
            </button>

            {/* Manual Save Button */}
            <button
              id="entry-manual-save-btn"
              onClick={handleManualSave}
              disabled={isSaving}
              className="p-2.5 rounded-xl bg-stone-800/90 hover:bg-stone-700 border border-stone-700/80 text-stone-200 hover:text-white transition-all cursor-pointer disabled:opacity-50 shadow-xs"
              title="Manual Save"
            >
              <Save className="w-4 h-4" />
            </button>

            {/* Delete Button */}
            <button
              id="entry-delete-btn"
              onClick={() => setShowDeleteConfirm(true)}
              className="p-2.5 rounded-xl bg-stone-800/60 hover:bg-rose-950/70 border border-stone-700/60 hover:border-rose-800/80 text-stone-400 hover:text-rose-300 transition-all cursor-pointer shadow-xs"
              title="Delete Reflection"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>

        </div>

        {/* Mood Selector Pills with Enhanced Visual Distinction & Breathing Space */}
        <div className="mt-5 pt-4 border-t border-stone-800/60 flex items-center space-x-2 overflow-x-auto pb-1 scrollbar-none">
          <span className="text-xs font-semibold uppercase tracking-wider text-stone-400 flex items-center space-x-1.5 pr-2">
            <Smile className="w-3.5 h-3.5 text-[#838CE5]" />
            <span>Mood:</span>
          </span>
          {MOODS.map((m) => {
            const isSelected = currentEntry.mood === m.id;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => handleMoodSelect(m.id)}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-xs transition-all cursor-pointer shrink-0 ${
                  isSelected
                    ? 'bg-[#838CE5] text-[#150a24] font-bold shadow-md shadow-[#838CE5]/25 ring-2 ring-[#838CE5]/50 border border-[#838CE5] scale-[1.02]'
                    : 'bg-stone-900/80 border border-stone-800 text-stone-300 hover:text-stone-100 hover:bg-stone-800/90 hover:border-[#D6B9FC]/30'
                }`}
              >
                <span className="text-sm">{m.emoji}</span>
                <span>{m.label}</span>
                {isSelected && (
                  <Check className="w-3 h-3 text-[#150a24] stroke-[2.5] ml-0.5" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Workspace Body with Generous Section Spacing */}
      <div className="p-5 sm:p-8 space-y-8 max-w-4xl w-full mx-auto flex-1">
        
        {/* Journal Text Entry Canvas */}
        <div className="bg-stone-950/70 border border-stone-800/90 rounded-2xl p-6 sm:p-7 focus-within:border-[#838CE5]/60 focus-within:ring-2 focus-within:ring-[#838CE5]/20 transition-all shadow-xl">
          <label htmlFor="journal-textarea" className="block text-xs font-semibold uppercase tracking-wider text-[#D6B9FC] mb-3 flex items-center space-x-1.5 font-sans">
            <span>Your Reflection & Journal Entry</span>
          </label>
          <textarea
            id="journal-textarea"
            rows={8}
            value={currentEntry.content}
            onChange={handleContentChange}
            placeholder="What is on your mind today? Write freely—about challenges, achievements, dilemmas, gratitude, or quiet thoughts..."
            className="w-full bg-transparent text-stone-100 placeholder-stone-600 text-base sm:text-[17px] leading-relaxed border-none focus:outline-hidden focus:ring-0 resize-y"
          />

          {/* Quick Action Cards to Consult Gemini AI */}
          <div className="mt-6 pt-5 border-t border-stone-800/80 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-5 h-5 rounded-lg bg-[#50207A]/50 border border-[#838CE5]/40 flex items-center justify-center text-[#D6B9FC]">
                  <Sparkles className="w-3 h-3 text-[#838CE5]" />
                </div>
                <span className="text-xs font-semibold uppercase tracking-wider text-stone-300 font-sans">
                  Ask Gemini AI
                </span>
              </div>
              <span className="text-[11px] text-stone-500 font-mono hidden sm:inline">
                Select an intention to guide the reflection
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full">
              {/* Deep Reflection Card */}
              <button
                id="gemini-deep-reflect-btn"
                type="button"
                onClick={() => {
                  setActiveMode('reflect');
                  executeGeminiReflection('reflect');
                }}
                disabled={isAiLoading || !currentEntry.content.trim()}
                className="group relative text-left p-3.5 rounded-xl bg-stone-900/80 hover:bg-stone-900 border border-stone-800 hover:border-[#838CE5]/60 transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-xs hover:shadow-md hover:shadow-[#838CE5]/10 flex items-start space-x-3"
              >
                <div className="w-9 h-9 rounded-xl bg-[#50207A]/50 group-hover:bg-[#50207A]/70 border border-[#838CE5]/40 group-hover:border-[#838CE5]/70 flex items-center justify-center text-[#D6B9FC] shrink-0 transition-colors shadow-xs">
                  <Compass className="w-4 h-4 text-[#838CE5]" />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="block text-xs font-semibold text-stone-100 group-hover:text-[#D6B9FC] transition-colors">
                    Deep Reflection
                  </span>
                  <span className="block text-[11px] text-stone-400 group-hover:text-stone-300 leading-tight mt-0.5">
                    Unpack emotions, beliefs & perspectives
                  </span>
                </div>
              </button>

              {/* Summarize Takeaways Card */}
              <button
                id="gemini-summarize-btn"
                type="button"
                onClick={() => {
                  setActiveMode('summarize');
                  executeGeminiReflection('summarize');
                }}
                disabled={isAiLoading || !currentEntry.content.trim()}
                className="group relative text-left p-3.5 rounded-xl bg-stone-900/80 hover:bg-stone-900 border border-stone-800 hover:border-[#838CE5]/60 transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-xs hover:shadow-md hover:shadow-[#838CE5]/10 flex items-start space-x-3"
              >
                <div className="w-9 h-9 rounded-xl bg-[#838CE5]/20 group-hover:bg-[#838CE5]/30 border border-[#838CE5]/40 group-hover:border-[#838CE5]/70 flex items-center justify-center text-[#838CE5] shrink-0 transition-colors shadow-xs">
                  <ListTree className="w-4 h-4 text-[#838CE5]" />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="block text-xs font-semibold text-stone-100 group-hover:text-[#838CE5] transition-colors">
                    Summarize Takeaways
                  </span>
                  <span className="block text-[11px] text-stone-400 group-hover:text-stone-300 leading-tight mt-0.5">
                    Synthesize core themes & key insights
                  </span>
                </div>
              </button>

              {/* Brainstorm Next Steps Card */}
              <button
                id="gemini-brainstorm-btn"
                type="button"
                onClick={() => {
                  setActiveMode('brainstorm');
                  executeGeminiReflection('brainstorm');
                }}
                disabled={isAiLoading || !currentEntry.content.trim()}
                className="group relative text-left p-3.5 rounded-xl bg-stone-900/80 hover:bg-stone-900 border border-stone-800 hover:border-[#D6B9FC]/60 transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-xs hover:shadow-md hover:shadow-[#D6B9FC]/10 flex items-start space-x-3"
              >
                <div className="w-9 h-9 rounded-xl bg-[#D6B9FC]/15 group-hover:bg-[#D6B9FC]/25 border border-[#D6B9FC]/35 group-hover:border-[#D6B9FC]/65 flex items-center justify-center text-[#D6B9FC] shrink-0 transition-colors shadow-xs">
                  <Lightbulb className="w-4 h-4 text-[#D6B9FC]" />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="block text-xs font-semibold text-stone-100 group-hover:text-[#D6B9FC] transition-colors">
                    Brainstorm Next Steps
                  </span>
                  <span className="block text-[11px] text-stone-400 group-hover:text-stone-300 leading-tight mt-0.5">
                    Practical actions & mindful suggestions
                  </span>
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* AI Error Notification */}
        {aiError && (
          <div className="p-4 rounded-xl bg-rose-950/80 border border-rose-800 text-rose-200 text-xs flex items-start space-x-3 shadow-md">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold text-rose-300">Reflection Error</p>
              <p className="mt-1 leading-relaxed">{aiError}</p>
            </div>
            <div className="flex items-center space-x-2 shrink-0">
              {lastFailedActionRef.current && (
                <button
                  type="button"
                  onClick={() => {
                    if (lastFailedActionRef.current) {
                      executeGeminiReflection(
                        lastFailedActionRef.current.mode,
                        lastFailedActionRef.current.customText,
                        true
                      );
                    }
                  }}
                  disabled={isAiLoading}
                  className="px-3 py-1 rounded-lg bg-[#838CE5] hover:bg-[#737ddb] active:bg-[#646fcb] text-[#150a24] font-bold text-xs transition-colors cursor-pointer disabled:opacity-50"
                >
                  Retry
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  setAiError(null);
                  lastFailedActionRef.current = null;
                }}
                className="text-stone-400 hover:text-stone-200 text-xs underline cursor-pointer"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        {/* Multi-Turn Conversation Thread with Distinct Visual Rhythms */}
        <div className="space-y-5 pt-4">
          <div className="flex items-center justify-between">
            <h3 className="font-serif text-base font-semibold text-stone-100 flex items-center space-x-2.5">
              <Sparkles className="w-4 h-4 text-[#838CE5]" />
              <span>Multi-Turn Dialogue & AI Reflections</span>
              <span className="px-2 py-0.5 rounded-full bg-[#50207A]/40 text-[#D6B9FC] font-mono text-[11px] border border-[#D6B9FC]/30">
                {currentEntry.messages.length}
              </span>
            </h3>
            {currentEntry.messages.length > 0 && (
              <span className="text-xs text-stone-400 font-mono hidden sm:inline">
                Secured in Firestore
              </span>
            )}
          </div>

          {currentEntry.messages.length === 0 ? (
            <div className="p-8 text-center rounded-2xl bg-stone-950/30 border border-dashed border-stone-800 text-stone-500 text-xs">
              <Sparkles className="w-6 h-6 mx-auto mb-2 text-[#838CE5]/40" />
              <p className="text-stone-300 font-medium">No reflections generated yet.</p>
              <p className="mt-1 text-stone-400">Write your thoughts above and click "Deep Reflection", "Summarize Takeaways", or "Brainstorm Next Steps" to converse with Gemini 3.6 Flash.</p>
            </div>
          ) : (
            <div className="space-y-5">
              {currentEntry.messages.map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 12, scale: 0.995 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.35, ease: 'easeOut' }}
                  className={`w-full flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {msg.role === 'user' ? (
                    /* User Message Bubble - Right Aligned & Distinct Charcoal Tone */
                    <div className="max-w-[90%] sm:max-w-[78%] rounded-2xl rounded-tr-xs bg-stone-900/95 border border-[#D6B9FC]/20 p-4 sm:p-5 text-stone-100 shadow-md">
                      <div className="flex items-center justify-between gap-4 mb-2.5 pb-2 border-b border-stone-800/80">
                        <div className="flex items-center space-x-2">
                          <div className="w-6 h-6 rounded-md bg-[#50207A]/40 text-[#D6B9FC] border border-[#838CE5]/30 flex items-center justify-center text-xs shadow-xs">
                            <UserIcon className="w-3.5 h-3.5" />
                          </div>
                          <span className="text-xs font-semibold text-stone-200">You</span>
                          {msg.mode && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#50207A]/30 text-[#D6B9FC] uppercase font-mono border border-[#D6B9FC]/20">
                              {msg.mode}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center space-x-2 text-stone-400 text-[11px] font-mono">
                          <span>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          <button
                            onClick={() => copyToClipboard(msg.content, msg.id)}
                            className="p-1 hover:text-stone-200 rounded transition-colors cursor-pointer"
                            title="Copy text"
                          >
                            {copiedMessageId === msg.id ? (
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </div>

                      <div className="text-sm leading-relaxed text-stone-100 whitespace-pre-wrap">
                        {msg.content}
                      </div>
                    </div>
                  ) : (
                    /* Gemini AI Response Sanctuary Block - Styled with Deep Purple and Lavender Glow */
                    <div className="w-full sm:max-w-[95%] rounded-2xl rounded-tl-xs bg-gradient-to-b from-[#180d28] via-[#1c0f30]/90 to-[#150a24] border border-[#838CE5]/35 p-5 sm:p-6 text-stone-100 shadow-xl relative overflow-hidden ring-1 ring-[#838CE5]/20">
                      {/* Decorative top accent line */}
                      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-[#50207A] via-[#838CE5] to-[#D6B9FC]" />

                      <div className="flex items-center justify-between gap-4 mb-3 pb-2.5 border-b border-stone-800/80">
                        <div className="flex items-center space-x-2.5">
                          <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-[#50207A] to-[#30134a] text-[#D6B9FC] border border-[#838CE5]/40 flex items-center justify-center shadow-xs">
                            <Bot className="w-4 h-4 text-[#838CE5]" />
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className="text-xs font-bold text-[#D6B9FC] tracking-wide font-sans">
                              ReflectAI
                            </span>
                            <span className="text-[10px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded bg-[#838CE5]/20 text-[#838CE5] border border-[#838CE5]/30">
                              Gemini
                            </span>
                          </div>
                          {msg.mode && (
                            <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-[#50207A]/50 text-[#D6B9FC] font-mono border border-[#D6B9FC]/30 capitalize flex items-center space-x-1">
                              {msg.mode === 'reflect' && <Compass className="w-3 h-3 text-[#838CE5]" />}
                              {msg.mode === 'summarize' && <ListTree className="w-3 h-3 text-[#838CE5]" />}
                              {msg.mode === 'brainstorm' && <Lightbulb className="w-3 h-3 text-[#D6B9FC]" />}
                              {msg.mode === 'chat' && <MessageSquare className="w-3 h-3 text-[#838CE5]" />}
                              <span>{msg.mode === 'reflect' ? 'Deep Reflection' : msg.mode === 'summarize' ? 'Takeaways' : msg.mode === 'brainstorm' ? 'Next Steps' : 'Dialogue'}</span>
                            </span>
                          )}
                        </div>

                        <div className="flex items-center space-x-2 text-stone-400 text-[11px] font-mono">
                          <span>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          <button
                            onClick={() => copyToClipboard(msg.content, msg.id)}
                            className="p-1 hover:text-stone-200 rounded transition-colors cursor-pointer"
                            title="Copy text"
                          >
                            {copiedMessageId === msg.id ? (
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </div>

                      {/* AI Markdown Content with Elevated Typography */}
                      <div className="text-sm leading-relaxed text-stone-200 mt-2">
                        <div className="prose prose-invert prose-stone max-w-none text-stone-200 prose-p:my-2.5 prose-p:leading-relaxed prose-headings:font-serif prose-headings:text-[#D6B9FC] prose-headings:font-semibold prose-strong:text-[#838CE5] prose-ul:my-2.5 prose-li:my-1 prose-li:text-stone-300">
                          <Markdown>{msg.content}</Markdown>
                        </div>
                      </div>
                    </div>
                  )}
                </motion.div>
              ))}

              {/* Subtle Animated Loading / Typing Indicator */}
              {isAiLoading && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25, ease: 'easeOut' }}
                  className="w-full sm:max-w-[95%] rounded-2xl rounded-tl-xs bg-gradient-to-b from-[#180d28] via-[#1c0f30]/90 to-[#150a24] border border-[#838CE5]/35 p-5 sm:p-6 text-stone-100 shadow-xl relative overflow-hidden ring-1 ring-[#838CE5]/20"
                >
                  <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-[#50207A] via-[#838CE5] to-[#D6B9FC]" />
                  
                  <div className="flex items-center space-x-2.5 mb-3">
                    <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-[#50207A] to-[#30134a] text-[#D6B9FC] border border-[#838CE5]/40 flex items-center justify-center shadow-xs">
                      <Sparkles className="w-3.5 h-3.5 text-[#838CE5] animate-pulse" />
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-bold text-[#D6B9FC] tracking-wide font-sans">
                        ReflectAI
                      </span>
                      <span className="text-[10px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded bg-[#838CE5]/20 text-[#838CE5] border border-[#838CE5]/30">
                        Generating
                      </span>
                    </div>
                  </div>

                  {/* Dynamic Typing Wave & Status */}
                  <div className="flex items-center space-x-3 py-1.5">
                    <div className="flex items-center space-x-1.5">
                      <span className="w-2 h-2 rounded-full bg-[#838CE5] animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-2 h-2 rounded-full bg-[#838CE5] animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-2 h-2 rounded-full bg-[#838CE5] animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                    <span className="text-xs text-stone-300 font-sans">
                      {activeMode === 'summarize'
                        ? 'Synthesizing core takeaways and insights...'
                        : activeMode === 'brainstorm'
                        ? 'Brainstorming practical next steps and perspectives...'
                        : activeMode === 'chat'
                        ? 'Formulating response to your reflection...'
                        : 'Contemplating your entry and writing a deep reflection...'}
                    </span>
                  </div>

                  {/* Subtle breathing glow bar */}
                  <div className="mt-3 w-full h-1 bg-stone-900 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-[#50207A]/50 via-[#838CE5] to-[#D6B9FC]/50 rounded-full animate-pulse" />
                  </div>
                </motion.div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}

          {/* Follow-up Interactive Input Bar */}
          <div className="pt-4 sticky bottom-4 z-10">
            <div className="bg-stone-900/95 border border-[#D6B9FC]/25 rounded-2xl p-2 sm:p-2.5 shadow-2xl backdrop-blur-md flex items-center space-x-2">
              <input
                id="followup-input"
                type="text"
                value={followUpPrompt}
                onChange={(e) => setFollowUpPrompt(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey && followUpPrompt.trim()) {
                    e.preventDefault();
                    executeGeminiReflection('chat', followUpPrompt);
                  }
                }}
                placeholder="Ask a follow-up question, explore a specific thought, or ask for advice..."
                className="flex-1 bg-transparent text-stone-100 placeholder-stone-500 text-xs sm:text-sm px-3.5 py-2 border-none focus:outline-hidden focus:ring-0"
              />

              <button
                id="send-followup-btn"
                onClick={() => executeGeminiReflection('chat', followUpPrompt)}
                disabled={isAiLoading || !followUpPrompt.trim()}
                className="p-3 rounded-xl bg-[#838CE5] hover:bg-[#737ddb] active:bg-[#646fcb] text-[#150a24] font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shrink-0 shadow-md hover:shadow-lg"
                title="Send follow-up"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>

        </div>

      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-stone-900 border border-stone-800 rounded-2xl p-6 max-w-sm w-full shadow-2xl text-center">
            <div className="w-10 h-10 rounded-full bg-rose-950/80 border border-rose-800 text-rose-400 flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-5 h-5" />
            </div>
            <h3 className="font-serif text-lg font-semibold text-stone-100">
              Delete this reflection?
            </h3>
            <p className="text-xs text-stone-400 mt-2">
              This will permanently remove this entry and all its multi-turn conversation history from your isolated Firestore storage.
            </p>
            <div className="mt-6 flex items-center justify-center space-x-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-medium transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  setShowDeleteConfirm(false);
                  await onDelete(currentEntry.id);
                }}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-medium transition-colors cursor-pointer"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}

    </motion.div>
  );
};
