/**
 * Roommate Chore Manager — Server-side Data Store & Sync Manager
 * Acts as an active server cloud registry shared across all users/browsers connected to this server.
 */

// Global in-memory storage singleton surviving Next.js dev reloads
const globalSyncState = globalThis.__ROOMMATE_CHORE_SERVER_STATE__ || {
  houses: [],
  house_members: [],
  users: [],
  chores: [],
  assignments: [],
  completion_events: [],
  attention_requests: [],
  absences: [],
  house_holidays: [],
  notifications: [],
};

if (process.env.NODE_ENV !== 'production') {
  globalThis.__ROOMMATE_CHORE_SERVER_STATE__ = globalSyncState;
}

export function getServerSyncState() {
  return globalSyncState;
}

export function addServerHouse(houseObj) {
  if (!houseObj || !houseObj.id) return houseObj;
  const existingIdx = globalSyncState.houses.findIndex((h) => h.id === houseObj.id);
  if (existingIdx >= 0) {
    globalSyncState.houses[existingIdx] = { ...globalSyncState.houses[existingIdx], ...houseObj };
  } else {
    globalSyncState.houses.push(houseObj);
  }
  return houseObj;
}

export function findServerHouseByCode(code) {
  if (!code) return null;
  const clean = code.trim().toUpperCase();
  return globalSyncState.houses.find((h) => (h.invite_code || '').toUpperCase() === clean) || null;
}

export function addServerMember(memberObj) {
  if (!memberObj || !memberObj.id) return memberObj;
  const existingIdx = globalSyncState.house_members.findIndex((m) => m.id === memberObj.id);
  if (existingIdx >= 0) {
    globalSyncState.house_members[existingIdx] = { ...globalSyncState.house_members[existingIdx], ...memberObj };
  } else {
    globalSyncState.house_members.push(memberObj);
  }
  return memberObj;
}

export function getServerHouseMembers(houseId) {
  if (!houseId) return [];
  return globalSyncState.house_members.filter((m) => m.house_id === houseId);
}

export function mergeServerSyncState(payload) {
  if (!payload || typeof payload !== 'object') return globalSyncState;

  if (Array.isArray(payload.houses)) {
    payload.houses.forEach(addServerHouse);
  }
  if (Array.isArray(payload.house_members)) {
    payload.house_members.forEach(addServerMember);
  }
  if (Array.isArray(payload.users)) {
    payload.users.forEach((u) => {
      if (!u || !u.id) return;
      const idx = globalSyncState.users.findIndex((x) => x.id === u.id);
      if (idx >= 0) globalSyncState.users[idx] = { ...globalSyncState.users[idx], ...u };
      else globalSyncState.users.push(u);
    });
  }
  if (Array.isArray(payload.chores)) {
    payload.chores.forEach((c) => {
      if (!c || !c.id) return;
      const idx = globalSyncState.chores.findIndex((x) => x.id === c.id);
      if (idx >= 0) globalSyncState.chores[idx] = { ...globalSyncState.chores[idx], ...c };
      else globalSyncState.chores.push(c);
    });
  }
  if (Array.isArray(payload.assignments)) {
    payload.assignments.forEach((a) => {
      if (!a || !a.id) return;
      const idx = globalSyncState.assignments.findIndex((x) => x.id === a.id);
      if (idx >= 0) globalSyncState.assignments[idx] = { ...globalSyncState.assignments[idx], ...a };
      else globalSyncState.assignments.push(a);
    });
  }
  if (Array.isArray(payload.completion_events)) {
    payload.completion_events.forEach((ce) => {
      if (!ce || !ce.id) return;
      const idx = globalSyncState.completion_events.findIndex((x) => x.id === ce.id);
      if (idx >= 0) globalSyncState.completion_events[idx] = { ...globalSyncState.completion_events[idx], ...ce };
      else globalSyncState.completion_events.push(ce);
    });
  }

  return globalSyncState;
}
