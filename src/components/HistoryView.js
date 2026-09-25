'use client';

import { useState } from 'react';
import { History } from 'lucide-react';
import { store } from '../lib/storage';

export default function HistoryView({ house, chores, members }) {
  const [activeTab, setActiveTab] = useState('COMPLETIONS');

  const rawDb = store.getRawData();
  const completionEvents = store.getHouseCompletionEvents(house.id);
  const attentionRequests = store.getHouseAttentionRequests(house.id);
  const houseSchedules = rawDb.weekly_schedules.filter((s) => s.house_id === house.id);
  const scheduleIds = houseSchedules.map((s) => s.id);

  const pastAssignments = rawDb.assignments
    .filter((a) => scheduleIds.includes(a.schedule_id))
    .sort((a, b) => b.week_number - a.week_number);

  const choresMap = new Map();
  chores.forEach((c) => choresMap.set(c.id, c.title));

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16 md:pb-6">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-3xl border border-slate-200 dark:border-gray-700 p-6 shadow-xs flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <History className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            Task & Chore History
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Complete audit trail of every completion event, attention report, and weekly log.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-gray-800 pb-2">
        {[
          { id: 'COMPLETIONS', label: 'Completion Events' },
          { id: 'REPORTS', label: 'Attention Reports' },
          { id: 'WEEKLY', label: 'Weekly Responsibilities' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-xl text-xs font-extrabold transition ${
              activeTab === tab.id
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-white dark:bg-gray-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-gray-700 border border-slate-200 dark:border-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 1. Completion Events */}
      {activeTab === 'COMPLETIONS' && (
        <div className="bg-white dark:bg-gray-800 rounded-3xl border border-slate-200 dark:border-gray-700 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
              <thead className="bg-slate-50 dark:bg-gray-700/50 text-slate-700 dark:text-slate-200 uppercase tracking-wider font-extrabold border-b border-slate-200 dark:border-gray-700">
                <tr>
                  <th className="px-4 py-3">Chore</th>
                  <th className="px-4 py-3">Completed By</th>
                  <th className="px-4 py-3">Date & Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-gray-700/50 font-medium">
                {completionEvents.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-4 py-8 text-center text-slate-400 italic">
                      No completion events recorded yet.
                    </td>
                  </tr>
                ) : (
                  completionEvents.map((ce) => (
                    <tr key={ce.id} className="hover:bg-slate-50/50 dark:hover:bg-gray-700/30 transition">
                      <td className="px-4 py-3 font-extrabold text-slate-900 dark:text-slate-100">
                        {choresMap.get(ce.chore_id) || 'Chore'}
                      </td>
                      <td className="px-4 py-3 font-bold text-indigo-600 dark:text-indigo-400">
                        {ce.completed_by_name}
                      </td>
                      <td className="px-4 py-3 text-slate-500 dark:text-slate-400">
                        {new Date(ce.timestamp).toLocaleString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 2. Attention Reports */}
      {activeTab === 'REPORTS' && (
        <div className="bg-white dark:bg-gray-800 rounded-3xl border border-slate-200 dark:border-gray-700 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
              <thead className="bg-slate-50 dark:bg-gray-700/50 text-slate-700 dark:text-slate-200 uppercase tracking-wider font-extrabold border-b border-slate-200 dark:border-gray-700">
                <tr>
                  <th className="px-4 py-3">Chore</th>
                  <th className="px-4 py-3">Reported By</th>
                  <th className="px-4 py-3">Date & Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-gray-700/50 font-medium">
                {attentionRequests.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-4 py-8 text-center text-slate-400 italic">
                      No attention reports recorded yet.
                    </td>
                  </tr>
                ) : (
                  attentionRequests.map((ar) => (
                    <tr key={ar.id} className="hover:bg-slate-50/50 dark:hover:bg-gray-700/30 transition">
                      <td className="px-4 py-3 font-extrabold text-slate-900 dark:text-slate-100">
                        {choresMap.get(ar.chore_id) || 'Chore'}
                      </td>
                      <td className="px-4 py-3 font-bold text-amber-600 dark:text-amber-400">
                        {(ar.reporter_names || []).join(', ')}
                      </td>
                      <td className="px-4 py-3 text-slate-500 dark:text-slate-400">
                        {new Date(ar.timestamp).toLocaleString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 3. Weekly Responsibilities */}
      {activeTab === 'WEEKLY' && (
        <div className="bg-white dark:bg-gray-800 rounded-3xl border border-slate-200 dark:border-gray-700 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
              <thead className="bg-slate-50 dark:bg-gray-700/50 text-slate-700 dark:text-slate-200 uppercase tracking-wider font-extrabold border-b border-slate-200 dark:border-gray-700">
                <tr>
                  <th className="px-4 py-3">Week</th>
                  <th className="px-4 py-3">Chore</th>
                  <th className="px-4 py-3">Completions Count</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-gray-700/50 font-medium">
                {pastAssignments.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-slate-400 italic">
                      No weekly assignments logged yet.
                    </td>
                  </tr>
                ) : (
                  pastAssignments.map((a) => (
                    <tr key={a.id} className="hover:bg-slate-50/50 dark:hover:bg-gray-700/30 transition">
                      <td className="px-4 py-3 font-extrabold text-slate-900 dark:text-slate-100">
                        Week {a.week_number}, {a.year}
                      </td>
                      <td className="px-4 py-3 font-bold text-slate-800 dark:text-slate-200">
                        {choresMap.get(a.chore_id) || 'Chore'}
                      </td>
                      <td className="px-4 py-3 font-extrabold text-emerald-600 dark:text-emerald-400">
                        {a.completion_count || 0} times
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            a.status === 'COMPLETED'
                              ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300'
                              : 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300'
                          }`}
                        >
                          {a.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
