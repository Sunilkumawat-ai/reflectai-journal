import React from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  Sparkles, 
  ShieldCheck, 
  Database, 
  Lock, 
  ArrowRight, 
  Cpu, 
  BookOpen, 
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

export const LandingPage: React.FC = () => {
  const { signInWithGoogle, signInAsGuest, loading, error, clearError } = useAuth();

  return (
    <div className="min-h-screen bg-stone-900 text-stone-100 flex flex-col justify-between selection:bg-[#D6B9FC]/30">
      
      {/* Top Bar */}
      <header className="max-w-6xl mx-auto w-full px-6 py-6 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-[#50207A]/50 border border-[#838CE5]/40 flex items-center justify-center text-[#D6B9FC] shadow-xs">
            <Sparkles className="w-5 h-5 text-[#838CE5]" />
          </div>
          <span className="font-serif text-xl font-bold tracking-tight text-stone-100">
            ReflectAI
          </span>
        </div>

        <div className="flex items-center space-x-2">
          <span className="flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-medium bg-emerald-950/60 text-emerald-300 border border-emerald-800/60">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Firestore Rules Deployed</span>
          </span>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-4xl mx-auto w-full px-6 py-12 flex flex-col items-center text-center">
        
        {/* Badge */}
        <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-[#50207A]/35 border border-[#D6B9FC]/30 text-xs text-[#D6B9FC] mb-8 shadow-xs">
          <Sparkles className="w-3.5 h-3.5 text-[#838CE5]" />
          <span>Powered by Gemini 3.6 Flash & Cloud Firestore</span>
        </div>

        {/* Headline */}
        <h1 className="font-serif text-4xl sm:text-5xl md:text-6xl font-normal tracking-tight text-stone-100 max-w-3xl leading-tight">
          A private space for <span className="italic text-[#D6B9FC]">clarity</span>, guided by intelligent reflection.
        </h1>

        <p className="mt-6 text-base sm:text-lg text-stone-300 max-w-2xl font-light leading-relaxed">
          Write unfiltered thoughts, explore ideas in multi-turn dialogue, and receive summaries or brainstormed next steps—all stored in your own strictly isolated Firestore collection.
        </p>

        {/* Error Notification Banner */}
        {error && (
          <div className="mt-6 w-full max-w-md p-4 rounded-xl bg-rose-950/80 border border-rose-800 text-rose-200 text-xs flex items-start space-x-3 text-left">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold text-rose-300">Authentication Notice</p>
              <p className="mt-1">{error}</p>
            </div>
            <button 
              onClick={clearError}
              className="text-rose-400 hover:text-rose-100 underline text-xs"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Sign In CTA Box */}
        <div className="mt-10 w-full max-w-md bg-stone-900/95 border border-[#D6B9FC]/25 rounded-2xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
          {/* Subtle lavender glow accent at top of card */}
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-[#50207A] via-[#838CE5] to-[#D6B9FC]" />

          <div className="text-center mb-6">
            <h2 className="text-lg font-semibold text-stone-100 font-serif">
              Sign In to Your Private Journal
            </h2>
            <p className="text-xs text-stone-400 mt-1">
              No passwords stored. Secure federated access via Google.
            </p>
          </div>

          <div className="space-y-3">
            <button
              id="google-signin-btn"
              onClick={() => signInWithGoogle()}
              disabled={loading}
              className="w-full flex items-center justify-center space-x-3 py-3 px-4 rounded-xl bg-[#838CE5] hover:bg-[#737ddb] active:bg-[#646fcb] text-[#150a24] font-bold text-sm transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>{loading ? 'Authenticating...' : 'Continue with Google'}</span>
            </button>

            <div className="relative flex py-1 items-center">
              <div className="flex-grow border-t border-stone-800"></div>
              <span className="flex-shrink mx-3 text-stone-500 text-[11px] uppercase tracking-wider">or preview mode</span>
              <div className="flex-grow border-t border-stone-800"></div>
            </div>

            <button
              id="guest-signin-btn"
              onClick={() => signInAsGuest()}
              disabled={loading}
              className="w-full py-2.5 px-4 rounded-xl bg-[#50207A]/25 hover:bg-[#50207A]/40 text-[#D6B9FC] hover:text-white text-xs font-medium transition-colors border border-[#D6B9FC]/20 cursor-pointer"
            >
              Continue as Guest (Anonymous Sandbox)
            </button>
          </div>

          {/* Privacy pledge */}
          <div className="mt-5 pt-4 border-t border-stone-800/80 flex items-center justify-center space-x-2 text-[11px] text-stone-400">
            <Lock className="w-3.5 h-3.5 text-[#838CE5]" />
            <span>Strict User Data Isolation via Firestore Security Rules</span>
          </div>
        </div>

        {/* 3 Pillars */}
        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6 text-left w-full">
          
          <div className="p-5 rounded-2xl bg-stone-900/60 border border-stone-800 hover:border-[#D6B9FC]/30 transition-colors">
            <div className="w-9 h-9 rounded-lg bg-[#50207A]/40 border border-[#838CE5]/30 flex items-center justify-center text-[#D6B9FC] mb-3">
              <BookOpen className="w-4 h-4 text-[#838CE5]" />
            </div>
            <h3 className="text-sm font-semibold text-stone-200 font-serif">1. Expressive Reflections</h3>
            <p className="mt-2 text-xs text-stone-400 leading-relaxed">
              Capture daily entries, mood tracking, and free-form thoughts with zero latency and automatic autosave.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-stone-900/60 border border-stone-800 hover:border-[#D6B9FC]/30 transition-colors">
            <div className="w-9 h-9 rounded-lg bg-[#838CE5]/20 border border-[#838CE5]/35 flex items-center justify-center text-[#838CE5] mb-3">
              <Cpu className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-semibold text-stone-200 font-serif">2. Gemini 3.6 Flash Multi-Turn</h3>
            <p className="mt-2 text-xs text-stone-400 leading-relaxed">
              Brainstorm, synthesize takeaways, or continue multi-turn conversations with resilient model fallback protection.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-stone-900/60 border border-stone-800 hover:border-[#D6B9FC]/30 transition-colors">
            <div className="w-9 h-9 rounded-lg bg-[#D6B9FC]/15 border border-[#D6B9FC]/30 flex items-center justify-center text-[#D6B9FC] mb-3">
              <Database className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-semibold text-stone-200 font-serif">3. Isolated Cloud Firestore</h3>
            <p className="mt-2 text-xs text-stone-400 leading-relaxed">
              Owner-bound security rules ensure only your authenticated account can ever read or write your personal entries.
            </p>
          </div>

        </div>

      </main>

      {/* Footer */}
      <footer className="border-t border-stone-800/80 py-6 text-center text-xs text-stone-500">
        <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>ReflectAI &copy; {new Date().getFullYear()} &bull; Google AI Studio Build</span>
          <span className="font-mono text-[11px] text-stone-400">Zero Client-Side API Keys &bull; Cloud Run Ready</span>
        </div>
      </footer>

    </div>
  );
};
