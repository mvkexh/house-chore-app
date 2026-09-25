/**
 * Roommate Chore Manager — Central Storage & Database Persistence Engine
 */
import { ROLES, RESPONSIBILITY_STATUS, ASSIGNMENT_SOURCE, CHORE_TYPES, CHORE_FREQUENCIES } from './types';
import { generateWeeklySchedule, isDateInRange } from './scheduler';

const STORAGE_KEY = 'roommate_chore_manager_db_v4';
const CURRENT_USER_KEY = 'roommate_chore_manager_user';
const ACTIVE_HOUSE_KEY = 'roommate_chore_manager_active_house';

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
      return data ? JSON.parse(data) : INITIAL_DB;
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
    const defaultProfile = googleProfile || {
      id: 'usr_' + Math.random().toString(36).substring(2, 9),
      email: 'user@example.com',
      full_name: 'Roommate User',
      avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    };

    const db = this.getRawData();
    let existingUser = db.users.find((u) => u.email === defaultProfile.email);

    if (!existingUser) {
      existingUser = { ...defaultProfile, created_at: new Date().toISOString() };
      db.users.push(existingUser);
      this.saveRawData(db);
    }

    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(existingUser));
    this.notify();
    return existingUser;
  }

  logout() {
    localStorage.removeItem(CURRENT_USER_KEY);
    localStorage.removeItem(ACTIVE_HOUSE_KEY);
    this.notify();
  }

  updateUserProfile(userId, { full_name, avatar_url }) {
    const db = this.getRawData();
    const user = db.users.find((u) => u.id === userId);
    if (user) {
      if (full_name !== undefined) user.full_name = full_name;
      if (avatar_url !== undefined) user.avatar_url = avatar_url;
      this.saveRawData(db);
    }

    const currentUser = this.getCurrentUser();
    if (currentUser && currentUser.id === userId) {
      if (full_name !== undefined) currentUser.full_name = full_name;
      if (avatar_url !== undefined) currentUser.avatar_url = avatar_url;
      localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(currentUser));
    }

    // Also update display_name in house_members
    db.house_members.forEach((hm) => {
      if (hm.user_id === userId && full_name) {
        hm.display_name = full_name;
      }
    });

    this.saveRawData(db);
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

  createHouse(houseName, userId) {
    const db = this.getRawData();
    const houseId = 'house_' + Math.random().toString(36).substring(2, 9);
    const inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();

    const newHouse = {
      id: houseId,
      name: houseName,
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

    db.houses.push(newHouse);
    db.house_members.push(initialMember);
    this.saveRawData(db);

    this.setActiveHouseId(houseId);
    this.getOrCreateCurrentSchedule(houseId);

    return newHouse;
  }

  joinHouseByCode(inviteCode, userId) {
    const db = this.getRawData();
    const cleanCode = inviteCode.trim().toUpperCase();
    const house = db.houses.find((h) => h.invite_code === cleanCode);

    if (!house) {
      throw new Error('Invalid house code. Please verify code.');
    }

    const existingMember = db.house_members.find(
      (hm) => hm.house_id === house.id && hm.user_id === userId
    );

    if (existingMember) {
      if (!existingMember.is_active) {
        existingMember.is_active = true;
        this.saveRawData(db);
      }
      this.setActiveHouseId(house.id);
      return house;
    }

    const user = db.users.find((u) => u.id === userId);
    const newMember = {
      id: 'hm_' + Math.random().toString(36).substring(2, 9),
      house_id: house.id,
      user_id: userId,
      display_name: user ? user.full_name : 'Member',
      role: ROLES.MEMBER,
      is_active: true,
      joined_at: new Date().toISOString(),
    };

    db.house_members.push(newMember);
    this.saveRawData(db);
    this.setActiveHouseId(house.id);
    return house;
  }

  // --- HOUSE MEMBERS & AVAILABILITY ---
  getHouseMembers(houseId) {
    const db = this.getRawData();
    return db.house_members.filter((hm) => hm.house_id === houseId);
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
    const newChore = {
      id: 'chore_' + Math.random().toString(36).substring(2, 9),
      house_id: houseId,
      title: choreData.title,
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
      is_active: true,
      created_at: new Date().toISOString(),
    };

    db.chores.push(newChore);
    this.saveRawData(db);
    this.regenerateCurrentSchedule(houseId);
    return newChore;
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

  markAssignmentCompleted(assignmentId, userId) {
    const db = this.getRawData();
    const assignment = db.assignments.find((a) => a.id === assignmentId);
    if (!assignment) return;

    assignment.status = RESPONSIBILITY_STATUS.COMPLETED;
    assignment.completion_count = (assignment.completion_count || 0) + 1;

    const user = db.users.find((u) => u.id === userId);
    const member = db.house_members.find((hm) => hm.user_id === userId);
    const userName = member ? member.display_name : user ? user.full_name : 'Roommate';

    db.completion_events.push({
      id: 'comp_' + Math.random().toString(36).substring(2, 9),
      assignment_id: assignmentId,
      house_id: assignment.house_id,
      chore_id: assignment.chore_id,
      completed_by_user_id: userId,
      completed_by_name: userName,
      week_number: assignment.week_number,
      year: assignment.year,
      timestamp: new Date().toISOString(),
    });

    this.saveRawData(db);
  }

  reportChoreNeedsAttention(assignmentId, reporterUserId, reason = 'Needs attention / Bin full') {
    const db = this.getRawData();
    const assignment = db.assignments.find((a) => a.id === assignmentId);
    if (!assignment) return;

    assignment.status = RESPONSIBILITY_STATUS.PENDING;

    const user = db.users.find((u) => u.id === reporterUserId);
    const member = db.house_members.find((hm) => hm.user_id === reporterUserId);
    const reporterName = member ? member.display_name : user ? user.full_name : 'Roommate';

    const existingReq = db.attention_requests.find(
      (ar) => ar.assignment_id === assignmentId && ar.is_resolved !== true
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
        reported_by_user_id: reporterUserId,
        reporter_names: [reporterName],
        week_number: assignment.week_number,
        year: assignment.year,
        reason: reason,
        is_resolved: false,
        timestamp: new Date().toISOString(),
      });
    }

    const chore = db.chores.find((c) => c.id === assignment.chore_id);
    const choreTitle = chore ? chore.title : 'Chore';

    (assignment.actual_member_ids || []).forEach((workerId) => {
      if (workerId !== reporterUserId) {
        db.notifications.push({
          id: 'notif_' + Math.random().toString(36).substring(2, 9),
          user_id: workerId,
          house_id: assignment.house_id,
          title: `${choreTitle} Needs Attention`,
          message: `${reporterName} reported that "${choreTitle}" needs attention.`,
          is_read: false,
          created_at: new Date().toISOString(),
        });
      }
    });

    this.saveRawData(db);
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
