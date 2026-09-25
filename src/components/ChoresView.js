'use client';

import { useState } from 'react';
import { CheckSquare, Plus, Trash2, HelpCircle } from 'lucide-react';
import { store } from '../lib/storage';
import { CHORE_TYPES, CHORE_FREQUENCIES } from '../lib/types';

export default function ChoresView({ house, currentUser, chores }) {
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Form states (ONLY WHAT IS NEEDED!)
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [choreType, setChoreType] = useState(CHORE_TYPES.REPEAT_ON_DEMAND);
  const [requiredPeopleCount, setRequiredPeopleCount] = useState(2);
  const [frequency, setFrequency] = useState(CHORE_FREQUENCIES.WEEKLY);
  const [scheduleDay, setScheduleDay] = useState('Monday');
  const [scheduleTime, setScheduleTime] = useState('19:00');
  const [notes, setNotes] = useState('');

  const handleCreateChore = (e) => {
    e.preventDefault();
    if (!title.trim()) return;

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

    // Reset form
    setTitle('');
    setDescription('');
    setNotes('');
    setShowCreateModal(false);
  };

  const handleDeleteChore = (choreId) => {
    store.deleteChore(choreId);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 flex items-center gap-2">
            <CheckSquare className="w-6 h-6 text-indigo-600" />
            House Chores
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Specify <b>What</b> needs to be done, <b>How Many</b> people are needed, and <b>How Often</b>. The system automatically decides <b>Who</b> does it!
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

      {/* Chores List */}
      {chores.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400 space-y-3">
          <CheckSquare className="w-10 h-10 text-slate-300 mx-auto" />
          <p className="text-sm font-semibold text-slate-700">No chores configured yet.</p>
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

            return (
              <div key={c.id} className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-extrabold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100 uppercase">
                    {isRepeatOnDemand ? 'Repeat on Demand' : 'Scheduled'}
                  </span>
                  <button
                    onClick={() => handleDeleteChore(c.id)}
                    className="text-slate-400 hover:text-rose-600 transition p-1"
                    title="Delete Chore"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div>
                  <h3 className="text-lg font-extrabold text-slate-900">{c.title}</h3>
                  {c.description && <p className="text-xs text-slate-500 mt-1">{c.description}</p>}
                </div>

                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-xs space-y-1.5 font-medium">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">People Required:</span>
                    <span className="font-extrabold text-slate-900">{c.required_people_count || 1} people</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Frequency:</span>
                    <span className="font-bold text-slate-800">{c.frequency || 'Weekly'}</span>
                  </div>
                  {!isRepeatOnDemand && c.schedule_day && (
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Scheduled Time:</span>
                      <span className="font-bold text-slate-800">{c.schedule_day} — {c.schedule_time}</span>
                    </div>
                  )}
                  {c.notes && (
                    <div className="text-[11px] text-slate-600 pt-1 border-t border-slate-200/60">
                      💡 <span className="italic">{c.notes}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* CREATE CHORE MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full space-y-4 shadow-xl border border-slate-100 my-8">
            <h2 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
              <Plus className="w-5 h-5 text-indigo-600" />
              Add House Chore
            </h2>

            <form onSubmit={handleCreateChore} className="space-y-4">
              {/* 1. Chore Name */}
              <div>
                <label className="block text-xs font-extrabold text-slate-700 mb-1">
                  1. Chore Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Garbage or Kitchen"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-xs font-semibold outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                  autoFocus
                />
              </div>

              {/* 2. People Required */}
              <div>
                <label className="block text-xs font-extrabold text-slate-700 mb-1">
                  2. People Required
                </label>
                <select
                  value={requiredPeopleCount}
                  onChange={(e) => setRequiredPeopleCount(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs font-bold outline-none"
                >
                  <option value={1}>1 person</option>
                  <option value={2}>2 people</option>
                  <option value={3}>3 people</option>
                  <option value={4}>4 people</option>
                </select>
              </div>

              {/* 3. Frequency & Chore Type */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-extrabold text-slate-700 mb-1">
                    3. How Often
                  </label>
                  <select
                    value={frequency}
                    onChange={(e) => setFrequency(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs font-bold outline-none"
                  >
                    <option value={CHORE_FREQUENCIES.WEEKLY}>Weekly</option>
                    <option value={CHORE_FREQUENCIES.DAILY}>Daily</option>
                    <option value={CHORE_FREQUENCIES.EVERY_2_WEEKS}>Every 2 Weeks</option>
                    <option value={CHORE_FREQUENCIES.ONCE}>Once</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-extrabold text-slate-700 mb-1">
                    4. Chore Type
                  </label>
                  <select
                    value={choreType}
                    onChange={(e) => setChoreType(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs font-bold outline-none"
                  >
                    <option value={CHORE_TYPES.REPEAT_ON_DEMAND}>Repeat on Demand (e.g. Garbage)</option>
                    <option value={CHORE_TYPES.SCHEDULED}>Scheduled (e.g. Mon 7 PM)</option>
                  </select>
                </div>
              </div>

              {/* Scheduled Day & Time if Scheduled */}
              {choreType === CHORE_TYPES.SCHEDULED && (
                <div className="grid grid-cols-2 gap-3 bg-indigo-50/50 p-3 rounded-xl border border-indigo-100">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Day
                    </label>
                    <select
                      value={scheduleDay}
                      onChange={(e) => setScheduleDay(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold"
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
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Time
                    </label>
                    <input
                      type="time"
                      value={scheduleTime}
                      onChange={(e) => setScheduleTime(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold"
                    />
                  </div>
                </div>
              )}

              {/* Optional Notes */}
              <div>
                <label className="block text-xs font-extrabold text-slate-700 mb-1">
                  Notes / Instructions (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Take garbage to outside collection area."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-xs outline-none"
                />
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-[11px] text-slate-500">
                🤖 <b>Automatic Assignment:</b> The system will automatically select the best available pair of house members and rotate assignments fairly!
              </div>

              {/* Buttons */}
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 py-2.5 border border-slate-300 text-slate-600 rounded-xl font-bold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs shadow-xs"
                >
                  Save Chore
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
