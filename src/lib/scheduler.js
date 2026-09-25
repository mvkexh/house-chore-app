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

  // Sort chores: SCHEDULED chores first, then chores that refer to another chore (SAME_TEAM or PREFER_SAME_TEAM) later so reference chore is assigned first
  const sortedChores = [...activeChores].sort((a, b) => {
    const aRef = a.preference_chore_id;
    const bRef = b.preference_chore_id;

    if (aRef === b.id) return 1;
    if (bRef === a.id) return -1;

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

    // 2. MANUAL ASSIGNMENT MODE
    if (chore.assignment_preference_type === 'MANUAL' && Array.isArray(chore.preferred_user_ids) && chore.preferred_user_ids.length > 0) {
      const activePreferred = chore.preferred_user_ids.filter((uid) => activeMembers.some((m) => m.user_id === uid));
      const finalManualUids = activePreferred.length > 0
        ? activePreferred
        : activeMembers.slice(0, chore.required_people_count || 1).map((m) => m.user_id);

      newAssignments.push({
        id: 'assign_' + Math.random().toString(36).substring(2, 9),
        house_id: houseId,
        schedule_id: scheduleId,
        week_number: weekNumber,
        year: year,
        chore_id: chore.id,
        assigned_team_id: null,
        assigned_user_id: finalManualUids[0] || null,
        actual_member_ids: finalManualUids,
        status: RESPONSIBILITY_STATUS.PENDING,
        source: 'MANUAL_MODE',
        completion_count: 0,
        created_at: new Date().toISOString(),
      });

      finalManualUids.forEach((uid) => {
        memberWorkloadMap.set(uid, (memberWorkloadMap.get(uid) || 0) + 1);
        const mcKey = `${uid}___${chore.id}`;
        memberChoreCountMap.set(mcKey, (memberChoreCountMap.get(mcKey) || 0) + 1);
      });
      return;
    }

    // 3. SAME_TEAM MODE (Always follow another chore's team)
    if (
      (chore.assignment_preference_type === 'SAME_TEAM' || chore.assignment_preference_type === 'PREFER_SAME_TEAM') &&
      chore.preference_chore_id
    ) {
      const refAssign = newAssignments.find((a) => a.chore_id === chore.preference_chore_id);
      if (chore.assignment_preference_type === 'SAME_TEAM' && refAssign && refAssign.actual_member_ids?.length > 0) {
        const refUids = refAssign.actual_member_ids;
        newAssignments.push({
          id: 'assign_' + Math.random().toString(36).substring(2, 9),
          house_id: houseId,
          schedule_id: scheduleId,
          week_number: weekNumber,
          year: year,
          chore_id: chore.id,
          assigned_team_id: null,
          assigned_user_id: refUids[0] || null,
          actual_member_ids: refUids,
          status: RESPONSIBILITY_STATUS.PENDING,
          source: 'SAME_TEAM_FOLLOW',
          completion_count: 0,
          created_at: new Date().toISOString(),
        });

        refUids.forEach((uid) => {
          memberWorkloadMap.set(uid, (memberWorkloadMap.get(uid) || 0) + 1);
          const mcKey = `${uid}___${chore.id}`;
          memberChoreCountMap.set(mcKey, (memberChoreCountMap.get(mcKey) || 0) + 1);
        });
        return;
      }
    }

    // --- CONSEQUENCE ROTATION RULE ---
    const lastAssignment = previousWeekAssignments.find((a) => a.chore_id === chore.id);
    const lastWorkers = lastAssignment?.actual_member_ids || [];

    const wasUncompleted =
      lastAssignment &&
      lastAssignment.status !== RESPONSIBILITY_STATUS.COMPLETED &&
      (lastAssignment.completion_count || 0) === 0;

    const anyWorkerAbsentLastWeek = lastWorkers.some((uid) =>
      absences.some(
        (abs) =>
          abs.user_id === uid &&
          isDateInRange(lastAssignment.start_date || weekStartDate, abs.start_date, abs.end_date)
      )
    );

    const anyWorkerAbsentThisWeek = lastWorkers.some((uid) =>
      absences.some(
        (abs) => abs.user_id === uid && isDateInRange(weekStartDate, abs.start_date, abs.end_date)
      )
    );

    const shouldRetainConsequence =
      wasUncompleted &&
      !anyWorkerAbsentLastWeek &&
      !anyWorkerAbsentThisWeek &&
      lastWorkers.length > 0;

    if (shouldRetainConsequence) {
      warnings.push(
        `Chore "${chore.title}" retained by previous team due to uncompleted responsibility in Week ${lastAssignment.week_number}.`
      );

      newAssignments.push({
        id: 'assign_' + Math.random().toString(36).substring(2, 9),
        house_id: houseId,
        schedule_id: scheduleId,
        week_number: weekNumber,
        year: year,
        chore_id: chore.id,
        assigned_team_id: null,
        assigned_user_id: lastWorkers[0] || null,
        actual_member_ids: lastWorkers,
        status: RESPONSIBILITY_STATUS.PENDING,
        source: 'CONSEQUENCE_RETAINED',
        retention_reason: `Uncompleted in Week ${lastAssignment.week_number}`,
        completion_count: 0,
        created_at: new Date().toISOString(),
      });
      return;
    }

    const requiredCount = Math.min(
      chore.required_people_count || 1,
      activeMembers.length
    );

    // Filter AVAILABLE members
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

    // COLLISION CHECK
    const timeKey =
      chore.chore_type === CHORE_TYPES.SCHEDULED && chore.schedule_day && chore.schedule_time
        ? `${chore.schedule_day}_${chore.schedule_time}`
        : null;

    const occupiedUsers = timeKey ? timeSlotOccupancy.get(timeKey) || new Set() : new Set();

    let eligibleCandidates = availableMembers.filter(
      (m) => !occupiedUsers.has(m.user_id)
    );

    if (eligibleCandidates.length < requiredCount) {
      eligibleCandidates = availableMembers;
      if (timeKey) {
        warnings.push(
          `Time conflict detected for "${chore.title}" (${chore.schedule_day} ${chore.schedule_time}). Some members have overlapping tasks.`
        );
      }
    }

    const targetK = Math.min(requiredCount, eligibleCandidates.length);

    // GENERATE ALL POSSIBLE MEMBER COMBINATIONS OF SIZE targetK
    const possibleCombinations = getKCombinations(eligibleCandidates, targetK);
    const lastWeekWorkers = lastWeekChoreMembersMap.get(chore.id) || [];

    // Find reference chore's assigned team if PREFER_SAME_TEAM constraint is enabled
    let sameTeamReferenceUserIds = [];
    if (
      (chore.assignment_preference_type === 'PREFER_SAME_TEAM' || chore.assignment_preference_type === 'SAME_TEAM') &&
      chore.preference_chore_id
    ) {
      const refAssign = newAssignments.find((a) => a.chore_id === chore.preference_chore_id);
      if (refAssign) {
        sameTeamReferenceUserIds = refAssign.actual_member_ids || [];
      }
    }

    const preferredUserIds = chore.preferred_user_ids || [];
    const avoidUserIds = chore.avoid_user_ids || [];

    // SCORE COMBINATIONS (Lowest score wins)
    const scoredCombinations = possibleCombinations.map((combination) => {
      let score = 0;
      const combinationUids = combination.map((m) => m.user_id);

      combination.forEach((m) => {
        const uid = m.user_id;

        // Base Penalty 1: Overall workload
        score += (memberWorkloadMap.get(uid) || 0) * 2;

        // Base Penalty 2: Times user performed this specific chore
        const mcKey = `${uid}___${chore.id}`;
        const choreCount = memberChoreCountMap.get(mcKey) || 0;
        score += choreCount * 5;

        // Base Penalty 3: User performed this exact chore last week!
        if (lastWeekWorkers.includes(uid)) {
          score += 20;
        }

        // AVOID_REPETITION MODE
        if (chore.assignment_preference_type === 'AVOID_REPETITION') {
          score += choreCount * 15;
          if (lastWeekWorkers.includes(uid)) score += 50;
        }

        // MEMBER_PREFERENCES / PREFER_USERS / AVOID_USERS
        if (preferredUserIds.includes(uid)) {
          score -= 35; // Heavy bonus for preferred member
        }
        if (avoidUserIds.includes(uid)) {
          score += 45; // Heavy penalty for avoided member
        }
      });

      // PREFER_SAME_TEAM constraint bonus
      if (sameTeamReferenceUserIds.length > 0) {
        const overlapCount = combinationUids.filter((uid) => sameTeamReferenceUserIds.includes(uid)).length;
        score -= overlapCount * 30; // Heavy bonus for matching same team as referenced chore
      }

      // Pair repetition penalty
      for (let i = 0; i < combination.length; i++) {
        for (let j = i + 1; j < combination.length; j++) {
          const pKey = getPairKey(combination[i].user_id, combination[j].user_id);
          let pairPenalty = (recentPairCountMap.get(pKey) || 0) * 8;
          if (chore.assignment_preference_type === 'AVOID_REPETITION') {
            pairPenalty *= 3;
          }
          score += pairPenalty;
        }
      }

      return { combination, score };
    });

    // Sort combinations by score ascending (best fair combination first)
    scoredCombinations.sort((a, b) => a.score - b.score);

    const bestCombination = scoredCombinations[0]?.combination || eligibleCandidates.slice(0, targetK);
    const selectedUserIds = bestCombination.map((m) => m.user_id);

    // UPDATE WORKLOAD STATS AND TIME SLOT OCCUPANCY
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
