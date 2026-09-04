import React from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LandingPage } from './components/LandingPage';
import { Dashboard } from './components/Dashboard';
import { Sparkles, RefreshCw } from 'lucide-react';

const AppContent: React.FC = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-950 flex flex-col items-center justify-center text-stone-300">
        <div className="w-12 h-12 rounded-2xl bg-[#50207A]/60 border border-[#838CE5]/40 flex items-center justify-center text-[#D6B9FC] mb-4 shadow-lg shadow-[#50207A]/25 animate-pulse">
          <Sparkles className="w-6 h-6 text-[#838CE5]" />
        </div>
        <div className="flex items-center space-x-2 text-sm font-medium text-stone-200">
          <RefreshCw className="w-4 h-4 animate-spin text-[#838CE5]" />
          <span>Verifying authentication state...</span>
        </div>
        <p className="text-xs text-[#D6B9FC]/80 mt-2 font-mono">
          ReflectAI &bull; Cloud Firestore
        </p>
      </div>
    );
  }

  return user ? <Dashboard /> : <LandingPage />;
};

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
