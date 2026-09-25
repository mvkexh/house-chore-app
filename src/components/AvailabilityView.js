'use client';

import { useState } from 'react';
import { Clock, Calendar, CheckCircle2, AlertCircle, Save } from 'lucide-react';
import { store } from '../lib/storage';

export default function AvailabilityView({ house, currentUser, members }) {
  const currentMember = members.find((m) => m.user_id === currentUser.id);

  const [isUnavailable, setIsUnavailable] = useState(
    currentMember ? !!currentMember.is_unavailable : false
  );
  const [startDate, setStartDate] = useState(
    currentMember?.unavailable_start || new Date().toISOString().split('T')[0]
  );
  const [endDate, setEndDate] = useState(
    currentMember?.unavailable_end || ''
  );
  const [reason, setReason] = useState('');
  const [savedFeedback, setSavedFeedback] = useState(false);

  const handleSaveAvailability = (e) => {
    e.preventDefault();
    store.updateMemberAvailability(currentUser.id, house.id, {
      isUnavailable,
      startDate: isUnavailable ? startDate : null,
      endDate: isUnavailable ? endDate : null,
      reason,
    });
    setSavedFeedback(true);
    setTimeout(() => setSavedFeedback(false), 3000);
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 flex items-center gap-2">
            <Clock className="w-6 h-6 text-indigo-600" />
            My Availability
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Set dates when you are away or unavailable. The scheduler will automatically plan around your absence!
          </p>
        </div>
      </div>

      {/* Main Form Box */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
        {/* Status Indicator */}
        <div className="flex items-center justify-between p-4 rounded-xl border border-slate-200 bg-slate-50">
          <div>
            <span className="text-xs font-bold text-slate-500 uppercase">Current Status</span>
            <div className="text-base font-extrabold flex items-center gap-2 mt-0.5">
              {isUnavailable ? (
                <span className="text-rose-600 flex items-center gap-1.5">
                  🔴 Unavailable
                </span>
              ) : (
                <span className="text-emerald-600 flex items-center gap-1.5">
                  🟢 Available
                </span>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsUnavailable(!isUnavailable)}
            className={`px-4 py-2 rounded-xl text-xs font-extrabold border transition ${
              isUnavailable
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                : 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
            }`}
          >
            {isUnavailable ? 'Set to Available' : 'Set to Unavailable'}
          </button>
        </div>

        {/* Unavailable Dates Form */}
        <form onSubmit={handleSaveAvailability} className="space-y-4">
          {isUnavailable && (
            <div className="space-y-4 p-4 rounded-xl border border-rose-100 bg-rose-50/40">
              <h3 className="text-xs font-extrabold text-rose-900 uppercase">
                Unavailable Period Details
              </h3>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Unavailable From
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs font-medium"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Until (End Date)
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs font-medium"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Reason (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Traveling / Exams"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs font-medium"
                />
              </div>
            </div>
          )}

          {savedFeedback && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              Availability updated successfully! Scheduler has adjusted your house responsibilities.
            </div>
          )}

          <button
            type="submit"
            className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs shadow-xs transition flex items-center justify-center gap-2"
          >
            <Save className="w-4 h-4" />
            Save Availability Settings
          </button>
        </form>
      </div>
    </div>
  );
}
