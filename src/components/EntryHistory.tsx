import React, { useState } from 'react';
import { 
  Search, 
  Plus, 
  Pin, 
  MessageSquare, 
  Calendar, 
  Sparkles, 
  Smile, 
  Filter,
  X,
  BookOpen
} from 'lucide-react';
import { JournalEntry } from '../types';
import { MoodTrendsChart } from './MoodTrendsChart';

interface EntryHistoryProps {
  entries: JournalEntry[];
  selectedEntryId: string | null;
  onSelectEntry: (entry: JournalEntry) => void;
  onNewEntry: () => void;
}

export const EntryHistory: React.FC<EntryHistoryProps> = ({
  entries,
  selectedEntryId,
  onSelectEntry,
  onNewEntry,
}) => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedMoodFilter, setSelectedMoodFilter] = useState<string>('all');

  // Filter entries based on search and mood
  const filteredEntries = entries.filter((entry) => {
    const matchesMood =
      selectedMoodFilter === 'all' || entry.mood === selectedMoodFilter;

    if (!matchesMood) return false;

    if (!searchQuery.trim()) return true;

    const queryLower = searchQuery.toLowerCase();
    const matchesTitle = entry.title.toLowerCase().includes(queryLower);
    const matchesContent = entry.content.toLowerCase().includes(queryLower);
    const matchesMessages = entry.messages.some((m) =>
      m.content.toLowerCase().includes(queryLower)
    );

    return matchesTitle || matchesContent || matchesMessages;
  });

  // Sort pinned entries first, then latest updated
  const sortedEntries = [...filteredEntries].sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });

  const getMoodEmoji = (mood?: string) => {
    switch (mood) {
      case 'calm': return '🍃';
      case 'grateful': return '✨';
      case 'optimistic': return '🌅';
      case 'energized': return '⚡';
      case 'creative': return '🎨';
      case 'anxious': return '🌧️';
      default: return '🪞';
    }
  };

  return (
    <aside className="w-full md:w-80 lg:w-96 border-r border-stone-800/80 bg-stone-950/80 flex flex-col h-full shrink-0">
      
      {/* Header & New Reflection Button */}
      <div className="p-4 border-b border-stone-800/80 space-y-3.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <h2 className="font-serif text-sm font-semibold text-stone-100">
              Journal Entries
            </h2>
            <span className="px-2 py-0.5 rounded-full text-[10px] bg-[#50207A]/40 text-[#D6B9FC] font-mono border border-[#D6B9FC]/30">
              {entries.length}
            </span>
          </div>
          <button
            id="sidebar-new-entry-btn"
            onClick={onNewEntry}
            className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-xl bg-[#838CE5]/20 hover:bg-[#838CE5]/30 active:bg-[#838CE5]/40 text-[#838CE5] border border-[#838CE5]/40 text-xs font-semibold transition-all cursor-pointer shadow-xs"
          >
            <Plus className="w-3.5 h-3.5 text-[#838CE5]" />
            <span>New</span>
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-stone-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            id="history-search-input"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search entries or insights..."
            className="w-full bg-stone-900/90 border border-stone-800 rounded-xl pl-9 pr-8 py-2 text-xs text-stone-200 placeholder-stone-500 focus:outline-hidden focus:border-[#838CE5]/60 focus:ring-1 focus:ring-[#838CE5]/30 shadow-inner"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-500 hover:text-stone-300 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Mood Filter Chips with Visually Distinct Selected State */}
        <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 text-[11px] scrollbar-none">
          <button
            onClick={() => setSelectedMoodFilter('all')}
            className={`px-2.5 py-1 rounded-full transition-all cursor-pointer shrink-0 font-medium ${
              selectedMoodFilter === 'all'
                ? 'bg-[#838CE5] text-[#150a24] font-bold shadow-xs ring-2 ring-[#838CE5]/40 border border-[#838CE5]'
                : 'bg-stone-900/90 text-stone-400 hover:text-stone-200 hover:bg-stone-800 border border-stone-800/90'
            }`}
          >
            All
          </button>
          {['reflective', 'grateful', 'calm', 'optimistic', 'creative', 'anxious'].map((m) => {
            const isSelected = selectedMoodFilter === m;
            return (
              <button
                key={m}
                onClick={() => setSelectedMoodFilter(m)}
                className={`px-2.5 py-1 rounded-full transition-all cursor-pointer shrink-0 capitalize ${
                  isSelected
                    ? 'bg-[#838CE5] text-[#150a24] font-bold shadow-xs ring-2 ring-[#838CE5]/40 border border-[#838CE5] scale-[1.02]'
                    : 'bg-stone-900/90 text-stone-300 hover:text-stone-100 hover:bg-stone-800 border border-stone-800/90'
                }`}
              >
                <span>{getMoodEmoji(m)} {m}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Mood Trends Chart Component */}
      <MoodTrendsChart
        entries={entries}
        selectedMoodFilter={selectedMoodFilter}
        onSelectMood={(mood) => setSelectedMoodFilter(mood)}
      />

      {/* Entries List */}
      <div className="flex-1 overflow-y-auto p-2.5 space-y-2">
        {sortedEntries.length === 0 ? (
          <div className="p-4 text-center">
            {searchQuery || selectedMoodFilter !== 'all' ? (
              <div className="py-8 px-4 text-center space-y-2.5">
                <div className="w-10 h-10 mx-auto rounded-xl bg-stone-900 border border-stone-800 flex items-center justify-center text-stone-500 shadow-inner">
                  <Search className="w-4 h-4" />
                </div>
                <p className="text-stone-300 font-medium text-xs">No matching reflections</p>
                <p className="text-stone-500 text-[11px] max-w-[200px] mx-auto">
                  Try searching with a different keyword or reset filters.
                </p>
                <button
                  onClick={() => {
                    setSelectedMoodFilter('all');
                    setSearchQuery('');
                  }}
                  className="text-xs text-[#838CE5] hover:text-[#D6B9FC] underline cursor-pointer"
                >
                  Clear Filters
                </button>
              </div>
            ) : (
              <div className="py-12 px-4 text-center space-y-3">
                {/* Gentle Calming Empty-State Illustration */}
                <div className="relative w-16 h-16 mx-auto mb-3 flex items-center justify-center">
                  <div className="absolute inset-0 rounded-3xl bg-[#838CE5]/15 animate-pulse" />
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-b from-[#50207A] to-[#241038] border border-[#838CE5]/40 flex items-center justify-center text-[#D6B9FC] shadow-md">
                    <BookOpen className="w-6 h-6 text-[#D6B9FC]" />
                  </div>
                  <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-stone-900 border border-[#838CE5]/50 flex items-center justify-center text-[#838CE5] shadow-xs">
                    <Sparkles className="w-3 h-3" />
                  </div>
                </div>
                <h4 className="font-serif text-sm font-semibold text-stone-100">
                  A Blank Canvas Awaits
                </h4>
                <p className="text-xs text-stone-400 max-w-[210px] mx-auto leading-relaxed">
                  Record your first thought, feeling, or insight. Gemini is ready to reflect alongside you.
                </p>
                <button
                  id="empty-state-new-entry-btn"
                  onClick={onNewEntry}
                  className="mt-2 inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl bg-[#838CE5] hover:bg-[#737ddb] active:bg-[#646fcb] text-[#150a24] text-xs font-bold transition-all cursor-pointer shadow-sm"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Write First Reflection</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          sortedEntries.map((entry) => {
            const isSelected = entry.id === selectedEntryId;
            const snippet = entry.content || (entry.messages[0]?.content) || 'Empty entry...';

            return (
              <button
                key={entry.id}
                onClick={() => onSelectEntry(entry)}
                className={`w-full text-left p-3.5 rounded-xl transition-all duration-200 ease-out cursor-pointer block border transform active:scale-[0.99] ${
                  isSelected
                    ? 'bg-stone-900 border-[#838CE5]/60 shadow-md ring-1 ring-[#838CE5]/30 translate-x-0.5'
                    : 'bg-stone-950/40 hover:bg-stone-900/70 border-stone-800/50 hover:border-[#D6B9FC]/30 hover:translate-x-0.5 shadow-xs'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-serif text-sm font-semibold text-stone-100 truncate flex-1 tracking-tight">
                    {entry.title || 'Untitled Reflection'}
                  </h3>
                  <div className="flex items-center space-x-1.5 shrink-0">
                    {entry.isPinned && (
                      <Pin className="w-3.5 h-3.5 text-[#838CE5] fill-[#838CE5]" />
                    )}
                    <span className="text-xs" title={`Mood: ${entry.mood || 'Reflective'}`}>
                      {getMoodEmoji(entry.mood)}
                    </span>
                  </div>
                </div>

                <p className="mt-1.5 text-xs text-stone-400 line-clamp-2 leading-relaxed">
                  {snippet}
                </p>

                <div className="mt-3 flex items-center justify-between text-[10px] text-stone-400 font-mono">
                  <span className="flex items-center space-x-1">
                    <Calendar className="w-3 h-3 text-stone-500" />
                    <span>
                      {new Date(entry.updatedAt).toLocaleDateString([], {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                  </span>

                  {entry.messages.length > 0 && (
                    <span className="flex items-center space-x-1 text-[#838CE5]/90 font-medium">
                      <MessageSquare className="w-3 h-3" />
                      <span>{entry.messages.length} turns</span>
                    </span>
                  )}
                </div>
              </button>
            );
          })
        )}
      </div>

    </aside>
  );
};
