'use client';

import { useState, useEffect } from 'react';
import DiagnosticPanel from '../components/DiagnosticPanel';
import { store, syncHouseWithServer } from '../lib/storage';
import { subscribeToAuthState, handleAuthRedirectResult, subscribeToHouseRealtimeData, auth, diagStore } from '../lib/firebase';
import Navbar from '../components/Navbar';
import MobileBottomNav from '../components/MobileBottomNav';
import Onboarding from '../components/Onboarding';
import Dashboard from '../components/Dashboard';
import ChoresView from '../components/ChoresView';
import MembersView from '../components/MembersView';
import HistoryView from '../components/HistoryView';
import NotificationsView from '../components/NotificationsView';
import ProfileModal from '../components/ProfileModal';
import ChoresModal from '../components/ChoresModal';
import Toast from '../components/Toast';

export default function Home() {
  const [dbState, setDbState] = useState(store.getRawData());
  const [currentUser, setCurrentUser] = useState(store.getCurrentUser());
  const [activeHouseId, setActiveHouseId] = useState(store.getActiveHouseId());
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isAuthInitializing, setIsAuthInitializing] = useState(true);

  // Modals & UI Controls
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showChoreModal, setShowChoreModal] = useState(false);
  const [showCreateHouseModal, setShowCreateHouseModal] = useState(false);
  const [showJoinHouseModal, setShowJoinHouseModal] = useState(false);
  const [showEditHouseModal, setShowEditHouseModal] = useState(false);
  const [newHouseName, setNewHouseName] = useState('');
  const [editHouseNameInput, setEditHouseNameInput] = useState('');
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [modalError, setModalError] = useState('');

  // Toast Banner State
  const [toast, setToast] = useState(null);

  const showToast = (toastObj) => {
    setToast(toastObj);
    setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => {
    let isMounted = true;

    // 1. Local Store Subscription
    const unsubscribeStore = store.subscribe(() => {
      if (!isMounted) return;
      setDbState(store.getRawData());
      setCurrentUser(store.getCurrentUser());
      setActiveHouseId(store.getActiveHouseId());
    });

    // 2. Await Firebase Auth Persistence Initialization (IndexedDB on Mobile/PWA)
    const initAuthSession = async () => {
      try {
        if (auth && typeof auth.authStateReady === 'function') {
          await auth.authStateReady();
        }
      } catch (err) {
        console.warn('[Auth State Ready Error]', err);
      }
    };
    initAuthSession();

    // 3. Firebase Auth State Change Listener (Google OAuth)
    const unsubscribeAuth = subscribeToAuthState(async (user) => {
      if (!isMounted) return;

      if (user) {
        diagStore.log(`Step 3: Processing authenticated user ${user.email} (UID: ${user.uid})`, 'info');
        const googleProfile = {
          id: user.uid,
          email: user.email,
          full_name: user.displayName || user.email?.split('@')[0] || '',
          avatar_url: user.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(user.email || 'user')}`,
          has_chosen_name: Boolean(user.displayName && user.displayName.trim()),
        };
        await store.loginWithGoogle(googleProfile);

        const updatedUser = store.getCurrentUser();
        const userHouses = updatedUser ? store.getUserHouses(updatedUser.id) : [];
        let destination = 'Dashboard';
        if (!updatedUser) destination = 'Onboarding Step A (Sign In Screen)';
        else if (!updatedUser.has_chosen_name) destination = 'Onboarding Step B (Name Setup)';
        else if (userHouses.length === 0) destination = 'Onboarding Step C (House Setup)';

        diagStore.log(`Step 5 DECISION: Auth guard destination -> ${destination}`, destination === 'Dashboard' ? 'success' : 'info');
      } else {
        diagStore.log('Step 3: Unauthenticated state observed', 'info');
        if (!store.getCurrentUser()) {
          store.clearCurrentUserIfUnauthenticated();
        }
      }

      if (isMounted) {
        setIsAuthInitializing(false);
      }
    });

    // 4. Handle OAuth Redirect Result (if returning from signInWithRedirect)
    handleAuthRedirectResult().then(async (user) => {
      if (!isMounted) return;
      if (user) {
        diagStore.log(`Step 2: Processing redirect user ${user.email} (UID: ${user.uid})`, 'info');
        const googleProfile = {
          id: user.uid,
          email: user.email,
          full_name: user.displayName || user.email?.split('@')[0] || '',
          avatar_url: user.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(user.email || 'user')}`,
          has_chosen_name: Boolean(user.displayName && user.displayName.trim()),
        };
        await store.loginWithGoogle(googleProfile);
        if (isMounted) setIsAuthInitializing(false);
      }
    });

    return () => {
      isMounted = false;
      unsubscribeStore();
      unsubscribeAuth();
    };
  }, []);

  // Live Realtime Firestore Listeners for active house (WebSockets / onSnapshot)
  useEffect(() => {
    if (!activeHouseId) return;

    syncHouseWithServer(activeHouseId);

    const unsubscribeRealtime = subscribeToHouseRealtimeData(activeHouseId, (realtimeData) => {
      store.updateRealtimeHouseData(realtimeData);
    });

    return () => {
      unsubscribeRealtime();
    };
  }, [activeHouseId]);

  const userHouses = currentUser ? store.getUserHouses(currentUser.id) : [];
  let activeHouse = userHouses.find((h) => h.id === activeHouseId);

  if (!activeHouse && userHouses.length > 0) {
    activeHouse = userHouses[0];
    if (activeHouseId !== activeHouse.id) {
      store.setActiveHouseId(activeHouse.id);
    }
  }

  // 0. Auth Initializing State -> Render Diagnostic Panel + Loading Spinner
  if (isAuthInitializing) {
    return (
      <main className="min-h-screen pt-40 flex flex-col items-center justify-center bg-slate-50 dark:bg-[#090d16] text-slate-900 dark:text-slate-100 transition-colors">
        <DiagnosticPanel />
        <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">Verifying session & Firestore profiles...</p>
      </main>
    );
  }

  // 1. Not Logged In OR Display Name Not Setup OR No House Joined Yet -> Show Onboarding Screen + Diagnostic Panel
  if (!currentUser || !currentUser.has_chosen_name || !activeHouse) {
    return (
      <main className="min-h-screen pt-40 bg-slate-50 dark:bg-[#090d16] transition-colors">
        <DiagnosticPanel />
        <Onboarding
          currentUser={currentUser}
          onComplete={(houseId) => {
            setActiveHouseId(houseId);
            setActiveTab('dashboard');
          }}
        />
      </main>
    );
  }

  // Active House Data
  const members = store.getHouseMembers(activeHouse.id);
  const chores = store.getHouseChores(activeHouse.id);
  const notifications = store.getUserNotifications(currentUser.id);
  const unreadNotifCount = notifications.filter((n) => !n.is_read).length;

  const handleModalCreateHouse = async (e) => {
    e.preventDefault();
    if (!newHouseName.trim()) return;
    try {
      await store.createHouse(newHouseName.trim(), currentUser.id);
      setNewHouseName('');
      setModalError('');
      setShowCreateHouseModal(false);
      showToast({ type: 'success', message: 'New house created successfully!' });
      setActiveTab('dashboard');
    } catch (err) {
      setModalError(err.message || 'Failed to create house.');
    }
  };

  const handleModalJoinHouse = async (e) => {
    e.preventDefault();
    if (!joinCodeInput.trim()) return;
    try {
      await store.joinHouseByCode(joinCodeInput.trim(), currentUser.id);
      setJoinCodeInput('');
      setModalError('');
      setShowJoinHouseModal(false);
      showToast({ type: 'success', message: 'Joined house successfully!' });
      setActiveTab('dashboard');
    } catch (err) {
      setModalError(err.message);
    }
  };

  const handleModalEditHouse = (e) => {
    e.preventDefault();
    if (!editHouseNameInput.trim()) return;
    try {
      store.updateHouseName(activeHouse.id, editHouseNameInput.trim());
      setEditHouseNameInput('');
      setModalError('');
      setShowEditHouseModal(false);
      showToast({ type: 'success', message: 'House name updated successfully!' });
    } catch (err) {
      setModalError(err.message);
    }
  };

  return (
    <div className="min-h-screen pt-40 flex flex-col bg-slate-50 dark:bg-[#090d16] text-slate-900 dark:text-slate-100 transition-colors">
      <DiagnosticPanel />
      {/* Top Navbar */}
      <Navbar
        currentUser={currentUser}
        activeHouse={activeHouse}
        userHouses={userHouses}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenCreateHouse={() => {
          setModalError('');
          setShowCreateHouseModal(true);
        }}
        onOpenJoinHouse={() => {
          setModalError('');
          setShowJoinHouseModal(true);
        }}
        onOpenEditHouse={() => {
          setModalError('');
          setEditHouseNameInput(activeHouse.name);
          setShowEditHouseModal(true);
        }}
        onOpenProfile={() => setShowProfileModal(true)}
        unreadNotifCount={unreadNotifCount}
        onShowToast={showToast}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-24 md:pb-8">
        {activeTab === 'dashboard' && (
          <Dashboard
            house={activeHouse}
            currentUser={currentUser}
            members={members}
            chores={chores}
            onNavigateToChores={() => setActiveTab('chores')}
            onOpenCreateChore={() => setShowChoreModal(true)}
            onShowToast={showToast}
          />
        )}

        {activeTab === 'chores' && (
          <ChoresView
            house={activeHouse}
            currentUser={currentUser}
            chores={chores}
          />
        )}

        {activeTab === 'members' && (
          <MembersView
            house={activeHouse}
            members={members}
            currentUser={currentUser}
          />
        )}

        {activeTab === 'history' && (
          <HistoryView
            house={activeHouse}
            chores={chores}
            members={members}
            currentUser={currentUser}
          />
        )}

        {activeTab === 'notifications' && (
          <NotificationsView
            notifications={notifications}
            onMarkRead={(id) => store.markNotificationRead(id)}
          />
        )}
      </main>

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        unreadNotifCount={unreadNotifCount}
      />

      {/* Toast Notification Banner */}
      <Toast toast={toast} onClose={() => setToast(null)} />

      {/* Profile & Settings Modal */}
      {showProfileModal && (
        <ProfileModal
          currentUser={currentUser}
          activeHouse={activeHouse}
          onClose={() => setShowProfileModal(false)}
          onShowToast={showToast}
        />
      )}

      {/* 4-Step Chore Creation Modal */}
      {showChoreModal && (
        <ChoresModal
          house={activeHouse}
          currentUser={currentUser}
          onClose={() => setShowChoreModal(false)}
          onShowToast={showToast}
        />
      )}

      {/* CREATE HOUSE MODAL */}
      {showCreateHouseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-2xl border border-slate-200 dark:border-gray-700">
            <h3 className="font-extrabold text-slate-900 dark:text-slate-100 text-lg">Create New House</h3>
            <form onSubmit={handleModalCreateHouse} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  House Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Palm Villa"
                  value={newHouseName}
                  onChange={(e) => setNewHouseName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-xs font-semibold outline-none"
                  autoFocus
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateHouseModal(false)}
                  className="flex-1 py-2.5 text-xs font-bold border border-slate-300 dark:border-gray-600 text-slate-600 dark:text-slate-300 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 text-xs font-bold bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 shadow-md"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* JOIN HOUSE MODAL */}
      {showJoinHouseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-2xl border border-slate-200 dark:border-gray-700">
            <h3 className="font-extrabold text-slate-900 dark:text-slate-100 text-lg">Join House by Code</h3>
            {modalError && (
              <p className="text-xs text-rose-600 bg-rose-50 p-2 rounded-xl border border-rose-200">
                {modalError}
              </p>
            )}
            <form onSubmit={handleModalJoinHouse} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  House Code
                </label>
                <input
                  type="text"
                  placeholder="e.g. K7XM2P"
                  value={joinCodeInput}
                  onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase())}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-gray-600 bg-white dark:bg-gray-700 font-mono text-center tracking-widest text-xs outline-none uppercase font-extrabold"
                  autoFocus
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowJoinHouseModal(false)}
                  className="flex-1 py-2.5 text-xs font-bold border border-slate-300 dark:border-gray-600 text-slate-600 dark:text-slate-300 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 text-xs font-bold bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 shadow-md"
                >
                  Join House
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT HOUSE NAME MODAL */}
      {showEditHouseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-2xl border border-slate-200 dark:border-gray-700">
            <h3 className="font-extrabold text-slate-900 dark:text-slate-100 text-lg">Edit House Name</h3>
            {modalError && (
              <p className="text-xs text-rose-600 bg-rose-50 p-2 rounded-xl border border-rose-200">
                {modalError}
              </p>
            )}
            <form onSubmit={handleModalEditHouse} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  House Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Palm Villa"
                  value={editHouseNameInput}
                  onChange={(e) => setEditHouseNameInput(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-xs font-semibold outline-none"
                  autoFocus
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowEditHouseModal(false)}
                  className="flex-1 py-2.5 text-xs font-bold border border-slate-300 dark:border-gray-600 text-slate-600 dark:text-slate-300 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 text-xs font-bold bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 shadow-md"
                >
                  Save Name
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
