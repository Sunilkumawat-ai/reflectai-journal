import React from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  Sparkles, 
  LogOut, 
  PlusCircle, 
  ShieldCheck, 
  User as UserIcon,
  Database
} from 'lucide-react';

interface NavbarProps {
  onNewEntry: () => void;
  onOpenSecurityModal: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onNewEntry, onOpenSecurityModal }) => {
  const { user, signOut } = useAuth();

  return (
    <header className="sticky top-0 z-40 bg-stone-950/90 text-stone-100 border-b border-stone-800/80 shadow-sm backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* Brand */}
        <div className="flex items-center space-x-3.5">
          <div className="w-10 h-10 rounded-2xl bg-[#50207A]/60 border border-[#838CE5]/40 flex items-center justify-center text-[#D6B9FC] shadow-xs">
            <Sparkles className="w-5 h-5 text-[#838CE5]" />
          </div>
          <div>
            <div className="flex items-center space-x-2.5">
              <span className="font-serif text-xl font-bold tracking-tight text-stone-50">
                ReflectAI
              </span>
              <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#50207A]/40 text-[#D6B9FC] font-medium border border-[#D6B9FC]/25">
                Gemini 3.6 Flash
              </span>
            </div>
            <p className="text-xs text-stone-400 hidden sm:block">
              Private Journal & Multi-Turn Reflection Assistant
            </p>
          </div>
        </div>

        {/* Actions & User Menu */}
        <div className="flex items-center space-x-2.5 sm:space-x-4">
          <button
            id="nav-security-badge-btn"
            onClick={onOpenSecurityModal}
            className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium rounded-xl bg-stone-900/80 hover:bg-stone-800 text-stone-300 hover:text-stone-100 border border-stone-800 hover:border-stone-700 transition-all shadow-xs cursor-pointer"
            title="View Security & Isolation Status"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden md:inline">Firestore Isolated</span>
          </button>

          <button
            id="nav-new-reflection-btn"
            onClick={onNewEntry}
            className="flex items-center space-x-2 px-4 py-2 text-xs sm:text-sm rounded-xl bg-[#838CE5] hover:bg-[#737ddb] active:bg-[#646fcb] text-[#150a24] font-bold shadow-sm hover:shadow-md transition-all cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>New Reflection</span>
          </button>

          {user && (
            <div className="flex items-center pl-2.5 border-l border-stone-800 space-x-3">
              <div className="flex items-center space-x-2.5">
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName || 'User'}
                    className="w-8 h-8 rounded-full ring-2 ring-[#838CE5]/60"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-stone-800 border border-stone-700 flex items-center justify-center text-stone-300">
                    <UserIcon className="w-4 h-4" />
                  </div>
                )}
                <div className="hidden lg:block text-left">
                  <p className="text-xs font-semibold text-stone-200 truncate max-w-[130px]">
                    {user.displayName || 'Authenticated User'}
                  </p>
                  <p className="text-[10px] text-stone-400 truncate max-w-[130px] font-mono">
                    {user.email || 'UID: ' + user.uid.slice(0, 6) + '...'}
                  </p>
                </div>
              </div>

              <button
                id="nav-sign-out-btn"
                onClick={() => signOut()}
                className="p-2 text-stone-400 hover:text-rose-400 hover:bg-stone-800/80 rounded-xl transition-colors cursor-pointer"
                title="Sign Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
