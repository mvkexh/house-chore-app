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
} from 'firebase/firestore';

class DiagnosticStore {
  constructor() {
    this.listeners = [];
    this.state = {
      firebaseConfigured: false,
      firebaseUser: null,
      uid: 'NONE',
      isInitializing: true,
      redirectResult: 'pending',
      firestoreStatus: 'pending',
      firestoreError: null,
      lastErrorCode: 'NONE',
      lastErrorMessage: null,
    };
    this.logs = [];
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
    if (this.logs.length > 50) this.logs.pop();
    this.notify();
  }

  update(patch) {
    this.state = { ...this.state, ...patch };
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

// Ensure local persistence for cross-tab and cross-redirect auth state
if (typeof window !== 'undefined') {
  const isConfigured = isFirebaseConfigured();
  diagStore.update({
    firebaseConfigured: isConfigured,
    firebaseUser: auth.currentUser ? auth.currentUser.email : null,
    uid: auth.currentUser ? auth.currentUser.uid : 'NONE',
  });
  diagStore.log(`Init: Firebase initialized. Configured: ${isConfigured ? 'YES ✅' : 'NO ❌'}`);

  setPersistence(auth, browserLocalPersistence).catch((err) => {
    diagStore.log(`Init Error: Persistence error [${err.code || 'UNKNOWN'}] ${err.message}`, 'error');
    diagStore.update({ lastErrorCode: err.code || 'PERSISTENCE_ERR', lastErrorMessage: err.message });
  });
}

const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

/**
 * Authentication Helpers
 */
export async function signInWithGoogle() {
  if (typeof window === 'undefined') return;

  diagStore.log('Step 1: signInWithGoogle button clicked', 'info');

  if (!isFirebaseConfigured()) {
    const errStr = 'Firebase Auth Configuration Error: Invalid or missing credentials.';
    diagStore.log(`Step 1 ERROR: ${errStr}`, 'error');
    diagStore.update({ lastErrorCode: 'MISSING_CONFIG', lastErrorMessage: errStr });
    throw new Error(errStr);
  }

  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });

  try {
    diagStore.log('Step 1: Invoking signInWithPopup (Popup Flow)...', 'info');
    const result = await signInWithPopup(auth, provider);
    if (result && result.user) {
      diagStore.log(`Step 1 SUCCESS: Popup signed in as ${result.user.email} (UID: ${result.user.uid})`, 'success');
      diagStore.update({
        firebaseUser: result.user.email,
        uid: result.user.uid,
        lastErrorCode: 'NONE',
        lastErrorMessage: null,
      });
    }
    return result;
  } catch (error) {
    diagStore.log(`Step 1 Warning: Popup error [${error.code || 'POPUP_ERR'}] ${error.message}`, 'error');
    diagStore.update({ lastErrorCode: error.code || 'POPUP_ERR', lastErrorMessage: error.message });

    // Automatic fallback to signInWithRedirect when popup is blocked by browser or closed
    if (
      error.code === 'auth/popup-blocked' ||
      error.code === 'auth/popup-closed-by-user' ||
      error.message?.includes('popup-blocked')
    ) {
      diagStore.log('Step 1 Fallback: Popup blocked/closed. Initiating signInWithRedirect...', 'info');
      await signInWithRedirect(auth, provider);
      return null;
    }

    throw new Error(`Google Sign-In Error: [${error.code || 'POPUP_ERR'}] ${error.message}`);
  }
}

export async function handleAuthRedirectResult() {
  if (typeof window === 'undefined') return null;
  diagStore.log('Step 2: Executing getRedirectResult()...', 'info');
  try {
    const result = await getRedirectResult(auth);
    if (result && result.user) {
      diagStore.log(`Step 2 SUCCESS: getRedirectResult returned user ${result.user.email} (UID: ${result.user.uid})`, 'success');
      diagStore.update({
        redirectResult: 'success',
        firebaseUser: result.user.email,
        uid: result.user.uid,
        lastErrorCode: 'NONE',
        lastErrorMessage: null,
      });
      return result.user;
    } else {
      diagStore.log('Step 2 NULL: getRedirectResult returned null (No redirect payload)', 'info');
      diagStore.update({ redirectResult: 'null' });
    }
  } catch (error) {
    diagStore.log(`Step 2 ERROR: getRedirectResult failed [${error.code}] ${error.message}`, 'error');
    diagStore.update({
      redirectResult: 'error',
      lastErrorCode: error.code || 'REDIRECT_ERR',
      lastErrorMessage: error.message,
    });
  }
  return null;
}

export async function signOutUser() {
  diagStore.log('Step Logout: User initiated logout', 'info');
  try {
    await firebaseSignOut(auth);
    diagStore.log('Step Logout SUCCESS: User signed out from Firebase Auth', 'success');
    diagStore.update({ firebaseUser: null, uid: 'NONE' });
  } catch (err) {
    diagStore.log(`Step Logout Warning: [${err.code}] ${err.message}`, 'error');
  }
}

export function subscribeToAuthState(callback) {
  diagStore.log('Step 3: Registering onAuthStateChanged listener', 'info');
  return firebaseOnAuthStateChanged(auth, (user) => {
    if (user) {
      diagStore.log(`Step 3 SUCCESS: onAuthStateChanged user: ${user.email} (UID: ${user.uid})`, 'success');
      diagStore.update({
        firebaseUser: user.email,
        uid: user.uid,
        isInitializing: false,
      });
    } else {
      diagStore.log('Step 3 NULL: onAuthStateChanged user is null (No active session)', 'info');
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
    const memberDocId = memberObj.id || `${memberObj.house_id}_${memberObj.user_id}`;
    const memberRef = doc(db, 'houseMembers', memberDocId);
    const docData = {
      id: memberDocId,
      houseId: memberObj.house_id || memberObj.houseId,
      userId: memberObj.user_id || memberObj.userId,
      displayName: memberObj.display_name || memberObj.displayName,
      role: memberObj.role || 'MEMBER',
      isActive: memberObj.is_active !== undefined ? memberObj.is_active : true,
      joinedAt: memberObj.joined_at || memberObj.joinedAt || new Date().toISOString(),
    };
    await setDoc(memberRef, docData);
    return memberObj;
  } catch (err) {
    console.error('[Firestore Error] Create member error:', err.message);
    throw new Error(`Firestore error adding member: ${err.message}`);
  }
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

    // Query members
    const membersQuery = query(collection(db, 'houseMembers'), where('houseId', '==', houseId));
    const membersSnap = await getDocs(membersQuery);
    const members = membersSnap.docs.map((d) => {
      const data = d.data();
      return {
        id: data.id,
        house_id: data.houseId,
        user_id: data.userId,
        display_name: data.displayName,
        role: data.role,
        is_active: data.isActive,
        joined_at: data.joinedAt,
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
        id: houseData.id,
        name: houseData.name,
        invite_code: houseData.inviteCode,
        created_by: houseData.createdBy,
        created_at: houseData.createdAt,
      },
      members,
      chores,
      assignments,
      completions,
      attentionRequests,
    };
  } catch (err) {
    console.error('[Firestore Error] Fetch house data error:', err.message);
    return null;
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
    const membersQuery = query(collection(db, 'houseMembers'), where('userId', '==', userId));
    const membersSnap = await getDocs(membersQuery);
    if (membersSnap.empty) {
      diagStore.log(`Step 4B NULL: No houseMembers documents found for UID: ${userId}`, 'info');
      return [];
    }

    const activeMemberDocs = membersSnap.docs.filter((d) => d.data().isActive !== false);
    const houseIds = [...new Set(activeMemberDocs.map((d) => d.data().houseId))];
    diagStore.log(`Step 4B SUCCESS: Found ${houseIds.length} active house membership(s) for UID: ${userId}`, 'success');
    
    const housePromises = houseIds.map((hId) => dbFetchHouseData(hId));
    const housesData = await Promise.all(housePromises);
    return housesData.filter(Boolean);
  } catch (err) {
    diagStore.log(`Step 4B ERROR: Querying houseMembers failed [${err.code || 'permission-denied'}]: ${err.message}`, 'error');
    diagStore.update({
      firestoreStatus: `error (${err.code || 'permission-denied'})`,
      firestoreError: `[${err.code || 'permission-denied'}] ${err.message}`,
      lastErrorCode: err.code || 'FIRESTORE_QUERY_ERR',
      lastErrorMessage: err.message,
    });
    return [];
  }
}

