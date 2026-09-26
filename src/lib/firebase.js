/**
 * Roommate Chore Manager — Firebase Cloud Infrastructure Integration Layer
 * Provides Firebase Authentication, Cloud Firestore Data Persistence, and Security.
 */
import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  setPersistence,
  browserLocalPersistence,
  signOut as firebaseSignOut,
  onAuthStateChanged as firebaseOnAuthStateChanged,
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  getDocs,
  deleteDoc,
  updateDoc,
  collection,
  query,
  where,
  writeBatch,
  onSnapshot,
} from 'firebase/firestore';

const DIAG_LOGS_KEY = 'roommate_diag_logs_v2';
const DIAG_STATE_KEY = 'roommate_diag_state_v2';

class DiagnosticStore {
  constructor() {
    this.listeners = [];
    this.state = this.loadState();
    this.logs = this.loadLogs();

    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => {
        this.log('[UNLOAD EVENT] Page is reloading / navigating away', 'error');
      });
    }
  }

  loadState() {
    if (typeof window === 'undefined') return this.defaultState();
    try {
      const raw = sessionStorage.getItem(DIAG_STATE_KEY);
      return raw ? JSON.parse(raw) : this.defaultState();
    } catch (e) {
      return this.defaultState();
    }
  }

  loadLogs() {
    if (typeof window === 'undefined') return [];
    try {
      const raw = sessionStorage.getItem(DIAG_LOGS_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  }

  defaultState() {
    return {
      firebaseConfigured: false,
      firebaseUser: null,
      uid: 'NONE',
      isInitializing: true,
      redirectResult: 'pending',
      firestoreStatus: 'pending',
      firestoreError: null,
      lastErrorCode: 'NONE',
      lastErrorMessage: null,
      persistenceConfigured: 'pending',
    };
  }

  subscribe(listener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  notify() {
    this.listeners.forEach((l) => l());
  }

  log(msg, type = 'info') {
    const time = new Date().toLocaleTimeString();
    console.log(`[Auth Flow Diagnostic] [${time}] ${msg}`);
    this.logs.unshift({ time, msg, type });
    if (this.logs.length > 80) this.logs.pop();
    if (typeof window !== 'undefined') {
      try {
        sessionStorage.setItem(DIAG_LOGS_KEY, JSON.stringify(this.logs));
      } catch (e) {}
    }
    this.notify();
  }

  update(patch) {
    this.state = { ...this.state, ...patch };
    if (typeof window !== 'undefined') {
      try {
        sessionStorage.setItem(DIAG_STATE_KEY, JSON.stringify(this.state));
      } catch (e) {}
    }
    this.notify();
  }

  clearLogs() {
    this.logs = [];
    this.state = this.defaultState();
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem(DIAG_LOGS_KEY);
      sessionStorage.removeItem(DIAG_STATE_KEY);
    }
    this.notify();
  }
}

export const diagStore = new DiagnosticStore();

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 'AIzaSyDbzM0q_IdhC3vp4d5W3WgD3xZvNtoA46I',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || 'device-streaming-3f82148c.firebaseapp.com',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'device-streaming-3f82148c',
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || 'device-streaming-3f82148c.firebasestorage.app',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '165171432088',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '1:165171432088:web:3e08207a867aadb2419eed',
};

export function isFirebaseConfigured() {
  const key = firebaseConfig.apiKey;
  const proj = firebaseConfig.projectId;
  return Boolean(key) && !key.includes('Mock') && !key.includes('YourValid') && Boolean(proj);
}

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);
export const db = getFirestore(app);

export let persistencePromise = Promise.resolve();

// Ensure local persistence for cross-tab and cross-redirect auth state
if (typeof window !== 'undefined') {
  const isConfigured = isFirebaseConfigured();
  diagStore.update({
    firebaseConfigured: isConfigured,
    firebaseUser: auth.currentUser ? auth.currentUser.email : null,
    uid: auth.currentUser ? auth.currentUser.uid : 'NONE',
  });
  diagStore.log(`Init: Firebase initialized. Configured: ${isConfigured ? 'YES ✅' : 'NO ❌'}`);

  persistencePromise = setPersistence(auth, browserLocalPersistence)
    .then(() => {
      diagStore.log('persistence configured = SUCCESS (browserLocalPersistence)', 'success');
      diagStore.update({ persistenceConfigured: 'SUCCESS' });
    })
    .catch((err) => {
      diagStore.log(`persistence configured = ERROR [${err.code || 'UNKNOWN'}] ${err.message}`, 'error');
      diagStore.update({
        persistenceConfigured: `ERROR (${err.code})`,
        lastErrorCode: err.code || 'PERSISTENCE_ERR',
        lastErrorMessage: err.message,
      });
    });
}

const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

/**
 * Authentication Helpers
 */
export function signInWithGoogle() {
  if (typeof window === 'undefined') return Promise.resolve(null);

  diagStore.log('BUTTON CLICKED', 'info');
  diagStore.log('signInWithPopup START', 'info');

  if (!isFirebaseConfigured()) {
    const errStr = 'Firebase Auth Configuration Error: Invalid or missing credentials.';
    diagStore.log(`signInWithPopup ERROR: ${errStr}`, 'error');
    diagStore.update({ lastErrorCode: 'MISSING_CONFIG', lastErrorMessage: errStr });
    return Promise.reject(new Error(errStr));
  }

  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });

  return signInWithPopup(auth, provider)
    .then((result) => {
      if (result && result.user) {
        diagStore.log('signInWithPopup SUCCESS', 'success');
        diagStore.log(`UserCredential UID = ${result.user.uid}`, 'success');
        diagStore.log(`auth.currentUser UID = ${auth.currentUser ? auth.currentUser.uid : 'null'}`, 'success');
        diagStore.update({
          firebaseUser: result.user.email,
          uid: result.user.uid,
          lastErrorCode: 'NONE',
          lastErrorMessage: null,
        });
      }
      return result;
    })
    .catch((error) => {
      diagStore.log(`signInWithPopup ERROR: [${error.code || 'POPUP_ERR'}] ${error.message}`, 'error');
      diagStore.update({
        lastErrorCode: error.code || 'POPUP_ERR',
        lastErrorMessage: error.message,
      });
      // STOP immediately. Do NOT initiate signInWithRedirect or reload the page!
      throw new Error(`Google Sign-In Error: [${error.code || 'POPUP_ERR'}] ${error.message}`);
    });
}

export async function handleAuthRedirectResult() {
  // Pure popup flow: getRedirectResult is not involved
  return null;
}

export async function signOutUser() {
  diagStore.log('Step Logout: User initiated logout', 'info');
  try {
    if (auth) {
      await firebaseSignOut(auth);
    }
    diagStore.log('Step Logout SUCCESS: User signed out from Firebase Auth', 'success');
    diagStore.update({ firebaseUser: null, uid: 'NONE' });
  } catch (err) {
    console.error('[Firebase signOutUser error]', err);
    diagStore.log(`Step Logout Warning: [${err.code || 'UNKNOWN'}] ${err.message}`, 'error');
  }
}

export function subscribeToAuthState(callback) {
  diagStore.log('onAuthStateChanged = LISTENER_REGISTERED', 'info');
  return firebaseOnAuthStateChanged(auth, (user) => {
    if (user) {
      diagStore.log(`onAuthStateChanged = USER_AUTHENTICATED (${user.email}) | UID = ${user.uid}`, 'success');
      diagStore.log(`auth.currentUser UID = ${auth.currentUser ? auth.currentUser.uid : 'null'}`, 'success');
      diagStore.update({
        firebaseUser: user.email,
        uid: user.uid,
        isInitializing: false,
      });
    } else {
      diagStore.log(`onAuthStateChanged = NULL (auth.currentUser = ${auth.currentUser ? auth.currentUser.uid : 'null'})`, 'info');
      diagStore.update({
        firebaseUser: null,
        uid: auth.currentUser ? auth.currentUser.uid : 'NONE',
        isInitializing: false,
      });
    }
    callback(user);
  });
}

/**
 * User Profile Operations
 */
export async function dbUpsertUserProfile(userObj) {
  if (!userObj || !userObj.id) return userObj;
  if (!isFirebaseConfigured()) return userObj;

  diagStore.log(`Step 4A: Writing Firestore profile for UID: ${userObj.id}...`, 'info');
  try {
    const userRef = doc(db, 'users', userObj.id);
    const profileData = {
      id: userObj.id,
      email: userObj.email,
      fullName: userObj.full_name || userObj.fullName,
      avatarUrl: userObj.avatar_url || userObj.avatarUrl,
      updatedAt: new Date().toISOString(),
    };
    await setDoc(userRef, profileData, { merge: true });
    diagStore.log(`Step 4A SUCCESS: Firestore profile written for UID: ${userObj.id}`, 'success');
    diagStore.update({ firestoreStatus: 'success', firestoreError: null });
    return userObj;
  } catch (err) {
    diagStore.log(`Step 4A ERROR: Firestore profile write failed [${err.code}]: ${err.message}`, 'error');
    diagStore.update({
      firestoreStatus: `error (${err.code || 'permission-denied'})`,
      firestoreError: `[${err.code || 'permission-denied'}] ${err.message}`,
      lastErrorCode: err.code || 'FIRESTORE_WRITE_ERR',
      lastErrorMessage: err.message,
    });
    return userObj;
  }
}

/**
 * Cloud Firestore House Operations
 */
export async function dbCreateHouseAtomic(houseObj, memberObj) {
  if (!isFirebaseConfigured()) return houseObj;

  diagStore.log(`Step 4C: Creating house ${houseObj.id} atomically for UID: ${memberObj.user_id}...`, 'info');

  try {
    const batch = writeBatch(db);

    // 1. House Document
    const houseRef = doc(db, 'houses', houseObj.id);
    const houseDocData = {
      id: houseObj.id,
      name: houseObj.name,
      inviteCode: houseObj.invite_code || houseObj.inviteCode,
      createdBy: houseObj.created_by || houseObj.createdBy,
      createdAt: houseObj.created_at || houseObj.createdAt || new Date().toISOString(),
    };
    batch.set(houseRef, houseDocData);

    // 2. House Member Document
    const memberDocId = memberObj.id || `${memberObj.house_id}_${memberObj.user_id}`;
    const memberRef = doc(db, 'houseMembers', memberDocId);
    const memberDocData = {
      id: memberDocId,
      houseId: memberObj.house_id || memberObj.houseId,
      userId: memberObj.user_id || memberObj.userId,
      displayName: memberObj.display_name || memberObj.displayName,
      role: memberObj.role || 'ADMIN',
      isActive: memberObj.is_active !== undefined ? memberObj.is_active : true,
      joinedAt: memberObj.joined_at || memberObj.joinedAt || new Date().toISOString(),
    };
    batch.set(memberRef, memberDocData);

    await batch.commit();
    diagStore.log(`Step 4C SUCCESS: House ${houseObj.id} and member ${memberDocId} created atomically`, 'success');
    return houseObj;
  } catch (err) {
    diagStore.log(`Step 4C ERROR: Atomic House Creation failed [${err.code || 'UNKNOWN'}]: ${err.message}`, 'error');
    throw new Error(`Firestore error creating house: ${err.message}`);
  }
}

export async function dbCreateHouse(houseObj) {
  if (!isFirebaseConfigured()) return houseObj;

  try {
    const houseRef = doc(db, 'houses', houseObj.id);
    const docData = {
      id: houseObj.id,
      name: houseObj.name,
      inviteCode: houseObj.invite_code || houseObj.inviteCode,
      createdBy: houseObj.created_by || houseObj.createdBy,
      createdAt: houseObj.created_at || houseObj.createdAt || new Date().toISOString(),
    };
    await setDoc(houseRef, docData);
    return houseObj;
  } catch (err) {
    console.error('[Firestore Error] Create house error:', err.message);
    throw new Error(`Firestore error creating house: ${err.message}`);
  }
}

export async function dbCreateMember(memberObj) {
  if (!isFirebaseConfigured()) return memberObj;

  try {
    const houseId = memberObj.house_id || memberObj.houseId;
    const userId = memberObj.user_id || memberObj.userId;
    const memberDocId = `${houseId}_${userId}`;
    const memberRef = doc(db, 'houseMembers', memberDocId);
    const docData = {
      id: memberDocId,
      houseId: houseId,
      house_id: houseId,
      userId: userId,
      user_id: userId,
      displayName: memberObj.display_name || memberObj.displayName,
      display_name: memberObj.display_name || memberObj.displayName,
      role: memberObj.role || 'MEMBER',
      isActive: memberObj.is_active !== undefined ? memberObj.is_active : true,
      is_active: memberObj.is_active !== undefined ? memberObj.is_active : true,
      joinedAt: memberObj.joined_at || memberObj.joinedAt || new Date().toISOString(),
      joined_at: memberObj.joined_at || memberObj.joinedAt || new Date().toISOString(),
    };
    await setDoc(memberRef, docData, { merge: true });
    return memberObj;
  } catch (err) {
    console.error('[Firestore Error] Create member error:', err.message);
    throw new Error(`Firestore error adding member: ${err.message}`);
  }
}

export async function dbSaveChore(choreObj) {
  if (!choreObj || !choreObj.id || !isFirebaseConfigured()) return choreObj;
  try {
    const choreRef = doc(db, 'chores', choreObj.id);
    const docData = {
      id: choreObj.id,
      houseId: choreObj.house_id || choreObj.houseId,
      house_id: choreObj.house_id || choreObj.houseId,
      title: choreObj.title,
      description: choreObj.description || '',
      createdBy: choreObj.created_by || choreObj.createdBy,
      created_by: choreObj.created_by || choreObj.createdBy,
      choreType: choreObj.chore_type || choreObj.choreType || 'REPEAT_ON_DEMAND',
      chore_type: choreObj.chore_type || choreObj.choreType || 'REPEAT_ON_DEMAND',
      frequency: choreObj.frequency || 'WEEKLY',
      requiredPeopleCount: choreObj.required_people_count || choreObj.requiredPeopleCount || 1,
      required_people_count: choreObj.required_people_count || choreObj.requiredPeopleCount || 1,
      scheduleDay: choreObj.schedule_day || choreObj.scheduleDay || 'Monday',
      schedule_day: choreObj.schedule_day || choreObj.scheduleDay || 'Monday',
      scheduleTime: choreObj.schedule_time || choreObj.scheduleTime || '19:00',
      schedule_time: choreObj.schedule_time || choreObj.scheduleTime || '19:00',
      startDate: choreObj.start_date || choreObj.startDate || new Date().toISOString().split('T')[0],
      start_date: choreObj.start_date || choreObj.startDate || new Date().toISOString().split('T')[0],
      notes: choreObj.notes || '',
      subItems: choreObj.sub_items || choreObj.subItems || [],
      sub_items: choreObj.sub_items || choreObj.subItems || [],
      dailyReminderEnabled: Boolean(choreObj.daily_reminder_enabled || choreObj.dailyReminderEnabled),
      daily_reminder_enabled: Boolean(choreObj.daily_reminder_enabled || choreObj.dailyReminderEnabled),
      dailyReminderTime: choreObj.daily_reminder_time || choreObj.dailyReminderTime || '19:00',
      daily_reminder_time: choreObj.daily_reminder_time || choreObj.dailyReminderTime || '19:00',
      assignmentPreferenceType: choreObj.assignment_preference_type || choreObj.assignmentPreferenceType || 'AUTOMATIC',
      assignment_preference_type: choreObj.assignment_preference_type || choreObj.assignmentPreferenceType || 'AUTOMATIC',
      preferredUserIds: choreObj.preferred_user_ids || choreObj.preferredUserIds || [],
      preferred_user_ids: choreObj.preferred_user_ids || choreObj.preferredUserIds || [],
      avoidUserIds: choreObj.avoid_user_ids || choreObj.avoidUserIds || [],
      avoid_user_ids: choreObj.avoid_user_ids || choreObj.avoidUserIds || [],
      isActive: choreObj.is_active !== undefined ? choreObj.is_active : true,
      is_active: choreObj.is_active !== undefined ? choreObj.is_active : true,
      createdAt: choreObj.created_at || choreObj.createdAt || new Date().toISOString(),
      created_at: choreObj.created_at || choreObj.createdAt || new Date().toISOString(),
    };
    await setDoc(choreRef, docData, { merge: true });
    return choreObj;
  } catch (err) {
    console.error('[Firestore Error] Save chore error:', err);
    throw err;
  }
}

export async function dbDeleteChore(choreId) {
  if (!choreId || !isFirebaseConfigured()) return;
  try {
    await deleteDoc(doc(db, 'chores', choreId));
  } catch (err) {
    console.error('[Firestore Error] Delete chore error:', err);
  }
}

export async function dbSaveAssignments(assignments) {
  if (!Array.isArray(assignments) || assignments.length === 0 || !isFirebaseConfigured()) return;
  try {
    const batch = writeBatch(db);
    assignments.forEach((a) => {
      if (!a || !a.id) return;
      const ref = doc(db, 'assignments', a.id);
      const docData = {
        id: a.id,
        houseId: a.house_id || a.houseId,
        house_id: a.house_id || a.houseId,
        choreId: a.chore_id || a.choreId,
        chore_id: a.chore_id || a.choreId,
        scheduleId: a.schedule_id || a.scheduleId,
        schedule_id: a.schedule_id || a.scheduleId,
        actualMemberIds: a.actual_member_ids || a.actualMemberIds || [],
        actual_member_ids: a.actual_member_ids || a.actualMemberIds || [],
        assignedNames: a.assigned_names || a.assignedNames || [],
        assigned_names: a.assigned_names || a.assignedNames || [],
        status: a.status || 'PENDING',
        dueDate: a.due_date || a.dueDate || '',
        due_date: a.due_date || a.dueDate || '',
        dueTime: a.due_time || a.dueTime || '',
        due_time: a.due_time || a.dueTime || '',
        completedAt: a.completed_at || a.completedAt || null,
        completed_at: a.completed_at || a.completedAt || null,
        completedBy: a.completed_by || a.completedBy || null,
        completed_by: a.completed_by || a.completedBy || null,
        source: a.source || 'AUTOMATIC',
        createdAt: a.created_at || a.createdAt || new Date().toISOString(),
        created_at: a.created_at || a.createdAt || new Date().toISOString(),
      };
      batch.set(ref, docData, { merge: true });
    });
    await batch.commit();
  } catch (err) {
    console.error('[Firestore Error] Save assignments error:', err);
  }
}

export async function dbSaveCompletionEvent(completionObj) {
  if (!completionObj || !completionObj.id || !isFirebaseConfigured()) return completionObj;
  try {
    const ref = doc(db, 'completionEvents', completionObj.id);
    const docData = {
      id: completionObj.id,
      houseId: completionObj.house_id || completionObj.houseId,
      house_id: completionObj.house_id || completionObj.houseId,
      choreId: completionObj.chore_id || completionObj.choreId,
      chore_id: completionObj.chore_id || completionObj.choreId,
      assignmentId: completionObj.assignment_id || completionObj.assignmentId,
      assignment_id: completionObj.assignment_id || completionObj.assignmentId,
      completedByUserId: completionObj.completed_by_user_id || completionObj.completedByUserId,
      completed_by_user_id: completionObj.completed_by_user_id || completionObj.completedByUserId,
      completedByName: completionObj.completed_by_name || completionObj.completedByName,
      completed_by_name: completionObj.completed_by_name || completionObj.completedByName,
      completionType: completionObj.completion_type || completionObj.completionType || 'ALONE',
      completion_type: completionObj.completion_type || completionObj.completionType || 'ALONE',
      participants: completionObj.participants || [],
      participantNames: completionObj.participant_names || completionObj.participantNames || [],
      participant_names: completionObj.participant_names || completionObj.participantNames || [],
      timestamp: completionObj.timestamp || new Date().toISOString(),
    };
    await setDoc(ref, docData, { merge: true });
    return completionObj;
  } catch (err) {
    console.error('[Firestore Error] Save completion event error:', err);
  }
}

export async function dbSaveAttentionRequest(attnObj) {
  if (!attnObj || !attnObj.id || !isFirebaseConfigured()) return attnObj;
  try {
    const ref = doc(db, 'attentionRequests', attnObj.id);
    const docData = {
      id: attnObj.id,
      houseId: attnObj.house_id || attnObj.houseId,
      house_id: attnObj.house_id || attnObj.houseId,
      choreId: attnObj.chore_id || attnObj.choreId,
      chore_id: attnObj.chore_id || attnObj.choreId,
      reportedByUserId: attnObj.reported_by_user_id || attnObj.reportedByUserId,
      reported_by_user_id: attnObj.reported_by_user_id || attnObj.reportedByUserId,
      reportedByName: attnObj.reported_by_name || attnObj.reportedByName,
      reported_by_name: attnObj.reported_by_name || attnObj.reportedByName,
      reason: attnObj.reason || '',
      note: attnObj.note || '',
      status: attnObj.status || 'OPEN',
      timestamp: attnObj.timestamp || new Date().toISOString(),
    };
    await setDoc(ref, docData, { merge: true });
    return attnObj;
  } catch (err) {
    console.error('[Firestore Error] Save attention request error:', err);
  }
}

export async function dbSaveNotification(notifObj) {
  if (!notifObj || !notifObj.id || !isFirebaseConfigured()) return notifObj;
  try {
    const ref = doc(db, 'notifications', notifObj.id);
    const docData = {
      id: notifObj.id,
      userId: notifObj.user_id || notifObj.userId,
      user_id: notifObj.user_id || notifObj.userId,
      houseId: notifObj.house_id || notifObj.houseId,
      house_id: notifObj.house_id || notifObj.houseId,
      type: notifObj.type || 'GENERAL',
      title: notifObj.title || 'Notification',
      message: notifObj.message || '',
      isRead: Boolean(notifObj.is_read || notifObj.isRead),
      is_read: Boolean(notifObj.is_read || notifObj.isRead),
      createdAt: notifObj.created_at || notifObj.createdAt || new Date().toISOString(),
      created_at: notifObj.created_at || notifObj.createdAt || new Date().toISOString(),
    };
    await setDoc(ref, docData, { merge: true });
    return notifObj;
  } catch (err) {
    console.error('[Firestore Error] Save notification error:', err);
  }
}

export async function dbMarkNotificationRead(notificationId) {
  if (!notificationId || !isFirebaseConfigured()) return;
  try {
    const ref = doc(db, 'notifications', notificationId);
    await updateDoc(ref, { isRead: true, is_read: true });
  } catch (err) {
    console.error('[Firestore Error] Mark notification read error:', err);
  }
}

export function subscribeToUserNotifications(userId, callback) {
  if (!userId || !isFirebaseConfigured()) return () => {};
  
  let notifQuery = query(collection(db, 'notifications'), where('userId', '==', userId));
  
  return onSnapshot(
    notifQuery,
    (snap) => {
      const notifications = snap.docs.map((d) => {
        const data = d.data();
        return {
          id: data.id || d.id,
          user_id: data.userId || data.user_id,
          house_id: data.houseId || data.house_id,
          type: data.type,
          title: data.title,
          message: data.message,
          is_read: data.isRead !== undefined ? data.isRead : Boolean(data.is_read),
          created_at: data.createdAt || data.created_at,
        };
      }).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      
      callback(notifications);
    },
    (err) => console.warn('[Realtime Notifications Error]', err.message)
  );
}

export async function dbFetchHouseByCode(code) {
  if (!code || !isFirebaseConfigured()) return null;
  const cleanCode = code.trim().toUpperCase();

  try {
    const housesRef = collection(db, 'houses');
    const q = query(housesRef, where('inviteCode', '==', cleanCode));
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
      const docSnap = querySnapshot.docs[0];
      const data = docSnap.data();
      return {
        id: data.id,
        name: data.name,
        invite_code: data.inviteCode,
        created_by: data.createdBy,
        created_at: data.createdAt,
      };
    }
  } catch (err) {
    console.error('[Firestore Error] Fetch house by code failed:', err.message);
    throw new Error(`Firestore error looking up house code "${cleanCode}": ${err.message}`);
  }
  return null;
}

export async function dbFetchHouseData(houseId) {
  if (!houseId || !isFirebaseConfigured()) return null;

  try {
    const houseSnap = await getDoc(doc(db, 'houses', houseId));
    if (!houseSnap.exists()) return null;

    const houseData = houseSnap.data();

    // Query members (support camelCase 'houseId' and snake_case 'house_id')
    let membersQuery = query(collection(db, 'houseMembers'), where('houseId', '==', houseId));
    let membersSnap = await getDocs(membersQuery);
    if (membersSnap.empty) {
      const altQuery = query(collection(db, 'houseMembers'), where('house_id', '==', houseId));
      const altSnap = await getDocs(altQuery);
      if (!altSnap.empty) membersSnap = altSnap;
    }

    const members = membersSnap.docs.map((d) => {
      const data = d.data();
      return {
        id: data.id || d.id,
        house_id: data.houseId || data.house_id || houseId,
        user_id: data.userId || data.user_id,
        display_name: data.displayName || data.display_name,
        role: data.role,
        is_active: data.isActive !== false && data.is_active !== false,
        joined_at: data.joinedAt || data.joined_at,
      };
    });

    // Query chores
    const choresQuery = query(collection(db, 'chores'), where('houseId', '==', houseId));
    const choresSnap = await getDocs(choresQuery);
    const chores = choresSnap.docs.map((d) => d.data());

    // Query assignments
    const assignmentsQuery = query(collection(db, 'assignments'), where('houseId', '==', houseId));
    const assignSnap = await getDocs(assignmentsQuery);
    const assignments = assignSnap.docs.map((d) => d.data());

    // Query completions
    const completionsQuery = query(collection(db, 'completionEvents'), where('houseId', '==', houseId));
    const compSnap = await getDocs(completionsQuery);
    const completions = compSnap.docs.map((d) => d.data());

    // Query attention requests
    const attnQuery = query(collection(db, 'attentionRequests'), where('houseId', '==', houseId));
    const attnSnap = await getDocs(attnQuery);
    const attentionRequests = attnSnap.docs.map((d) => d.data());

    return {
      house: {
        id: houseData.id || houseSnap.id,
        name: houseData.name,
        invite_code: houseData.inviteCode || houseData.invite_code,
        created_by: houseData.createdBy || houseData.created_by,
        created_at: houseData.createdAt || houseData.created_at,
      },
      members,
      chores,
      assignments,
      completions,
      attentionRequests,
    };
  } catch (err) {
    console.error(`[FIRESTORE HOUSE DATA ERROR] dbFetchHouseData failed for houseId "${houseId}":`, err);
    throw err;
  }
}

export async function dbDeleteHouse(houseId) {
  if (!houseId || !isFirebaseConfigured()) return;
  try {
    // Delete house document
    await deleteDoc(doc(db, 'houses', houseId));

    // Delete member documents
    const membersQuery = query(collection(db, 'houseMembers'), where('houseId', '==', houseId));
    const membersSnap = await getDocs(membersQuery);
    const deletePromises = membersSnap.docs.map((d) => deleteDoc(d.ref));
    await Promise.all(deletePromises);
  } catch (err) {
    console.error('[Firestore Error] Delete house error:', err.message);
  }
}

export async function dbUpdateMemberDisplayName(userId, newDisplayName) {
  if (!userId || !newDisplayName || !isFirebaseConfigured()) return;
  try {
    const membersQuery = query(collection(db, 'houseMembers'), where('userId', '==', userId));
    const membersSnap = await getDocs(membersQuery);
    const updatePromises = membersSnap.docs.map((d) => updateDoc(d.ref, { displayName: newDisplayName }));
    await Promise.all(updatePromises);
  } catch (err) {
    console.error('[Firestore Error] Update member display name error:', err.message);
  }
}

export async function dbFetchUserHouses(userId) {
  if (!userId || !isFirebaseConfigured()) return [];
  diagStore.log(`Step 4B: Querying houseMembers for UID: ${userId}...`, 'info');
  try {
    let membersQuery = query(collection(db, 'houseMembers'), where('userId', '==', userId));
    let membersSnap = await getDocs(membersQuery);

    if (membersSnap.empty) {
      const altQuery = query(collection(db, 'houseMembers'), where('user_id', '==', userId));
      const altSnap = await getDocs(altQuery);
      if (!altSnap.empty) {
        membersSnap = altSnap;
      }
    }

    if (membersSnap.empty) {
      diagStore.log(`Step 4B NULL: No houseMembers documents found for UID: ${userId}`, 'info');
      return [];
    }

    const activeMemberDocs = membersSnap.docs.filter((d) => {
      const data = d.data();
      return data.isActive !== false && data.is_active !== false;
    });

    const houseIds = [...new Set(activeMemberDocs.map((d) => d.data().houseId || d.data().house_id).filter(Boolean))];
    diagStore.log(`Step 4B SUCCESS: Found ${houseIds.length} active house membership(s) for UID: ${userId}`, 'success');
    
    const housePromises = houseIds.map((hId) => dbFetchHouseData(hId));
    const housesData = await Promise.all(housePromises);
    return housesData.filter(Boolean);
  } catch (err) {
    console.error(`[FIRESTORE QUERY ERROR] dbFetchUserHouses failed for UID "${userId}":`, err);
    diagStore.log(`Step 4B ERROR: Querying houseMembers failed [${err.code || 'UNKNOWN'}]: ${err.message}`, 'error');
    diagStore.update({
      firestoreStatus: `error (${err.code || 'UNKNOWN'})`,
      firestoreError: `[${err.code || 'UNKNOWN'}] ${err.message}`,
      lastErrorCode: err.code || 'FIRESTORE_QUERY_ERR',
      lastErrorMessage: err.message,
    });
    throw err;
  }
}

/**
  * Realtime Firestore Subscriptions for PWA / Mobile live updates
  */
export function subscribeToHouseRealtimeData(houseId, callback) {
  if (!houseId || !isFirebaseConfigured()) return () => {};

  diagStore.log(`Subscribing to realtime Firestore snapshots for house: ${houseId}`, 'info');

  const houseRef = doc(db, 'houses', houseId);
  const membersQuery = query(collection(db, 'houseMembers'), where('houseId', '==', houseId));
  const choresQuery = query(collection(db, 'chores'), where('houseId', '==', houseId));
  const assignmentsQuery = query(collection(db, 'assignments'), where('houseId', '==', houseId));
  const completionsQuery = query(collection(db, 'completionEvents'), where('houseId', '==', houseId));
  const attnQuery = query(collection(db, 'attentionRequests'), where('houseId', '==', houseId));

  const currentData = {
    house: null,
    members: [],
    chores: [],
    assignments: [],
    completions: [],
    attentionRequests: [],
  };

  const emit = () => {
    if (currentData.house) {
      callback({ ...currentData });
    }
  };

  const unsubHouse = onSnapshot(
    houseRef,
    (docSnap) => {
      if (docSnap.exists()) {
        const d = docSnap.data();
        currentData.house = {
          id: d.id || docSnap.id,
          name: d.name,
          invite_code: d.inviteCode,
          created_by: d.createdBy,
          created_at: d.createdAt,
        };
        emit();
      }
    },
    (err) => console.warn('[Realtime House Error]', err.message)
  );

  const unsubMembers = onSnapshot(
    membersQuery,
    (snap) => {
      currentData.members = snap.docs.map((d) => {
        const data = d.data();
        return {
          id: data.id || d.id,
          house_id: data.houseId,
          user_id: data.userId,
          display_name: data.displayName,
          role: data.role,
          is_active: data.isActive !== false,
          joined_at: data.joinedAt,
        };
      });
      emit();
    },
    (err) => console.warn('[Realtime Members Error]', err.message)
  );

  const unsubChores = onSnapshot(
    choresQuery,
    (snap) => {
      currentData.chores = snap.docs.map((d) => d.data());
      emit();
    },
    (err) => console.warn('[Realtime Chores Error]', err.message)
  );

  const unsubAssignments = onSnapshot(
    assignmentsQuery,
    (snap) => {
      currentData.assignments = snap.docs.map((d) => d.data());
      emit();
    },
    (err) => console.warn('[Realtime Assignments Error]', err.message)
  );

  const unsubCompletions = onSnapshot(
    completionsQuery,
    (snap) => {
      currentData.completions = snap.docs.map((d) => d.data());
      emit();
    },
    (err) => console.warn('[Realtime Completions Error]', err.message)
  );

  const unsubAttn = onSnapshot(
    attnQuery,
    (snap) => {
      currentData.attentionRequests = snap.docs.map((d) => d.data());
      emit();
    },
    (err) => console.warn('[Realtime Attention Error]', err.message)
  );

  return () => {
    unsubHouse();
    unsubMembers();
    unsubChores();
    unsubAssignments();
    unsubCompletions();
    unsubAttn();
  };
}

