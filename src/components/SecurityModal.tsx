import React from 'react';
import { 
  ShieldCheck, 
  X, 
  Lock, 
  Server, 
  Database, 
  KeyRound, 
  Cpu,
  CheckCircle
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface SecurityModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SecurityModal: React.FC<SecurityModalProps> = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-stone-900 border border-stone-800 text-stone-100 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="p-5 border-b border-stone-800 flex items-center justify-between bg-stone-950/50">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-serif text-lg font-semibold text-stone-100">
                Security Architecture & Threat Model
              </h2>
              <p className="text-xs text-stone-400">
                Production-grade data isolation & defensive execution policies
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-stone-400 hover:text-stone-100 hover:bg-stone-800 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6 text-xs text-stone-300">
          
          {/* User Session Details */}
          <div className="p-4 rounded-xl bg-stone-800/40 border border-stone-700/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[#D6B9FC]">
                Active Authenticated Scope
              </span>
              <p className="text-sm font-medium text-stone-100 mt-0.5">
                {user ? user.displayName : 'Anonymous / Not signed in'}
              </p>
              <p className="font-mono text-[11px] text-stone-400 truncate max-w-xs sm:max-w-md">
                Firestore User ID: {user ? user.uid : 'N/A'}
              </p>
            </div>
            <div className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-emerald-950/70 border border-emerald-800 text-emerald-300 text-xs shrink-0 self-start sm:self-auto">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
              <span>Owner Isolated</span>
            </div>
          </div>

          {/* 5 Threat Zones Table */}
          <div>
            <h3 className="text-sm font-serif font-semibold text-stone-200 mb-3 flex items-center space-x-2">
              <Lock className="w-4 h-4 text-[#838CE5]" />
              <span>Agentic Threat Modeling Summary (5 Threat Zones)</span>
            </h3>
            
            <div className="overflow-x-auto rounded-xl border border-stone-800">
              <table className="w-full text-left border-collapse text-[11px]">
                <thead>
                  <tr className="bg-stone-800/80 text-stone-300 font-semibold border-b border-stone-700">
                    <th className="p-2.5">Threat Zone</th>
                    <th className="p-2.5">Potential Risk</th>
                    <th className="p-2.5">Implemented Countermeasure</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-800 bg-stone-900/60 font-sans">
                  <tr>
                    <td className="p-2.5 font-medium text-stone-200">1. Input Surfaces</td>
                    <td className="p-2.5 text-rose-300/90">Prompt injection, payload malformation</td>
                    <td className="p-2.5 text-stone-300">Strict schema validation & JSON destructuring guards</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 font-medium text-stone-200">2. Planning / Reasoning</td>
                    <td className="p-2.5 text-rose-300/90">Model instruction bypass via reflections</td>
                    <td className="p-2.5 text-stone-300">Journal treated strictly as data in isolated context blocks</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 font-medium text-stone-200">3. Tool & API Routing</td>
                    <td className="p-2.5 text-rose-300/90">Gemini API outage or rate limiting</td>
                    <td className="p-2.5 text-stone-300">Automated fallback ladder (3.6-flash &rarr; 3.1-flash-lite &rarr; flash-latest &rarr; 3.7-flash)</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 font-medium text-stone-200">4. Memory & State</td>
                    <td className="p-2.5 text-rose-300/90">Cross-user data exposure in Firestore</td>
                    <td className="p-2.5 text-stone-300">Owner-bound security rules (`request.auth.uid == userId`)</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 font-medium text-stone-200">5. Inter-System Comm</td>
                    <td className="p-2.5 text-rose-300/90">Browser leakage of Gemini API secrets</td>
                    <td className="p-2.5 text-stone-300">Proxying requests through server-side `/api/gemini/reflect` only</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Firestore Rules Verification */}
          <div>
            <h3 className="text-sm font-serif font-semibold text-stone-200 mb-2 flex items-center space-x-2">
              <Database className="w-4 h-4 text-emerald-400" />
              <span>Deployed Firestore Security Rules</span>
            </h3>
            <pre className="p-3 rounded-xl bg-stone-950 border border-stone-800 text-stone-300 font-mono text-[11px] overflow-x-auto leading-relaxed">
{`rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
      
      match /{allSubcollections=**} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
    }
  }
}`}
            </pre>
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-stone-800 bg-stone-950/50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200 font-medium text-xs transition-colors cursor-pointer"
          >
            Close Inspector
          </button>
        </div>

      </div>
    </div>
  );
};
