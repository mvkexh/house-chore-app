'use client';

import { useState } from 'react';
import {
  Calendar,
  CheckCircle2,
  Clock,
  Bell,
  Sparkles,
  User,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Send,
  PlusCircle,
  Check,
  X,
  Plus,
  Sun,
} from 'lucide-react';
import { store, getWeekDetails } from '../lib/storage';
import { RESPONSIBILITY_STATUS, CHORE_TYPES, ROLES } from '../lib/types';
import { formatDateTime12Hour, formatTimeOnly12Hour, formatDateRange } from '../lib/formatters';
import { CardSkeleton } from './Skeleton';
import CompletionChoiceModal from './CompletionChoiceModal';

export default function Dashboard({ house, currentUser, members, chores, onNavigateToChores, onOpenCreateChore, onShowToast }) {
  const [filterMode, setFilterMode] = useState('THIS_WEEK');
  const [currentWeekOffset, setCurrentWeekOffset] = useState(0);
  const [notifyFeedback, setNotifyFeedback] = useState({});
  const [showAvailabilityModal, setShowAvailabilityModal] = useState(false);
  const [pendingCompletionAssignId, setPendingCompletionAssignId] = useState(null);

  // Availability Modal State
  const currentMember = members.find((m) => m.user_id === currentUser.id);
  const [isUnavailable, setIsUnavailable] = useState(!!currentMember?.is_unavailable);
  const [availStartDate, setAvailStartDate] = useState(
    currentMember?.unavailable_start || new Date().toISOString().split('T')[0]
  );
  const [availEndDate, setAvailEndDate] = useState(currentMember?.unavailable_end || '');
  const [availReason, setAvailReason] = useState('');

  const targetDate = new Date();
  targetDate.setDate(targetDate.getDate() + currentWeekOffset * 7);
  const weekDetails = getWeekDetails(targetDate);

  const schedule = store.getOrCreateCurrentSchedule(house.id, targetDate);
  let assignments = store.getScheduleAssignments(schedule.id);

  const rawDb = store.getRawData();
  const completionEvents = store.getHouseCompletionEvents(house.id);
  const attentionRequests = store.getHouseAttentionRequests(house.id);

  // Helper maps
  const membersMap = new Map();
  members.forEach((m) => membersMap.set(m.user_id, m.display_name));

  const choresMap = new Map();
  chores.forEach((c) => choresMap.set(c.id, c));

  const usersMap = new Map();
  rawDb.users.forEach((u) => usersMap.set(u.id, u.full_name));

  // Calculated Stats
  const pendingCount = assignments.filter((a) => a.status === RESPONSIBILITY_STATUS.PENDING).length;
  const completedCount = assignments.filter((a) => a.status === RESPONSIBILITY_STATUS.COMPLETED).length;
  const attentionCount = attentionRequests.filter((ar) => ar.is_resolved !== true).length;
  const myResponsibilitiesCount = assignments.filter((a) =>
    (a.actual_member_ids || []).includes(currentUser.id)
  ).length;

  // Filter Modes
  if (filterMode === 'MY_TASKS') {
    assignments = assignments.filter((a) =>
      (a.actual_member_ids || []).includes(currentUser.id)
    );
  } else if (filterMode === 'PENDING') {
    assignments = assignments.filter((a) => a.status === RESPONSIBILITY_STATUS.PENDING);
  } else if (filterMode === 'COMPLETED') {
    assignments = assignments.filter((a) => a.status === RESPONSIBILITY_STATUS.COMPLETED);
  }

  const [pendingCompletionSubItemId, setPendingCompletionSubItemId] = useState(null);
  const [subItemModalConfig, setSubItemModalConfig] = useState(null);
  const [selectedSubItemIds, setSelectedSubItemIds] = useState([]);

  // Pending completion modal state calculation
  const pendingAssignment = assignments.find((a) => a.id === pendingCompletionAssignId);
  const pendingChoreObj = pendingAssignment ? choresMap.get(pendingAssignment.chore_id) : null;

  const pendingAssignedMembersList = pendingAssignment
    ? (pendingAssignment.actual_member_ids || []).map((uid) => ({
        id: uid,
        name: membersMap.get(uid) || usersMap.get(uid) || 'Roommate',
      }))
    : [];

  const allHouseMembersList = members.map((m) => ({
    id: m.user_id,
    name: m.display_name,
  }));

  // Multi Sub-item Action Triggers
  const handleCompleteClick = (assignment, chore) => {
    if (chore?.sub_items?.length > 1) {
      setSubItemModalConfig({
        assignmentId: assignment.id,
        choreTitle: chore.title,
        subItems: chore.sub_items,
        actionType: 'COMPLETE',
      });
      setSelectedSubItemIds(chore.sub_items.map((s) => s.id));
    } else {
      setPendingCompletionAssignId(assignment.id);
      setPendingCompletionSubItemId(chore?.sub_items?.[0]?.id || null);
    }
  };

  const handleBinFullClick = (assignment, chore) => {
    if (chore?.sub_items?.length > 1) {
      setSubItemModalConfig({
        assignmentId: assignment.id,
        choreTitle: chore.title,
        subItems: chore.sub_items,
        actionType: 'BIN_FULL',
      });
      setSelectedSubItemIds(chore.sub_items.map((s) => s.id));
    } else {
      handleReportAttention(assignment.id, chore?.title);
    }
  };

  const handleNotifyClick = (assignment, chore) => {
    if (chore?.sub_items?.length > 1) {
      setSubItemModalConfig({
        assignmentId: assignment.id,
        choreTitle: chore.title,
        subItems: chore.sub_items,
        actionType: 'NOTIFY_TEAM',
      });
      setSelectedSubItemIds(chore.sub_items.map((s) => s.id));
    } else {
      handleNotifyTeam(assignment.id);
    }
  };

  const handleConfirmSubItemSelection = () => {
    if (!subItemModalConfig) return;
    const { assignmentId, choreTitle, actionType, subItems } = subItemModalConfig;
    const ids = selectedSubItemIds.length === subItems.length ? 'ALL' : selectedSubItemIds;

    if (actionType === 'COMPLETE') {
      setPendingCompletionAssignId(assignmentId);
      setPendingCompletionSubItemId(ids);
    } else if (actionType === 'BIN_FULL') {
      store.reportChoreNeedsAttention(assignmentId, currentUser.id, 'Bin full / Needs cleaning', ids);
      onShowToast({ type: 'info', message: `Reported attention for "${choreTitle}". Team notified!` });
    } else if (actionType === 'NOTIFY_TEAM') {
      store.sendNotificationToTeam(assignmentId, currentUser.id, ids);
      setNotifyFeedback((prev) => ({ ...prev, [assignmentId]: true }));
      onShowToast({ type: 'info', message: 'Roommates notified!' });
      setTimeout(() => {
        setNotifyFeedback((prev) => ({ ...prev, [assignmentId]: false }));
      }, 3000);
    }
    setSubItemModalConfig(null);
    setSelectedSubItemIds([]);
  };

  // Handlers
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
      const title = pendingChoreObj?.title || 'Chore';
      onShowToast({
        type: 'success',
        message: `Marked "${title}" completed (${completionType === 'ALONE' ? 'Solo' : 'Together'})!`,
      });
    } catch (err) {
      onShowToast({ type: 'error', message: err.message || 'Permission denied' });
    }
    setPendingCompletionAssignId(null);
    setPendingCompletionSubItemId(null);
  };

  const handleReportAttention = (assignmentId, choreTitle) => {
    store.reportChoreNeedsAttention(assignmentId, currentUser.id, 'Needs attention / Bin full');
    onShowToast({ type: 'info', message: `Reported "${choreTitle}" needs attention. Team notified!` });
  };

  const handleNotifyTeam = (assignmentId) => {
    store.sendNotificationToTeam(assignmentId, currentUser.id);
    setNotifyFeedback((prev) => ({ ...prev, [assignmentId]: true }));
    onShowToast({ type: 'info', message: 'Roommates notified!' });
    setTimeout(() => {
      setNotifyFeedback((prev) => ({ ...prev, [assignmentId]: false }));
    }, 3000);
  };

  const handleSaveAvailability = (e) => {
    e.preventDefault();
    store.updateMemberAvailability(currentUser.id, house.id, {
      isUnavailable,
      startDate: isUnavailable ? availStartDate : null,
      endDate: isUnavailable ? availEndDate : null,
      reason: availReason,
    });
    setShowAvailabilityModal(false);
    onShowToast({ type: 'success', message: 'Availability updated!' });
  };

  // House Holiday Check
  const activeHolidayNow = store.isDateInHouseHoliday(house.id, new Date());

  // Greeting helper
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  return (
    <div className="space-y-3 sm:space-y-6 max-w-7xl mx-auto pb-16 md:pb-6">

      {/* HOUSE HOLIDAY BANNER */}
      {activeHolidayNow && (
        <div className="bg-gradient-to-r from-amber-500 via-amber-600 to-orange-600 text-white rounded-2xl p-4 sm:p-5 shadow-lg flex items-center justify-between gap-3 animate-in fade-in">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/20 rounded-xl backdrop-blur-xs shrink-0">
              <Sun className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-extrabold text-xs sm:text-sm tracking-wide uppercase bg-white/20 px-2 py-0.5 rounded text-amber-50">
                  House Holiday Active
                </span>
                <span className="text-xs text-amber-100 font-bold">
                  {formatDateRange(activeHolidayNow.start_date, activeHolidayNow.end_date)}
                </span>
              </div>
              <p className="text-xs sm:text-sm font-semibold mt-1 text-amber-50">
                "{activeHolidayNow.reason}" — Normal chore assignments and daily check reminders are currently paused. Enjoy the break!
              </p>
            </div>
          </div>
        </div>
      )}
      
      {/* 1. COMPACT TOP HEADER & GREETING */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4 min-w-0">
        <div className="min-w-0">
          <div className="text-[10px] sm:text-xs font-bold text-slate-500 dark:text-slate-400 truncate">
            This Week · {weekDetails.weekStartDate} – {weekDetails.weekEndDate}
          </div>
          <h1 className="text-lg sm:text-2xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight truncate">
            {greeting}, {currentUser?.full_name?.split(' ')[0] || 'Roommate'} 👋
          </h1>
          <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 font-medium">
            <b className="text-indigo-600 dark:text-indigo-400">{myResponsibilitiesCount}</b> responsibilities assigned this week.
          </p>
        </div>

        {/* AVAILABILITY BAR AT TOP OF HOMEPAGE */}
        <div className="flex items-center gap-2 flex-wrap min-w-0">
          <div className="p-1.5 sm:p-2.5 rounded-xl sm:rounded-2xl border border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex items-center justify-between gap-2 shadow-xs min-w-0 flex-1 sm:flex-initial">
            <div className="flex items-center gap-1 text-[11px] sm:text-xs font-bold min-w-0 truncate">
              {currentMember?.is_unavailable ? (
                <span className="text-rose-600 dark:text-rose-400 flex items-center gap-1 truncate">
                  🔴 Unavailable until {currentMember.unavailable_end || 'soon'}
                </span>
              ) : (
                <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1 shrink-0">
                  🟢 Available
                </span>
              )}
            </div>
            <button
              onClick={() => setShowAvailabilityModal(true)}
              className="text-[10px] sm:text-xs font-extrabold text-indigo-600 dark:text-indigo-400 hover:underline bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 sm:py-1 rounded-md sm:rounded-lg border border-indigo-100 dark:border-indigo-900 shrink-0"
            >
              Change
            </button>
          </div>

          <button
            onClick={onOpenCreateChore}
            className="hidden sm:flex py-2.5 px-3.5 rounded-xl sm:rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs shadow-md transition items-center gap-1.5 shrink-0"
          >
            <Plus className="w-4 h-4 shrink-0" />
            Add Chore
          </button>
        </div>
      </div>

      {/* 2. COMPACT QUICK STATS CARDS */}
      <div className="grid grid-cols-3 gap-1.5 sm:gap-4">
        <div className="p-2 sm:p-4 rounded-xl sm:rounded-2xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 flex flex-col sm:flex-row items-baseline sm:items-center justify-between min-w-0">
          <span className="text-[10px] sm:text-xs font-bold text-amber-800 dark:text-amber-300 truncate">🟠 Pending</span>
          <span className="text-lg sm:text-2xl font-extrabold text-amber-900 dark:text-amber-200">
            {pendingCount}
          </span>
        </div>

        <div className="p-2 sm:p-4 rounded-xl sm:rounded-2xl bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 flex flex-col sm:flex-row items-baseline sm:items-center justify-between min-w-0">
          <span className="text-[10px] sm:text-xs font-bold text-emerald-800 dark:text-emerald-300 truncate">✓ Done</span>
          <span className="text-lg sm:text-2xl font-extrabold text-emerald-900 dark:text-emerald-200">
            {completedCount}
          </span>
        </div>

        <div className="p-2 sm:p-4 rounded-xl sm:rounded-2xl bg-rose-50/80 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 flex flex-col sm:flex-row items-baseline sm:items-center justify-between min-w-0">
          <span className="text-[10px] sm:text-xs font-bold text-rose-800 dark:text-rose-300 truncate">🔔 Attention</span>
          <span className="text-lg sm:text-2xl font-extrabold text-rose-900 dark:text-rose-200">
            {attentionCount}
          </span>
        </div>
      </div>

      {/* 3. YOUR RESPONSIBILITIES FILTER CHIPS & CONTROLS */}
      <div className="flex items-center justify-between flex-wrap gap-1.5 pt-1.5 sm:pt-2 border-t border-slate-200 dark:border-gray-800 min-w-0">
        <div className="flex items-center gap-1 sm:gap-1.5 overflow-x-auto max-w-full pb-0.5 no-scrollbar min-w-0">
          {[
            { id: 'THIS_WEEK', label: 'This Week' },
            { id: 'MY_TASKS', label: 'My Tasks' },
            { id: 'PENDING', label: 'Pending' },
            { id: 'COMPLETED', label: 'Completed' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterMode(tab.id)}
              className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-bold transition shrink-0 ${
                filterMode === tab.id
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-white dark:bg-gray-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-gray-700 border border-slate-200 dark:border-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <div className="inline-flex rounded-lg sm:rounded-xl border border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-0.5 sm:p-1">
            <button
              onClick={() => setCurrentWeekOffset((prev) => prev - 1)}
              className="p-1 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 rounded hover:bg-slate-100 dark:hover:bg-gray-700"
            >
              <ChevronLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>
            <button
              onClick={() => setCurrentWeekOffset(0)}
              className="px-1.5 sm:px-2 py-0.5 text-[10px] sm:text-xs font-bold text-slate-700 dark:text-slate-300"
            >
              Reset
            </button>
            <button
              onClick={() => setCurrentWeekOffset((prev) => prev + 1)}
              className="p-1 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 rounded hover:bg-slate-100 dark:hover:bg-gray-700"
            >
              <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* 4. CHORE RESPONSIBILITY CARDS */}
      {chores.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-3xl border border-slate-200 dark:border-gray-700 p-12 text-center space-y-4">
          <div className="p-4 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 rounded-2xl inline-flex">
            <Sparkles className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-extrabold text-slate-900 dark:text-slate-100">Nothing here yet ✨</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto font-medium">
            Create your first chore and the system will automatically assign responsible house members!
          </p>
          <button
            onClick={onOpenCreateChore}
            className="py-3 px-6 rounded-2xl bg-indigo-600 text-white font-extrabold text-xs shadow-md hover:bg-indigo-700 transition inline-flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            + Create Chore
          </button>
        </div>
      ) : assignments.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-3xl border border-slate-200 dark:border-gray-700 p-8 text-center space-y-3">
          <Calendar className="w-8 h-8 text-indigo-600 mx-auto" />
          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">No responsibilities for this view</h3>
          <p className="text-xs text-slate-500">Switch filter tabs to view other house tasks.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {assignments.map((assignment) => {
            const chore = choresMap.get(assignment.chore_id);
            const isCompleted = assignment.status === RESPONSIBILITY_STATUS.COMPLETED;
            const isRepeatOnDemand = chore && chore.chore_type === CHORE_TYPES.REPEAT_ON_DEMAND;

            const actualWorkerNames = (assignment.actual_member_ids || []).map(
              (uid) => membersMap.get(uid) || usersMap.get(uid) || 'Roommate'
            );

            const lastCompletion = completionEvents.find(
              (ce) => ce.assignment_id === assignment.id
            );

            const activeAttentionReq = attentionRequests.find(
              (ar) => ar.assignment_id === assignment.id && ar.is_resolved !== true
            );

            // Permission check: Assigned member OR House Admin can mark complete
            const isAssigned = (assignment.actual_member_ids || []).includes(currentUser.id);
            const isHouseAdmin = currentMember?.role === ROLES.ADMIN || currentMember?.role === 'ADMIN' || house.created_by === currentUser.id;
            const canComplete = isAssigned || isHouseAdmin;

            return (
              <div
                key={assignment.id}
                className={`bg-white dark:bg-gray-800 rounded-3xl border transition-all duration-200 p-5 flex flex-col justify-between space-y-4 shadow-xs hover:shadow-md ${
                  isCompleted
                    ? 'border-emerald-200 dark:border-emerald-900 bg-emerald-50/20 dark:bg-emerald-950/20'
                    : 'border-slate-200 dark:border-gray-700'
                }`}
              >
                <div className="space-y-3">
                  {/* Status & Type Badges */}
                  <div className="flex items-center justify-between flex-wrap gap-1">
                    <span
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold ${
                        isCompleted
                          ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300'
                          : 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300'
                      }`}
                    >
                      {isCompleted ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                          🟢 COMPLETED
                        </>
                      ) : (
                        <>
                          <Clock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                          🟠 PENDING
                        </>
                      )}
                    </span>

                    <span className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-gray-700 px-2 py-0.5 rounded-lg">
                      {isRepeatOnDemand ? 'Repeat on Demand' : 'Scheduled'}
                    </span>
                  </div>

                  {/* Chore Title */}
                  <div>
                    <h3 className="text-lg font-extrabold text-slate-900 dark:text-slate-100">
                      {chore ? chore.title : 'Chore'}
                    </h3>
                    {chore && chore.description && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">
                        {chore.description}
                      </p>
                    )}
                  </div>

                  {/* Assigned Members Box */}
                  <div className="bg-slate-50 dark:bg-gray-700/50 rounded-2xl p-3.5 border border-slate-100 dark:border-gray-700 space-y-1.5">
                    <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                      <User className="w-3.5 h-3.5 text-indigo-500" />
                      <span className="font-bold">Assigned Roommates:</span>
                    </div>
                    <div className="text-base font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
                      {actualWorkerNames.length > 0 ? actualWorkerNames.join(' + ') : 'Unassigned'}
                    </div>

                    {!isRepeatOnDemand && chore && chore.schedule_day && (
                      <div className="text-xs text-slate-600 dark:text-slate-300 font-semibold pt-1">
                        🗓️ Scheduled: {chore.schedule_day} · {chore.schedule_time}
                      </div>
                    )}

                    {assignment.completion_count > 0 ? (
                      <div className="text-xs font-extrabold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-1 rounded-lg border border-emerald-200 dark:border-emerald-900 mt-1">
                        ✓ Completed {assignment.completion_count} time{assignment.completion_count > 1 ? 's' : ''} this week
                      </div>
                    ) : (
                      <div className="text-[11px] text-slate-400 italic pt-0.5">
                        No completion yet this week
                      </div>
                    )}
                  </div>

                  {/* Sub-items Compact Summary */}
                  {chore?.sub_items?.length > 0 && (
                    <div className="flex items-center justify-between text-xs font-semibold text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-gray-700/40 p-2.5 rounded-xl border border-slate-200/80 dark:border-gray-700">
                      <span className="font-bold flex items-center gap-1.5 truncate">
                        <span>📦 Areas:</span>
                        <span className="text-slate-900 dark:text-slate-100 font-extrabold truncate">
                          {chore.sub_items.map((s) => s.name).join(', ')}
                        </span>
                      </span>
                      <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 shrink-0 ml-2">
                        {chore.sub_items.filter((s) =>
                          completionEvents.some(
                            (ce) =>
                              ce.assignment_id === assignment.id &&
                              (ce.sub_item_id === s.id || ce.sub_item_ids?.includes(s.id))
                          )
                        ).length} of {chore.sub_items.length} completed
                      </span>
                    </div>
                  )}

                  {/* Active Attention Request Notice */}
                  {activeAttentionReq && (
                    <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 p-2.5 rounded-xl text-xs text-amber-900 dark:text-amber-200 space-y-1">
                      <div className="font-extrabold flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                        Attention Requested!
                      </div>
                      <p className="text-[11px] font-medium">
                        {activeAttentionReq.reporter_names.join(', ')} reported this chore needs attention.
                      </p>
                    </div>
                  )}

                  {/* Detailed Last Completion Timestamp */}
                  {lastCompletion && (
                    <div className="text-[11px] text-emerald-700 dark:text-emerald-300 bg-emerald-50/70 dark:bg-emerald-950/40 p-2.5 rounded-xl border border-emerald-100 dark:border-emerald-900/60 font-medium space-y-0.5">
                      <div className="font-bold flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                        <span>
                          {lastCompletion.completion_type === 'TOGETHER'
                            ? `Completed together · ${lastCompletion.participant_names?.join(', ') || lastCompletion.completed_by_name}`
                            : `Completed by ${lastCompletion.completed_by_name} · Alone`}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold">
                        {formatDateTime12Hour(lastCompletion.timestamp)}
                      </div>
                    </div>
                  )}
                </div>

                {/* Inline Action Buttons with Multi Sub-item Modal Support */}
                <div className="pt-2 border-t border-slate-100 dark:border-gray-700 space-y-2">
                  <div className={`grid ${canComplete ? 'grid-cols-2' : 'grid-cols-1'} gap-2`}>
                    {canComplete && (
                      <button
                        onClick={() => handleCompleteClick(assignment, chore)}
                        className="py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs transition shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        [Complete]
                      </button>
                    )}

                    <button
                      onClick={() => handleBinFullClick(assignment, chore)}
                      className="py-2.5 px-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-xs transition shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <AlertCircle className="w-4 h-4" />
                      [Bin Is Full]
                    </button>
                  </div>

                  <button
                    onClick={() => handleNotifyClick(assignment, chore)}
                    className="w-full py-2 px-3 rounded-xl bg-slate-100 dark:bg-gray-700 hover:bg-slate-200 dark:hover:bg-gray-600 text-slate-700 dark:text-slate-300 font-bold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5 text-indigo-500" />
                    {notifyFeedback[assignment.id] ? 'Notified!' : '[Notify Team]'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* AVAILABILITY MODAL */}
      {showAvailabilityModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-2xl border border-slate-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-slate-900 dark:text-slate-100 text-lg">
                Set My Availability
              </h3>
              <button
                onClick={() => setShowAvailabilityModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAvailability} className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-xl border border-slate-200 dark:border-gray-700 bg-slate-50 dark:bg-gray-700/50">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Status</span>
                <button
                  type="button"
                  onClick={() => setIsUnavailable(!isUnavailable)}
                  className={`px-3 py-1 rounded-lg text-xs font-extrabold border ${
                    isUnavailable
                      ? 'bg-rose-100 text-rose-800 border-rose-300'
                      : 'bg-emerald-100 text-emerald-800 border-emerald-300'
                  }`}
                >
                  {isUnavailable ? '🔴 Unavailable' : '🟢 Available'}
                </button>
              </div>

              {isUnavailable && (
                <div className="space-y-3 p-3 rounded-xl border border-rose-100 dark:border-rose-900 bg-rose-50/50 dark:bg-rose-950/30 text-xs">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Start Date
                    </label>
                    <input
                      type="date"
                      value={availStartDate}
                      onChange={(e) => setAvailStartDate(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-xs"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      End Date
                    </label>
                    <input
                      type="date"
                      value={availEndDate}
                      onChange={(e) => setAvailEndDate(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-xs"
                      required
                    />
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowAvailabilityModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-300 dark:border-gray-600 text-slate-600 dark:text-slate-300 text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 shadow-sm"
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MULTI SUB-ITEM SELECTION MODAL */}
      {subItemModalConfig && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-2xl border border-slate-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-extrabold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                  {subItemModalConfig.choreTitle}
                </span>
                <h3 className="font-extrabold text-slate-900 dark:text-slate-100 text-base">
                  {subItemModalConfig.actionType === 'COMPLETE' && 'What did you complete?'}
                  {subItemModalConfig.actionType === 'BIN_FULL' && 'Which area / bin is full?'}
                  {subItemModalConfig.actionType === 'NOTIFY_TEAM' && 'What needs attention?'}
                </h3>
              </div>
              <button
                onClick={() => {
                  setSubItemModalConfig(null);
                  setSelectedSubItemIds([]);
                }}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              Select one, multiple, or all sub-items below:
            </p>

            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              <button
                type="button"
                onClick={() => {
                  if (selectedSubItemIds.length === subItemModalConfig.subItems.length) {
                    setSelectedSubItemIds([]);
                  } else {
                    setSelectedSubItemIds(subItemModalConfig.subItems.map((s) => s.id));
                  }
                }}
                className="w-full text-left px-3 py-2 rounded-xl text-xs font-bold border border-slate-200 dark:border-gray-700 bg-slate-50 dark:bg-gray-700/50 flex items-center justify-between text-indigo-600 dark:text-indigo-400"
              >
                <span>Select All ({subItemModalConfig.subItems.length} items)</span>
                <span className="text-xs font-extrabold">
                  {selectedSubItemIds.length === subItemModalConfig.subItems.length ? '✓' : ''}
                </span>
              </button>

              {subItemModalConfig.subItems.map((s) => {
                const isSelected = selectedSubItemIds.includes(s.id);
                return (
                  <button
                    type="button"
                    key={s.id}
                    onClick={() => {
                      setSelectedSubItemIds((prev) =>
                        prev.includes(s.id) ? prev.filter((id) => id !== s.id) : [...prev, s.id]
                      );
                    }}
                    className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-bold border transition flex items-center justify-between ${
                      isSelected
                        ? 'bg-indigo-600 text-white border-indigo-600'
                        : 'bg-white dark:bg-gray-700 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-gray-600'
                    }`}
                  >
                    <span>{s.name}</span>
                    {isSelected && <Check className="w-4 h-4 shrink-0" />}
                  </button>
                );
              })}
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setSubItemModalConfig(null);
                  setSelectedSubItemIds([]);
                }}
                className="flex-1 py-2.5 rounded-xl border border-slate-300 dark:border-gray-600 text-slate-600 dark:text-slate-300 text-xs font-bold"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={selectedSubItemIds.length === 0}
                onClick={handleConfirmSubItemSelection}
                className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold shadow-sm"
              >
                {subItemModalConfig.actionType === 'COMPLETE' ? 'Continue' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* COMPLETION CHOICE MODAL */}
      <CompletionChoiceModal
        isOpen={!!pendingCompletionAssignId}
        onClose={() => setPendingCompletionAssignId(null)}
        choreTitle={pendingChoreObj ? pendingChoreObj.title : ''}
        assignedMembers={pendingAssignedMembersList}
        allHouseMembers={allHouseMembersList}
        currentUser={currentUser}
        onConfirm={handleConfirmCompletionChoice}
      />
    </div>
  );
}
