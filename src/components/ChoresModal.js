'use client';

import { useState } from 'react';
import { Plus, CheckCircle2, Clock, Sparkles, X, ChevronRight, ChevronLeft } from 'lucide-react';
import { store } from '../lib/storage';
import { CHORE_TYPES, CHORE_FREQUENCIES } from '../lib/types';

export default function ChoresModal({ house, currentUser, onClose, onShowToast }) {
  const [step, setStep] = useState(1);

  // Form states
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [requiredPeopleCount, setRequiredPeopleCount] = useState(2);
  const [frequency, setFrequency] = useState(CHORE_FREQUENCIES.WEEKLY);
  const [choreType, setChoreType] = useState(CHORE_TYPES.REPEAT_ON_DEMAND);
  const [scheduleDay, setScheduleDay] = useState('Monday');
  const [scheduleTime, setScheduleTime] = useState('19:00');
  const [notes, setNotes] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmitChore = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;

    setIsSubmitting(true);

    setTimeout(() => {
      store.createChore(
        house.id,
        {
          title: title.trim(),
          description: description.trim(),
          chore_type: choreType,
          required_people_count: parseInt(requiredPeopleCount) || 1,
          frequency: frequency,
          schedule_day: scheduleDay,
          schedule_time: scheduleTime,
          notes: notes.trim(),
        },
        currentUser.id
      );

      setIsSubmitting(false);
      onShowToast({ type: 'success', message: `"${title}" created! Members assigned automatically.` });
      onClose();
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 max-w-md w-full space-y-6 shadow-2xl border border-slate-200 dark:border-gray-700 my-8">
        
        {/* Modal Header & Progress */}
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[11px] font-extrabold text-indigo-600 dark:text-indigo-400 tracking-wider uppercase">
              Step {step} of 4
            </div>
            <h2 className="text-xl font-extrabold text-slate-900 dark:text-slate-100">
              Create New Chore
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg"
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

        <form onSubmit={handleSubmitChore} className="space-y-6">
          {/* STEP 1: What needs to be done? */}
          {step === 1 && (
            <div className="space-y-4 animate-fade-in">
              <div>
                <label className="block text-xs font-extrabold text-slate-700 dark:text-slate-300 mb-1">
                  1. What needs to be done? *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Garbage, Kitchen Cleaning, Bathroom"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-400 text-xs font-semibold outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-extrabold text-slate-700 dark:text-slate-300 mb-1">
                  Optional Instructions / Notes
                </label>
                <input
                  type="text"
                  placeholder="e.g. Take garbage to outside collection area."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-400 text-xs font-medium outline-none"
                />
              </div>

              <button
                type="button"
                disabled={!title.trim()}
                onClick={() => setStep(2)}
                className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-extrabold text-xs shadow-md transition flex items-center justify-center gap-1.5"
              >
                Next <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* STEP 2: How many people? */}
          {step === 2 && (
            <div className="space-y-4 animate-fade-in">
              <label className="block text-xs font-extrabold text-slate-700 dark:text-slate-300">
                2. How many people are required?
              </label>

              <div className="grid grid-cols-4 gap-2">
                {[1, 2, 3, 4].map((count) => (
                  <button
                    key={count}
                    type="button"
                    onClick={() => setRequiredPeopleCount(count)}
                    className={`p-3 rounded-xl border text-center font-extrabold text-sm transition ${
                      requiredPeopleCount === count
                        ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400'
                        : 'border-slate-200 dark:border-gray-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-gray-700'
                    }`}
                  >
                    {count} {count === 1 ? 'Person' : 'People'}
                  </button>
                ))}
              </div>

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
                  Next <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: How often & Type */}
          {step === 3 && (
            <div className="space-y-4 animate-fade-in">
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-extrabold text-slate-700 dark:text-slate-300 mb-1">
                    3. How Often?
                  </label>
                  <select
                    value={frequency}
                    onChange={(e) => setFrequency(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-slate-900 dark:text-slate-100 text-xs font-bold outline-none"
                  >
                    <option value={CHORE_FREQUENCIES.WEEKLY}>Weekly</option>
                    <option value={CHORE_FREQUENCIES.DAILY}>Daily</option>
                    <option value={CHORE_FREQUENCIES.EVERY_2_WEEKS}>Every 2 Weeks</option>
                    <option value={CHORE_FREQUENCIES.ONCE}>Once</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-extrabold text-slate-700 dark:text-slate-300 mb-1">
                    4. Chore Type
                  </label>
                  <select
                    value={choreType}
                    onChange={(e) => setChoreType(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-slate-900 dark:text-slate-100 text-xs font-bold outline-none"
                  >
                    <option value={CHORE_TYPES.REPEAT_ON_DEMAND}>
                      Repeat on Demand (e.g. Garbage - completed multiple times)
                    </option>
                    <option value={CHORE_TYPES.SCHEDULED}>
                      Scheduled (Specific Day & Time)
                    </option>
                  </select>
                </div>

                {choreType === CHORE_TYPES.SCHEDULED && (
                  <div className="grid grid-cols-2 gap-2 p-3 bg-indigo-50/50 dark:bg-indigo-950/40 rounded-xl border border-indigo-100 dark:border-indigo-900">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Scheduled Day
                      </label>
                      <select
                        value={scheduleDay}
                        onChange={(e) => setScheduleDay(e.target.value)}
                        className="w-full px-2 py-1.5 rounded-lg border border-slate-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-slate-900 dark:text-slate-100 text-xs font-semibold"
                      >
                        {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(
                          (d) => (
                            <option key={d} value={d}>
                              {d}
                            </option>
                          )
                        )}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Time
                      </label>
                      <input
                        type="time"
                        value={scheduleTime}
                        onChange={(e) => setScheduleTime(e.target.value)}
                        className="w-full px-2 py-1.5 rounded-lg border border-slate-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-slate-900 dark:text-slate-100 text-xs font-semibold"
                      />
                    </div>
                  </div>
                )}
              </div>

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
                  Next <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 4: Review */}
          {step === 4 && (
            <div className="space-y-4 animate-fade-in">
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-gray-700/50 border border-slate-200 dark:border-gray-600 space-y-2 text-xs">
                <div className="font-extrabold text-slate-900 dark:text-slate-100 text-sm">
                  {title}
                </div>
                <div className="text-slate-600 dark:text-slate-400">
                  <b>Type:</b> {choreType === CHORE_TYPES.REPEAT_ON_DEMAND ? 'Repeat on Demand' : 'Scheduled'}
                </div>
                <div className="text-slate-600 dark:text-slate-400">
                  <b>People Required:</b> {requiredPeopleCount} member(s)
                </div>
                <div className="text-slate-600 dark:text-slate-400">
                  <b>Frequency:</b> {frequency}
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900 text-xs text-indigo-900 dark:text-indigo-300 space-y-1">
                <div className="font-extrabold flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  Automatic Member Assignment
                </div>
                <p className="text-[11px] text-indigo-700 dark:text-indigo-300">
                  The system will automatically select available roommates and generate a collision-free rotation schedule!
                </p>
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
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-extrabold text-xs shadow-md transition flex items-center justify-center gap-1.5"
                >
                  {isSubmitting ? 'Assigning...' : 'Create Chore'}
                </button>
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
