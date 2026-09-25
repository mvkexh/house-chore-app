'use client';

import { useState } from 'react';
import {
  Plus,
  CheckCircle2,
  Clock,
  Sparkles,
  X,
  ChevronRight,
  ChevronLeft,
  Tag,
  Trash2,
  Users,
  Calendar,
  Bell,
  Sliders,
  Check,
} from 'lucide-react';
import { store } from '../lib/storage';
import { CHORE_TYPES, CHORE_FREQUENCIES, ASSIGNMENT_PREFERENCES } from '../lib/types';
import { formatTime12Hour } from '../lib/formatters';

export default function ChoresModal({ house, currentUser, onClose, onShowToast }) {
  const [step, setStep] = useState(1);

  // STEP 1: Basic Info & Sub-items
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [hasSubItems, setHasSubItems] = useState(false);
  const [subItemInputs, setSubItemInputs] = useState(['Hall Dustbin', 'Kitchen Dustbin']);

  // STEP 2: People & Recurrence
  const [requiredPeopleCount, setRequiredPeopleCount] = useState(2);
  const [frequency, setFrequency] = useState(CHORE_FREQUENCIES.WEEKLY);
  const [choreType, setChoreType] = useState(CHORE_TYPES.REPEAT_ON_DEMAND);
  const [scheduleDay, setScheduleDay] = useState('Monday');
  const [scheduleTime, setScheduleTime] = useState('19:00');
  const [dailyReminderEnabled, setDailyReminderEnabled] = useState(false);
  const [dailyReminderTime, setDailyReminderTime] = useState('19:00');

  // STEP 3: Flexible Assignment Options
  const [assignmentPrefType, setAssignmentPrefType] = useState(ASSIGNMENT_PREFERENCES.AUTOMATIC);
  const [preferenceChoreId, setPreferenceChoreId] = useState('');
  const [preferredUserIds, setPreferredUserIds] = useState([]);
  const [avoidUserIds, setAvoidUserIds] = useState([]);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const houseMembers = house ? store.getHouseMembers(house.id) : [];
  const houseChores = house ? store.getHouseChores(house.id) : [];
  const activeMembers = houseMembers.filter((m) => m.is_active !== false);

  // Sub-items helpers
  const handleToggleSubItems = (enabled) => {
    setHasSubItems(enabled);
    if (enabled && subItemInputs.length === 0) {
      setSubItemInputs(['Item 1', 'Item 2']);
    }
  };

  const handleSubItemChange = (index, val) => {
    const next = [...subItemInputs];
    next[index] = val;
    setSubItemInputs(next);
  };

  const handleAddSubItemInput = () => {
    setSubItemInputs([...subItemInputs, `Item ${subItemInputs.length + 1}`]);
  };

  const handleRemoveSubItemInput = (index) => {
    setSubItemInputs(subItemInputs.filter((_, i) => i !== index));
  };

  // Preferred / Avoid User helpers
  const handleTogglePreferredUser = (uid) => {
    setPreferredUserIds((prev) =>
      prev.includes(uid) ? prev.filter((id) => id !== uid) : [...prev, uid]
    );
  };

  const handleToggleAvoidUser = (uid) => {
    setAvoidUserIds((prev) =>
      prev.includes(uid) ? prev.filter((id) => id !== uid) : [...prev, uid]
    );
  };

  // Submit Handler
  const handleSubmitChore = async (e) => {
    if (e) e.preventDefault();
    if (!title.trim()) return;

    setIsSubmitting(true);

    const formattedSubItems = hasSubItems
      ? subItemInputs.map((s) => s.trim()).filter(Boolean)
      : [];

    setTimeout(() => {
      store.createChore(
        house.id,
        {
          title: title.trim(),
          description: '',
          chore_type: choreType,
          required_people_count: parseInt(requiredPeopleCount) || 1,
          frequency: frequency,
          schedule_day: scheduleDay,
          schedule_time: scheduleTime,
          notes: notes.trim(),
          sub_items: formattedSubItems,
          daily_reminder_enabled: dailyReminderEnabled,
          daily_reminder_time: dailyReminderTime,
          assignment_preference_type: assignmentPrefType,
          preference_chore_id: preferenceChoreId || null,
          preferred_user_ids: preferredUserIds,
          avoid_user_ids: avoidUserIds,
        },
        currentUser.id
      );

      setIsSubmitting(false);
      onShowToast?.({ type: 'success', message: `"${title}" created with updated assignment rules!` });
      onClose();
    }, 400);
  };

  // Helper labels for Step 4 Summary
  const getAssignmentModeSummary = () => {
    if (assignmentPrefType === ASSIGNMENT_PREFERENCES.AUTOMATIC) {
      return 'Automatic (Balanced workload & availability)';
    }
    if (assignmentPrefType === ASSIGNMENT_PREFERENCES.MANUAL) {
      const names = preferredUserIds
        .map((uid) => activeMembers.find((m) => m.user_id === uid)?.display_name || 'Member')
        .join(', ');
      return names ? `Manual: ${names}` : 'Manual (Selected members)';
    }
    if (
      assignmentPrefType === ASSIGNMENT_PREFERENCES.COORDINATE_SAME_TEAM ||
      assignmentPrefType === ASSIGNMENT_PREFERENCES.SAME_TEAM
    ) {
      const refChore = houseChores.find((c) => c.id === preferenceChoreId);
      return refChore ? `Always same team as "${refChore.title}"` : 'Always same team as selected chore';
    }
    if (assignmentPrefType === ASSIGNMENT_PREFERENCES.PREFER_SAME_TEAM) {
      const refChore = houseChores.find((c) => c.id === preferenceChoreId);
      return refChore ? `Prefer same team as "${refChore.title}"` : 'Prefer same team as selected chore';
    }
    if (assignmentPrefType === ASSIGNMENT_PREFERENCES.MEMBER_PREFERENCES) {
      const prefNames = preferredUserIds.map((uid) => activeMembers.find((m) => m.user_id === uid)?.display_name).filter(Boolean);
      const avoidNames = avoidUserIds.map((uid) => activeMembers.find((m) => m.user_id === uid)?.display_name).filter(Boolean);
      let text = '';
      if (prefNames.length) text += `Prefer: ${prefNames.join(', ')}`;
      if (avoidNames.length) text += `${text ? ' | ' : ''}Avoid: ${avoidNames.join(', ')}`;
      return text || 'Member Preferences';
    }
    return 'Automatic';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/60 backdrop-blur-xs p-0 sm:p-4 overflow-y-auto">
      <div className="bg-white dark:bg-gray-800 rounded-t-3xl sm:rounded-3xl max-w-lg w-full max-h-[92vh] sm:max-h-[88vh] flex flex-col shadow-2xl border border-slate-200 dark:border-gray-700 overflow-hidden min-w-0">
        
        {/* Sticky Header */}
        <div className="sticky top-0 z-20 shrink-0 bg-white dark:bg-gray-800 border-b border-slate-200 dark:border-gray-700 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[10px] sm:text-[11px] font-extrabold text-indigo-600 dark:text-indigo-400 tracking-wider uppercase">
                Step {step} of 4
              </div>
              <h2 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-slate-100">
                {step === 1 && '1. What & Sub-items'}
                {step === 2 && '2. Schedule & Recurrence'}
                {step === 3 && '3. Flexible Assignment Rules'}
                {step === 4 && '4. Review & Create Chore'}
              </h2>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl transition"
              title="Close modal"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-slate-100 dark:bg-gray-700 h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-indigo-600 h-full transition-all duration-300"
              style={{ width: `${(step / 4) * 100}%` }}
            ></div>
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 text-slate-900 dark:text-slate-100">
          
          {/* STEP 1: Chore Title & Sub-items */}
          {step === 1 && (
            <div className="space-y-5 animate-in fade-in">
              <div>
                <label className="block text-xs font-extrabold mb-1">
                  Chore Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Garbage, Kitchen Cleaning, Toilet Cleaning"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-xs font-semibold outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-extrabold mb-1">
                  Instructions / Notes (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Empty all dustbins and replace trash bags."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-xs font-medium outline-none"
                />
              </div>

              {/* Sub-items / Locations Question */}
              <div className="p-4 bg-slate-50 dark:bg-gray-700/50 rounded-2xl border border-slate-200 dark:border-gray-600 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-xs font-extrabold block text-slate-800 dark:text-slate-200">
                      Does this chore have multiple areas or items?
                    </label>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      e.g. Hall Dustbin, Kitchen Dustbin, Bathroom Dustbin
                    </p>
                  </div>

                  <div className="flex gap-1 bg-white dark:bg-gray-800 p-1 rounded-xl border border-slate-200 dark:border-gray-600 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleToggleSubItems(false)}
                      className={`px-3 py-1 text-xs font-bold rounded-lg transition ${
                        !hasSubItems
                          ? 'bg-indigo-600 text-white shadow-2xs'
                          : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-gray-700'
                      }`}
                    >
                      No
                    </button>
                    <button
                      type="button"
                      onClick={() => handleToggleSubItems(true)}
                      className={`px-3 py-1 text-xs font-bold rounded-lg transition ${
                        hasSubItems
                          ? 'bg-indigo-600 text-white shadow-2xs'
                          : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-gray-700'
                      }`}
                    >
                      Yes
                    </button>
                  </div>
                </div>

                {hasSubItems && (
                  <div className="space-y-3 pt-2 border-t border-slate-200 dark:border-gray-600 animate-in fade-in">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        Item / Area Names ({subItemInputs.length}):
                      </span>
                      <button
                        type="button"
                        onClick={handleAddSubItemInput}
                        className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Add Area
                      </button>
                    </div>

                    <div className="space-y-2">
                      {subItemInputs.map((val, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-400 w-12 shrink-0">
                            Item {idx + 1}:
                          </span>
                          <input
                            type="text"
                            value={val}
                            onChange={(e) => handleSubItemChange(idx, e.target.value)}
                            placeholder={`e.g. Area ${idx + 1}`}
                            className="flex-1 px-3 py-2 text-xs font-semibold rounded-xl border border-slate-300 dark:border-gray-600 bg-white dark:bg-gray-700 outline-none focus:ring-2 focus:ring-indigo-500"
                            required
                          />
                          {subItemInputs.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveSubItemInput(idx)}
                              className="p-2 text-slate-400 hover:text-rose-600 transition shrink-0"
                              title="Remove item"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <button
                type="button"
                disabled={!title.trim()}
                onClick={() => setStep(2)}
                className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-extrabold text-xs shadow-md transition flex items-center justify-center gap-1.5"
              >
                Next Step <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* STEP 2: People & Recurrence */}
          {step === 2 && (
            <div className="space-y-5 animate-in fade-in">
              <div>
                <label className="block text-xs font-extrabold mb-1.5">
                  How many people are required for each occurrence?
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[1, 2, 3, 4].map((count) => (
                    <button
                      key={count}
                      type="button"
                      onClick={() => setRequiredPeopleCount(count)}
                      className={`p-3 rounded-xl border text-center font-extrabold text-xs transition ${
                        requiredPeopleCount === count
                          ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400'
                          : 'border-slate-200 dark:border-gray-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-gray-700'
                      }`}
                    >
                      {count} {count === 1 ? 'Person' : 'People'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-extrabold mb-1">Frequency</label>
                  <select
                    value={frequency}
                    onChange={(e) => setFrequency(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-xs font-bold outline-none"
                  >
                    <option value={CHORE_FREQUENCIES.WEEKLY}>Weekly</option>
                    <option value={CHORE_FREQUENCIES.DAILY}>Daily</option>
                    <option value={CHORE_FREQUENCIES.EVERY_2_WEEKS}>Every 2 Weeks</option>
                    <option value={CHORE_FREQUENCIES.ONCE}>Once</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-extrabold mb-1">Chore Nature</label>
                  <select
                    value={choreType}
                    onChange={(e) => setChoreType(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-xs font-bold outline-none"
                  >
                    <option value={CHORE_TYPES.REPEAT_ON_DEMAND}>Repeat on Demand (e.g. Garbage)</option>
                    <option value={CHORE_TYPES.SCHEDULED}>Scheduled (Fixed Day & Time)</option>
                  </select>
                </div>
              </div>

              {choreType === CHORE_TYPES.SCHEDULED && (
                <div className="grid grid-cols-2 gap-3 p-3.5 bg-indigo-50/50 dark:bg-indigo-950/40 rounded-xl border border-indigo-100 dark:border-indigo-900">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">Scheduled Day</label>
                    <select
                      value={scheduleDay}
                      onChange={(e) => setScheduleDay(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-xs font-semibold"
                    >
                      {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((d) => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">Time</label>
                    <input
                      type="time"
                      value={scheduleTime}
                      onChange={(e) => setScheduleTime(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-xs font-semibold"
                    />
                  </div>
                </div>
              )}

              {/* Daily Reminder Toggle */}
              {choreType === CHORE_TYPES.REPEAT_ON_DEMAND && (
                <div className="p-3.5 bg-indigo-50/60 dark:bg-indigo-950/40 rounded-2xl border border-indigo-100 dark:border-indigo-900 space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={dailyReminderEnabled}
                      onChange={(e) => setDailyReminderEnabled(e.target.checked)}
                      className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="text-xs font-extrabold text-indigo-900 dark:text-indigo-200">
                      Enable Daily Check Reminder
                    </span>
                  </label>
                  {dailyReminderEnabled && (
                    <div className="flex items-center justify-between pt-1 pl-6">
                      <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300">Check time:</span>
                      <input
                        type="time"
                        value={dailyReminderTime}
                        onChange={(e) => setDailyReminderTime(e.target.value)}
                        className="px-2 py-1 rounded-lg border border-slate-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-xs font-bold"
                      />
                    </div>
                  )}
                </div>
              )}

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="flex-1 py-3 border border-slate-300 dark:border-gray-600 text-slate-600 dark:text-slate-300 rounded-xl font-bold text-xs"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-extrabold text-xs shadow-md transition flex items-center justify-center gap-1.5"
                >
                  Next Step <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: Flexible Member Assignment Options */}
          {step === 3 && (
            <div className="space-y-4 animate-in fade-in">
              <div>
                <label className="block text-xs font-extrabold mb-1">
                  How should members be assigned?
                </label>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Select assignment rules for the scheduler
                </p>
              </div>

              {/* 4 Assignment Options */}
              <div className="space-y-2.5">
                {[
                  {
                    id: ASSIGNMENT_PREFERENCES.AUTOMATIC,
                    label: 'Automatic',
                    desc: 'Let the scheduler automatically choose based on workload, availability, and non-repetition.',
                  },
                  {
                    id: ASSIGNMENT_PREFERENCES.MANUAL,
                    label: 'Manual',
                    desc: 'Select specific house members directly for this chore.',
                  },
                  {
                    id: 'COORDINATE',
                    label: 'Coordinate with another chore',
                    desc: 'Share or align the assigned team with another chore in the house.',
                  },
                  {
                    id: ASSIGNMENT_PREFERENCES.MEMBER_PREFERENCES,
                    label: 'Member preferences',
                    desc: 'Set custom preferences for preferred or avoided members.',
                  },
                ].map((option) => {
                  const isCoord = option.id === 'COORDINATE';
                  const isSelected = isCoord
                    ? assignmentPrefType === ASSIGNMENT_PREFERENCES.SAME_TEAM ||
                      assignmentPrefType === ASSIGNMENT_PREFERENCES.PREFER_SAME_TEAM ||
                      assignmentPrefType === ASSIGNMENT_PREFERENCES.COORDINATE_SAME_TEAM
                    : assignmentPrefType === option.id;

                  return (
                    <div
                      key={option.id}
                      onClick={() => {
                        if (isCoord) {
                          setAssignmentPrefType(ASSIGNMENT_PREFERENCES.SAME_TEAM);
                        } else {
                          setAssignmentPrefType(option.id);
                        }
                      }}
                      className={`p-3.5 rounded-2xl border text-left cursor-pointer transition ${
                        isSelected
                          ? 'border-indigo-600 bg-indigo-50/70 dark:bg-indigo-950/60 shadow-xs'
                          : 'border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-slate-50 dark:hover:bg-gray-700'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-extrabold text-slate-900 dark:text-slate-100">
                          {option.label}
                        </span>
                        {isSelected && <Check className="w-4 h-4 text-indigo-600 shrink-0" />}
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                        {option.desc}
                      </p>
                    </div>
                  );
                })}
              </div>

              {/* MANUAL SELECTION UI */}
              {assignmentPrefType === ASSIGNMENT_PREFERENCES.MANUAL && (
                <div className="p-3.5 bg-indigo-50/50 dark:bg-indigo-950/40 rounded-2xl border border-indigo-200 dark:border-indigo-900 space-y-2 animate-in fade-in">
                  <label className="block text-xs font-bold text-indigo-900 dark:text-indigo-200">
                    Select assigned members ({preferredUserIds.length} selected):
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {activeMembers.map((m) => {
                      const isSel = preferredUserIds.includes(m.user_id);
                      return (
                        <button
                          type="button"
                          key={m.user_id}
                          onClick={() => handleTogglePreferredUser(m.user_id)}
                          className={`p-2 rounded-xl text-xs font-bold border transition text-left flex items-center justify-between ${
                            isSel
                              ? 'bg-indigo-600 text-white border-indigo-600'
                              : 'bg-white dark:bg-gray-700 text-slate-700 dark:text-slate-200 border-slate-300 dark:border-gray-600'
                          }`}
                        >
                          <span className="truncate">{m.display_name}</span>
                          {isSel && <Check className="w-3.5 h-3.5 shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* COORDINATE WITH ANOTHER CHORE UI */}
              {(assignmentPrefType === ASSIGNMENT_PREFERENCES.SAME_TEAM ||
                assignmentPrefType === ASSIGNMENT_PREFERENCES.PREFER_SAME_TEAM ||
                assignmentPrefType === ASSIGNMENT_PREFERENCES.COORDINATE_SAME_TEAM) && (
                <div className="p-3.5 bg-indigo-50/50 dark:bg-indigo-950/40 rounded-2xl border border-indigo-200 dark:border-indigo-900 space-y-3 animate-in fade-in">
                  <div>
                    <label className="block text-xs font-bold text-indigo-900 dark:text-indigo-200 mb-1">
                      Select reference chore to follow:
                    </label>
                    <select
                      value={preferenceChoreId}
                      onChange={(e) => setPreferenceChoreId(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-xs font-bold outline-none"
                      required
                    >
                      <option value="">-- Select Chore --</option>
                      {houseChores.map((c) => (
                        <option key={c.id} value={c.id}>{c.title}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-indigo-900 dark:text-indigo-200 mb-1.5">
                      Team Relationship:
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setAssignmentPrefType(ASSIGNMENT_PREFERENCES.SAME_TEAM)}
                        className={`p-2.5 rounded-xl text-xs font-extrabold border transition text-left ${
                          assignmentPrefType === ASSIGNMENT_PREFERENCES.SAME_TEAM || assignmentPrefType === ASSIGNMENT_PREFERENCES.COORDINATE_SAME_TEAM
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                            : 'bg-white dark:bg-gray-700 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-gray-600 hover:bg-slate-100'
                        }`}
                      >
                        Always use same team
                        <p className={`text-[10px] font-normal mt-0.5 ${
                          assignmentPrefType === ASSIGNMENT_PREFERENCES.SAME_TEAM || assignmentPrefType === ASSIGNMENT_PREFERENCES.COORDINATE_SAME_TEAM ? 'text-indigo-100' : 'text-slate-500'
                        }`}>
                          Strictly match team
                        </p>
                      </button>

                      <button
                        type="button"
                        onClick={() => setAssignmentPrefType(ASSIGNMENT_PREFERENCES.PREFER_SAME_TEAM)}
                        className={`p-2.5 rounded-xl text-xs font-extrabold border transition text-left ${
                          assignmentPrefType === ASSIGNMENT_PREFERENCES.PREFER_SAME_TEAM
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                            : 'bg-white dark:bg-gray-700 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-gray-600 hover:bg-slate-100'
                        }`}
                      >
                        Prefer same team
                        <p className={`text-[10px] font-normal mt-0.5 ${
                          assignmentPrefType === ASSIGNMENT_PREFERENCES.PREFER_SAME_TEAM ? 'text-indigo-100' : 'text-slate-500'
                        }`}>
                          Fallback if unavailable
                        </p>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* MEMBER PREFERENCES UI */}
              {assignmentPrefType === ASSIGNMENT_PREFERENCES.MEMBER_PREFERENCES && (
                <div className="p-3.5 bg-indigo-50/50 dark:bg-indigo-950/40 rounded-2xl border border-indigo-200 dark:border-indigo-900 space-y-3 animate-in fade-in">
                  <div>
                    <label className="block text-[11px] font-bold text-indigo-900 dark:text-indigo-200 mb-1">
                      Prefer members:
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {activeMembers.map((m) => (
                        <button
                          type="button"
                          key={m.user_id}
                          onClick={() => handleTogglePreferredUser(m.user_id)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition ${
                            preferredUserIds.includes(m.user_id)
                              ? 'bg-emerald-600 text-white border-emerald-600'
                              : 'bg-white dark:bg-gray-700 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-gray-600'
                          }`}
                        >
                          {m.display_name} {preferredUserIds.includes(m.user_id) && '✓'}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-indigo-900 dark:text-indigo-200 mb-1">
                      Avoid members:
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {activeMembers.map((m) => (
                        <button
                          type="button"
                          key={m.user_id}
                          onClick={() => handleToggleAvoidUser(m.user_id)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition ${
                            avoidUserIds.includes(m.user_id)
                              ? 'bg-rose-600 text-white border-rose-600'
                              : 'bg-white dark:bg-gray-700 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-gray-600'
                          }`}
                        >
                          {m.display_name} {avoidUserIds.includes(m.user_id) && '✕'}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="flex-1 py-3 border border-slate-300 dark:border-gray-600 text-slate-600 dark:text-slate-300 rounded-xl font-bold text-xs"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={() => setStep(4)}
                  className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-extrabold text-xs shadow-md transition flex items-center justify-center gap-1.5"
                >
                  Review Summary <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 4: Review Summary */}
          {step === 4 && (
            <div className="space-y-5 animate-in fade-in">
              <div className="bg-slate-50 dark:bg-gray-700/50 rounded-2xl border border-slate-200 dark:border-gray-600 p-4 space-y-3 text-xs">
                <div className="flex items-center justify-between border-b border-slate-200/80 dark:border-gray-600 pb-2.5">
                  <span className="text-slate-500 font-semibold">Chore</span>
                  <span className="font-extrabold text-slate-900 dark:text-slate-100 text-sm">{title}</span>
                </div>

                <div className="flex items-center justify-between border-b border-slate-200/80 dark:border-gray-600 pb-2.5">
                  <span className="text-slate-500 font-semibold">Type</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    {choreType === CHORE_TYPES.REPEAT_ON_DEMAND ? 'Repeat on Demand' : `Scheduled (${scheduleDay} ${formatTime12Hour(scheduleTime)})`}
                  </span>
                </div>

                <div className="flex items-center justify-between border-b border-slate-200/80 dark:border-gray-600 pb-2.5">
                  <span className="text-slate-500 font-semibold">Frequency</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{frequency}</span>
                </div>

                {/* Sub-items list */}
                <div className="border-b border-slate-200/80 dark:border-gray-600 pb-2.5 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 font-semibold">Items / Areas</span>
                    <span className="font-extrabold text-indigo-600 dark:text-indigo-400">
                      {hasSubItems ? `${subItemInputs.length} items` : 'None (Single item)'}
                    </span>
                  </div>
                  {hasSubItems && (
                    <div className="flex flex-wrap gap-1 pt-1">
                      {subItemInputs.map((item, idx) => (
                        <span key={idx} className="px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-bold text-[11px] border border-indigo-100 dark:border-indigo-900">
                          {item}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between border-b border-slate-200/80 dark:border-gray-600 pb-2.5">
                  <span className="text-slate-500 font-semibold">People Required</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{requiredPeopleCount} member(s)</span>
                </div>

                <div className="flex items-center justify-between border-b border-slate-200/80 dark:border-gray-600 pb-2.5">
                  <span className="text-slate-500 font-semibold">Assignment</span>
                  <span className="font-bold text-indigo-600 dark:text-indigo-400 text-right truncate max-w-[200px]">
                    {getAssignmentModeSummary()}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-semibold">Reminder</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    {dailyReminderEnabled ? `Daily check at ${formatTime12Hour(dailyReminderTime)}` : 'Disabled'}
                  </span>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="flex-1 py-3 border border-slate-300 dark:border-gray-600 text-slate-600 dark:text-slate-300 rounded-xl font-bold text-xs"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={handleSubmitChore}
                  disabled={isSubmitting}
                  className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-extrabold text-xs shadow-md transition flex items-center justify-center gap-1.5"
                >
                  {isSubmitting ? 'Creating Chore...' : 'Create Chore'}
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
