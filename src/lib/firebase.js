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

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 'AIzaSyMockApiKeyForRoommateChoreManager',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || 'roommate-chore-manager.firebaseapp.com',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'roommate-chore-manager',
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || 'roommate-chore-manager.appspot.com',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '123456789012',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '1:123456789012:web:abcdef1234567890',
};

export function isFirebaseConfigured() {
  return (
    Boolean(process.env.NEXT_PUBLIC_FIREBASE_API_KEY) &&
    !process.env.NEXT_PUBLIC_FIREBASE_API_KEY.includes('Mock') &&
    Boolean(process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID)
  );
}

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);
export const db = getFirestore(app);

const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

/**
 * Authentication Helpers
 */
export async function signInWithGoogle() {
  if (typeof window === 'undefined') return;

  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });

  try {
    const result = await signInWithPopup(auth, provider);
    return result;
  } catch (error) {
    console.warn('[Firebase Auth Warning] Popup sign-in error:', error.code, error.message);
    
    // Automatically trigger signInWithRedirect fallback when popup is blocked by browser or closed
    if (
      error.code === 'auth/popup-blocked' ||
      error.code === 'auth/popup-closed-by-user' ||
      error.message?.includes('popup-blocked')
    ) {
      console.log('[Firebase Auth] Popup blocked/closed. Initiating signInWithRedirect...');
      await signInWithRedirect(auth, provider);
      return null;
    }
    
    throw new Error(`Google Sign-In Error: ${error.message}`);
  }
}

export async function handleAuthRedirectResult() {
  if (typeof window === 'undefined') return null;
  try {
    const result = await getRedirectResult(auth);
    if (result && result.user) {
      console.log('[Firebase Auth] Redirect sign-in success:', result.user.email);
      return result.user;
    }
  } catch (error) {
    console.error('[Firebase Auth Error] getRedirectResult Error:', error.message);
  }
  return null;
}

export async function signOutUser() {
  try {
    await firebaseSignOut(auth);
  } catch (err) {
    console.warn('[Firebase Auth Warning] Sign out error:', err.message);
  }
}

export function subscribeToAuthState(callback) {
  return firebaseOnAuthStateChanged(auth, callback);
}

/**
 * User Profile Operations
 */
export async function dbUpsertUserProfile(userObj) {
  if (!userObj || !userObj.id) return userObj;
  if (!isFirebaseConfigured()) return userObj;

  try {
    const userRef = doc(db, 'users', userObj.id);
    const profileData = {
      id: userObj.id,
      email: userObj.email,
      fullName: userObj.full_name || userObj.fullName,
      avatarUrl: userObj.avatar_url || userObj.avatarUrl,
      hasChosenName: Boolean(userObj.has_chosen_name || userObj.hasChosenName),
      updatedAt: new Date().toISOString(),
    };
    await setDoc(userRef, profileData, { merge: true });
    return userObj;
  } catch (err) {
    console.error('[Firestore Error] Profile upsert error:', err.message);
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

