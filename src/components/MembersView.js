'use client';

import { useState } from 'react';
import {
  Users,
  UserCheck,
  UserX,
  Edit2,
  Search,
  Check,
  X,
  Shield,
  FileText,
  Calendar,
  Clock,
  AlertTriangle,
  Award,
  ChevronRight,
} from 'lucide-react';
import { store } from '../lib/storage';
import { ROLES } from '../lib/types';
import { formatDateTime12Hour } from '../lib/formatters';

export default function MembersView({ house, members, currentUser }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [editingMemberId, setEditingMemberId] = useState(null);
  const [editDisplayName, setEditDisplayName] = useState('');
  const [selectedReportMember, setSelectedReportMember] = useState(null);

  // Admin Check
  const currentMember = members.find((m) => m.user_id === currentUser?.id);
  const isCurrentUserAdmin =
    house?.created_by === currentUser?.id ||
    currentMember?.role === ROLES.ADMIN ||
    currentMember?.role === 'ADMIN';

  const handleSaveMemberName = (memberId) => {
    if (editDisplayName.trim()) {
      store.updateMemberDisplayName(memberId, editDisplayName.trim());
      setEditingMemberId(null);
      if (selectedReportMember && selectedReportMember.id === memberId) {
        setSelectedReportMember({ ...selectedReportMember, display_name: editDisplayName.trim() });
      }
    }
  };

  const handleToggleMember = (memberId) => {
    store.toggleMemberActive(memberId);
    if (selectedReportMember && selectedReportMember.id === memberId) {
      setSelectedReportMember({
        ...selectedReportMember,
        is_active: selectedReportMember.is_active === false ? true : false,
      });
    }
  };

  const handleRoleChange = (memberId, newRole) => {
    store.updateMemberRole(memberId, newRole);
    if (selectedReportMember && selectedReportMember.id === memberId) {
      setSelectedReportMember({ ...selectedReportMember, role: newRole });
    }
  };

  // Filter members by search query and active status
  const filteredMembers = members.filter((m) => {
    const matchesSearch = (m.display_name || '').toLowerCase().includes(searchQuery.toLowerCase().trim());
    if (statusFilter === 'ACTIVE') return matchesSearch && m.is_active !== false;
    if (statusFilter === 'INACTIVE') return matchesSearch && m.is_active === false;
    return matchesSearch;
  });

  const activeCount = members.filter((m) => m.is_active !== false).length;

  // Report Data if modal open
  const reportData =
    selectedReportMember && house
      ? store.getMemberReportData(selectedReportMember.user_id, house.id)
      : null;

  return (
    <div className="space-y-4 sm:space-y-6 max-w-5xl mx-auto pb-16 md:pb-6 min-w-0">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl sm:rounded-3xl border border-slate-200 dark:border-gray-700 p-4 sm:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 min-w-0">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2 truncate">
              <Users className="w-5 h-5 sm:w-6 sm:h-6 text-indigo-600 dark:text-indigo-400 shrink-0" />
              House Members
            </h1>
            <span className="bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 text-xs font-extrabold px-2.5 py-0.5 rounded-full border border-indigo-100 dark:border-indigo-900 shrink-0">
              {members.length} Total ({activeCount} Active)
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            View house members, open individual report summary, update display names, and manage admin roles.
          </p>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 min-w-0">
        <div className="relative flex-1 min-w-0">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search members by name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-slate-900 dark:text-slate-100 text-xs font-semibold outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {[
            { id: 'ALL', label: 'All' },
            { id: 'ACTIVE', label: 'Active' },
            { id: 'INACTIVE', label: 'Inactive' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition shrink-0 ${
                statusFilter === tab.id
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-white dark:bg-gray-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-gray-700 border border-slate-200 dark:border-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* MEMBER LISTING */}
      {filteredMembers.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-2xl sm:rounded-3xl border border-slate-200 dark:border-gray-700 p-8 text-center text-slate-400 space-y-2">
          <Users className="w-8 h-8 text-slate-300 mx-auto" />
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">No members match your criteria</p>
          <p className="text-xs text-slate-500">Try clearing your search query or status filter.</p>
        </div>
      ) : (
        <>
          {/* MOBILE RESPONSIVE MEMBER CARDS (VISIBLE ON MOBILE ONLY < 640px) */}
          <div className="block sm:hidden space-y-3">
            {filteredMembers.map((m) => {
              const isEditing = editingMemberId === m.id;
              const isActive = m.is_active !== false;
              const isAdmin = m.role === ROLES.ADMIN || house?.created_by === m.user_id;

              return (
                <div
                  key={m.id}
                  className="bg-white dark:bg-gray-800 rounded-2xl border border-slate-200 dark:border-gray-700 p-4 space-y-3 shadow-2xs"
                >
                  <div className="flex items-center justify-between gap-2 min-w-0">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      {/* Avatar / Status Ring */}
                      <div className="relative shrink-0">
                        <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-extrabold flex items-center justify-center text-sm border border-indigo-200 dark:border-indigo-800">
                          {(m.display_name || 'M')[0].toUpperCase()}
                        </div>
                        <span
                          className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white dark:border-gray-800 ${
                            isActive ? 'bg-emerald-500' : 'bg-slate-400'
                          }`}
                        />
                      </div>

                      {/* Name & Role */}
                      <div className="min-w-0 flex-1">
                        {isEditing ? (
                          <div className="flex items-center gap-1.5">
                            <input
                              type="text"
                              value={editDisplayName}
                              onChange={(e) => setEditDisplayName(e.target.value)}
                              className="px-2 py-1 rounded-lg border border-slate-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-xs font-semibold w-full min-w-0"
                              autoFocus
                            />
                            <button
                              onClick={() => handleSaveMemberName(m.id)}
                              className="p-1 bg-emerald-600 text-white rounded-lg shrink-0"
                              title="Save Name"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setEditingMemberId(null)}
                              className="p-1 bg-slate-200 text-slate-700 rounded-lg shrink-0"
                              title="Cancel"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <h3 className="text-sm font-extrabold text-slate-900 dark:text-slate-100 truncate">
                              {m.display_name}
                            </h3>
                            <button
                              onClick={() => {
                                setEditingMemberId(m.id);
                                setEditDisplayName(m.display_name);
                              }}
                              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 shrink-0"
                              title="Edit Display Name"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                        <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1">
                          {isAdmin && <Shield className="w-3 h-3 text-amber-500" />}
                          Role: <span className="text-slate-700 dark:text-slate-300 font-bold">{m.role || ROLES.MEMBER}</span>
                        </div>
                      </div>
                    </div>

                    {/* Status Pill */}
                    <span
                      className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold shrink-0 ${
                        isActive
                          ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300'
                          : 'bg-slate-100 dark:bg-gray-700 text-slate-500 dark:text-slate-400'
                      }`}
                    >
                      {isActive ? 'ACTIVE' : 'INACTIVE'}
                    </span>
                  </div>

                  {/* Actions Bar */}
                  <div className="pt-2 border-t border-slate-100 dark:border-gray-700/80 flex items-center justify-between gap-2 text-xs flex-wrap">
                    <button
                      onClick={() => setSelectedReportMember(m)}
                      className="px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-900 font-extrabold hover:bg-indigo-100 transition flex items-center gap-1.5"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>View Report</span>
                    </button>

                    <button
                      onClick={() => handleToggleMember(m.id)}
                      className={`px-3 py-1.5 rounded-xl font-extrabold transition flex items-center gap-1.5 ${
                        isActive
                          ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900 hover:bg-rose-100'
                          : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900 hover:bg-emerald-100'
                      }`}
                    >
                      {isActive ? (
                        <>
                          <UserX className="w-3.5 h-3.5" />
                          <span>Deactivate</span>
                        </>
                      ) : (
                        <>
                          <UserCheck className="w-3.5 h-3.5" />
                          <span>Activate</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* DESKTOP TABLE VIEW (VISIBLE ON DESKTOP >= 640px) */}
          <div className="hidden sm:block bg-white dark:bg-gray-800 rounded-3xl border border-slate-200 dark:border-gray-700 p-6 shadow-xs space-y-4 min-w-0">
            <div className="overflow-x-auto max-w-full min-w-0">
              <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300 min-w-[550px]">
                <thead className="bg-slate-50 dark:bg-gray-700/50 text-slate-700 dark:text-slate-200 uppercase tracking-wider font-extrabold border-b border-slate-200 dark:border-gray-700">
                  <tr>
                    <th className="px-4 py-3">Member Name</th>
                    <th className="px-4 py-3">Role</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-center">Report Summary</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-gray-700/50 font-medium">
                  {filteredMembers.map((m) => {
                    const isEditing = editingMemberId === m.id;
                    const isActive = m.is_active !== false;
                    const isAdmin = m.role === ROLES.ADMIN || house?.created_by === m.user_id;

                    return (
                      <tr key={m.id} className="hover:bg-slate-50/50 dark:hover:bg-gray-700/30 transition">
                        <td className="px-4 py-3 text-slate-900 dark:text-slate-100 font-extrabold">
                          {isEditing ? (
                            <div className="flex items-center gap-2">
                              <input
                                type="text"
                                value={editDisplayName}
                                onChange={(e) => setEditDisplayName(e.target.value)}
                                className="px-2.5 py-1 rounded-lg border border-slate-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-xs font-semibold max-w-[160px]"
                              />
                              <button
                                onClick={() => handleSaveMemberName(m.id)}
                                className="px-2.5 py-1 bg-emerald-600 text-white rounded-lg text-[11px] font-bold shadow-xs shrink-0"
                              >
                                Save
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <span>{m.display_name}</span>
                              <button
                                onClick={() => {
                                  setEditingMemberId(m.id);
                                  setEditDisplayName(m.display_name);
                                }}
                                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 shrink-0"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </td>

                        <td className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-300">
                          <span className="inline-flex items-center gap-1">
                            {isAdmin && <Shield className="w-3.5 h-3.5 text-amber-500" />}
                            {m.role || ROLES.MEMBER}
                          </span>
                        </td>

                        <td className="px-4 py-3">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                              isActive
                                ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300'
                                : 'bg-slate-100 dark:bg-gray-700 text-slate-500 dark:text-slate-400'
                            }`}
                          >
                            {isActive ? 'ACTIVE' : 'INACTIVE'}
                          </span>
                        </td>

                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => setSelectedReportMember(m)}
                            className="px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-900 font-extrabold hover:bg-indigo-100 transition inline-flex items-center gap-1.5"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            <span>View Report</span>
                          </button>
                        </td>

                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => handleToggleMember(m.id)}
                            className={`p-1.5 rounded-lg transition shrink-0 ${
                              isActive
                                ? 'text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/30'
                                : 'text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/30'
                            }`}
                            title={isActive ? 'Deactivate Member' : 'Activate Member'}
                          >
                            {isActive ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* INDIVIDUAL MEMBER REPORT MODAL */}
      {selectedReportMember && reportData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white dark:bg-gray-800 rounded-3xl p-5 sm:p-6 max-w-xl w-full space-y-5 shadow-2xl border border-slate-200 dark:border-gray-700 my-auto max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-gray-700 pb-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-11 h-11 rounded-2xl bg-indigo-600 text-white font-black text-lg flex items-center justify-center shadow-xs shrink-0">
                  {(selectedReportMember.display_name || 'M')[0].toUpperCase()}
                </div>
                <div className="min-w-0">
                  <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-slate-100 truncate">
                    {selectedReportMember.display_name}'s Activity Report
                  </h2>
                  <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    <span className="font-bold text-indigo-600 dark:text-indigo-400">
                      Role: {selectedReportMember.role || ROLES.MEMBER}
                    </span>
                    <span>•</span>
                    <span className={selectedReportMember.is_active !== false ? 'text-emerald-600 font-bold' : 'text-slate-400'}>
                      {selectedReportMember.is_active !== false ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setSelectedReportMember(null)}
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Stat Summary */}
            <div className="grid grid-cols-3 gap-2 sm:gap-3 text-center">
              <div className="bg-indigo-50/70 dark:bg-indigo-950/40 p-3 rounded-2xl border border-indigo-100 dark:border-indigo-900">
                <div className="text-lg font-black text-indigo-700 dark:text-indigo-300">
                  {reportData.upcomingAssignments.length}
                </div>
                <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">Upcoming</div>
              </div>
              <div className="bg-emerald-50/70 dark:bg-emerald-950/40 p-3 rounded-2xl border border-emerald-100 dark:border-emerald-900">
                <div className="text-lg font-black text-emerald-700 dark:text-emerald-300">
                  {reportData.userCompletions.length}
                </div>
                <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">Completed</div>
              </div>
              <div className="bg-amber-50/70 dark:bg-amber-950/40 p-3 rounded-2xl border border-amber-100 dark:border-amber-900">
                <div className="text-lg font-black text-amber-700 dark:text-amber-300">
                  {reportData.userAttentionReports.length}
                </div>
                <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">Attention Logs</div>
              </div>
            </div>

            {/* 1. Upcoming Assignments */}
            <div className="space-y-2">
              <h3 className="text-xs font-extrabold text-slate-900 dark:text-slate-100 uppercase tracking-wider flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                Upcoming Responsibilities
              </h3>
              {reportData.upcomingAssignments.length === 0 ? (
                <div className="bg-slate-50 dark:bg-gray-700/30 p-3 rounded-xl text-xs text-slate-400 italic">
                  No pending assignments scheduled for this member.
                </div>
              ) : (
                <div className="space-y-1.5">
                  {reportData.upcomingAssignments.map((a) => {
                    const chore = reportData.choresMap.get(a.chore_id);
                    return (
                      <div
                        key={a.id}
                        className="bg-slate-50 dark:bg-gray-700/40 p-2.5 rounded-xl border border-slate-200/80 dark:border-gray-700 flex items-center justify-between text-xs"
                      >
                        <div>
                          <div className="font-extrabold text-slate-900 dark:text-slate-100">
                            {chore ? chore.title : 'House Chore'}
                          </div>
                          <div className="text-[10px] text-slate-500">Week {a.week_number}, {a.year}</div>
                        </div>
                        <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300">
                          Pending
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 2. Completed Chores with 12h Timestamps */}
            <div className="space-y-2">
              <h3 className="text-xs font-extrabold text-slate-900 dark:text-slate-100 uppercase tracking-wider flex items-center gap-1.5">
                <Award className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                Completed Chores History
              </h3>
              {reportData.userCompletions.length === 0 ? (
                <div className="bg-slate-50 dark:bg-gray-700/30 p-3 rounded-xl text-xs text-slate-400 italic">
                  No completed chores recorded yet.
                </div>
              ) : (
                <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                  {reportData.userCompletions.map((ce) => {
                    const chore = reportData.choresMap.get(ce.chore_id);
                    return (
                      <div
                        key={ce.id}
                        className="bg-emerald-50/50 dark:bg-emerald-950/20 p-2.5 rounded-xl border border-emerald-100 dark:border-emerald-900/60 flex items-center justify-between text-xs"
                      >
                        <div>
                          <div className="font-extrabold text-slate-900 dark:text-slate-100">
                            {chore ? chore.title : 'House Chore'}
                          </div>
                          <div className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5 font-medium">
                            <Clock className="w-3 h-3 text-emerald-600" />
                            {formatDateTime12Hour(ce.timestamp)}
                          </div>
                        </div>
                        <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200">
                          ✓ Completed
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 3. Attention Reports */}
            <div className="space-y-2">
              <h3 className="text-xs font-extrabold text-slate-900 dark:text-slate-100 uppercase tracking-wider flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                Attention Logs & Reports
              </h3>
              {reportData.userAttentionReports.length === 0 ? (
                <div className="bg-slate-50 dark:bg-gray-700/30 p-3 rounded-xl text-xs text-slate-400 italic">
                  No attention reports linked to this member.
                </div>
              ) : (
                <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                  {reportData.userAttentionReports.map((ar) => {
                    const chore = reportData.choresMap.get(ar.chore_id);
                    return (
                      <div
                        key={ar.id}
                        className="bg-amber-50/50 dark:bg-amber-950/20 p-2.5 rounded-xl border border-amber-100 dark:border-amber-900/60 flex items-center justify-between text-xs"
                      >
                        <div>
                          <div className="font-extrabold text-slate-900 dark:text-slate-100">
                            {chore ? chore.title : 'House Chore'}
                          </div>
                          <div className="text-[10px] text-slate-500 mt-0.5">
                            {formatDateTime12Hour(ar.timestamp)}
                          </div>
                        </div>
                        <span className="text-[10px] font-extrabold text-amber-700 dark:text-amber-300">
                          {ar.is_resolved ? `✓ Resolved by ${ar.resolved_by_name}` : 'Active Request'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Admin Management Section */}
            {isCurrentUserAdmin && selectedReportMember.user_id !== currentUser?.id && (
              <div className="pt-3 border-t border-slate-200 dark:border-gray-700 space-y-2">
                <div className="text-xs font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                  <Shield className="w-4 h-4 text-amber-500" />
                  Admin Controls
                </div>
                <div className="flex items-center justify-between bg-slate-50 dark:bg-gray-700/50 p-3 rounded-2xl border border-slate-200 dark:border-gray-600">
                  <div className="text-xs font-medium text-slate-600 dark:text-slate-300">
                    Change Role Status:
                  </div>
                  {selectedReportMember.role === ROLES.ADMIN ? (
                    <button
                      onClick={() => handleRoleChange(selectedReportMember.id, ROLES.MEMBER)}
                      className="px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-900 text-xs font-extrabold hover:bg-amber-100 transition"
                    >
                      Demote to Member
                    </button>
                  ) : (
                    <button
                      onClick={() => handleRoleChange(selectedReportMember.id, ROLES.ADMIN)}
                      className="px-3 py-1.5 rounded-xl bg-indigo-600 text-white text-xs font-extrabold hover:bg-indigo-700 shadow-xs transition"
                    >
                      Promote to Admin
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Modal Footer */}
            <div className="pt-2">
              <button
                onClick={() => setSelectedReportMember(null)}
                className="w-full py-2.5 bg-slate-100 dark:bg-gray-700 text-slate-700 dark:text-slate-200 font-extrabold rounded-xl text-xs hover:bg-slate-200 dark:hover:bg-gray-600 transition"
              >
                Close Report
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
