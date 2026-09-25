'use client';

import { useState } from 'react';
import { Home, Sparkles, Key, PlusCircle, ArrowRight, HelpCircle } from 'lucide-react';
import { store } from '../lib/storage';
import { signInWithGoogle } from '../lib/supabase';

export default function Onboarding({ currentUser, onComplete }) {
  const [googleName, setGoogleName] = useState('');
  const [googleEmail, setGoogleEmail] = useState('');
  const [showConfigHelp, setShowConfigHelp] = useState(false);
  const [isSigningInOAuth, setIsSigningInOAuth] = useState(false);

  const [mode, setMode] = useState('CHOICE'); // 'CHOICE', 'CREATE', 'JOIN'
  const [houseName, setHouseName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Handle Google OAuth Popup/Redirect Login
  const handleTriggerGoogleOAuth = async () => {
    setIsSigningInOAuth(true);
    setErrorMessage('');
    try {
      await signInWithGoogle();
    } catch (err) {
      console.warn('[Google OAuth Warning]', err);
      // Fallback to name/email if OAuth is not configured in environment
      const name = googleName.trim() || 'Roommate User';
      const email = googleEmail.trim() || 'user@example.com';
      store.loginWithGoogle({
        id: 'usr_' + Math.random().toString(36).substring(2, 9),
        email: email,
        full_name: name,
        avatar_url: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name)}`,
      });
    } finally {
      setIsSigningInOAuth(false);
    }
  };

  // Handle Form Submit Login
  const handleGoogleLogin = (e) => {
    e.preventDefault();
    const name = googleName.trim() || 'Alex Smith';
    const email = googleEmail.trim() || 'alex@example.com';
    
    store.loginWithGoogle({
      id: 'usr_' + Math.random().toString(36).substring(2, 9),
      email: email,
      full_name: name,
      avatar_url: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name)}`,
    });
  };

  const handleCreateHouseSubmit = (e) => {
    e.preventDefault();
    if (!houseName.trim()) {
      setErrorMessage('Please enter a house name.');
      return;
    }
    setErrorMessage('');
    const house = store.createHouse(houseName.trim(), currentUser.id);
    if (onComplete) onComplete(house.id);
  };

  const handleJoinHouseSubmit = async (e) => {
    e.preventDefault();
    if (!joinCode.trim()) {
      setErrorMessage('Please enter a house join code.');
      return;
    }
    setErrorMessage('');
    try {
      const house = await store.joinHouseByCode(joinCode.trim(), currentUser.id);
      if (onComplete) onComplete(house.id);
    } catch (err) {
      setErrorMessage(err.message || 'Failed to join house.');
    }
  };

  // 1. Google Sign-In Screen
  if (!currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-[#090d16] p-4 transition-colors">
        <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-slate-100 dark:border-gray-700 p-8 space-y-6">
          <div className="text-center space-y-2">
            <div className="inline-flex p-3 bg-indigo-600 rounded-2xl text-white shadow-md">
              <Home className="w-8 h-8" />
            </div>
            <h1 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">Roommate Chore Manager</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Fair, automated chore scheduling for shared homes.
            </p>
          </div>

          <form onSubmit={handleGoogleLogin} className="space-y-4">
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Google Display Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Alex Smith"
                  value={googleName}
                  onChange={(e) => setGoogleName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-400 text-sm outline-none focus:ring-2 focus:ring-indigo-500 font-semibold"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Google Email Address
                </label>
                <input
                  type="email"
                  placeholder="alex@example.com"
                  value={googleEmail}
                  onChange={(e) => setGoogleEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-400 text-sm outline-none focus:ring-2 focus:ring-indigo-500 font-semibold"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm transition shadow-md flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                <path d="M12.545,10.239v3.821h5.445c-0.712,2.315-2.647,3.972-5.445,3.972c-3.332,0-6.033-2.701-6.033-6.032s2.701-6.032,6.033-6.032c1.498,0,2.866,0.549,3.921,1.453l2.814-2.814C17.503,2.988,15.139,2,12.545,2C7.021,2,2.543,6.477,2.543,12s4.478,10,10.002,10c8.396,0,10.249-7.85,9.426-11.761H12.545z" />
              </svg>
              Continue with Google Account
            </button>
          </form>

          <div className="text-center pt-1">
            <button
              onClick={() => setShowConfigHelp(!showConfigHelp)}
              className="text-[11px] text-slate-400 hover:text-indigo-600 inline-flex items-center gap-1 font-medium"
            >
              <HelpCircle className="w-3 h-3" />
              Google Cloud OAuth Config Info
            </button>
            {showConfigHelp && (
              <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-2 bg-slate-50 dark:bg-gray-700/50 p-2.5 rounded border border-slate-200 dark:border-gray-700 text-left">
                To connect production Google OAuth popup logins, add <code className="font-mono bg-white dark:bg-gray-800 px-1">NEXT_PUBLIC_GOOGLE_CLIENT_ID</code> to your environment settings.
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  // 2. Create or Join House Screen
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-[#090d16] p-4 transition-colors">
      <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-slate-100 dark:border-gray-700 p-8 space-y-6">
        
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            Signed in as {currentUser.full_name}
          </div>
          <h2 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">Get Started with a House</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Create a fresh house for your roommates or enter a join code.
          </p>
        </div>

        {errorMessage && (
          <div className="bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 text-xs font-medium p-3 rounded-lg border border-rose-200 dark:border-rose-900">
            {errorMessage}
          </div>
        )}

        {mode === 'CHOICE' && (
          <div className="space-y-3">
            <button
              onClick={() => {
                setMode('CREATE');
                setErrorMessage('');
              }}
              className="w-full p-4 rounded-xl border-2 border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/30 hover:bg-indigo-100/50 text-left transition group flex items-center justify-between"
            >
              <div>
                <h3 className="font-bold text-indigo-950 dark:text-indigo-200 text-sm flex items-center gap-2">
                  <PlusCircle className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  CREATE A HOUSE
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                  Set up a house from scratch. Zero demo data.
                </p>
              </div>
              <ArrowRight className="w-5 h-5 text-indigo-600 dark:text-indigo-400 group-hover:translate-x-1 transition" />
            </button>

            <button
              onClick={() => {
                setMode('JOIN');
                setErrorMessage('');
              }}
              className="w-full p-4 rounded-xl border-2 border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-indigo-400 text-left transition group flex items-center justify-between"
            >
              <div>
                <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm flex items-center gap-2">
                  <Key className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                  JOIN A HOUSE
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Enter an 8-character code shared by your house admin.
                </p>
              </div>
              <ArrowRight className="w-5 h-5 text-slate-400 group-hover:translate-x-1 transition" />
            </button>
          </div>
        )}

        {mode === 'CREATE' && (
          <form onSubmit={handleCreateHouseSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                House Name
              </label>
              <input
                type="text"
                placeholder="e.g. Sunset Apartments"
                value={houseName}
                onChange={(e) => setHouseName(e.target.value)}
                autoFocus
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-400 text-sm outline-none focus:ring-2 focus:ring-indigo-500 font-semibold"
              />
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setMode('CHOICE')}
                className="flex-1 py-2.5 rounded-lg border border-slate-300 dark:border-gray-600 text-slate-600 dark:text-slate-300 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-gray-700"
              >
                Back
              </button>
              <button
                type="submit"
                className="flex-1 py-2.5 rounded-lg bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 shadow-sm"
              >
                Create House
              </button>
            </div>
          </form>
        )}

        {mode === 'JOIN' && (
          <form onSubmit={handleJoinHouseSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                House Join Code
              </label>
              <input
                type="text"
                placeholder="e.g. K7XM2P"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                autoFocus
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-400 text-sm font-mono tracking-widest text-center uppercase outline-none focus:ring-2 focus:ring-indigo-500 font-bold"
              />
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setMode('CHOICE')}
                className="flex-1 py-2.5 rounded-lg border border-slate-300 dark:border-gray-600 text-slate-600 dark:text-slate-300 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-gray-700"
              >
                Back
              </button>
              <button
                type="submit"
                className="flex-1 py-2.5 rounded-lg bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 shadow-sm"
              >
                Join House
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
