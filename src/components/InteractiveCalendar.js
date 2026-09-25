'use client';

import { useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Clock,
  CheckSquare,
  AlertTriangle,
  Check,
  Users,
  X,
  User,
  Shield,
  Bell,
  Plus,
  Tag,
  Send,
  Calendar,
  Sun,
} from 'lucide-react';
import { store, getWeekDetails } from '../lib/storage';
import { formatTime12Hour, formatDateTime12Hour, formatDateRange } from '../lib/formatters';
import { ROLES, CHORE_TYPES } from '../lib/types';
import CompletionChoiceModal from './CompletionChoiceModal';

const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export default function InteractiveCalendar({ house, currentUser, onShowToast, isModal = false, onCloseModal }) {
  const [currentWeekDate, setCurrentWeekDate] = useState(new Date());
  const [selectedDayFilter, setSelectedDayFilter] = useState('ALL'); // 'ALL' or 'Monday', etc.
  const [selectedItemDetail, setSelectedItemDetail] = useState(null);
  const [pendingCompletionAssignId, setPendingCompletionAssignId] = useState(null);
  const [pendingCompletionSubItemId, setPendingCompletionSubItemId] = useState(null);

  // Date Reminder Modal State
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [reminderChoreId, setReminderChoreId] = useState('');
  const [reminderSubItemId, setReminderSubItemId] = useState('');
  const [reminderDateStr, setReminderDateStr] = useState(new Date().toISOString().split('T')[0]);
  const [reminderTimeStr, setReminderTimeStr] = useState('18:00');
  const [reminderNote, setReminderNote] = useState('');

  if (!house) return null;

  const rawDb = store.getRawData();
  const weekDetails = getWeekDetails(currentWeekDate);
  const schedule = store.getOrCreateCurrentSchedule(house.id, currentWeekDate);
  const assignments = store.getScheduleAssignments(schedule.id);

  // Next Week Schedule Data
  const nextWeekDate = new Date(currentWeekDate);
  nextWeekDate.setDate(nextWeekDate.getDate() + 7);
  const nextSchedule = store.getOrCreateCurrentSchedule(house.id, nextWeekDate);
  const nextAssignments = store.getScheduleAssignments(nextSchedule.id);

  // House Members & Chores Maps
  const members = store.getHouseMembers(house.id);
  const chores = store.getHouseChores(house.id);

  const currentMember = members.find((m) => m.user_id === currentUser?.id);
  const isAdmin = house?.created_by === currentUser?.id || currentMember?.role === ROLES.ADMIN || currentMember?.role === 'ADMIN';

  const membersMap = new Map();
  members.forEach((m) => membersMap.set(m.user_id, m.display_name));
  (rawDb.users || []).forEach((u) => {
    if (!membersMap.has(u.id)) membersMap.set(u.id, u.full_name);
  });

  const choresMap = new Map();
  chores.forEach((c) => choresMap.set(c.id, c));

  // Actual Completion, Attention, and Reminder Logs for this house & week
  const completionEvents = (rawDb.completion_events || []).filter(
    (ce) => ce.house_id === house.id && ce.week_number === schedule.week_number && ce.year === schedule.year
  );

  const attentionRequests = (rawDb.attention_requests || []).filter(
    (ar) => ar.house_id === house.id && ar.week_number === schedule.week_number && ar.year === schedule.year
  );

  const houseReminders = (rawDb.reminders || []).filter(
    (r) => r.house_id === house.id
  );

  // Separate Repeat-on-Demand assignments (Weekly Responsibilities Pool) from Scheduled chores
  const onDemandAssignments = assignments.filter((a) => {
    const c = choresMap.get(a.chore_id);
    return c && c.chore_type === CHORE_TYPES.REPEAT_ON_DEMAND;
  });

  const scheduledAssignments = assignments.filter((a) => {
    const c = choresMap.get(a.chore_id);
    return c && c.chore_type === CHORE_TYPES.SCHEDULED;
  });

  // Generate 7 Days Date Info for the selected week
  const weekDays = DAYS_OF_WEEK.map((dayName, idx) => {
    const startDate = new Date(schedule.start_date + 'T00:00:00');
    const dayDate = new Date(startDate);
    dayDate.setDate(startDate.getDate() + idx);

    const dateStr = dayDate.toISOString().split('T')[0];
    const monthShort = dayDate.toLocaleString('en-US', { month: 'short' });
    const dayNum = dayDate.getDate();

    const todayStr = new Date().toISOString().split('T')[0];
    const isToday = dateStr === todayStr;

    return {
      dayName,
      dateStr,
      displayDate: `${monthShort} ${dayNum}`,
      isToday,
      dayDate,
    };
  });

  // Navigation Handlers
  const handlePrevWeek = (e) => {
    if (e) e.stopPropagation();
    const prev = new Date(currentWeekDate);
    prev.setDate(prev.getDate() - 7);
    setCurrentWeekDate(prev);
  };

  const handleNextWeek = (e) => {
    if (e) e.stopPropagation();
    const next = new Date(currentWeekDate);
    next.setDate(next.getDate() + 7);
    setCurrentWeekDate(next);
  };

  const handleToday = (e) => {
    if (e) e.stopPropagation();
    setCurrentWeekDate(new Date());
  };

  // Completion Choice Handler
  const handleConfirmCompletionChoice = ({ completionType, participantIds }) => {
    if (!pendingCompletionAssignId) return;

    try {
      store.markAssignmentCompleted(
        pendingCompletionAssignId,
        currentUser.id,
        completionType,
        participantIds,
        pendingCompletionSubItemId
      );
      if (onShowToast) {
        onShowToast({
          type: 'success',
          message: completionType === 'ALONE' ? 'Marked completed (Alone)' : 'Marked completed (Together)!',
        });
      }
    } catch (err) {
      if (onShowToast) {
        onShowToast({ type: 'error', message: err.message });
      }
    }

    setPendingCompletionAssignId(null);
    setPendingCompletionSubItemId(null);
    setSelectedItemDetail(null);
  };

  const handleReportAttention = (assignmentId, subItemId = null, e = null) => {
    if (e) e.stopPropagation();
    store.reportChoreNeedsAttention(assignmentId, currentUser.id, 'Needs attention / Bin full', subItemId);
    if (onShowToast) {
      onShowToast({ type: 'info', message: 'Report submitted to assigned team!' });
    }
    setSelectedItemDetail(null);
  };

  const handleSaveDateReminder = (e) => {
    e.preventDefault();
    if (!reminderChoreId) return;

    const chore = choresMap.get(reminderChoreId);
    const assign = assignments.find((a) => a.chore_id === reminderChoreId);
    const targetUserIds = assign ? assign.actual_member_ids : [];

    store.createSpecificDateReminder(
      house.id,
      reminderChoreId,
      reminderSubItemId || null,
      targetUserIds,
      reminderDateStr,
      reminderTimeStr,
      reminderNote,
      currentUser.id
    );

    setShowReminderModal(false);
    setReminderNote('');
    if (onShowToast) {
      onShowToast({ type: 'success', message: 'Specific date reminder scheduled!' });
    }
  };

  // Sub-item status lookup helper
  const getSubItemStatus = (assignmentId, subItemId) => {
    const isAttn = attentionRequests.some(
      (ar) => ar.assignment_id === assignmentId && ar.sub_item_id === subItemId && !ar.is_resolved
    );
    const lastComp = completionEvents.find(
      (ce) => ce.assignment_id === assignmentId && ce.sub_item_id === subItemId
    );
    return {
      isAttn,
      isDone: !!lastComp,
      lastComp,
    };
  };

  // Group items by day strictly for SCHEDULED chores and ACTUAL completion/reminder/attention events
  const getDayItems = (dayObj) => {
    const dayName = dayObj.dayName;
    const dateStr = dayObj.dateStr;

    const items = [];

    // 1. Scheduled Chores for this specific day
    scheduledAssignments.forEach((assign) => {
      const chore = choresMap.get(assign.chore_id);
      if (!chore) return;

      if (chore.schedule_day === dayName) {
        const completionsOnDate = completionEvents.filter(
          (ce) => ce.assignment_id === assign.id && ce.timestamp.startsWith(dateStr)
        );

        const attentionReq = attentionRequests.find(
          (ar) => ar.assignment_id === assign.id && !ar.is_resolved
        );

        let dayStatus = 'PENDING';
        if (attentionReq) {
          dayStatus = 'ATTENTION_REQUESTED';
        } else if (completionsOnDate.length > 0) {
          dayStatus = 'COMPLETED';
        }

        const assignedWorkerNames = (assign.actual_member_ids || []).map(
          (uid) => membersMap.get(uid) || 'Roommate'
        );

        const isAssignedToCurrent = (assign.actual_member_ids || []).includes(currentUser?.id);

        items.push({
          id: `sched_${assign.id}_${dateStr}`,
          itemType: 'SCHEDULED_TASK',
          assignmentId: assign.id,
          assignment: assign,
          chore: chore,
          title: chore.title,
          assignedWorkerNames,
          isAssignedToCurrent,
          canComplete: isAssignedToCurrent || isAdmin,
          status: dayStatus,
          scheduledTime: chore.schedule_time ? formatTime12Hour(chore.schedule_time) : 'Flex',
          completionsOnDate,
          attentionReq,
          dateStr,
          dayName,
        });
      }
    });

    // 2. Actual Completion Events on this date (for both Scheduled & Repeat-on-Demand)
    const completionsForDate = completionEvents.filter((ce) => ce.timestamp.startsWith(dateStr));
    completionsForDate.forEach((ce) => {
      const chore = choresMap.get(ce.chore_id);
      const assign = assignments.find((a) => a.id === ce.assignment_id);

      items.push({
        id: `comp_event_${ce.id}`,
        itemType: 'COMPLETION_EVENT',
        completionEvent: ce,
        chore: chore,
        title: ce.sub_item_name ? `${chore?.title || 'Chore'} (${ce.sub_item_name})` : chore?.title || 'Chore',
        completedByName: ce.completed_by_name,
        completionType: ce.completion_type,
        timeStr: formatTime12Hour(ce.timestamp.split('T')[1]),
        dateStr,
        dayName,
      });
    });

    // 3. Specific Date Reminders on this date
    const remindersForDate = houseReminders.filter((r) => r.remind_date === dateStr);
    remindersForDate.forEach((rem) => {
      const chore = choresMap.get(rem.chore_id);
      items.push({
        id: `rem_event_${rem.id}`,
        itemType: 'DATE_REMINDER',
        reminder: rem,
        chore: chore,
        title: rem.sub_item_name ? `Reminder: ${rem.chore_title} (${rem.sub_item_name})` : `Reminder: ${rem.chore_title}`,
        timeStr: formatTime12Hour(rem.remind_time),
        note: rem.note,
        createdByName: rem.created_by_name,
        dateStr,
        dayName,
      });
    });

    return items;
  };

  const pendingAssignObj = pendingCompletionAssignId
    ? assignments.find((a) => a.id === pendingCompletionAssignId)
    : null;
  const pendingChoreObj = pendingAssignObj ? choresMap.get(pendingAssignObj.chore_id) : null;
  
  const pendingAssignedMembersList = pendingAssignObj
    ? (pendingAssignObj.actual_member_ids || []).map((uid) => ({
        id: uid,
        name: membersMap.get(uid) || 'Roommate',
      }))
    : [];

  const allHouseMembersList = members.map((m) => ({
    id: m.user_id,
    name: m.display_name,
  }));

  return (
    <div
      className={`space-y-4 text-slate-900 dark:text-slate-100 ${isModal ? 'p-1' : ''}`}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Top Header & Week Controls */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl sm:rounded-3xl border border-slate-200 dark:border-gray-700 p-3.5 sm:p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 min-w-0">
        <div className="flex items-center gap-3 min-w-0">
          <div className="p-2.5 bg-indigo-600 dark:bg-indigo-500 text-white rounded-2xl shadow-xs shrink-0">
            <CalendarIcon className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h2 className="text-base sm:text-lg font-extrabold flex items-center gap-2 truncate">
              <span>Schedule Calendar</span>
              <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded-full border border-indigo-100 dark:border-indigo-900 shrink-0">
                Week {schedule.week_number}, {schedule.year}
              </span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium truncate">
              {formatDateRange(schedule.start_date, schedule.end_date)}
            </p>
          </div>
        </div>

        {/* Week Controls & Remind Action */}
        <div className="flex items-center justify-between sm:justify-end gap-1.5 shrink-0 flex-wrap">
          <button
            type="button"
            onClick={() => setShowReminderModal(true)}
            className="px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-900 font-extrabold text-xs hover:bg-amber-100 transition cursor-pointer flex items-center gap-1"
          >
            <Bell className="w-3.5 h-3.5 text-amber-600" />
            <span>+ Remind Date</span>
          </button>

          <button
            type="button"
            onClick={handlePrevWeek}
            className="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-gray-700 hover:bg-slate-100 dark:hover:bg-gray-700 text-slate-700 dark:text-slate-300 font-bold text-xs transition flex items-center gap-1 cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Prev</span>
          </button>

          <button
            type="button"
            onClick={handleToday}
            className="px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-900 font-extrabold text-xs hover:bg-indigo-100 transition cursor-pointer"
          >
            This Week
          </button>

          <button
            type="button"
            onClick={handleNextWeek}
            className="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-gray-700 hover:bg-slate-100 dark:hover:bg-gray-700 text-slate-700 dark:text-slate-300 font-bold text-xs transition flex items-center gap-1 cursor-pointer"
          >
            <span>Next</span>
            <ChevronRight className="w-4 h-4" />
          </button>

          {isModal && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (onCloseModal) onCloseModal();
              }}
              className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-gray-700 rounded-xl transition ml-1 cursor-pointer shrink-0"
              title="Close Calendar (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* HOUSE HOLIDAY BANNER */}
      {store.isDateInHouseHoliday(house.id, schedule.start_date) && (
        <div className="bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-2xl p-3.5 sm:p-4 shadow-sm flex items-center justify-between gap-3 animate-in fade-in">
          <div className="flex items-center gap-2.5">
            <Sun className="w-5 h-5 shrink-0" />
            <div className="text-xs">
              <span className="font-extrabold uppercase tracking-wide bg-white/20 px-2 py-0.5 rounded mr-2">House Holiday</span>
              <span className="font-semibold">
                "{store.isDateInHouseHoliday(house.id, schedule.start_date).reason}" ({formatDateRange(store.isDateInHouseHoliday(house.id, schedule.start_date).start_date, store.isDateInHouseHoliday(house.id, schedule.start_date).end_date)}) — Normal chore assignments and check-in reminders are paused.
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 1. REPEAT-ON-DEMAND WEEKLY RESPONSIBILITIES POOL SECTION */}
      {onDemandAssignments.length > 0 && selectedDayFilter === 'ALL' && (
        <div className="bg-slate-50 dark:bg-gray-800/90 rounded-2xl border border-slate-200 dark:border-gray-700 p-4 space-y-3 shadow-2xs">
          <div className="flex items-center justify-between flex-wrap gap-2 border-b border-slate-200 dark:border-gray-700 pb-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-extrabold uppercase tracking-wider text-amber-800 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/80 px-2.5 py-1 rounded-lg border border-amber-200 dark:border-amber-900">
                Repeat-on-Demand Responsibilities
              </span>
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                {formatDateRange(schedule.start_date, schedule.end_date)}
              </span>
            </div>
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 italic">
              Flex timing · Completed as needed during responsibility period
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {onDemandAssignments.map((assign) => {
              const chore = choresMap.get(assign.chore_id);
              if (!chore) return null;

              const assignedWorkerNames = (assign.actual_member_ids || []).map(
                (uid) => membersMap.get(uid) || 'Roommate'
              );
              const isCompletedThisWeek = assign.completion_count > 0;
              const subItems = chore.sub_items || [];
              const isAssignedToCurrent = (assign.actual_member_ids || []).includes(currentUser?.id);
              const canComplete = isAssignedToCurrent || isAdmin;

              return (
                <div
                  key={assign.id}
                  className="bg-white dark:bg-gray-800 p-3.5 rounded-2xl border border-slate-200 dark:border-gray-700 space-y-2.5 shadow-2xs hover:shadow-md transition"
                >
                  <div className="flex items-center justify-between gap-1">
                    <h4 className="font-extrabold text-sm text-slate-900 dark:text-slate-100 truncate">
                      {chore.title}
                    </h4>
                    <span
                      className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md ${
                        isCompletedThisWeek
                          ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900'
                          : 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-900'
                      }`}
                    >
                      {isCompletedThisWeek ? `✓ Completed (${assign.completion_count}x)` : 'Not completed this week'}
                    </span>
                  </div>

                  <div className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                    👤 <b>{assignedWorkerNames.join(' + ')}</b>
                  </div>

                  {/* Sub-items list breakdown */}
                  {subItems.length > 0 ? (
                    <div className="space-y-1 pt-1 border-t border-slate-100 dark:border-gray-700">
                      <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                        Sub-items / Areas:
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {subItems.map((sub) => {
                          const subStatus = getSubItemStatus(assign.id, sub.id);
                          return (
                            <div
                              key={sub.id}
                              className={`text-[10px] font-extrabold px-2 py-1 rounded-lg border flex items-center justify-between gap-2 w-full ${
                                subStatus.isAttn
                                  ? 'bg-amber-50 dark:bg-amber-950 text-amber-900 dark:text-amber-200 border-amber-300 dark:border-amber-800'
                                  : subStatus.isDone
                                  ? 'bg-emerald-50 dark:bg-emerald-950 text-emerald-900 dark:text-emerald-200 border-emerald-200 dark:border-emerald-900'
                                  : 'bg-slate-50 dark:bg-gray-700/50 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-gray-600'
                              }`}
                            >
                              <span className="truncate">
                                {subStatus.isAttn ? `🔔 ${sub.name}` : subStatus.isDone ? `✓ ${sub.name}` : sub.name}
                              </span>

                              {canComplete && (
                                <div className="flex gap-1 shrink-0">
                                  <button
                                    onClick={() => {
                                      setPendingCompletionAssignId(assign.id);
                                      setPendingCompletionSubItemId(sub.id);
                                    }}
                                    className="px-1.5 py-0.5 rounded bg-emerald-600 text-white text-[9px] font-bold"
                                    title={`Complete ${sub.name}`}
                                  >
                                    Done
                                  </button>
                                  <button
                                    onClick={() => handleReportAttention(assign.id, sub.id)}
                                    className="px-1.5 py-0.5 rounded bg-amber-500 text-white text-[9px] font-bold"
                                    title={`Report ${sub.name} Full`}
                                  >
                                    Full
                                  </button>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    /* General Actions if no sub items */
                    <div className="pt-2 border-t border-slate-100 dark:border-gray-700 flex items-center gap-1.5">
                      {canComplete && (
                        <button
                          onClick={() => setPendingCompletionAssignId(assign.id)}
                          className="flex-1 py-1.5 px-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl transition cursor-pointer"
                        >
                          [Complete]
                        </button>
                      )}
                      <button
                        onClick={() => handleReportAttention(assign.id)}
                        className="flex-1 py-1.5 px-2 bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-xs rounded-xl transition cursor-pointer"
                      >
                        [Bin Is Full]
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Day Selector Tabs (Mon - Sun + All Week + Next Week Section) */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar max-w-full min-w-0">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setSelectedDayFilter('ALL');
          }}
          className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition shrink-0 cursor-pointer ${
            selectedDayFilter === 'ALL'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'bg-white dark:bg-gray-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-gray-700 border border-slate-200 dark:border-gray-700'
          }`}
        >
          All Week
        </button>

        {weekDays.map((d) => (
          <button
            key={d.dayName}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setSelectedDayFilter(d.dayName);
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition shrink-0 flex items-center gap-1.5 cursor-pointer ${
              selectedDayFilter === d.dayName
                ? 'bg-indigo-600 text-white shadow-xs'
                : d.isToday
                ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-900'
                : 'bg-white dark:bg-gray-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-gray-700 border border-slate-200 dark:border-gray-700'
            }`}
          >
            <span>{d.dayName.substring(0, 3)}</span>
            <span className="text-[10px] opacity-80">{d.displayDate}</span>
            {d.isToday && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />}
          </button>
        ))}

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setSelectedDayFilter('NEXT_WEEK');
          }}
          className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition shrink-0 cursor-pointer ${
            selectedDayFilter === 'NEXT_WEEK'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-900'
          }`}
        >
          Next Week Schedule →
        </button>
      </div>

      {/* 2. DESKTOP 7-DAY CALENDAR GRID (SCHEDULED OCCURRENCES & ACTUAL LOGS ONLY) */}
      {selectedDayFilter === 'ALL' && (
        <div className="hidden md:grid grid-cols-7 gap-2.5">
          {weekDays.map((dayObj) => {
            const dayItems = getDayItems(dayObj);

            return (
              <div
                key={dayObj.dayName}
                className={`bg-white dark:bg-gray-800 rounded-2xl border p-3 space-y-2 min-h-[220px] shadow-2xs flex flex-col justify-between ${
                  dayObj.isToday
                    ? 'border-indigo-500 dark:border-indigo-400 ring-2 ring-indigo-500/20'
                    : 'border-slate-200 dark:border-gray-700'
                }`}
              >
                {/* Header */}
                <div className="border-b border-slate-100 dark:border-gray-700/80 pb-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-extrabold text-slate-900 dark:text-slate-100">
                      {dayObj.dayName.substring(0, 3)}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                        dayObj.isToday
                          ? 'bg-indigo-600 text-white'
                          : 'text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-gray-700'
                      }`}
                    >
                      {dayObj.displayDate}
                    </span>
                  </div>
                </div>

                {/* Day Items */}
                <div className="space-y-2 flex-1 overflow-y-auto max-h-[260px] pr-0.5">
                  {dayItems.length === 0 ? (
                    <div className="text-[10px] text-slate-400 dark:text-slate-500 italic pt-4 text-center">
                      No scheduled tasks
                    </div>
                  ) : (
                    dayItems.map((item) => {
                      if (item.itemType === 'COMPLETION_EVENT') {
                        return (
                          <div
                            key={item.id}
                            className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-950 dark:text-emerald-100 text-[10px] space-y-1 font-medium"
                          >
                            <div className="font-extrabold text-emerald-800 dark:text-emerald-300 truncate">
                              ✓ {item.title}
                            </div>
                            <div className="text-[9px] font-bold">
                              {item.completionType === 'TOGETHER' ? `Together: ${item.completedByName}` : `By ${item.completedByName} (Alone)`}
                            </div>
                            <div className="text-[9px] text-slate-400">{item.timeStr}</div>
                          </div>
                        );
                      }

                      if (item.itemType === 'DATE_REMINDER') {
                        return (
                          <div
                            key={item.id}
                            className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-950 dark:text-amber-100 text-[10px] space-y-1 font-medium"
                          >
                            <div className="font-extrabold text-amber-800 dark:text-amber-300 truncate">
                              🔔 {item.title}
                            </div>
                            <div className="text-[9px]">{item.timeStr} {item.note ? `· ${item.note}` : ''}</div>
                          </div>
                        );
                      }

                      // SCHEDULED TASK CARD
                      const isDone = item.status === 'COMPLETED';
                      const isAttn = item.status === 'ATTENTION_REQUESTED';

                      return (
                        <div
                          key={item.id}
                          className={`p-2.5 rounded-xl border text-xs cursor-pointer transition space-y-1.5 hover:shadow-md ${
                            isAttn
                              ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800 text-amber-950 dark:text-amber-100'
                              : isDone
                              ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/80 text-emerald-950 dark:text-emerald-100'
                              : 'bg-slate-50 dark:bg-gray-700/50 border-slate-200 dark:border-gray-600 text-slate-900 dark:text-slate-100'
                          }`}
                        >
                          <div className="font-extrabold truncate text-[11px]">
                            {item.title}
                          </div>
                          <div className="text-[10px] font-medium text-slate-500 dark:text-slate-400 truncate">
                            👤 {item.assignedWorkerNames.join(' + ')}
                          </div>

                          <div className="flex items-center justify-between pt-1 text-[9px] font-extrabold">
                            <span className="text-slate-400 flex items-center gap-0.5">
                              <Clock className="w-2.5 h-2.5" />
                              {item.scheduledTime}
                            </span>
                            <span
                              className={`px-1.5 py-0.2 rounded uppercase ${
                                isAttn
                                  ? 'bg-amber-200 dark:bg-amber-900 text-amber-900 dark:text-amber-200'
                                  : isDone
                                  ? 'bg-emerald-200 dark:bg-emerald-900 text-emerald-900 dark:text-emerald-200'
                                  : 'bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300'
                              }`}
                            >
                              {isAttn ? 'ATTN' : isDone ? 'DONE' : 'PENDING'}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* STACKED LIST VIEW FOR MOBILE & SINGLE DAY FILTERS */}
      {selectedDayFilter !== 'NEXT_WEEK' && (
        <div className={`${selectedDayFilter !== 'ALL' ? 'block' : 'block md:hidden'} space-y-3`}>
          {weekDays
            .filter((d) => selectedDayFilter === 'ALL' || d.dayName === selectedDayFilter)
            .map((dayObj) => {
              const dayItems = getDayItems(dayObj);

              return (
                <div
                  key={dayObj.dayName}
                  className="bg-white dark:bg-gray-800 rounded-2xl border border-slate-200 dark:border-gray-700 p-4 space-y-3 shadow-2xs"
                >
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-gray-700 pb-2">
                    <div className="flex items-center gap-2">
                      <h3 className="font-extrabold text-slate-900 dark:text-slate-100 text-sm">
                        {dayObj.dayName}
                      </h3>
                      <span className="text-xs text-slate-500 dark:text-slate-400 font-bold">
                        ({dayObj.displayDate})
                      </span>
                    </div>
                    {dayObj.isToday && (
                      <span className="bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 text-[10px] font-extrabold px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-900">
                        Today
                      </span>
                    )}
                  </div>

                  {dayItems.length === 0 ? (
                    <p className="text-xs text-slate-400 italic">No scheduled tasks or events for this day.</p>
                  ) : (
                    <div className="space-y-2.5">
                      {dayItems.map((item) => (
                        <div
                          key={item.id}
                          className="p-3 rounded-2xl border bg-slate-50 dark:bg-gray-700/50 border-slate-200 dark:border-gray-600 space-y-1 text-xs"
                        >
                          <div className="font-extrabold text-slate-900 dark:text-slate-100">
                            {item.title}
                          </div>
                          {item.itemType === 'COMPLETION_EVENT' && (
                            <div className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300">
                              ✓ Completed by {item.completedByName} ({item.completionType === 'TOGETHER' ? 'Together' : 'Alone'}) at {item.timeStr}
                            </div>
                          )}
                          {item.itemType === 'DATE_REMINDER' && (
                            <div className="text-[11px] font-bold text-amber-700 dark:text-amber-300">
                              🔔 Reminder at {item.timeStr} {item.note ? `· "${item.note}"` : ''}
                            </div>
                          )}
                          {item.itemType === 'SCHEDULED_TASK' && (
                            <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                              👥 {item.assignedWorkerNames.join(' + ')} · Scheduled {item.scheduledTime}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
        </div>
      )}

      {/* DATE REMINDER CREATION MODAL */}
      {showReminderModal && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-2xl border border-slate-200 dark:border-gray-700 text-slate-900 dark:text-slate-100">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-gray-700 pb-3">
              <h3 className="font-extrabold text-base flex items-center gap-2">
                <Bell className="w-5 h-5 text-amber-500" />
                Remind Team on Specific Date
              </h3>
              <button
                onClick={() => setShowReminderModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveDateReminder} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold mb-1">Select Chore *</label>
                <select
                  value={reminderChoreId}
                  onChange={(e) => {
                    setReminderChoreId(e.target.value);
                    setReminderSubItemId('');
                  }}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-xs font-bold"
                  required
                >
                  <option value="">-- Select Chore --</option>
                  {chores.map((c) => (
                    <option key={c.id} value={c.id}>{c.title}</option>
                  ))}
                </select>
              </div>

              {reminderChoreId && choresMap.get(reminderChoreId)?.sub_items?.length > 0 && (
                <div>
                  <label className="block font-bold mb-1">Select Area / Sub-item (Optional)</label>
                  <select
                    value={reminderSubItemId}
                    onChange={(e) => setReminderSubItemId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-xs font-bold"
                  >
                    <option value="">-- All Areas --</option>
                    {(choresMap.get(reminderChoreId)?.sub_items || []).map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold mb-1">Date *</label>
                  <input
                    type="date"
                    value={reminderDateStr}
                    onChange={(e) => setReminderDateStr(e.target.value)}
                    className="w-full px-2.5 py-2 rounded-xl border border-slate-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-xs font-semibold"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold mb-1">Time *</label>
                  <input
                    type="time"
                    value={reminderTimeStr}
                    onChange={(e) => setReminderTimeStr(e.target.value)}
                    className="w-full px-2.5 py-2 rounded-xl border border-slate-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-xs font-semibold"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold mb-1">Reminder Note (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Please take out the kitchen bin before guests arrive."
                  value={reminderNote}
                  onChange={(e) => setReminderNote(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-xs"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowReminderModal(false)}
                  className="flex-1 py-2.5 border border-slate-300 text-slate-600 rounded-xl font-bold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-extrabold text-xs shadow-xs"
                >
                  Save Reminder
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TEAM CHORE COMPLETION CHOICE MODAL */}
      <CompletionChoiceModal
        isOpen={!!pendingCompletionAssignId}
        onClose={() => {
          setPendingCompletionAssignId(null);
          setPendingCompletionSubItemId(null);
        }}
        choreTitle={pendingChoreObj ? pendingChoreObj.title : ''}
        assignedMembers={pendingAssignedMembersList}
        allHouseMembers={allHouseMembersList}
        currentUser={currentUser}
        onConfirm={handleConfirmCompletionChoice}
      />
    </div>
  );
}
