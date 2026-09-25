/**
 * Roommate Chore Manager — Intelligent Automatic Member Assignment Engine
 * 
 * CORE RULES:
 * 1. The user specifies: WHAT, HOW MANY people, HOW OFTEN, WHAT TYPE.
 * 2. The scheduler automatically decides: WHO does it, WHO works together, WHEN to rotate.
 * 3. NO TWO TASKS AT THE SAME TIME: Checks time collisions BEFORE creating assignments!
 * 4. NO REPETITIVE ASSIGNMENTS: Rotates pairings and avoids assigning same person/pair repeatedly.
 * 5. ABSENCE HANDLING: Automatically selects an available replacement if someone is unavailable.
 */

import { RESPONSIBILITY_STATUS, ASSIGNMENT_SOURCE, CHORE_TYPES } from './types';

export function isDateInRange(targetDateStr, startDateStr, endDateStr) {
  if (!targetDateStr) return true;
  const target = new Date(targetDateStr).getTime();
  if (startDateStr) {
    const start = new Date(startDateStr).getTime();
    if (target < start) return false;
  }
  if (endDateStr) {
    const end = new Date(endDateStr).getTime();
    if (target > end) return false;
  }
  return true;
}

/**
 * Generate unique key for a pair of user IDs (order independent)
 */
function getPairKey(uid1, uid2) {
  return [uid1, uid2].sort().join('___');
}

/**
 * Generate all combinations of size K from an array
 */
function getKCombinations(arr, k) {
  if (k === 0) return [[]];
  if (arr.length === 0 || k > arr.length) return [];

  const head = arr[0];
  const tail = arr.slice(1);

  const withHead = getKCombinations(tail, k - 1).map((comb) => [head, ...comb]);
  const withoutHead = getKCombinations(tail, k);

  return [...withHead, ...withoutHead];
}

export function generateWeeklySchedule({
  houseId,
  scheduleId,
  weekNumber,
  year,
  weekStartDate,
  weekEndDate,
  chores = [],
  members = [],
  absences = [],
  pastAssignments = [],
  existingScheduleAssignments = [],
}) {
  const activeChores = chores.filter((c) => c.is_active !== false);
  const activeMembers = members.filter((m) => m.is_active !== false);

  if (activeChores.length === 0) {
    return { assignments: [], warnings: ['No active chores found.'] };
  }

  if (activeMembers.length === 0) {
    return { assignments: [], warnings: ['No active house members found.'] };
  }

  // Preserve existing manual overrides
  const existingOverridesMap = new Map();
  existingScheduleAssignments.forEach((a) => {
    if (a.source === ASSIGNMENT_SOURCE.MANUAL_OVERRIDE) {
      existingOverridesMap.set(a.chore_id, a);
    }
  });

  // --- HISTORICAL STATS FOR ANTI-REPETITION & FAIRNESS ---
  const memberWorkloadMap = new Map(); // total assignments per member
  const memberChoreCountMap = new Map(); // (member_chore) -> count
  const recentPairCountMap = new Map(); // pairKey -> count
  const lastWeekChoreMembersMap = new Map(); // choreId -> array of memberIds

  activeMembers.forEach((m) => {
    memberWorkloadMap.set(m.user_id, 0);
  });

  // Find previous week's assignments
  const previousWeekAssignments = pastAssignments.filter(
    (a) => a.week_number === weekNumber - 1 || (weekNumber === 1 && a.year === year - 1)
  );

  previousWeekAssignments.forEach((pa) => {
    lastWeekChoreMembersMap.set(pa.chore_id, pa.actual_member_ids || []);
  });

  // Calculate cumulative stats over all past assignments
  pastAssignments.forEach((assignment) => {
    const workers = assignment.actual_member_ids || [];
    workers.forEach((uid) => {
      if (memberWorkloadMap.has(uid)) {
        memberWorkloadMap.set(uid, memberWorkloadMap.get(uid) + 1);
      }

      const mcKey = `${uid}___${assignment.chore_id}`;
      memberChoreCountMap.set(mcKey, (memberChoreCountMap.get(mcKey) || 0) + 1);
    });

    // Track pair frequencies
    for (let i = 0; i < workers.length; i++) {
      for (let j = i + 1; j < workers.length; j++) {
        const pKey = getPairKey(workers[i], workers[j]);
        recentPairCountMap.set(pKey, (recentPairCountMap.get(pKey) || 0) + 1);
      }
    }
  });

  // --- TIME COLLISION TRACKING ---
  // Key: "Day_Time" -> Set of assigned user IDs
  const timeSlotOccupancy = new Map();

  // Sort chores: SCHEDULED chores with specific time slots FIRST, then Repeat on Demand chores
  const sortedChores = [...activeChores].sort((a, b) => {
    const aHasTime = a.chore_type === CHORE_TYPES.SCHEDULED && a.schedule_day && a.schedule_time;
    const bHasTime = b.chore_type === CHORE_TYPES.SCHEDULED && b.schedule_day && b.schedule_time;
    if (aHasTime && !bHasTime) return -1;
    if (!aHasTime && bHasTime) return 1;
    return 0;
  });

  const newAssignments = [];
  const warnings = [];

  sortedChores.forEach((chore) => {
    // 1. Check if there is a manual override for this chore
    if (existingOverridesMap.has(chore.id)) {
      newAssignments.push(existingOverridesMap.get(chore.id));
      return;
    }

    const requiredCount = Math.min(
      chore.required_people_count || 1,
      activeMembers.length
    );

    // 2. Filter AVAILABLE members (not marked absent during weekStartDate)
    const availableMembers = activeMembers.filter(
      (m) =>
        !absences.some(
          (abs) =>
            abs.user_id === m.user_id &&
            isDateInRange(weekStartDate, abs.start_date, abs.end_date)
        )
    );

    if (availableMembers.length === 0) {
      warnings.push(`No available members for chore "${chore.title}".`);
      return;
    }

    // 3. COLLISION CHECK: Find occupied members for this specific scheduled time slot
    const timeKey =
      chore.chore_type === CHORE_TYPES.SCHEDULED && chore.schedule_day && chore.schedule_time
        ? `${chore.schedule_day}_${chore.schedule_time}`
        : null;

    const occupiedUsers = timeKey ? timeSlotOccupancy.get(timeKey) || new Set() : new Set();

    // Candidates MUST NOT be occupied in the same time slot!
    let eligibleCandidates = availableMembers.filter(
      (m) => !occupiedUsers.has(m.user_id)
    );

    // If collisions make it impossible to get requiredCount, fallback to all available members with a warning
    if (eligibleCandidates.length < requiredCount) {
      eligibleCandidates = availableMembers;
      if (timeKey) {
        warnings.push(
          `Time conflict detected for "${chore.title}" (${chore.schedule_day} ${chore.schedule_time}). Some members have overlapping tasks.`
        );
      }
    }

    const targetK = Math.min(requiredCount, eligibleCandidates.length);

    // 4. GENERATE ALL POSSIBLE MEMBER COMBINATIONS OF SIZE targetK
    const possibleCombinations = getKCombinations(eligibleCandidates, targetK);

    const lastWeekWorkers = lastWeekChoreMembersMap.get(chore.id) || [];

    // 5. SCORE COMBINATIONS (Lowest score wins)
    const scoredCombinations = possibleCombinations.map((combination) => {
      let score = 0;

      combination.forEach((m) => {
        const uid = m.user_id;

        // Penalty 1: Overall workload
        score += (memberWorkloadMap.get(uid) || 0) * 2;

        // Penalty 2: Times user performed this specific chore
        const mcKey = `${uid}___${chore.id}`;
        score += (memberChoreCountMap.get(mcKey) || 0) * 5;

        // Heavy Penalty 3: User performed this exact chore last week!
        if (lastWeekWorkers.includes(uid)) {
          score += 20;
        }
      });

      // Penalty 4: Pair repetition penalty
      for (let i = 0; i < combination.length; i++) {
        for (let j = i + 1; j < combination.length; j++) {
          const pKey = getPairKey(combination[i].user_id, combination[j].user_id);
          score += (recentPairCountMap.get(pKey) || 0) * 8;
        }
      }

      return { combination, score };
    });

    // Sort combinations by score ascending (best fair combination first)
    scoredCombinations.sort((a, b) => a.score - b.score);

    const bestCombination = scoredCombinations[0]?.combination || eligibleCandidates.slice(0, targetK);
    const selectedUserIds = bestCombination.map((m) => m.user_id);

    // 6. UPDATE WORKLOAD STATS AND TIME SLOT OCCUPANCY
    selectedUserIds.forEach((uid) => {
      memberWorkloadMap.set(uid, (memberWorkloadMap.get(uid) || 0) + 1);

      const mcKey = `${uid}___${chore.id}`;
      memberChoreCountMap.set(mcKey, (memberChoreCountMap.get(mcKey) || 0) + 1);

      if (timeKey) {
        if (!timeSlotOccupancy.has(timeKey)) {
          timeSlotOccupancy.set(timeKey, new Set());
        }
        timeSlotOccupancy.get(timeKey).add(uid);
      }
    });

    for (let i = 0; i < selectedUserIds.length; i++) {
      for (let j = i + 1; j < selectedUserIds.length; j++) {
        const pKey = getPairKey(selectedUserIds[i], selectedUserIds[j]);
        recentPairCountMap.set(pKey, (recentPairCountMap.get(pKey) || 0) + 1);
      }
    }

    newAssignments.push({
      id: 'assign_' + Math.random().toString(36).substring(2, 9),
      house_id: houseId,
      schedule_id: scheduleId,
      week_number: weekNumber,
      year: year,
      chore_id: chore.id,
      assigned_team_id: null,
      assigned_user_id: selectedUserIds[0] || null,
      actual_member_ids: selectedUserIds,
      status: RESPONSIBILITY_STATUS.PENDING,
      source: ASSIGNMENT_SOURCE.AUTO_SCHEDULER,
      completion_count: 0,
      created_at: new Date().toISOString(),
    });
  });

  return { assignments: newAssignments, warnings };
}
