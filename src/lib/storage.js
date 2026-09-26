/**
 * Roommate Chore Manager — Central Storage & Database Persistence Engine
 */
import { ROLES, RESPONSIBILITY_STATUS, ASSIGNMENT_SOURCE, CHORE_TYPES, CHORE_FREQUENCIES } from './types';
import { generateWeeklySchedule, isDateInRange } from './scheduler';
import { dbCreateHouse, dbCreateMember, dbFetchHouseByCode, dbFetchHouseData, dbFetchUserHouses, dbUpsertUserProfile, dbDeleteHouse, dbUpdateMemberDisplayName, signOutUser, isFirebaseConfigured } from './firebase';

const STORAGE_KEY = 'roommate_chore_manager_db_v4';
const CURRENT_USER_KEY = 'roommate_chore_manager_user';
const ACTIVE_HOUSE_KEY = 'roommate_chore_manager_active_house';
const SHARED_CLOUD_KEY = 'roommate_chore_manager_cloud_registry_v2';

function getSharedCloudRegistry() {
  if (typeof window === 'undefined') return { houses: [], house_members: [], chores: [], assignments: [], completion_events: [], attention_requests: [] };
  try {
    const raw = localStorage.getItem(SHARED_CLOUD_KEY);
    if (!raw) return { houses: [], house_members: [], chores: [], assignments: [], completion_events: [], attention_requests: [] };
    const parsed = JSON.parse(raw);
    return {
      houses: Array.isArray(parsed.houses) ? parsed.houses : [],
      house_members: Array.isArray(parsed.house_members) ? parsed.house_members : [],
      chores: Array.isArray(parsed.chores) ? parsed.chores : [],
      assignments: Array.isArray(parsed.assignments) ? parsed.assignments : [],
      completion_events: Array.isArray(parsed.completion_events) ? parsed.completion_events : [],
      attention_requests: Array.isArray(parsed.attention_requests) ? parsed.attention_requests : [],
    };
  } catch (e) {
    return { houses: [], house_members: [], chores: [], assignments: [], completion_events: [], attention_requests: [] };
  }
}

function updateSharedCloudRegistry(updaterFn) {
  if (typeof window === 'undefined') return;
  try {
    const current = getSharedCloudRegistry();
    const next = updaterFn(current);
    localStorage.setItem(SHARED_CLOUD_KEY, JSON.stringify(next));
  } catch (e) {
    console.warn('[Shared Cloud Registry Error]', e);
  }
}

const INITIAL_DB = {
  users: [],
  houses: [],
  house_members: [],
  chores: [],
  weekly_schedules: [],
  assignments: [],
  completion_events: [],
  attention_requests: [],
  absences: [],
  reminders: [],
  notifications: [],
  house_holidays: [],
};

export function getWeekDetails(dateInput = new Date()) {
  const d = new Date(dateInput);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay() || 7;
  if (day !== 1) d.setHours(-24 * (day - 1));
  const weekStart = new Date(d);
  const weekEnd = new Date(d);
  weekEnd.setDate(weekEnd.getDate() + 6);

  const yearStart = new Date(d.getFullYear(), 0, 1);
  const weekNumber = Math.ceil(((d - yearStart) / 86400000 + yearStart.getDay() + 1) / 7);

  return {
    year: d.getFullYear(),
    weekNumber: weekNumber || 1,
    weekStartDate: weekStart.toISOString().split('T')[0],
    weekEndDate: weekEnd.toISOString().split('T')[0],
  };
}

class Store {
  constructor() {
    this.listeners = [];
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

  getRawData() {
    if (typeof window === 'undefined') return INITIAL_DB;
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (!data) return INITIAL_DB;
      const parsed = JSON.parse(data);

      const rawChores = Array.isArray(parsed.chores) ? parsed.chores : [];
      const rawAssignments = Array.isArray(parsed.assignments) ? parsed.assignments : [];
      const choresMap = new Map(rawChores.map((c) => [c.id, c]));
      const assignmentsMap = new Map(rawAssignments.map((a) => [a.id, a]));

      // Sanitize completion_events: purge events before chore created_at or orphaned events
      const rawCompletions = Array.isArray(parsed.completion_events) ? parsed.completion_events : [];
      const sanitizedCompletions = rawCompletions
        .filter((ce) => {
          if (!ce || !ce.chore_id) return false;
          const chore = choresMap.get(ce.chore_id);
          if (!chore) return false; // Orphaned record for deleted chore

          // Check timestamp: completion cannot occur before chore was created
          if (chore.created_at && ce.timestamp) {
            const ceTime = new Date(ce.timestamp).getTime();
            const choreTime = new Date(chore.created_at).getTime();
            if (ceTime < choreTime - 60000) return false; // Purge invalid pre-creation test completions
          }
          return true;
        })
        .map((ce) => {
          // Strict rule: "TOGETHER" MUST have at least 2 distinct participants
          const participants = Array.isArray(ce.participants) ? ce.participants : [ce.completed_by_user_id];
          const participantNames = Array.isArray(ce.participant_names) ? ce.participant_names : [ce.completed_by_name];
          if (ce.completion_type === 'TOGETHER' && (participantNames.length < 2 || participants.length < 2)) {
            return {
              ...ce,
              completion_type: 'ALONE',
              completed_by_name: participantNames[0] || ce.completed_by_name || 'Roommate',
              participant_names: [participantNames[0] || ce.completed_by_name || 'Roommate'],
              participants: [ce.completed_by_user_id],
            };
          }
          return ce;
        });

      const cloud = getSharedCloudRegistry();

      const mergedHousesMap = new Map();
      (parsed.houses || []).forEach((h) => mergedHousesMap.set(h.id, h));
      (cloud.houses || []).forEach((h) => {
        if (mergedHousesMap.has(h.id)) {
          const existing = mergedHousesMap.get(h.id);
          if (h.invite_code) existing.invite_code = h.invite_code;
          if (h.name) existing.name = h.name;
        }
      });

      const mergedMembersMap = new Map();
      (parsed.house_members || []).forEach((m) => mergedMembersMap.set(m.id, m));
      (cloud.house_members || []).forEach((m) => {
        if (!mergedMembersMap.has(m.id)) mergedMembersMap.set(m.id, m);
        else {
          const existing = mergedMembersMap.get(m.id);
          if (m.is_active !== undefined) existing.is_active = m.is_active;
          if (m.role) existing.role = m.role;
        }
      });

      return {
        users: Array.isArray(parsed.users) ? parsed.users : [],
        houses: Array.from(mergedHousesMap.values()),
        house_members: Array.from(mergedMembersMap.values()),
        chores: rawChores,
        weekly_schedules: Array.isArray(parsed.weekly_schedules) ? parsed.weekly_schedules : [],
        assignments: rawAssignments,
        completion_events: sanitizedCompletions,
        attention_requests: Array.isArray(parsed.attention_requests) ? parsed.attention_requests : [],
        absences: Array.isArray(parsed.absences) ? parsed.absences : [],
        reminders: Array.isArray(parsed.reminders) ? parsed.reminders : [],
        notifications: Array.isArray(parsed.notifications) ? parsed.notifications : [],
        house_holidays: Array.isArray(parsed.house_holidays) ? parsed.house_holidays : [],
      };
    } catch (e) {
      console.error('Failed to parse storage:', e);
      return INITIAL_DB;
    }
  }

  saveRawData(data) {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      this.notify();
    } catch (e) {
      console.error('Failed to save storage:', e);
    }
  }

  // --- AUTHENTICATION ---
  getCurrentUser() {
    if (typeof window === 'undefined') return null;
    const userJson = localStorage.getItem(CURRENT_USER_KEY);
    return userJson ? JSON.parse(userJson) : null;
  }

  loginWithGoogle(googleProfile = null) {
    if (!googleProfile) return null;

    const db = this.getRawData();
    let existingUser = db.users.find((u) => u.email === googleProfile.email || u.id === googleProfile.id);

    const hasChosenName =
      googleProfile.has_chosen_name !== undefined
        ? googleProfile.has_chosen_name
        : Boolean(googleProfile.full_name && googleProfile.full_name.trim());

    if (!existingUser) {
      existingUser = {
        id: googleProfile.id || 'usr_' + Math.random().toString(36).substring(2, 9),
        email: googleProfile.email || 'user@example.com',
        full_name: googleProfile.full_name || '',
        avatar_url: googleProfile.avatar_url || '',
        has_chosen_name: hasChosenName,
        created_at: new Date().toISOString(),
      };
      db.users.push(existingUser);
    } else {
      if (googleProfile.full_name) {
        existingUser.full_name = googleProfile.full_name;
      }
      if (googleProfile.avatar_url) existingUser.avatar_url = googleProfile.avatar_url;
      if (googleProfile.has_chosen_name !== undefined) {
        existingUser.has_chosen_name = googleProfile.has_chosen_name;
      } else if (!existingUser.has_chosen_name && existingUser.full_name) {
        existingUser.has_chosen_name = true;
      }
    }
    this.saveRawData(db);

    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(existingUser));

    // Sync profile to Cloud Firestore
    dbUpsertUserProfile(existingUser);
    if (typeof fetch !== 'undefined') {
      fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ users: [existingUser] }),
      }).catch(() => {});
    }

    // Sync user houses from Cloud Firestore
    this.syncUserHousesFromFirestore(existingUser.id);

    this.notify();
    return existingUser;
  }

  async syncUserHousesFromFirestore(userId) {
    if (!userId || !isFirebaseConfigured()) return;
    try {
      const housesData = await dbFetchUserHouses(userId);
      if (housesData && housesData.length > 0) {
        const raw = this.getRawData();
        housesData.forEach((hData) => {
          if (!hData || !hData.house) return;

          // Merge house
          const hIdx = raw.houses.findIndex((h) => h.id === hData.house.id);
          if (hIdx >= 0) raw.houses[hIdx] = hData.house;
          else raw.houses.push(hData.house);

          // Merge members
          if (Array.isArray(hData.members)) {
            hData.members.forEach((m) => {
              const mIdx = raw.house_members.findIndex((x) => x.id === m.id);
              if (mIdx >= 0) raw.house_members[mIdx] = m;
              else raw.house_members.push(m);
            });
          }

          // Merge chores
          if (Array.isArray(hData.chores)) {
            hData.chores.forEach((c) => {
              const cIdx = raw.chores.findIndex((x) => x.id === c.id);
              if (cIdx >= 0) raw.chores[cIdx] = c;
              else raw.chores.push(c);
            });
          }

          // Merge assignments
          if (Array.isArray(hData.assignments)) {
            hData.assignments.forEach((a) => {
              const aIdx = raw.assignments.findIndex((x) => x.id === a.id);
              if (aIdx >= 0) raw.assignments[aIdx] = a;
              else raw.assignments.push(a);
            });
          }
        });

        this.saveRawData(raw);

        const currentActive = this.getActiveHouseId();
        const userHouses = this.getUserHouses(userId);
        if (!currentActive || !userHouses.some((h) => h.id === currentActive)) {
          if (userHouses.length > 0) {
            this.setActiveHouseId(userHouses[0].id);
          }
        }
        this.notify();
      }
    } catch (err) {
      console.warn('[Storage Error] syncUserHousesFromFirestore failed:', err.message);
    }
  }

  logout() {
    localStorage.removeItem(CURRENT_USER_KEY);
    localStorage.removeItem(ACTIVE_HOUSE_KEY);
    signOutUser();
    this.notify();
  }

  clearCurrentUserIfUnauthenticated() {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(CURRENT_USER_KEY);
    this.notify();
  }

  updateUserProfile(userId, { full_name, avatar_url, has_chosen_name }) {
    const db = this.getRawData();
    const user = db.users.find((u) => u.id === userId);
    if (user) {
      if (full_name !== undefined) user.full_name = full_name;
      if (avatar_url !== undefined) user.avatar_url = avatar_url;
      if (has_chosen_name !== undefined) user.has_chosen_name = has_chosen_name;
      this.saveRawData(db);
    }

    const currentUser = this.getCurrentUser();
    if (currentUser && currentUser.id === userId) {
      if (full_name !== undefined) currentUser.full_name = full_name;
      if (avatar_url !== undefined) currentUser.avatar_url = avatar_url;
      if (has_chosen_name !== undefined) currentUser.has_chosen_name = has_chosen_name;
      localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(currentUser));
    }

    // Also update display_name in house_members
    if (full_name) {
      db.house_members.forEach((hm) => {
        if (hm.user_id === userId) {
          hm.display_name = full_name;
        }
      });
      this.saveRawData(db);

      // Sync display name change to Cloud Firestore and Server API
      dbUpdateMemberDisplayName(userId, full_name);
      if (typeof fetch !== 'undefined') {
        fetch('/api/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ house_members: db.house_members.filter((hm) => hm.user_id === userId) }),
        }).catch(() => {});
      }
    }

    dbUpsertUserProfile(user || currentUser);
    this.notify();
  }

  // --- HOUSES ENGINE ---
  getActiveHouseId() {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(ACTIVE_HOUSE_KEY);
  }

  setActiveHouseId(houseId) {
    localStorage.setItem(ACTIVE_HOUSE_KEY, houseId);
    this.notify();
  }

  getUserHouses(userId) {
    const db = this.getRawData();
    const memberships = db.house_members.filter((hm) => hm.user_id === userId && hm.is_active !== false);
    const houseIds = memberships.map((m) => m.house_id);
    return db.houses.filter((h) => houseIds.includes(h.id));
  }

  async createHouse(houseName, userId) {
    const cleanHouseName = (houseName || '').trim();
    if (!cleanHouseName) throw new Error('Please enter a house name.');

    const db = this.getRawData();
    const houseId = 'house_' + Math.random().toString(36).substring(2, 9);
    const inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();

    const newHouse = {
      id: houseId,
      name: cleanHouseName,
      invite_code: inviteCode,
      created_by: userId,
      created_at: new Date().toISOString(),
    };

    const user = db.users.find((u) => u.id === userId);
    const initialMember = {
      id: 'hm_' + Math.random().toString(36).substring(2, 9),
      house_id: houseId,
      user_id: userId,
      display_name: user ? user.full_name : 'Admin',
      role: ROLES.ADMIN,
      is_active: true,
      joined_at: new Date().toISOString(),
    };

    // If Firebase Cloud Database is configured, insert to Firestore FIRST
    if (isFirebaseConfigured()) {
      await dbCreateHouse(newHouse);
      await dbCreateMember(initialMember);
    }

    db.houses.push(newHouse);
    db.house_members.push(initialMember);
    this.saveRawData(db);

    // Sync to Shared Cloud Registry
    updateSharedCloudRegistry((cloud) => ({
      ...cloud,
      houses: [...cloud.houses.filter((h) => h.id !== houseId), newHouse],
      house_members: [...cloud.house_members.filter((m) => m.id !== initialMember.id), initialMember],
    }));

    // Sync to Server API
    if (typeof fetch !== 'undefined') {
      fetch('/api/houses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newHouse),
      }).catch(() => {});

      fetch('/api/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(initialMember),
      }).catch(() => {});
    }

    this.setActiveHouseId(houseId);
    this.getOrCreateCurrentSchedule(houseId);

    return newHouse;
  }

  updateHouseName(houseId, newName) {
    const db = this.getRawData();
    const house = db.houses.find((h) => h.id === houseId);
    if (!house) throw new Error('House not found.');
    const cleanName = newName.trim();
    if (!cleanName) throw new Error('House name cannot be empty.');

    house.name = cleanName;
    this.saveRawData(db);
    return house;
  }

  regenerateHouseCode(houseId) {
    const db = this.getRawData();
    const house = db.houses.find((h) => h.id === houseId);
    if (!house) throw new Error('House not found.');
    const newCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    house.invite_code = newCode;
    this.saveRawData(db);
    return newCode;
  }

  async leaveHouse(houseId, userId) {
    const db = this.getRawData();
    const houseMembers = db.house_members.filter((hm) => hm.house_id === houseId && hm.is_active !== false);
    const member = houseMembers.find((hm) => hm.user_id === userId);
    if (!member) throw new Error('You are not an active member of this house.');

    const isAdmin = (member.role || '').toUpperCase() === ROLES.ADMIN || (member.role || '').toUpperCase() === 'ADMIN';
    const otherActiveMembers = houseMembers.filter((hm) => hm.user_id !== userId);

    if (isAdmin && otherActiveMembers.length > 0) {
      const otherAdmins = otherActiveMembers.filter((hm) => (hm.role || '').toUpperCase() === ROLES.ADMIN || (hm.role || '').toUpperCase() === 'ADMIN');
      if (otherAdmins.length === 0) {
        throw new Error('You are the only Admin of this house. Please promote another member to Admin before leaving.');
      }
    }

    // Deactivate membership record without deleting historical data
    member.is_active = false;
    member.left_at = new Date().toISOString();

    this.saveRawData(db);

    // Sync deactivated membership to Shared Cloud Registry, Server API, and Cloud Firestore
    updateSharedCloudRegistry((cloud) => ({
      ...cloud,
      house_members: cloud.house_members.map((m) => (m.id === member.id ? { ...m, is_active: false, left_at: member.left_at } : m)),
    }));

    if (typeof fetch !== 'undefined') {
      fetch('/api/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(member),
      }).catch(() => {});
    }

    await dbCreateMember(member);

    const userActiveHouses = this.getUserHouses(userId);
    if (userActiveHouses.length > 0) {
      this.setActiveHouseId(userActiveHouses[0].id);
    } else {
      localStorage.removeItem(ACTIVE_HOUSE_KEY);
    }

    this.notify();
  }

  async deleteHouse(houseId, userId) {
    const db = this.getRawData();
    const house = db.houses.find((h) => h.id === houseId);
    if (!house) throw new Error('House not found.');

    const member = db.house_members.find((hm) => hm.house_id === houseId && hm.user_id === userId);
    const isAdmin =
      house.created_by === userId ||
      !member ||
      (member.role || '').toUpperCase() === 'ADMIN' ||
      (member.role || '').toUpperCase() === ROLES.ADMIN;

    if (!isAdmin) throw new Error('Permission denied: Only a House Admin can delete this house.');

    db.houses = db.houses.filter((h) => h.id !== houseId);
    db.house_members = db.house_members.filter((hm) => hm.house_id !== houseId);
    db.chores = db.chores.filter((c) => c.house_id !== houseId);
    db.weekly_schedules = db.weekly_schedules.filter((ws) => ws.house_id !== houseId);
    db.assignments = db.assignments.filter((a) => a.house_id !== houseId);
    db.completion_events = db.completion_events.filter((ce) => ce.house_id !== houseId);
    db.attention_requests = db.attention_requests.filter((ar) => ar.house_id !== houseId);
    db.absences = db.absences.filter((ab) => ab.house_id !== houseId);
    db.reminders = db.reminders.filter((r) => r.house_id !== houseId);
    db.notifications = db.notifications.filter((n) => n.house_id !== houseId);
    if (db.house_holidays) {
      db.house_holidays = db.house_holidays.filter((hh) => hh.house_id !== houseId);
    }

    this.saveRawData(db);

    // Sync deletion to Shared Cloud Registry, Server API, and Cloud Firestore
    updateSharedCloudRegistry((cloud) => ({
      ...cloud,
      houses: (cloud.houses || []).filter((h) => h.id !== houseId),
      house_members: (cloud.house_members || []).filter((m) => m.house_id !== houseId),
      chores: (cloud.chores || []).filter((c) => c.house_id !== houseId),
      assignments: (cloud.assignments || []).filter((a) => a.house_id !== houseId),
    }));

    if (typeof fetch !== 'undefined') {
      fetch(`/api/houses?id=${encodeURIComponent(houseId)}`, {
        method: 'DELETE',
      }).catch(() => {});
    }

    await dbDeleteHouse(houseId);

    const remainingHouses = this.getUserHouses(userId);
    if (remainingHouses.length > 0) {
      localStorage.setItem(ACTIVE_HOUSE_KEY, remainingHouses[0].id);
    } else {
      localStorage.removeItem(ACTIVE_HOUSE_KEY);
    }

    this.notify();
  }

  // --- HOUSE HOLIDAYS ---
  getHouseHolidays(houseId) {
    const db = this.getRawData();
    return (db.house_holidays || [])
      .filter((h) => h.house_id === houseId)
      .sort((a, b) => new Date(a.start_date) - new Date(b.start_date));
  }

  createHouseHoliday(houseId, { startDate, endDate, reason }, createdByUserId) {
    const db = this.getRawData();
    if (!startDate || !endDate) {
      throw new Error('Start date and end date are required for house holiday.');
    }
    if (new Date(endDate) < new Date(startDate)) {
      throw new Error('End date cannot be before start date.');
    }

    const newHoliday = {
      id: 'hol_' + Math.random().toString(36).substring(2, 9),
      house_id: houseId,
      start_date: startDate,
      end_date: endDate,
      reason: (reason || 'House Holiday').trim(),
      created_by: createdByUserId,
      created_at: new Date().toISOString(),
    };

    if (!db.house_holidays) db.house_holidays = [];
    db.house_holidays.push(newHoliday);
    this.saveRawData(db);
    this.notify();
    return newHoliday;
  }

  deleteHouseHoliday(holidayId) {
    const db = this.getRawData();
    if (!db.house_holidays) return;
    db.house_holidays = db.house_holidays.filter((h) => h.id !== holidayId);
    this.saveRawData(db);
    this.notify();
  }

  isDateInHouseHoliday(houseId, dateInput = new Date()) {
    const db = this.getRawData();
    const holidays = (db.house_holidays || []).filter((h) => h.house_id === houseId);
    if (holidays.length === 0) return null;

    const targetDateStr = typeof dateInput === 'string'
      ? dateInput.split('T')[0]
      : new Date(dateInput).toISOString().split('T')[0];

    const targetTime = new Date(targetDateStr).getTime();

    for (const hol of holidays) {
      const startTime = new Date(hol.start_date).getTime();
      const endTime = new Date(hol.end_date).getTime();
      if (targetTime >= startTime && targetTime <= endTime) {
        return hol;
      }
    }
    return null;
  }

  async joinHouseByCode(inviteCode, userId) {
    const db = this.getRawData();
    const cleanCode = (inviteCode || '').trim().toUpperCase();
    if (!cleanCode) throw new Error('Please enter a valid house code.');

    // 1. Search local DB
    let house = db.houses.find((h) => (h.invite_code || '').toUpperCase() === cleanCode);

    // 2. Search Server API
    if (!house && typeof fetch !== 'undefined') {
      try {
        const res = await fetch(`/api/houses?code=${encodeURIComponent(cleanCode)}`);
        if (res.ok) {
          const apiJson = await res.json();
          if (apiJson.success && apiJson.house) {
            house = apiJson.house;
            if (!db.houses.some((h) => h.id === house.id)) {
              db.houses.push(house);
            }
          }
        }
      } catch (err) {
        console.warn('[Server API House Search Warning]', err);
      }
    }

    // 3. Search Shared Cloud Registry
    if (!house) {
      const cloud = getSharedCloudRegistry();
      house = cloud.houses.find((h) => (h.invite_code || '').toUpperCase() === cleanCode);
      if (house) {
        if (!db.houses.some((h) => h.id === house.id)) {
          db.houses.push(house);
        }
        const cloudMembers = cloud.house_members.filter((m) => m.house_id === house.id);
        cloudMembers.forEach((m) => {
          if (!db.house_members.some((hm) => hm.id === m.id)) {
            db.house_members.push(m);
          }
        });
      }
    }

    // 4. Search Cloud Firestore Database
    if (!house) {
      const fetched = await dbFetchHouseByCode(cleanCode);
      if (fetched) {
        house = fetched;
        if (!db.houses.some((h) => h.id === house.id)) {
          db.houses.push(house);
        }
        const houseData = await dbFetchHouseData(house.id);
        if (houseData) {
          (houseData.members || []).forEach((m) => {
            if (!db.house_members.some((hm) => hm.id === m.id)) db.house_members.push(m);
          });
          (houseData.chores || []).forEach((c) => {
            if (!db.chores.some((ch) => ch.id === c.id)) db.chores.push(c);
          });
          (houseData.assignments || []).forEach((a) => {
            if (!db.assignments.some((as) => as.id === a.id)) db.assignments.push(a);
          });
        }
      }
    }

    if (!house) {
      throw new Error(`House code "${cleanCode}" not found. Please verify the code and try again.`);
    }

    let member = db.house_members.find(
      (hm) => hm.house_id === house.id && hm.user_id === userId
    );

    if (member) {
      if (!member.is_active) {
        member.is_active = true;
      }
    } else {
      const user = db.users.find((u) => u.id === userId);
      member = {
        id: 'hm_' + Math.random().toString(36).substring(2, 9),
        house_id: house.id,
        user_id: userId,
        display_name: user ? user.full_name : 'Member',
        role: ROLES.MEMBER,
        is_active: true,
        joined_at: new Date().toISOString(),
      };
      db.house_members.push(member);
    }

    this.saveRawData(db);

    // Sync membership to Shared Cloud Registry, Server API, and Supabase
    updateSharedCloudRegistry((cloud) => ({
      ...cloud,
      houses: [...cloud.houses.filter((h) => h.id !== house.id), house],
      house_members: [...cloud.house_members.filter((m) => m.id !== member.id), member],
    }));

    if (typeof fetch !== 'undefined') {
      fetch('/api/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(member),
      }).catch(() => {});
    }

    dbCreateMember(member);

    this.setActiveHouseId(house.id);
    this.getOrCreateCurrentSchedule(house.id);
    return house;
  }

  // --- HOUSE MEMBERS & AVAILABILITY ---
  getHouseMembers(houseId) {
    const db = this.getRawData();
    return db.house_members.filter((hm) => hm.house_id === houseId);
  }

  updateMemberRole(houseMemberId, newRole) {
    const db = this.getRawData();
    const member = db.house_members.find((hm) => hm.id === houseMemberId);
    if (member) {
      // Prevent demoting last admin if other members exist
      if (newRole === ROLES.MEMBER || newRole === 'MEMBER') {
        const activeMembers = db.house_members.filter((hm) => hm.house_id === member.house_id && hm.is_active !== false);
        const activeAdmins = activeMembers.filter((hm) => hm.role === ROLES.ADMIN || hm.role === 'ADMIN');
        if (activeAdmins.length <= 1 && activeAdmins.some((a) => a.id === houseMemberId)) {
          throw new Error('Cannot demote the last Admin of the house. Promote another member first.');
        }
      }
      member.role = newRole;
      this.saveRawData(db);
      this.notify();
    }
  }

  promoteMemberToAdmin(houseMemberId) {
    this.updateMemberRole(houseMemberId, ROLES.ADMIN);
  }

  demoteAdminToMember(houseMemberId) {
    this.updateMemberRole(houseMemberId, ROLES.MEMBER);
  }

  getMemberReportData(userId, houseId) {
    const db = this.getRawData();
    const houseChores = (db.chores || []).filter((c) => c.house_id === houseId);
    const choresMap = new Map();
    houseChores.forEach((c) => choresMap.set(c.id, c));

    const userAssignments = (db.assignments || []).filter(
      (a) => a.house_id === houseId && (a.actual_member_ids || []).includes(userId)
    );

    const upcomingAssignments = userAssignments.filter(
      (a) => a.status === RESPONSIBILITY_STATUS.PENDING
    );

    const userCompletions = (db.completion_events || []).filter(
      (ce) => ce.house_id === houseId && ce.completed_by_user_id === userId
    ).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    const userAttentionReports = (db.attention_requests || []).filter(
      (ar) =>
        ar.house_id === houseId &&
        (ar.reported_by_user_id === userId || ar.resolved_by_user_id === userId)
    ).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    return {
      upcomingAssignments,
      userCompletions,
      userAttentionReports,
      allUserAssignments: userAssignments,
      choresMap,
    };
  }

  updateMemberDisplayName(houseMemberId, displayName) {
    const db = this.getRawData();
    const member = db.house_members.find((hm) => hm.id === houseMemberId);
    if (member) {
      member.display_name = displayName;
      this.saveRawData(db);
    }
  }

  toggleMemberActive(houseMemberId) {
    const db = this.getRawData();
    const member = db.house_members.find((hm) => hm.id === houseMemberId);
    if (member) {
      member.is_active = !member.is_active;
      this.saveRawData(db);
    }
  }

  updateMemberAvailability(userId, houseId, { isUnavailable, startDate, endDate, reason }) {
    const db = this.getRawData();
    const member = db.house_members.find((hm) => hm.house_id === houseId && hm.user_id === userId);

    if (isUnavailable && startDate && endDate) {
      db.absences.push({
        id: 'abs_' + Math.random().toString(36).substring(2, 9),
        house_id: houseId,
        user_id: userId,
        start_date: startDate,
        end_date: endDate,
        reason: reason || 'Unavailable',
        created_at: new Date().toISOString(),
      });
    }

    if (member) {
      member.is_unavailable = isUnavailable;
      member.unavailable_start = isUnavailable ? startDate : null;
      member.unavailable_end = isUnavailable ? endDate : null;
    }

    this.saveRawData(db);
    this.regenerateCurrentSchedule(houseId);
  }

  // --- CHORES ENGINE ---
  getHouseChores(houseId) {
    const db = this.getRawData();
    return db.chores.filter((c) => c.house_id === houseId);
  }

  createChore(houseId, choreData, createdByUserId) {
    const db = this.getRawData();

    // Map sub_items array of strings or objects to structured sub_items array
    const rawSubItems = Array.isArray(choreData.sub_items) ? choreData.sub_items : [];
    const formattedSubItems = rawSubItems.map((item, idx) => {
      if (typeof item === 'string') {
        return { id: `sub_${Math.random().toString(36).substring(2, 9)}`, name: item.trim() };
      }
      return { id: item.id || `sub_${Math.random().toString(36).substring(2, 9)}`, name: (item.name || item.title || `Area ${idx + 1}`).trim() };
    }).filter(item => item.name);

    const newChore = {
      id: 'chore_' + Math.random().toString(36).substring(2, 9),
      house_id: houseId,
      title: choreData.title.trim(),
      description: choreData.description || '',
      created_by: createdByUserId,
      chore_type: choreData.chore_type || CHORE_TYPES.REPEAT_ON_DEMAND,
      frequency: choreData.frequency || CHORE_FREQUENCIES.WEEKLY,
      required_people_count: parseInt(choreData.required_people_count) || 1,
      schedule_day: choreData.schedule_day || 'Monday',
      schedule_time: choreData.schedule_time || '19:00',
      start_date: choreData.start_date || new Date().toISOString().split('T')[0],
      end_date: choreData.end_date || null,
      notes: choreData.notes || '',
      sub_items: formattedSubItems,
      daily_reminder_enabled: !!choreData.daily_reminder_enabled,
      daily_reminder_time: choreData.daily_reminder_time || '19:00',
      assignment_preference_type: choreData.assignment_preference_type || ASSIGNMENT_PREFERENCES.AUTOMATIC,
      preference_chore_id: choreData.preference_chore_id || null,
      preferred_user_ids: Array.isArray(choreData.preferred_user_ids) ? choreData.preferred_user_ids : [],
      avoid_user_ids: Array.isArray(choreData.avoid_user_ids) ? choreData.avoid_user_ids : [],
      is_active: true,
      created_at: new Date().toISOString(),
    };

    db.chores.push(newChore);
    this.saveRawData(db);
    this.regenerateCurrentSchedule(houseId);
    return newChore;
  }

  updateChore(choreId, choreData) {
    const db = this.getRawData();
    const chore = db.chores.find((c) => c.id === choreId);
    if (!chore) throw new Error('Chore not found.');

    if (choreData.title !== undefined) chore.title = choreData.title.trim();
    if (choreData.description !== undefined) chore.description = choreData.description.trim();
    if (choreData.chore_type !== undefined) chore.chore_type = choreData.chore_type;
    if (choreData.frequency !== undefined) chore.frequency = choreData.frequency;
    if (choreData.required_people_count !== undefined) chore.required_people_count = parseInt(choreData.required_people_count) || 1;
    if (choreData.schedule_day !== undefined) chore.schedule_day = choreData.schedule_day;
    if (choreData.schedule_time !== undefined) chore.schedule_time = choreData.schedule_time;
    if (choreData.notes !== undefined) chore.notes = choreData.notes;

    if (choreData.sub_items !== undefined) {
      const rawSubItems = Array.isArray(choreData.sub_items) ? choreData.sub_items : [];
      chore.sub_items = rawSubItems.map((item, idx) => {
        if (typeof item === 'string') {
          return { id: `sub_${Math.random().toString(36).substring(2, 9)}`, name: item.trim() };
        }
        return {
          id: item.id || `sub_${Math.random().toString(36).substring(2, 9)}`,
          name: (item.name || item.title || `Area ${idx + 1}`).trim(),
        };
      }).filter((item) => item.name);
    }

    if (choreData.daily_reminder_enabled !== undefined) chore.daily_reminder_enabled = !!choreData.daily_reminder_enabled;
    if (choreData.daily_reminder_time !== undefined) chore.daily_reminder_time = choreData.daily_reminder_time;

    if (choreData.assignment_preference_type !== undefined) chore.assignment_preference_type = choreData.assignment_preference_type;
    if (choreData.preference_chore_id !== undefined) chore.preference_chore_id = choreData.preference_chore_id;
    if (choreData.preferred_user_ids !== undefined) chore.preferred_user_ids = Array.isArray(choreData.preferred_user_ids) ? choreData.preferred_user_ids : [];
    if (choreData.avoid_user_ids !== undefined) chore.avoid_user_ids = Array.isArray(choreData.avoid_user_ids) ? choreData.avoid_user_ids : [];

    this.saveRawData(db);
    this.regenerateCurrentSchedule(chore.house_id);
    return chore;
  }

  deleteChore(choreId) {
    const db = this.getRawData();
    const chore = db.chores.find((c) => c.id === choreId);
    const houseId = chore ? chore.house_id : null;
    db.chores = db.chores.filter((c) => c.id !== choreId);
    db.assignments = db.assignments.filter((a) => a.chore_id !== choreId);
    this.saveRawData(db);
    if (houseId) this.regenerateCurrentSchedule(houseId);
  }

  // --- SCHEDULE & MULTIPLE COMPLETIONS ENGINE ---
  getOrCreateCurrentSchedule(houseId, targetDate = new Date()) {
    const db = this.getRawData();
    const weekDetails = getWeekDetails(targetDate);

    let schedule = db.weekly_schedules.find(
      (s) =>
        s.house_id === houseId &&
        s.year === weekDetails.year &&
        s.week_number === weekDetails.weekNumber
    );

    if (!schedule) {
      schedule = {
        id: 'sched_' + Math.random().toString(36).substring(2, 9),
        house_id: houseId,
        year: weekDetails.year,
        week_number: weekDetails.weekNumber,
        start_date: weekDetails.weekStartDate,
        end_date: weekDetails.weekEndDate,
        is_generated: true,
      };
      db.weekly_schedules.push(schedule);
      this.saveRawData(db);
    }

    return schedule;
  }

  getScheduleAssignments(scheduleId) {
    const db = this.getRawData();
    return db.assignments.filter((a) => a.schedule_id === scheduleId);
  }

  regenerateCurrentSchedule(houseId, targetDate = new Date()) {
    const db = this.getRawData();
    const schedule = this.getOrCreateCurrentSchedule(houseId, targetDate);

    const chores = db.chores.filter((c) => c.house_id === houseId);
    const members = db.house_members.filter((m) => m.house_id === houseId && m.is_active !== false);
    const absences = db.absences.filter((a) => a.house_id === houseId);
    const pastAssignments = db.assignments.filter(
      (a) => a.house_id === houseId && a.schedule_id !== schedule.id
    );

    const existingAssignments = db.assignments.filter((a) => a.schedule_id === schedule.id);

    const { assignments: generatedAssignments } = generateWeeklySchedule({
      houseId,
      scheduleId: schedule.id,
      weekNumber: schedule.week_number,
      year: schedule.year,
      weekStartDate: schedule.start_date,
      weekEndDate: schedule.end_date,
      chores,
      members,
      absences,
      pastAssignments,
      existingScheduleAssignments: existingAssignments,
    });

    db.assignments = db.assignments.filter(
      (a) => a.schedule_id !== schedule.id || a.source === ASSIGNMENT_SOURCE.MANUAL_OVERRIDE
    );

    generatedAssignments.forEach((gen) => {
      if (!db.assignments.some((a) => a.id === gen.id)) {
        db.assignments.push(gen);
      }
    });

    this.saveRawData(db);
    return generatedAssignments;
  }

  markAssignmentCompleted(assignmentId, userId, completionType = 'TOGETHER', participantIds = null, subItemInput = null) {
    const db = this.getRawData();
    const assignment = db.assignments.find((a) => a.id === assignmentId);
    if (!assignment) return;

    // Strict Permission Enforcement: User must be in actual_member_ids OR house Admin
    const member = db.house_members.find((hm) => hm.house_id === assignment.house_id && hm.user_id === userId);
    const house = db.houses.find((h) => h.id === assignment.house_id);
    const isAssigned = (assignment.actual_member_ids || []).includes(userId);
    const isAdmin = house?.created_by === userId || member?.role === ROLES.ADMIN || member?.role === 'ADMIN';

    if (!isAssigned && !isAdmin) {
      throw new Error('Permission Denied: Only assigned team members or house Admins can mark this chore completed.');
    }

    const chore = db.chores.find((c) => c.id === assignment.chore_id);
    const subItems = chore?.sub_items || [];

    // Normalize subItemInput to array of subItem objects
    let targetSubItems = [];
    if (Array.isArray(subItemInput)) {
      targetSubItems = subItems.filter((s) => subItemInput.includes(s.id));
    } else if (typeof subItemInput === 'string' && subItemInput) {
      if (subItemInput === 'ALL') {
        targetSubItems = [...subItems];
      } else {
        const found = subItems.find((s) => s.id === subItemInput);
        if (found) targetSubItems = [found];
      }
    }

    if (targetSubItems.length === 0 && subItems.length > 0) {
      targetSubItems = [...subItems];
    }

    assignment.completion_count = (assignment.completion_count || 0) + 1;

    // Check if all sub-items are completed now
    const thisAssignmentCompletions = db.completion_events.filter((ce) => ce.assignment_id === assignmentId);
    const completedSubIds = new Set(thisAssignmentCompletions.map((ce) => ce.sub_item_id).filter(Boolean));
    (thisAssignmentCompletions.flatMap((ce) => ce.sub_item_ids || [])).forEach((id) => completedSubIds.add(id));
    targetSubItems.forEach((s) => completedSubIds.add(s.id));

    if (subItems.length === 0 || subItems.every((s) => completedSubIds.has(s.id))) {
      assignment.status = RESPONSIBILITY_STATUS.COMPLETED;
    }

    const user = db.users.find((u) => u.id === userId);
    const userName = member ? member.display_name : user ? user.full_name : 'Roommate';

    // Determine participants & completion_type
    let participants = [];
    if (completionType === 'TOGETHER') {
      const candidateParticipants = Array.isArray(participantIds) && participantIds.length >= 2
        ? participantIds
        : (assignment.actual_member_ids || []);

      const uniqueParticipants = Array.from(new Set(candidateParticipants));
      if (uniqueParticipants.length < 2) {
        completionType = 'ALONE';
        participants = [userId];
      } else {
        participants = uniqueParticipants;
      }
    } else {
      completionType = 'ALONE';
      participants = [userId];
    }

    const participantNames = participants.map((uid) => {
      const m = db.house_members.find((hm) => hm.house_id === assignment.house_id && hm.user_id === uid);
      const u = db.users.find((usr) => usr.id === uid);
      return m ? m.display_name : u ? u.full_name : 'Roommate';
    });

    const completedByName = completionType === 'TOGETHER'
      ? participantNames.join(' + ')
      : userName;

    const subItemNamesList = targetSubItems.map((s) => s.name);
    let combinedSubItemLabel = null;
    if (subItemNamesList.length > 0) {
      if (subItems.length > 1 && subItemNamesList.length === subItems.length) {
        combinedSubItemLabel = `all ${chore?.title || 'chore'} areas`;
      } else {
        combinedSubItemLabel = subItemNamesList.join(' + ');
      }
    }

    // RESOLVE ACTIVE ATTENTION REQUESTS FOR THESE SUB-ITEMS
    const targetSubIds = new Set(targetSubItems.map((s) => s.id));
    db.attention_requests.forEach((ar) => {
      if (ar.assignment_id === assignmentId && !ar.is_resolved) {
        if (!ar.sub_item_id || targetSubIds.has(ar.sub_item_id) || targetSubItems.length === 0) {
          ar.is_resolved = true;
          ar.resolved_at = new Date().toISOString();
          ar.resolved_by_user_id = userId;
          ar.resolved_by_name = userName;
        }
      }
    });

    // Save completion event
    db.completion_events.push({
      id: 'comp_' + Math.random().toString(36).substring(2, 9),
      assignment_id: assignmentId,
      house_id: assignment.house_id,
      chore_id: assignment.chore_id,
      sub_item_id: targetSubItems.length === 1 ? targetSubItems[0].id : null,
      sub_item_ids: targetSubItems.map((s) => s.id),
      sub_item_name: combinedSubItemLabel,
      sub_item_names: subItemNamesList,
      completed_by_user_id: userId,
      completed_by_name: completedByName,
      completion_type: completionType, // 'ALONE' or 'TOGETHER'
      participants: participants,
      participant_names: participantNames,
      week_number: assignment.week_number,
      year: assignment.year,
      timestamp: new Date().toISOString(),
    });

    this.saveRawData(db);
  }

  reportChoreNeedsAttention(assignmentId, reporterUserId, reason = 'Needs attention / Bin full', subItemInput = null) {
    const db = this.getRawData();
    const assignment = db.assignments.find((a) => a.id === assignmentId);
    if (!assignment) return;

    assignment.status = RESPONSIBILITY_STATUS.PENDING;

    const user = db.users.find((u) => u.id === reporterUserId);
    const member = db.house_members.find((hm) => hm.user_id === reporterUserId);
    const reporterName = member ? member.display_name : user ? user.full_name : 'Roommate';

    const chore = db.chores.find((c) => c.id === assignment.chore_id);
    const choreTitle = chore ? chore.title : 'Chore';
    const subItems = chore?.sub_items || [];

    let targetSubItems = [];
    if (Array.isArray(subItemInput)) {
      targetSubItems = subItems.filter((s) => subItemInput.includes(s.id));
    } else if (typeof subItemInput === 'string' && subItemInput) {
      if (subItemInput === 'ALL') {
        targetSubItems = [...subItems];
      } else {
        const found = subItems.find((s) => s.id === subItemInput);
        if (found) targetSubItems = [found];
      }
    }

    const subItemNamesList = targetSubItems.map((s) => s.name);
    let combinedLabel = subItemNamesList.length > 0
      ? (subItems.length > 1 && subItemNamesList.length === subItems.length ? `all ${choreTitle} areas` : subItemNamesList.join(' + '))
      : null;

    const existingReq = db.attention_requests.find(
      (ar) =>
        ar.assignment_id === assignmentId &&
        ar.is_resolved !== true &&
        (!combinedLabel || ar.sub_item_name === combinedLabel)
    );

    if (existingReq) {
      if (!existingReq.reporter_names.includes(reporterName)) {
        existingReq.reporter_names.push(reporterName);
      }
    } else {
      db.attention_requests.push({
        id: 'att_' + Math.random().toString(36).substring(2, 9),
        assignment_id: assignmentId,
        house_id: assignment.house_id,
        chore_id: assignment.chore_id,
        sub_item_id: targetSubItems.length === 1 ? targetSubItems[0].id : null,
        sub_item_ids: targetSubItems.map((s) => s.id),
        sub_item_name: combinedLabel,
        reported_by_user_id: reporterUserId,
        reporter_names: [reporterName],
        week_number: assignment.week_number,
        year: assignment.year,
        reason: combinedLabel ? `${combinedLabel} — ${reason}` : reason,
        is_resolved: false,
        timestamp: new Date().toISOString(),
      });
    }

    const notifTitle = combinedLabel ? `${choreTitle} (${combinedLabel}) Needs Attention` : `${choreTitle} Needs Attention`;
    const notifMsg = `${reporterName} reported that ${combinedLabel ? `"${combinedLabel}" in ` : ''}"${choreTitle}" needs attention.`;

    (assignment.actual_member_ids || []).forEach((workerId) => {
      if (workerId !== reporterUserId) {
        db.notifications.push({
          id: 'notif_' + Math.random().toString(36).substring(2, 9),
          user_id: workerId,
          house_id: assignment.house_id,
          title: notifTitle,
          message: notifMsg,
          is_read: false,
          created_at: new Date().toISOString(),
        });
      }
    });

    this.saveRawData(db);
  }

  createSpecificDateReminder(houseId, choreId, subItemId, targetUserIds, remindDateStr, remindTimeStr, note, createdByUserId) {
    const db = this.getRawData();
    const chore = db.chores.find((c) => c.id === choreId);
    if (!chore) return;

    const subItem = (chore.sub_items || []).find((s) => s.id === subItemId);
    const creatorUser = db.users.find((u) => u.id === createdByUserId);
    const creatorName = creatorUser ? creatorUser.full_name : 'Roommate';

    const newReminder = {
      id: 'rem_' + Math.random().toString(36).substring(2, 9),
      house_id: houseId,
      chore_id: choreId,
      chore_title: chore.title,
      sub_item_id: subItemId || null,
      sub_item_name: subItem ? subItem.name : null,
      target_user_ids: Array.isArray(targetUserIds) ? targetUserIds : [],
      remind_date: remindDateStr, // YYYY-MM-DD
      remind_time: remindTimeStr || '18:00',
      note: note || '',
      created_by_user_id: createdByUserId,
      created_by_name: creatorName,
      created_at: new Date().toISOString(),
    };

    db.reminders.push(newReminder);

    // Send notification to target users
    (targetUserIds || []).forEach((uid) => {
      db.notifications.push({
        id: 'notif_' + Math.random().toString(36).substring(2, 9),
        user_id: uid,
        house_id: houseId,
        title: `Reminder Scheduled: ${chore.title}`,
        message: `${creatorName} set a reminder for "${chore.title}${subItem ? ` - ${subItem.name}` : ''}" on ${remindDateStr} at ${remindTimeStr || '18:00'}. ${note ? `Note: "${note}"` : ''}`,
        is_read: false,
        created_at: new Date().toISOString(),
      });
    });

    this.saveRawData(db);
    return newReminder;
  }

  sendNotificationToTeam(assignmentId, senderUserId) {
    const db = this.getRawData();
    const assignment = db.assignments.find((a) => a.id === assignmentId);
    if (!assignment) return;

    const chore = db.chores.find((c) => c.id === assignment.chore_id);
    const senderMember = db.house_members.find((hm) => hm.user_id === senderUserId);
    const senderName = senderMember ? senderMember.display_name : 'A roommate';

    (assignment.actual_member_ids || []).forEach((uid) => {
      if (uid !== senderUserId) {
        db.notifications.push({
          id: 'notif_' + Math.random().toString(36).substring(2, 9),
          user_id: uid,
          house_id: assignment.house_id,
          title: 'Chore Reminder',
          message: `${senderName} notified you regarding "${chore ? chore.title : 'your chore'}".`,
          is_read: false,
          created_at: new Date().toISOString(),
        });
      }
    });

    this.saveRawData(db);
  }

  updateCompletionEvent(eventId, editorUserId, updateData = {}) {
    const db = this.getRawData();
    const event = db.completion_events.find((ce) => ce.id === eventId);
    if (!event) throw new Error('Completion event not found.');

    const assignment = db.assignments.find((a) => a.id === event.assignment_id);
    const house = db.houses.find((h) => h.id === event.house_id);
    const editorMember = db.house_members.find((hm) => hm.house_id === event.house_id && hm.user_id === editorUserId);
    const isAdmin = house?.created_by === editorUserId || editorMember?.role === ROLES.ADMIN || editorMember?.role === 'ADMIN';

    // Check week window
    const currentSched = this.getOrCreateCurrentSchedule(event.house_id);
    const isCurrentWeek = currentSched.week_number === event.week_number && currentSched.year === event.year;

    const isSubmitter = event.completed_by_user_id === editorUserId;
    const isParticipant = Array.isArray(event.participants) && event.participants.includes(editorUserId);

    if (!isAdmin && !isCurrentWeek) {
      throw new Error('Permission Denied: Historical completion records cannot be edited after the responsibility week has ended.');
    }

    if (!isAdmin && !isSubmitter && !isParticipant) {
      throw new Error('Permission Denied: Only the submitter, participating members, or House Admin can edit this completion event.');
    }

    const chore = db.chores.find((c) => c.id === event.chore_id);
    const subItems = chore?.sub_items || [];

    // Store audit history
    if (!event.edit_history) event.edit_history = [];
    event.edit_history.push({
      edited_at: new Date().toISOString(),
      edited_by_user_id: editorUserId,
      previous_sub_item_name: event.sub_item_name,
      previous_sub_item_ids: event.sub_item_ids || [],
      previous_completion_type: event.completion_type,
      previous_participants: event.participants || [],
      previous_completed_by_name: event.completed_by_name,
    });

    // Sub-items update
    if (updateData.sub_item_input !== undefined) {
      const subItemInput = updateData.sub_item_input;
      let targetSubItems = [];
      if (Array.isArray(subItemInput)) {
        targetSubItems = subItems.filter((s) => subItemInput.includes(s.id));
      } else if (typeof subItemInput === 'string' && subItemInput) {
        if (subItemInput === 'ALL') {
          targetSubItems = [...subItems];
        } else {
          const found = subItems.find((s) => s.id === subItemInput);
          if (found) targetSubItems = [found];
        }
      }

      if (targetSubItems.length === 0 && subItems.length > 0) {
        targetSubItems = [...subItems];
      }

      const subItemNamesList = targetSubItems.map((s) => s.name);
      let combinedSubItemLabel = null;
      if (subItemNamesList.length > 0) {
        if (subItems.length > 1 && subItemNamesList.length === subItems.length) {
          combinedSubItemLabel = `all ${chore?.title || 'chore'} areas`;
        } else {
          combinedSubItemLabel = subItemNamesList.join(' + ');
        }
      }

      event.sub_item_id = targetSubItems.length === 1 ? targetSubItems[0].id : null;
      event.sub_item_ids = targetSubItems.map((s) => s.id);
      event.sub_item_name = combinedSubItemLabel;
      event.sub_item_names = subItemNamesList;
    }

    // Completion type & Participants update
    if (updateData.completion_type !== undefined) {
      let completionType = updateData.completion_type;
      let participantIds = updateData.participant_ids;

      let participants = [];
      if (completionType === 'TOGETHER') {
        const candidateParticipants = Array.isArray(participantIds) && participantIds.length >= 2
          ? participantIds
          : (assignment?.actual_member_ids || []);

        const uniqueParticipants = Array.from(new Set(candidateParticipants));
        if (uniqueParticipants.length < 2) {
          completionType = 'ALONE';
          participants = [editorUserId];
        } else {
          participants = uniqueParticipants;
        }
      } else {
        completionType = 'ALONE';
        participants = [editorUserId];
      }

      const participantNames = participants.map((uid) => {
        const m = db.house_members.find((hm) => hm.house_id === event.house_id && hm.user_id === uid);
        const u = db.users.find((usr) => usr.id === uid);
        return m ? m.display_name : u ? u.full_name : 'Roommate';
      });

      const editorUser = db.users.find((u) => u.id === editorUserId);
      const editorMemberObj = db.house_members.find((hm) => hm.house_id === event.house_id && hm.user_id === editorUserId);
      const editorName = editorMemberObj ? editorMemberObj.display_name : editorUser ? editorUser.full_name : 'Roommate';

      event.completion_type = completionType;
      event.participants = participants;
      event.participant_names = participantNames;
      event.completed_by_name = completionType === 'TOGETHER' ? participantNames.join(' + ') : editorName;
    }

    event.is_edited = true;
    event.last_edited_at = new Date().toISOString();
    event.last_edited_by_user_id = editorUserId;

    // Recalculate parent assignment completion status if assignment exists
    if (assignment) {
      const allCompletionsForAssign = db.completion_events.filter((ce) => ce.assignment_id === assignment.id);
      const coveredSubIds = new Set();
      allCompletionsForAssign.forEach((ce) => {
        if (ce.sub_item_id) coveredSubIds.add(ce.sub_item_id);
        (ce.sub_item_ids || []).forEach((id) => coveredSubIds.add(id));
      });

      if (subItems.length === 0 || subItems.every((s) => coveredSubIds.has(s.id))) {
        assignment.status = RESPONSIBILITY_STATUS.COMPLETED;
      } else {
        assignment.status = RESPONSIBILITY_STATUS.PENDING;
      }
    }

    this.saveRawData(db);
    return event;
  }

  getHouseCompletionEvents(houseId) {
    const db = this.getRawData();
    return db.completion_events
      .filter((ce) => ce.house_id === houseId)
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }

  getHouseAttentionRequests(houseId) {
    const db = this.getRawData();
    return db.attention_requests
      .filter((ar) => ar.house_id === houseId)
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }

  getUserNotifications(userId) {
    const db = this.getRawData();
    return db.notifications
      .filter((n) => n.user_id === userId)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }

  markNotificationRead(notificationId) {
    const db = this.getRawData();
    const notif = db.notifications.find((n) => n.id === notificationId);
    if (notif) {
      notif.is_read = true;
      this.saveRawData(db);
    }
  }
}

export const store = new Store();

export async function syncHouseWithServer(houseId) {
  if (typeof window === 'undefined' || !houseId) return;
  try {
    // 1. Sync members from server API
    const res = await fetch(`/api/members?house_id=${encodeURIComponent(houseId)}`);
    if (res.ok) {
      const json = await res.json();
      if (json.success && Array.isArray(json.members)) {
        const db = store.getRawData();
        let changed = false;
        json.members.forEach((m) => {
          if (!db.house_members.some((hm) => hm.id === m.id)) {
            db.house_members.push(m);
            changed = true;
          }
        });
        if (changed) {
          store.saveRawData(db);
        }
      }
    }

    // 2. Sync house data from Cloud Firestore DB
    if (isFirebaseConfigured()) {
      const houseData = await dbFetchHouseData(houseId);
      const db = store.getRawData();
      if (!houseData || !houseData.house) {
        // House was deleted in Cloud Firestore - purge locally
        let changed = false;
        if (db.houses.some((h) => h.id === houseId)) {
          db.houses = db.houses.filter((h) => h.id !== houseId);
          db.house_members = db.house_members.filter((m) => m.house_id !== houseId);
          changed = true;
        }
        if (changed) {
          store.saveRawData(db);
          store.notify();
        }
      } else {
        let changed = false;
        (houseData.members || []).forEach((m) => {
          const existing = db.house_members.find((hm) => hm.id === m.id);
          if (!existing) {
            db.house_members.push(m);
            changed = true;
          } else if (existing.display_name !== m.display_name) {
            existing.display_name = m.display_name;
            changed = true;
          }
        });
        (houseData.chores || []).forEach((c) => {
          if (!db.chores.some((ch) => ch.id === c.id)) {
            db.chores.push(c);
            changed = true;
          }
        });
        (houseData.assignments || []).forEach((a) => {
          if (!db.assignments.some((as) => as.id === a.id)) {
            db.assignments.push(a);
            changed = true;
          }
        });
        if (changed) {
          store.saveRawData(db);
          store.notify();
        }
      }
    }
  } catch (err) {
    console.warn('[Sync House Error]', err);
  }
}
