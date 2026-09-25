'use client';

import { useState } from 'react';
import { CheckSquare, Plus, Trash2, Edit2, Calendar, Users, Clock, Bell, Settings, X, Tag, Check } from 'lucide-react';
import { store } from '../lib/storage';
import { CHORE_TYPES, CHORE_FREQUENCIES, ASSIGNMENT_PREFERENCES } from '../lib/types';
import { formatTime12Hour, formatDateRange } from '../lib/formatters';
import ChoresModal from './ChoresModal';

export default function ChoresView({ house, currentUser, chores }) {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingChore, setEditingChore] = useState(null);

  // Form state for Editing Chore
  const [editTitle, setEditTitle] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editChoreType, setEditChoreType] = useState(CHORE_TYPES.REPEAT_ON_DEMAND);
  const [editRequiredPeopleCount, setEditRequiredPeopleCount] = useState(2);
  const [editFrequency, setEditFrequency] = useState(CHORE_FREQUENCIES.WEEKLY);
  const [editScheduleDay, setEditScheduleDay] = useState('Monday');
  const [editScheduleTime, setEditScheduleTime] = useState('19:00');
  const [editSubItems, setEditSubItems] = useState([]);
  const [editSubItemInput, setEditSubItemInput] = useState('');
  const [editDailyReminderEnabled, setEditDailyReminderEnabled] = useState(false);
  const [editDailyReminderTime, setEditDailyReminderTime] = useState('19:00');
  const [editAssignmentPrefType, setEditAssignmentPrefType] = useState(ASSIGNMENT_PREFERENCES.AUTOMATIC);
  const [editPreferenceChoreId, setEditPreferenceChoreId] = useState('');
  const [editPreferredUserIds, setEditPreferredUserIds] = useState([]);
  const [editAvoidUserIds, setEditAvoidUserIds] = useState([]);

  // Schedule Preview & Member Lookup Calculations
  const now = new Date();
  const thisSched = house ? store.getOrCreateCurrentSchedule(house.id, now) : null;
  const thisAssignments = thisSched ? store.getScheduleAssignments(thisSched.id) : [];

  const nextWeekDate = new Date(now);
  nextWeekDate.setDate(nextWeekDate.getDate() + 7);
  const nextSched = house ? store.getOrCreateCurrentSchedule(house.id, nextWeekDate) : null;
  const nextAssignments = nextSched ? store.getScheduleAssignments(nextSched.id) : [];

  const rawDb = store.getRawData();
  const members = house ? store.getHouseMembers(house.id) : [];
  const activeMembers = members.filter((m) => m.is_active !== false);

  const membersMap = new Map();
  members.forEach((m) => membersMap.set(m.user_id, m.display_name));
  rawDb.users.forEach((u) => {
    if (!membersMap.has(u.id)) membersMap.set(u.id, u.full_name);
  });

  const handleOpenEditModal = (c) => {
    setEditingChore(c);
    setEditTitle(c.title || '');
    setEditNotes(c.notes || '');
    setEditChoreType(c.chore_type || CHORE_TYPES.REPEAT_ON_DEMAND);
    setEditRequiredPeopleCount(c.required_people_count || 2);
    setEditFrequency(c.frequency || CHORE_FREQUENCIES.WEEKLY);
    setEditScheduleDay(c.schedule_day || 'Monday');
    setEditScheduleTime(c.schedule_time || '19:00');

    const subs = Array.isArray(c.sub_items)
      ? c.sub_items.map((s) => (typeof s === 'string' ? s : s.name))
      : [];
    setEditSubItems(subs);
    setEditSubItemInput('');

    setEditDailyReminderEnabled(!!c.daily_reminder_enabled);
    setEditDailyReminderTime(c.daily_reminder_time || '19:00');

    setEditAssignmentPrefType(c.assignment_preference_type || ASSIGNMENT_PREFERENCES.AUTOMATIC);
    setEditPreferenceChoreId(c.preference_chore_id || '');
    setEditPreferredUserIds(Array.isArray(c.preferred_user_ids) ? c.preferred_user_ids : []);
    setEditAvoidUserIds(Array.isArray(c.avoid_user_ids) ? c.avoid_user_ids : []);
  };

  const handleAddEditSubItem = () => {
    const trimmed = editSubItemInput.trim();
    if (trimmed && !editSubItems.includes(trimmed)) {
      setEditSubItems([...editSubItems, trimmed]);
      setEditSubItemInput('');
    }
  };

  const handleRemoveEditSubItem = (idx) => {
    setEditSubItems(editSubItems.filter((_, i) => i !== idx));
  };

  const handleToggleEditPreferredUser = (uid) => {
    setEditPreferredUserIds((prev) =>
      prev.includes(uid) ? prev.filter((id) => id !== uid) : [...prev, uid]
    );
  };

  const handleToggleEditAvoidUser = (uid) => {
    setEditAvoidUserIds((prev) =>
      prev.includes(uid) ? prev.filter((id) => id !== uid) : [...prev, uid]
    );
  };

  const handleSaveEditChore = (e) => {
    e.preventDefault();
    if (!editingChore || !editTitle.trim()) return;

    store.updateChore(editingChore.id, {
      title: editTitle.trim(),
      notes: editNotes.trim(),
      chore_type: editChoreType,
      required_people_count: parseInt(editRequiredPeopleCount) || 1,
      frequency: editFrequency,
      schedule_day: editScheduleDay,
      schedule_time: editScheduleTime,
      sub_items: editSubItems,
      daily_reminder_enabled: editDailyReminderEnabled,
      daily_reminder_time: editDailyReminderTime,
      assignment_preference_type: editAssignmentPrefType,
      preference_chore_id: editPreferenceChoreId || null,
      preferred_user_ids: editPreferredUserIds,
      avoid_user_ids: editAvoidUserIds,
    });

    setEditingChore(null);
  };

  const handleDeleteChore = (choreId) => {
    store.deleteChore(choreId);
  };

  const thisWeekRange = thisSched ? formatDateRange(thisSched.start_date, thisSched.end_date) : '';
  const nextWeekRange = nextSched ? formatDateRange(nextSched.start_date, nextSched.end_date) : '';

  const getPrefLabel = (c) => {
    const mode = c.assignment_preference_type;
    if (mode === ASSIGNMENT_PREFERENCES.AUTOMATIC) return 'Automatic';
    if (mode === ASSIGNMENT_PREFERENCES.MANUAL) return 'Manual';
    if (mode === ASSIGNMENT_PREFERENCES.SAME_TEAM || mode === ASSIGNMENT_PREFERENCES.COORDINATE_SAME_TEAM) return 'Always Same Team';
    if (mode === ASSIGNMENT_PREFERENCES.PREFER_SAME_TEAM) return 'Prefer Same Team';
    if (mode === ASSIGNMENT_PREFERENCES.MEMBER_PREFERENCES) return 'Member Preferences';
    return 'Automatic';
  };

  return (
    <div className="space-y-6 text-slate-900 dark:text-slate-100">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-slate-200 dark:border-gray-700 p-6 shadow-xs flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <CheckSquare className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            House Chores
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Specify <b>What</b> needs to be done, <b>Sub-items / Areas</b>, and <b>Flexible Assignment Rules</b>. Rotate assignments fairly with full human control!
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs shadow-xs transition flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          + Add Chore
        </button>
      </div>

      {/* Chores List Grid */}
      {chores.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-slate-200 dark:border-gray-700 p-12 text-center text-slate-400 space-y-3">
          <CheckSquare className="w-10 h-10 text-slate-300 dark:text-gray-600 mx-auto" />
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">No chores configured yet.</p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="py-2 px-4 rounded-xl bg-indigo-600 text-white font-extrabold text-xs shadow-xs"
          >
            Add Your First Chore
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {chores.map((c) => {
            const isRepeatOnDemand = c.chore_type === CHORE_TYPES.REPEAT_ON_DEMAND;
            const thisAssign = thisAssignments.find((a) => a.chore_id === c.id);
            const nextAssign = nextAssignments.find((a) => a.chore_id === c.id);

            const thisWeekMembers = thisAssign
              ? (thisAssign.actual_member_ids || []).map((id) => membersMap.get(id) || 'Member').join(', ')
              : 'Unassigned';
            const nextWeekMembers = nextAssign
              ? (nextAssign.planned_member_ids || nextAssign.actual_member_ids || []).map((id) => membersMap.get(id) || 'Member').join(', ')
              : 'Unassigned';

            const choreSubItems = c.sub_items || [];

            return (
              <div key={c.id} className="bg-white dark:bg-gray-800 rounded-2xl border border-slate-200 dark:border-gray-700 p-5 space-y-3.5 shadow-xs flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded uppercase border ${
                      isRepeatOnDemand
                        ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-900'
                        : 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border-indigo-100 dark:border-indigo-900'
                    }`}>
                      {isRepeatOnDemand ? 'Repeat on Demand' : 'Scheduled'}
                    </span>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenEditModal(c)}
                        className="p-1.5 text-slate-400 hover:text-indigo-600 transition rounded-lg hover:bg-slate-100 dark:hover:bg-gray-700"
                        title="Edit Chore Settings"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteChore(c.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 transition rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/50"
                        title="Delete Chore"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-extrabold text-slate-900 dark:text-slate-100">{c.title}</h3>
                    {c.notes && <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 italic">"{c.notes}"</p>}
                  </div>

                  {/* Sub-Items / Areas Display */}
                  {choreSubItems.length > 0 && (
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        Sub-items / Areas ({choreSubItems.length})
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {choreSubItems.map((sub) => (
                          <span key={sub.id || sub.name} className="text-[11px] font-bold px-2.5 py-0.5 rounded-lg bg-slate-100 dark:bg-gray-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-gray-600 flex items-center gap-1">
                            <Tag className="w-3 h-3 text-indigo-500" />
                            {typeof sub === 'string' ? sub : sub.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Configuration Breakdown */}
                  <div className="bg-slate-50 dark:bg-gray-700/30 p-3 rounded-xl border border-slate-100 dark:border-gray-700 text-xs space-y-1.5 font-medium">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 dark:text-slate-400">People Required:</span>
                      <span className="font-extrabold text-slate-900 dark:text-slate-100">{c.required_people_count || 1} people</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 dark:text-slate-400">Frequency:</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">{c.frequency || 'Weekly'}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 dark:text-slate-400">Assignment Rule:</span>
                      <span className="font-extrabold text-indigo-600 dark:text-indigo-400">{getPrefLabel(c)}</span>
                    </div>
                    {!isRepeatOnDemand && c.schedule_day && (
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500 dark:text-slate-400">Scheduled Time:</span>
                        <span className="font-bold text-slate-800 dark:text-slate-200">
                          {c.schedule_day} — {formatTime12Hour(c.schedule_time)}
                        </span>
                      </div>
                    )}
                    {isRepeatOnDemand && c.daily_reminder_enabled && (
                      <div className="flex items-center justify-between text-indigo-700 dark:text-indigo-300 font-bold text-[11px]">
                        <span className="flex items-center gap-1">
                          <Bell className="w-3 h-3" /> Daily Check Reminder:
                        </span>
                        <span>{formatTime12Hour(c.daily_reminder_time)}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Assignment Schedule Breakdown (This Week & Next Week) */}
                <div className="bg-slate-50/70 dark:bg-gray-700/40 p-3 rounded-xl border border-slate-200/80 dark:border-gray-700 text-xs space-y-2 pt-3">
                  <div className="flex items-center justify-between font-extrabold text-slate-800 dark:text-slate-200 border-b border-slate-200/60 dark:border-gray-600 pb-1.5">
                    <span className="flex items-center gap-1.5 text-[11px]">
                      <Calendar className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                      Assignment Schedule
                    </span>
                  </div>

                  {/* THIS WEEK */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-extrabold text-indigo-700 dark:text-indigo-300">This Week</span>
                      <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">{thisWeekRange}</span>
                    </div>
                    <div className="flex items-center justify-between bg-white dark:bg-gray-800 p-2 rounded-lg border border-slate-100 dark:border-gray-700">
                      <div className="min-w-0 pr-2">
                        <div className="font-extrabold text-slate-900 dark:text-slate-100 text-xs truncate">
                          👤 {thisWeekMembers}
                        </div>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-extrabold shrink-0 ${
                          thisAssign?.status === 'COMPLETED'
                            ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300'
                            : 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300'
                        }`}
                      >
                        {thisAssign?.status === 'COMPLETED' ? '✓ Completed' : 'Pending'}
                      </span>
                    </div>
                  </div>

                  {/* NEXT WEEK */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-extrabold text-slate-700 dark:text-slate-300">Next Week</span>
                      <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">{nextWeekRange}</span>
                    </div>
                    <div className="bg-white dark:bg-gray-800 p-2 rounded-lg border border-slate-100 dark:border-gray-700 flex items-center justify-between">
                      <div className="font-extrabold text-slate-800 dark:text-slate-200 text-xs truncate">
                        👥 Planned: {nextWeekMembers}
                      </div>
                      <span className="text-[10px] font-bold text-slate-400">Scheduled</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 4-STEP CREATE CHORE MODAL */}
      {showCreateModal && (
        <ChoresModal
          house={house}
          currentUser={currentUser}
          onClose={() => setShowCreateModal(false)}
          onShowToast={(t) => console.log(t)}
        />
      )}

      {/* EDIT CHORE MODAL */}
      {editingChore && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 max-w-lg w-full space-y-4 shadow-2xl border border-slate-200 dark:border-gray-700 my-8 text-slate-900 dark:text-slate-100">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-gray-700 pb-3">
              <h2 className="text-lg font-extrabold flex items-center gap-2">
                <Edit2 className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                Edit Chore Settings
              </h2>
              <button
                type="button"
                onClick={() => setEditingChore(null)}
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditChore} className="space-y-4 text-xs font-semibold">
              <div>
                <label className="block text-xs font-extrabold mb-1">Chore Name *</label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-xs font-semibold outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-extrabold mb-1">Notes / Instructions</label>
                <input
                  type="text"
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-xs outline-none"
                />
              </div>

              {/* Sub-items / Areas Editing */}
              <div>
                <label className="block text-xs font-extrabold mb-1">Sub-items / Areas</label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    placeholder="e.g. Bathroom Dustbin"
                    value={editSubItemInput}
                    onChange={(e) => setEditSubItemInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddEditSubItem();
                      }
                    }}
                    className="flex-1 px-3 py-2 rounded-xl border border-slate-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-xs"
                  />
                  <button
                    type="button"
                    onClick={handleAddEditSubItem}
                    className="px-3 py-2 rounded-xl bg-indigo-600 text-white font-extrabold text-xs hover:bg-indigo-700 transition"
                  >
                    + Add Item
                  </button>
                </div>

                {editSubItems.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 p-2 rounded-xl bg-slate-50 dark:bg-gray-700/40 border border-slate-200 dark:border-gray-700">
                    {editSubItems.map((item, idx) => (
                      <span key={idx} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-900 font-bold text-[11px]">
                        <span>{item}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveEditSubItem(idx)}
                          className="text-indigo-400 hover:text-rose-600"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* People Required & Frequency */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-extrabold mb-1">People Required</label>
                  <select
                    value={editRequiredPeopleCount}
                    onChange={(e) => setEditRequiredPeopleCount(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-xs font-bold outline-none"
                  >
                    <option value={1}>1 person</option>
                    <option value={2}>2 people</option>
                    <option value={3}>3 people</option>
                    <option value={4}>4 people</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-extrabold mb-1">Frequency</label>
                  <select
                    value={editFrequency}
                    onChange={(e) => setEditFrequency(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-xs font-bold outline-none"
                  >
                    <option value={CHORE_FREQUENCIES.WEEKLY}>Every Week</option>
                    <option value={CHORE_FREQUENCIES.DAILY}>Every Day</option>
                    <option value={CHORE_FREQUENCIES.EVERY_2_WEEKS}>Every 2 Weeks</option>
                    <option value={CHORE_FREQUENCIES.MONTHLY}>Monthly</option>
                  </select>
                </div>
              </div>

              {/* Assignment Rule Mode */}
              <div>
                <label className="block text-xs font-extrabold mb-1">Assignment Rule</label>
                <select
                  value={
                    editAssignmentPrefType === ASSIGNMENT_PREFERENCES.SAME_TEAM ||
                    editAssignmentPrefType === ASSIGNMENT_PREFERENCES.PREFER_SAME_TEAM
                      ? 'COORDINATE'
                      : editAssignmentPrefType
                  }
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === 'COORDINATE') {
                      setEditAssignmentPrefType(ASSIGNMENT_PREFERENCES.SAME_TEAM);
                    } else {
                      setEditAssignmentPrefType(val);
                    }
                  }}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-xs font-bold outline-none"
                >
                  <option value={ASSIGNMENT_PREFERENCES.AUTOMATIC}>Automatic (Balanced Workload & Non-repetition)</option>
                  <option value={ASSIGNMENT_PREFERENCES.MANUAL}>Manual (Selected Members)</option>
                  <option value="COORDINATE">Coordinate with another chore</option>
                  <option value={ASSIGNMENT_PREFERENCES.MEMBER_PREFERENCES}>Member Preferences</option>
                </select>
              </div>

              {/* MANUAL SELECTION */}
              {editAssignmentPrefType === ASSIGNMENT_PREFERENCES.MANUAL && (
                <div className="p-3 bg-slate-50 dark:bg-gray-700/40 rounded-xl border border-slate-200 dark:border-gray-700 space-y-2">
                  <label className="block text-[11px] font-bold">Select assigned members:</label>
                  <div className="flex flex-wrap gap-2">
                    {activeMembers.map((m) => (
                      <button
                        type="button"
                        key={m.user_id}
                        onClick={() => handleToggleEditPreferredUser(m.user_id)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition ${
                          editPreferredUserIds.includes(m.user_id)
                            ? 'bg-indigo-600 text-white border-indigo-600'
                            : 'bg-white dark:bg-gray-700 text-slate-700 dark:text-slate-200 border-slate-300 dark:border-gray-600'
                        }`}
                      >
                        {m.display_name} {editPreferredUserIds.includes(m.user_id) && '✓'}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* COORDINATE WITH ANOTHER CHORE */}
              {(editAssignmentPrefType === ASSIGNMENT_PREFERENCES.SAME_TEAM ||
                editAssignmentPrefType === ASSIGNMENT_PREFERENCES.PREFER_SAME_TEAM ||
                editAssignmentPrefType === ASSIGNMENT_PREFERENCES.COORDINATE_SAME_TEAM) && (
                <div className="p-3 bg-indigo-50/50 dark:bg-indigo-950/40 rounded-xl border border-indigo-200 dark:border-indigo-900 space-y-2.5">
                  <div>
                    <label className="block text-[11px] font-bold mb-1 text-indigo-900 dark:text-indigo-200">
                      Select reference chore to follow:
                    </label>
                    <select
                      value={editPreferenceChoreId}
                      onChange={(e) => setEditPreferenceChoreId(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-xs font-bold"
                    >
                      <option value="">-- Choose Chore --</option>
                      {chores.filter((c) => c.id !== editingChore.id).map((c) => (
                        <option key={c.id} value={c.id}>{c.title}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-indigo-900 dark:text-indigo-200 mb-1">
                      Team Relationship:
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setEditAssignmentPrefType(ASSIGNMENT_PREFERENCES.SAME_TEAM)}
                        className={`p-2 rounded-lg text-xs font-extrabold border transition ${
                          editAssignmentPrefType === ASSIGNMENT_PREFERENCES.SAME_TEAM || editAssignmentPrefType === ASSIGNMENT_PREFERENCES.COORDINATE_SAME_TEAM
                            ? 'bg-indigo-600 text-white border-indigo-600'
                            : 'bg-white dark:bg-gray-700 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-gray-600'
                        }`}
                      >
                        Always same team
                      </button>

                      <button
                        type="button"
                        onClick={() => setEditAssignmentPrefType(ASSIGNMENT_PREFERENCES.PREFER_SAME_TEAM)}
                        className={`p-2 rounded-lg text-xs font-extrabold border transition ${
                          editAssignmentPrefType === ASSIGNMENT_PREFERENCES.PREFER_SAME_TEAM
                            ? 'bg-indigo-600 text-white border-indigo-600'
                            : 'bg-white dark:bg-gray-700 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-gray-600'
                        }`}
                      >
                        Prefer same team
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Daily Check Reminder */}
              {editChoreType === CHORE_TYPES.REPEAT_ON_DEMAND && (
                <div className="p-3 bg-indigo-50/60 dark:bg-indigo-950/40 rounded-2xl border border-indigo-100 dark:border-indigo-900 space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editDailyReminderEnabled}
                      onChange={(e) => setEditDailyReminderEnabled(e.target.checked)}
                      className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="text-xs font-extrabold text-indigo-900 dark:text-indigo-200">
                      Enable Daily Check Reminder
                    </span>
                  </label>
                  {editDailyReminderEnabled && (
                    <div className="flex items-center justify-between pt-1 pl-6">
                      <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300">Check time:</span>
                      <input
                        type="time"
                        value={editDailyReminderTime}
                        onChange={(e) => setEditDailyReminderTime(e.target.value)}
                        className="px-2 py-1 rounded-lg border border-slate-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-xs font-bold"
                      />
                    </div>
                  )}
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingChore(null)}
                  className="flex-1 py-2.5 border border-slate-300 dark:border-gray-600 text-slate-600 dark:text-slate-300 rounded-xl font-bold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-extrabold text-xs shadow-md transition"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
