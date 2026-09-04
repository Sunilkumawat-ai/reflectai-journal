import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { Navbar } from './Navbar';
import { EntryHistory } from './EntryHistory';
import { JournalEditor } from './JournalEditor';
import { SecurityModal } from './SecurityModal';
import { 
  fetchUserEntries, 
  saveUserEntry, 
  deleteUserEntry 
} from '../firebase';
import { JournalEntry } from '../types';
import { 
  Menu, 
  X, 
  Sparkles, 
  AlertTriangle, 
  RefreshCw 
} from 'lucide-react';

export const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
  const [isLoadingEntries, setIsLoadingEntries] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);
  const [isSecurityModalOpen, setIsSecurityModalOpen] = useState<boolean>(false);

  // Helper to create a fresh new entry template
  const createNewEntryObject = useCallback((): JournalEntry => {
    return {
      id: 'entry-' + Date.now(),
      userId: user?.uid || '',
      title: 'Untitled Reflection',
      content: '',
      messages: [],
      mood: 'reflective',
      tags: [],
      summary: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isPinned: false,
    };
  }, [user?.uid]);

  // Load user entries from Cloud Firestore
  const loadEntries = useCallback(async () => {
    if (!user?.uid) return;
    setIsLoadingEntries(true);
    setLoadError(null);
    try {
      const fetched = await fetchUserEntries(user.uid);
      setEntries(fetched);
      if (fetched.length > 0) {
        // Select latest active entry if none selected
        setSelectedEntryId((prev) => (prev && fetched.some((e) => e.id === prev) ? prev : fetched[0].id));
      } else {
        // Auto scaffold an initial first entry for instant user interaction
        const initial = createNewEntryObject();
        initial.title = 'Welcome to Your Private Reflection Journal';
        initial.content = 'Welcome! This is your private sanctuary for daily thoughts, reflections, and insights. You can write anything here, choose a mood, and converse with Gemini 3.6 Flash for summaries or brainstorming.';
        setEntries([initial]);
        setSelectedEntryId(initial.id);
        await saveUserEntry(user.uid, initial);
      }
    } catch (err: any) {
      console.error('Failed to load user entries from Firestore:', err);
      setLoadError(err.message || 'Failed to load entries from Firestore.');
    } finally {
      setIsLoadingEntries(false);
    }
  }, [user?.uid, createNewEntryObject]);

  useEffect(() => {
    loadEntries();
  }, [loadEntries]);

  // Save handler with transaction integrity & state updating
  const handleSaveEntry = async (updated: JournalEntry) => {
    if (!user?.uid) return;
    setIsSaving(true);
    setSaveError(null);
    try {
      await saveUserEntry(user.uid, updated);
      setEntries((prev) => {
        const index = prev.findIndex((e) => e.id === updated.id);
        if (index >= 0) {
          const next = [...prev];
          next[index] = updated;
          return next;
        }
        return [updated, ...prev];
      });
    } catch (err: any) {
      console.error('Save failed:', err);
      setSaveError(err.message || 'Failed to save entry to Firestore.');
      throw err;
    } finally {
      setIsSaving(false);
    }
  };

  // Delete handler
  const handleDeleteEntry = async (entryId: string) => {
    if (!user?.uid) return;
    try {
      await deleteUserEntry(user.uid, entryId);
      const remaining = entries.filter((e) => e.id !== entryId);
      setEntries(remaining);
      if (remaining.length > 0) {
        setSelectedEntryId(remaining[0].id);
      } else {
        const fresh = createNewEntryObject();
        setEntries([fresh]);
        setSelectedEntryId(fresh.id);
        await saveUserEntry(user.uid, fresh);
      }
    } catch (err: any) {
      console.error('Delete error:', err);
      setSaveError(err.message || 'Failed to delete entry from Firestore.');
    }
  };

  // Create new entry action
  const handleCreateNewEntry = async () => {
    if (!user?.uid) return;
    const fresh = createNewEntryObject();
    setEntries((prev) => [fresh, ...prev]);
    setSelectedEntryId(fresh.id);
    setIsSidebarOpen(false);
    try {
      await saveUserEntry(user.uid, fresh);
    } catch (err) {
      console.error('Error saving new entry:', err);
    }
  };

  const activeEntry =
    entries.find((e) => e.id === selectedEntryId) ||
    entries[0] ||
    createNewEntryObject();

  return (
    <div className="min-h-screen bg-stone-900 text-stone-100 flex flex-col selection:bg-amber-500/30">
      
      {/* Top Navigation */}
      <Navbar
        onNewEntry={handleCreateNewEntry}
        onOpenSecurityModal={() => setIsSecurityModalOpen(true)}
      />

      {/* Mobile Drawer Trigger Bar */}
      <div className="md:hidden bg-stone-950 px-4 py-2.5 border-b border-stone-800 flex items-center justify-between">
        <button
          id="mobile-menu-toggle-btn"
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="flex items-center space-x-2 text-xs text-stone-300 hover:text-stone-100 font-medium py-1 px-2.5 rounded-lg bg-stone-900 border border-stone-800"
        >
          {isSidebarOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          <span>{isSidebarOpen ? 'Close History' : 'View Entries History'}</span>
        </button>

        <span className="text-xs text-stone-400 truncate max-w-[180px]">
          {activeEntry.title || 'Untitled'}
        </span>
      </div>

      {/* Main Workspace Frame */}
      <div className="flex-1 flex overflow-hidden relative">
        
        {/* Loading / Error States */}
        {isLoadingEntries ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-stone-400">
            <RefreshCw className="w-8 h-8 animate-spin text-[#838CE5] mb-3" />
            <p className="font-serif text-base text-stone-200">Loading your private Firestore records...</p>
            <p className="text-xs text-stone-500 mt-1">Secured with user-isolated security rules</p>
          </div>
        ) : loadError ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center max-w-md mx-auto">
            <AlertTriangle className="w-10 h-10 text-rose-400 mb-3" />
            <h3 className="font-serif text-lg font-semibold text-rose-300">Firestore Retrieval Error</h3>
            <p className="text-xs text-stone-400 mt-2">{loadError}</p>
            <button
              onClick={loadEntries}
              className="mt-4 px-4 py-2 rounded-xl bg-[#838CE5] hover:bg-[#737ddb] active:bg-[#646fcb] text-[#150a24] text-xs font-bold transition-all shadow-sm"
            >
              Retry Connection
            </button>
          </div>
        ) : (
          <>
            {/* Sidebar (Desktop & Mobile Drawer) */}
            <div
              className={`fixed inset-y-16 left-0 z-30 md:static transform ${
                isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
              } md:translate-x-0 transition-transform duration-200 ease-in-out w-full sm:w-80 md:w-80 lg:w-96 shadow-xl md:shadow-none shrink-0`}
            >
              <EntryHistory
                entries={entries}
                selectedEntryId={selectedEntryId}
                onSelectEntry={(entry) => {
                  setSelectedEntryId(entry.id);
                  setIsSidebarOpen(false);
                }}
                onNewEntry={handleCreateNewEntry}
              />
            </div>

            {/* Backdrop overlay for mobile drawer */}
            {isSidebarOpen && (
              <div
                onClick={() => setIsSidebarOpen(false)}
                className="md:hidden fixed inset-0 z-20 bg-black/60 backdrop-blur-xs"
              />
            )}

            {/* Active Reflection Editor & AI Conversation Area */}
            <JournalEditor
              key={activeEntry.id}
              entry={activeEntry}
              onSave={handleSaveEntry}
              onDelete={handleDeleteEntry}
              isSaving={isSaving}
              saveError={saveError}
              onClearSaveError={() => setSaveError(null)}
            />
          </>
        )}

      </div>

      {/* Security Architecture & Rules Inspector Modal */}
      <SecurityModal
        isOpen={isSecurityModalOpen}
        onClose={() => setIsSecurityModalOpen(false)}
      />

    </div>
  );
};
