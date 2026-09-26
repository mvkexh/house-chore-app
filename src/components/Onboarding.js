'use client';

import { useState, useEffect } from 'react';
import { Home, Sparkles, Key, PlusCircle, ArrowRight, UserCheck } from 'lucide-react';
import { store } from '../lib/storage';
import { signInWithGoogle, isFirebaseConfigured } from '../lib/firebase';

export default function Onboarding({ currentUser, onComplete }) {
  const [googleName, setGoogleName] = useState('');
  const [googleEmail, setGoogleEmail] = useState('');
  const [isSigningInOAuth, setIsSigningInOAuth] = useState(false);

  // Name setup state
  const [displayNameInput, setDisplayNameInput] = useState('');

  // House setup mode ('CHOICE', 'CREATE', 'JOIN')
  const [mode, setMode] = useState('CHOICE');
  const [houseName, setHouseName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Sync initial display name input from Google account or user profile
  useEffect(() => {
    if (currentUser) {
      setDisplayNameInput(currentUser.full_name || currentUser.email?.split('@')[0] || '');
    }
  }, [currentUser]);

  const handleTriggerGoogleOAuth = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    setErrorMessage('');
    
    // Launch Google Auth Popup synchronously in the user click event tick
    const authPromise = signInWithGoogle();
    setIsSigningInOAuth(true);

    authPromise
      .then(async (res) => {
        if (res && res.user) {
          const u = res.user;
          await store.loginWithGoogle({
            id: u.uid,
            email: u.email || 'user@example.com',
            full_name: u.displayName || '',
            avatar_url: u.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(u.email || 'user')}`,
            has_chosen_name: Boolean(u.displayName && u.displayName.trim()),
          });
        }
      })
      .catch((err) => {
        console.warn('[Google OAuth Popup Warning]', err);
        setErrorMessage(err.message || 'Google Sign-In failed. Please try again.');
      })
      .finally(() => {
        setIsSigningInOAuth(false);
      });
  };

  // 2. Handle Manual Local Login (Fallback when Firebase Auth is unconfigured)
  const handleLocalFormLogin = (e) => {
    e.preventDefault();
    const name = googleName.trim();
    const email = googleEmail.trim() || 'user@example.com';

    store.loginWithGoogle({
      id: 'usr_' + Math.random().toString(36).substring(2, 9),
      email: email,
      full_name: name,
      avatar_url: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name || email)}`,
      has_chosen_name: Boolean(name),
    });
  };

  // 3. Handle Mandatory Name Confirmation / Setup Submit
  const handleSaveChosenName = (e) => {
    e.preventDefault();
    const cleanName = displayNameInput.trim();
    if (!cleanName) {
      setErrorMessage('Please enter a valid display name.');
      return;
    }
    setErrorMessage('');
    store.updateUserProfile(currentUser.id, {
      full_name: cleanName,
      has_chosen_name: true,
    });
  };

  // 4. Handle Create House Submit
  const handleCreateHouseSubmit = async (e) => {
    e.preventDefault();
    if (!houseName.trim()) {
      setErrorMessage('Please enter a house name.');
      return;
    }
    setErrorMessage('');
    try {
      const house = await store.createHouse(houseName.trim(), currentUser.id);
      if (onComplete) onComplete(house.id);
    } catch (err) {
      setErrorMessage(err.message || 'Failed to create house.');
    }
  };

  // 5. Handle Join House Submit
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

  // STEP A: Not Logged In -> Google Sign-In Screen
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

          {errorMessage && (
            <div className="bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 text-xs font-medium p-3 rounded-lg border border-rose-200 dark:border-rose-900">
              {errorMessage}
            </div>
          )}

          <div className="space-y-4">
            {/* Primary Google Sign-In Button */}
            <button
              type="button"
              onClick={handleTriggerGoogleOAuth}
              disabled={isSigningInOAuth}
              className="w-full py-3.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-sm transition shadow-md flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-60"
            >
              <svg className="w-5 h-5 fill-current shrink-0" viewBox="0 0 24 24">
                <path d="M12.545,10.239v3.821h5.445c-0.712,2.315-2.647,3.972-5.445,3.972c-3.332,0-6.033-2.701-6.033-6.032s2.701-6.032,6.033-6.032c1.498,0,2.866,0.549,3.921,1.453l2.814-2.814C17.503,2.988,15.139,2,12.545,2C7.021,2,2.543,6.477,2.543,12s4.478,10,10.002,10c8.396,0,10.249-7.85,9.426-11.761H12.545z" />
              </svg>
              {isSigningInOAuth ? 'Opening Google Account Selection...' : 'Continue with Google Account'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // STEP B: Logged In BUT No Chosen Display Name -> Show "What should we call you?" Screen
  if (!currentUser.has_chosen_name) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-[#090d16] p-4 transition-colors">
        <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-slate-100 dark:border-gray-700 p-8 space-y-6">
          <div className="text-center space-y-2">
            <div className="inline-flex p-3 bg-indigo-50 dark:bg-indigo-950/50 rounded-2xl text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900 shadow-xs">
              <UserCheck className="w-7 h-7" />
            </div>
            <h2 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">What should we call you?</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Enter your preferred display name so your roommates can recognize you in the chore schedule.
            </p>
          </div>

          {errorMessage && (
            <div className="bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 text-xs font-medium p-3 rounded-lg border border-rose-200 dark:border-rose-900">
              {errorMessage}
            </div>
          )}

          <form onSubmit={handleSaveChosenName} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Display Name
              </label>
              <input
                type="text"
                placeholder="e.g. Alex Smith"
                value={displayNameInput}
                onChange={(e) => setDisplayNameInput(e.target.value)}
                autoFocus
                required
                className="w-full px-3.5 py-3 rounded-xl border border-slate-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 text-sm outline-none focus:ring-2 focus:ring-indigo-500 font-bold"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-sm transition shadow-md flex items-center justify-center gap-2 cursor-pointer"
            >
              Continue
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    );
  }

  // STEP C: Logged In & Name Set -> House Setup Screen (Create or Join)
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
              className="w-full p-4 rounded-xl border-2 border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/30 hover:bg-indigo-100/50 text-left transition group flex items-center justify-between cursor-pointer"
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
              className="w-full p-4 rounded-xl border-2 border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-indigo-400 text-left transition group flex items-center justify-between cursor-pointer"
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
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 text-sm outline-none focus:ring-2 focus:ring-indigo-500 font-semibold"
              />
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setMode('CHOICE')}
                className="flex-1 py-2.5 rounded-lg border border-slate-300 dark:border-gray-600 text-slate-600 dark:text-slate-300 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-gray-700 cursor-pointer"
              >
                Back
              </button>
              <button
                type="submit"
                className="flex-1 py-2.5 rounded-lg bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 shadow-sm cursor-pointer"
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
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 text-sm font-mono tracking-widest text-center uppercase outline-none focus:ring-2 focus:ring-indigo-500 font-bold"
              />
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setMode('CHOICE')}
                className="flex-1 py-2.5 rounded-lg border border-slate-300 dark:border-gray-600 text-slate-600 dark:text-slate-300 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-gray-700 cursor-pointer"
              >
                Back
              </button>
              <button
                type="submit"
                className="flex-1 py-2.5 rounded-lg bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 shadow-sm cursor-pointer"
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
