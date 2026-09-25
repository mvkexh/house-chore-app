'use client';

import { useState } from 'react';
import { History, Calendar as CalendarIcon, List, Edit2 } from 'lucide-react';
import { store } from '../lib/storage';
import { formatDateTime12Hour } from '../lib/formatters';
import { ROLES } from '../lib/types';
import InteractiveCalendar from './InteractiveCalendar';
import EditCompletionModal from './EditCompletionModal';

export default function HistoryView({ house, chores, members, currentUser }) {
  const [viewMode, setViewMode] = useState('CALENDAR'); // 'CALENDAR' or 'LIST'
  const [activeTab, setActiveTab] = useState('COMPLETIONS');
  const [editingCompletionEvent, setEditingCompletionEvent] = useState(null);

  const rawDb = store.getRawData();
  const completionEvents = store.getHouseCompletionEvents(house.id);
  const attentionRequests = store.getHouseAttentionRequests(house.id);
  const houseSchedules = (rawDb.weekly_schedules || []).filter((s) => s.house_id === house.id);
  const scheduleIds = houseSchedules.map((s) => s.id);
  const currentSched = house ? store.getOrCreateCurrentSchedule(house.id) : null;

  const currentMember = members.find((m) => m.user_id === currentUser.id);
  const isAdmin = house?.created_by === currentUser.id || currentMember?.role === ROLES.ADMIN || currentMember?.role === 'ADMIN';

  const pastAssignments = (rawDb.assignments || [])
    .filter((a) => scheduleIds.includes(a.schedule_id))
    .sort((a, b) => b.week_number - a.week_number);

  const choresMap = new Map();
  chores.forEach((c) => choresMap.set(c.id, c));

  const membersMap = new Map();
  members.forEach((m) => membersMap.set(m.user_id, m.display_name));

  // Edit modal helper data
  const editingChoreObj = editingCompletionEvent ? choresMap.get(editingCompletionEvent.chore_id) : null;
  const editingAssignObj = editingCompletionEvent
    ? (rawDb.assignments || []).find((a) => a.id === editingCompletionEvent.assignment_id)
    : null;

  const editingAssignedMembersList = editingAssignObj
    ? (editingAssignObj.actual_member_ids || []).map((uid) => ({
        id: uid,
        name: membersMap.get(uid) || 'Roommate',
      }))
    : [];

  const allHouseMembersList = members.map((m) => ({
    id: m.user_id,
    name: m.display_name,
  }));

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16 md:pb-6 min-w-0">
      {/* Header with View Mode Switcher (List/Table | Calendar) */}
      <div className="bg-white dark:bg-gray-800 rounded-3xl border border-slate-200 dark:border-gray-700 p-4 sm:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 min-w-0">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2 truncate">
            <History className="w-5 h-5 sm:w-6 sm:h-6 text-indigo-600 dark:text-indigo-400 shrink-0" />
            Task & Chore History
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Interactive schedule calendar, completion event audit trail, and attention reports.
          </p>
        </div>

        {/* View Switcher: List/Table | Calendar */}
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-gray-700/60 p-1 rounded-2xl border border-slate-200 dark:border-gray-600 shrink-0">
          <button
            onClick={() => setViewMode('CALENDAR')}
            className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition flex items-center gap-1.5 ${
              viewMode === 'CALENDAR'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <CalendarIcon className="w-3.5 h-3.5" />
            <span>Calendar View</span>
          </button>
          <button
            onClick={() => setViewMode('LIST')}
            className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition flex items-center gap-1.5 ${
              viewMode === 'LIST'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <List className="w-3.5 h-3.5" />
            <span>List / Table</span>
          </button>
        </div>
      </div>

      {/* 1. CALENDAR VIEW MODE */}
      {viewMode === 'CALENDAR' ? (
        <InteractiveCalendar house={house} currentUser={currentUser} />
      ) : (
        <>
          {/* Tabs for List View */}
          <div className="flex items-center gap-1.5 border-b border-slate-200 dark:border-gray-800 pb-2 overflow-x-auto no-scrollbar max-w-full min-w-0">
            {[
              { id: 'COMPLETIONS', label: 'Completion Events' },
              { id: 'REPORTS', label: 'Attention Reports' },
              { id: 'WEEKLY', label: 'Weekly Responsibilities' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 sm:px-4 py-2 rounded-xl text-xs font-extrabold transition shrink-0 ${
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
                <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300 min-w-[500px]">
                  <thead className="bg-slate-50 dark:bg-gray-700/50 text-slate-700 dark:text-slate-200 uppercase tracking-wider font-extrabold border-b border-slate-200 dark:border-gray-700">
                    <tr>
                      <th className="px-4 py-3">Chore</th>
                      <th className="px-4 py-3">Completed By</th>
                      <th className="px-4 py-3">Completion Mode</th>
                      <th className="px-4 py-3">Date & Time</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-gray-700/50 font-medium">
                    {completionEvents.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-8 text-center text-slate-400 italic">
                          No completion events recorded yet.
                        </td>
                      </tr>
                    ) : (
                      completionEvents.map((ce) => {
                        const choreObj = choresMap.get(ce.chore_id);
                        const isCurrentWeek = currentSched && currentSched.week_number === ce.week_number && currentSched.year === ce.year;
                        const isSubmitter = ce.completed_by_user_id === currentUser.id;
                        const isParticipant = Array.isArray(ce.participants) && ce.participants.includes(currentUser.id);
                        const canEdit = isAdmin || (isCurrentWeek && (isSubmitter || isParticipant));

                        return (
                          <tr key={ce.id} className="hover:bg-slate-50/50 dark:hover:bg-gray-700/30 transition">
                            <td className="px-4 py-3 font-extrabold text-slate-900 dark:text-slate-100">
                              {choreObj ? choreObj.title : 'Chore'}
                              {ce.sub_item_name ? <span className="text-indigo-600 dark:text-indigo-400 font-bold ml-1">· {ce.sub_item_name}</span> : ''}
                              {ce.is_edited && <span className="text-[10px] text-slate-400 font-normal italic ml-1.5">(edited)</span>}
                            </td>
                            <td className="px-4 py-3 font-bold text-indigo-600 dark:text-indigo-400">
                              {ce.completed_by_name}
                            </td>
                            <td className="px-4 py-3">
                              {ce.completion_type === 'TOGETHER' ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-extrabold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900">
                                  👥 Together ({ce.participant_names?.join(', ') || 'Team'})
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-extrabold bg-slate-100 dark:bg-gray-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-gray-600">
                                  👤 Alone
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-slate-500 dark:text-slate-400">
                              {formatDateTime12Hour(ce.timestamp)}
                            </td>
                            <td className="px-4 py-3 text-right">
                              {canEdit ? (
                                <button
                                  onClick={() => setEditingCompletionEvent(ce)}
                                  className="px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 text-indigo-600 dark:text-indigo-400 font-bold text-xs transition inline-flex items-center gap-1 border border-indigo-200 dark:border-indigo-900"
                                >
                                  <Edit2 className="w-3 h-3" />
                                  Edit
                                </button>
                              ) : (
                                <span className="text-[10px] text-slate-400 italic">Locked</span>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 2. Attention Reports */}
          {activeTab === 'REPORTS' && (
            <div className="bg-white dark:bg-gray-800 rounded-3xl border border-slate-200 dark:border-gray-700 overflow-hidden shadow-xs">
              <div className="overflow-x-auto max-w-full">
                <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300 min-w-[500px]">
                  <thead className="bg-slate-50 dark:bg-gray-700/50 text-slate-700 dark:text-slate-200 uppercase tracking-wider font-extrabold border-b border-slate-200 dark:border-gray-700">
                    <tr>
                      <th className="px-4 py-3">Chore</th>
                      <th className="px-4 py-3">Reported By</th>
                      <th className="px-4 py-3">Reported Date</th>
                      <th className="px-4 py-3">Resolution Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-gray-700/50 font-medium">
                    {attentionRequests.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-4 py-8 text-center text-slate-400 italic">
                          No attention reports recorded yet.
                        </td>
                      </tr>
                    ) : (
                      attentionRequests.map((ar) => (
                        <tr key={ar.id} className="hover:bg-slate-50/50 dark:hover:bg-gray-700/30 transition">
                          <td className="px-4 py-3 font-extrabold text-slate-900 dark:text-slate-100">
                            {choresMap.get(ar.chore_id) || 'Chore'}
                            {ar.sub_item_name ? <span className="text-amber-600 dark:text-amber-400 font-bold ml-1">· {ar.sub_item_name}</span> : ''}
                          </td>
                          <td className="px-4 py-3 font-bold text-amber-600 dark:text-amber-400">
                            {(ar.reporter_names || []).join(', ')}
                          </td>
                          <td className="px-4 py-3 text-slate-500 dark:text-slate-400">
                            {formatDateTime12Hour(ar.timestamp)}
                          </td>
                          <td className="px-4 py-3">
                            {ar.is_resolved ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-extrabold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-1 rounded-lg border border-emerald-200 dark:border-emerald-900">
                                ✓ Cleaned by {ar.resolved_by_name || 'Roommate'}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[11px] font-extrabold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 px-2.5 py-1 rounded-lg border border-amber-200 dark:border-amber-900">
                                🔴 Active Attention Request
                              </span>
                            )}
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
        </>
      )}

      {/* EDIT COMPLETION MODAL */}
      <EditCompletionModal
        isOpen={!!editingCompletionEvent}
        onClose={() => setEditingCompletionEvent(null)}
        completionEvent={editingCompletionEvent}
        chore={editingChoreObj}
        assignedMembers={editingAssignedMembersList}
        allHouseMembers={allHouseMembersList}
        currentUser={currentUser}
        onSave={() => {
          setEditingCompletionEvent(null);
        }}
      />
    </div>
  );
}
