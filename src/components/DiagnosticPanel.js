'use client';

import { useState, useEffect } from 'react';
import { diagStore } from '../lib/firebase';

export default function DiagnosticPanel() {
  const [diagState, setDiagState] = useState(diagStore.state);
  const [logs, setLogs] = useState(diagStore.logs);
  const [isMinimized, setIsMinimized] = useState(false);

  useEffect(() => {
    const unsubscribe = diagStore.subscribe(() => {
      setDiagState({ ...diagStore.state });
      setLogs([...diagStore.logs]);
    });
    return unsubscribe;
  }, []);

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-slate-950/95 text-slate-100 p-3 border-b-2 border-indigo-500 font-mono text-xs shadow-2xl backdrop-blur-md">
      <div className="max-w-6xl mx-auto space-y-2">
        <div className="flex items-center justify-between font-bold text-indigo-400 border-b border-slate-800 pb-1">
          <span className="flex items-center gap-2 text-sm">
            <span>⚡ REAL-TIME AUTHENTICATION DIAGNOSTIC PANEL</span>
          </span>
          <div className="flex items-center gap-2">
            <span
              className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold border ${
                diagState.isInitializing
                  ? 'bg-amber-950 text-amber-300 border-amber-800'
                  : 'bg-emerald-950 text-emerald-300 border-emerald-800'
              }`}
            >
              {diagState.isInitializing ? '⏳ Initializing' : '✅ Initialized'}
            </span>
            <button
              onClick={() => setIsMinimized(!isMinimized)}
              className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] transition cursor-pointer"
            >
              {isMinimized ? 'Expand' : 'Minimize'}
            </button>
          </div>
        </div>

        {!isMinimized && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-[11px]">
              <div className="p-1.5 rounded bg-slate-900 border border-slate-800">
                <span className="text-slate-400 block text-[10px]">Firebase Configured:</span>
                <strong className={diagState.firebaseConfigured ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                  {diagState.firebaseConfigured ? 'YES ✅' : 'NO ❌'}
                </strong>
              </div>

              <div className="p-1.5 rounded bg-slate-900 border border-slate-800">
                <span className="text-slate-400 block text-[10px]">auth.currentUser:</span>
                <strong className={diagState.firebaseUser ? 'text-emerald-400 font-bold truncate block' : 'text-amber-400 font-bold'}>
                  {diagState.firebaseUser ? diagState.firebaseUser : 'NO (null)'}
                </strong>
              </div>

              <div className="p-1.5 rounded bg-slate-900 border border-slate-800 col-span-2">
                <span className="text-slate-400 block text-[10px]">Firebase UID:</span>
                <strong className="text-indigo-300 font-bold truncate block">
                  {diagState.uid || 'NONE'}
                </strong>
              </div>

              <div className="p-1.5 rounded bg-slate-900 border border-slate-800">
                <span className="text-slate-400 block text-[10px]">Redirect Result:</span>
                <strong
                  className={
                    diagState.redirectResult === 'success'
                      ? 'text-emerald-400 font-bold'
                      : diagState.redirectResult === 'error'
                      ? 'text-rose-400 font-bold'
                      : 'text-slate-300'
                  }
                >
                  {diagState.redirectResult}
                </strong>
              </div>

              <div className="p-1.5 rounded bg-slate-900 border border-slate-800">
                <span className="text-slate-400 block text-[10px]">Firestore Profile:</span>
                <strong
                  className={
                    diagState.firestoreStatus === 'success'
                      ? 'text-emerald-400 font-bold'
                      : diagState.firestoreStatus === 'error'
                      ? 'text-rose-400 font-bold'
                      : 'text-slate-300'
                  }
                >
                  {diagState.firestoreStatus}
                </strong>
              </div>

              <div className="p-1.5 rounded bg-slate-900 border border-slate-800 col-span-2">
                <span className="text-slate-400 block text-[10px]">Last Auth Error Code:</span>
                <strong
                  className={
                    diagState.lastErrorCode !== 'NONE'
                      ? 'text-rose-400 font-bold block truncate'
                      : 'text-slate-400 block truncate'
                  }
                >
                  {diagState.lastErrorCode}
                </strong>
              </div>
            </div>

            {diagState.lastErrorMessage && (
              <div className="p-2 rounded bg-rose-950/90 border border-rose-800 text-rose-200 text-xs font-semibold">
                ❌ LAST RUNTIME ERROR: {diagState.lastErrorMessage}
              </div>
            )}

            {diagState.firestoreError && (
              <div className="p-2 rounded bg-rose-950/90 border border-rose-800 text-rose-200 text-xs font-semibold">
                🔥 FIRESTORE ERROR: {diagState.firestoreError}
              </div>
            )}

            <div className="bg-slate-900 p-2 rounded border border-slate-800 max-h-32 overflow-y-auto space-y-1 font-mono text-[10px]">
              <div className="text-slate-500 font-bold text-[9px] uppercase border-b border-slate-800 pb-0.5 mb-1">
                Live Lifecycle Stream ({logs.length} events)
              </div>
              {logs.map((log, index) => (
                <div
                  key={index}
                  className={
                    log.type === 'error'
                      ? 'text-rose-400 font-bold'
                      : log.type === 'success'
                      ? 'text-emerald-400 font-bold'
                      : 'text-indigo-300'
                  }
                >
                  {log.msg}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
