'use client';

import { useState } from 'react';
import {
  Users,
  Shield,
  Layers,
  CheckSquare,
  Calendar,
  Key,
  RefreshCw,
  Plus,
  Edit2,
  Trash2,
  UserCheck,
  UserX,
  AlertTriangle,
  Clock,
  Sparkles,
} from 'lucide-react';
import { store } from '../lib/storage';
import { ROLES, CHORE_FREQUENCIES } from '../lib/types';

export default function AdminPanel({ house, currentUser, members, teams, chores, absences, substitutions }) {
  const [activeAdminTab, setActiveAdminTab] = useState('members');

  // --- STATE FOR FORMS ---
  // Members
  const [editingMemberId, setEditingMemberId] = useState(null);
  const [editDisplayName, setEditDisplayName] = useState('');

  // Teams
  const [teamName, setTeamName] = useState('');
  const [selectedTeamMemberIds, setSelectedTeamMemberIds] = useState([]);
  const [teamLeaderId, setTeamLeaderId] = useState('');

  // Chores
  const [choreTitle, setChoreTitle] = useState('');
  const [choreDesc, setChoreDesc] = useState('');
  const [choreFreq, setChoreFreq] = useState(CHORE_FREQUENCIES.EVERY_WEEK);
  const [choreCustomDays, setChoreCustomDays] = useState(14);
  const [choreWeight, setChoreWeight] = useState(1);
  const [choreStartDate, setChoreStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [choreEndDate, setChoreEndDate] = useState('');

  // Absences
  const [absentUserId, setAbsentUserId] = useState('');
  const [absentStartDate, setAbsentStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [absentEndDate, setAbsentEndDate] = useState('');
  const [absentReason, setAbsentReason] = useState('');

  // Substitutions
  const [subOriginalUserId, setSubOriginalUserId] = useState('');
  const [subSubstituteUserId, setSubSubstituteUserId] = useState('');
  const [subStartDate, setSubStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [subEndDate, setSubEndDate] = useState('');
  const [subReason, setSubReason] = useState('');

  const rawDb = store.getRawData();
  const usersMap = new Map();
  rawDb.users.forEach((u) => usersMap.set(u.id, u.full_name));

  // --- MEMBER HANDLERS ---
  const handleSaveMemberName = (memberId) => {
    if (editDisplayName.trim()) {
      store.updateMemberDisplayName(memberId, editDisplayName.trim());
      setEditingMemberId(null);
    }
  };

  const handleChangeRole = (memberId, newRole) => {
    store.updateMemberRole(memberId, newRole);
  };

  const handleToggleMember = (memberId) => {
    store.toggleMemberActive(memberId);
  };

  // --- TEAM HANDLERS ---
  const handleCreateTeam = (e) => {
    e.preventDefault();
    if (!teamName.trim()) return;
    store.createTeam(house.id, teamName.trim(), selectedTeamMemberIds, teamLeaderId || null);
    setTeamName('');
    setSelectedTeamMemberIds([]);
    setTeamLeaderId('');
  };

  // --- CHORE HANDLERS ---
  const handleCreateChore = (e) => {
    e.preventDefault();
    if (!choreTitle.trim()) return;
    store.createChore(house.id, {
      title: choreTitle.trim(),
      description: choreDesc.trim(),
      frequency: choreFreq,
      frequency_custom_days: choreFreq === CHORE_FREQUENCIES.CUSTOM ? parseInt(choreCustomDays) : null,
      effort_weight: parseInt(choreWeight),
      start_date: choreStartDate,
      end_date: choreEndDate || null,
    });
    setChoreTitle('');
    setChoreDesc('');
    setChoreEndDate('');
  };

  const handleDeleteChore = (choreId) => {
    store.deleteChore(choreId);
  };

  // --- ABSENCE HANDLERS ---
  const handleCreateAbsence = (e) => {
    e.preventDefault();
    if (!absentUserId || !absentEndDate) return;
    store.createAbsence(house.id, absentUserId, absentStartDate, absentEndDate, absentReason);
    setAbsentUserId('');
    setAbsentReason('');
  };

  // --- SUBSTITUTION HANDLERS ---
  const handleCreateSubstitution = (e) => {
    e.preventDefault();
    if (!subOriginalUserId || !subSubstituteUserId || !subEndDate) return;
    store.createSubstitution(
      house.id,
      subOriginalUserId,
      subSubstituteUserId,
      subStartDate,
      subEndDate,
      subReason
    );
    setSubOriginalUserId('');
    setSubSubstituteUserId('');
    setSubReason('');
  };

  // --- HOUSE SETTINGS HANDLER ---
  const handleRegenerateCode = () => {
    store.regenerateHouseCode(house.id);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 flex items-center gap-2">
            <Shield className="w-6 h-6 text-indigo-600" />
            Admin Management Controls
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Configure house members, teams, dynamic chores, absences, and temporary team substitutions.
          </p>
        </div>
      </div>

      {/* Admin Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-2">
        {[
          { id: 'members', label: 'Members & Roles', icon: Users },
          { id: 'teams', label: 'Teams & Leaders', icon: Layers },
          { id: 'chores', label: 'Chores & Frequencies', icon: CheckSquare },
          { id: 'absences', label: 'Absences & Substitutions', icon: Calendar },
          { id: 'settings', label: 'House Settings', icon: Key },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeAdminTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveAdminTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* 1. MEMBERS TAB */}
      {activeAdminTab === 'members' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-6">
          <h2 className="text-lg font-bold text-slate-900">House Members</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-slate-700 uppercase tracking-wider font-semibold border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Member Name</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {members.map((m) => {
                  const isEditing = editingMemberId === m.id;
                  return (
                    <tr key={m.id} className="hover:bg-slate-50/50 transition">
                      <td className="px-4 py-3 font-medium text-slate-900">
                        {isEditing ? (
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              value={editDisplayName}
                              onChange={(e) => setEditDisplayName(e.target.value)}
                              className="px-2 py-1 rounded border border-slate-300 text-xs"
                            />
                            <button
                              onClick={() => handleSaveMemberName(m.id)}
                              className="px-2 py-1 bg-emerald-600 text-white rounded text-[11px] font-bold"
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
                              className="text-slate-400 hover:text-slate-600"
                            >
                              <Edit2 className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                      </td>

                      <td className="px-4 py-3">
                        <select
                          value={m.role}
                          onChange={(e) => handleChangeRole(m.id, e.target.value)}
                          className="bg-slate-100 font-semibold text-slate-800 rounded px-2 py-1 outline-none text-xs border border-slate-200"
                        >
                          <option value={ROLES.MEMBER}>MEMBER</option>
                          <option value={ROLES.TEAM_LEADER}>TEAM LEADER</option>
                          <option value={ROLES.ADMIN}>ADMIN</option>
                        </select>
                      </td>

                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            m.is_active
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          {m.is_active ? 'ACTIVE' : 'INACTIVE'}
                        </span>
                      </td>

                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => handleToggleMember(m.id)}
                          className={`p-1.5 rounded transition ${
                            m.is_active
                              ? 'text-rose-600 hover:bg-rose-50'
                              : 'text-emerald-600 hover:bg-emerald-50'
                          }`}
                          title={m.is_active ? 'Deactivate Member' : 'Activate Member'}
                        >
                          {m.is_active ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 2. TEAMS TAB */}
      {activeAdminTab === 'teams' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Create Team Form */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Plus className="w-4 h-4 text-indigo-600" />
              Create New Team
            </h2>
            <form onSubmit={handleCreateTeam} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Team Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Kitchen Squad"
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Select Team Leader
                </label>
                <select
                  value={teamLeaderId}
                  onChange={(e) => setTeamLeaderId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs outline-none"
                >
                  <option value="">No Leader Assigned</option>
                  {members.map((m) => (
                    <option key={m.user_id} value={m.user_id}>
                      {m.display_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Assign Team Members
                </label>
                <div className="space-y-1.5 max-h-40 overflow-y-auto p-2 border border-slate-200 rounded-lg">
                  {members.map((m) => {
                    const isChecked = selectedTeamMemberIds.includes(m.user_id);
                    return (
                      <label
                        key={m.user_id}
                        className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer hover:bg-slate-50 p-1 rounded"
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedTeamMemberIds((prev) => [...prev, m.user_id]);
                            } else {
                              setSelectedTeamMemberIds((prev) =>
                                prev.filter((id) => id !== m.user_id)
                              );
                            }
                          }}
                        />
                        <span>{m.display_name}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs transition shadow-sm"
              >
                Create Team
              </button>
            </form>
          </div>

          {/* Teams List */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
            <h2 className="text-base font-bold text-slate-900">Active House Teams ({teams.length})</h2>
            {teams.length === 0 ? (
              <p className="text-xs text-slate-400 italic">No teams created yet.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {teams.map((t) => {
                  const leader = members.find((m) => m.user_id === t.leader_user_id);
                  const memberNames = (t.member_user_ids || []).map(
                    (uid) => members.find((m) => m.user_id === uid)?.display_name || 'Member'
                  );
                  return (
                    <div key={t.id} className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
                      <h3 className="font-bold text-slate-900 text-sm flex items-center justify-between">
                        <span>{t.name}</span>
                        {leader && (
                          <span className="text-[10px] bg-indigo-100 text-indigo-800 font-bold px-2 py-0.5 rounded">
                            Leader: {leader.display_name}
                          </span>
                        )}
                      </h3>
                      <div className="text-xs text-slate-600">
                        <span className="font-semibold">Members: </span>
                        {memberNames.length > 0 ? memberNames.join(', ') : 'None'}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 3. CHORES TAB */}
      {activeAdminTab === 'chores' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Create Chore Form */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Plus className="w-4 h-4 text-indigo-600" />
              Add Dynamic Chore
            </h2>
            <form onSubmit={handleCreateChore} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Chore Title
                </label>
                <input
                  type="text"
                  placeholder="e.g. Deep Clean Kitchen"
                  value={choreTitle}
                  onChange={(e) => setChoreTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Description
                </label>
                <textarea
                  placeholder="Instructions or guidelines..."
                  value={choreDesc}
                  onChange={(e) => setChoreDesc(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs outline-none"
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Frequency
                  </label>
                  <select
                    value={choreFreq}
                    onChange={(e) => setChoreFreq(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs outline-none"
                  >
                    <option value={CHORE_FREQUENCIES.DAILY}>Daily</option>
                    <option value={CHORE_FREQUENCIES.EVERY_WEEK}>Every Week</option>
                    <option value={CHORE_FREQUENCIES.EVERY_2_WEEKS}>Every 2 Weeks</option>
                    <option value={CHORE_FREQUENCIES.EVERY_3_WEEKS}>Every 3 Weeks</option>
                    <option value={CHORE_FREQUENCIES.EVERY_MONTH}>Every Month</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Effort Weight
                  </label>
                  <select
                    value={choreWeight}
                    onChange={(e) => setChoreWeight(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs outline-none"
                  >
                    <option value={1}>1 (Easy/Quick)</option>
                    <option value={2}>2 (Medium)</option>
                    <option value={3}>3 (Heavy/Deep Clean)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={choreStartDate}
                    onChange={(e) => setChoreStartDate(e.target.value)}
                    className="w-full px-2 py-1.5 rounded-lg border border-slate-300 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Optional End Date
                  </label>
                  <input
                    type="date"
                    value={choreEndDate}
                    onChange={(e) => setChoreEndDate(e.target.value)}
                    className="w-full px-2 py-1.5 rounded-lg border border-slate-300 text-xs"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs transition shadow-sm"
              >
                Add Chore
              </button>
            </form>
          </div>

          {/* Chores List */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
            <h2 className="text-base font-bold text-slate-900">Configured Chores ({chores.length})</h2>
            {chores.length === 0 ? (
              <p className="text-xs text-slate-400 italic">No chores added yet.</p>
            ) : (
              <div className="space-y-3">
                {chores.map((c) => (
                  <div
                    key={c.id}
                    className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex items-center justify-between"
                  >
                    <div>
                      <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                        {c.title}
                        <span className="text-[10px] bg-slate-200 text-slate-700 px-2 py-0.5 rounded font-mono">
                          {c.frequency}
                        </span>
                        {c.end_date && (
                          <span className="text-[10px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded font-bold">
                            Temporary
                          </span>
                        )}
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">{c.description}</p>
                    </div>

                    <button
                      onClick={() => handleDeleteChore(c.id)}
                      className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg transition"
                      title="Delete Chore"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 4. ABSENCES & SUBSTITUTIONS TAB */}
      {activeAdminTab === 'absences' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Absences Form & List */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-indigo-600" />
              Schedule Member Absence
            </h2>
            <form onSubmit={handleCreateAbsence} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Absent Member
                </label>
                <select
                  value={absentUserId}
                  onChange={(e) => setAbsentUserId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs"
                >
                  <option value="">Select Roommate...</option>
                  {members.map((m) => (
                    <option key={m.user_id} value={m.user_id}>
                      {m.display_name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={absentStartDate}
                    onChange={(e) => setAbsentStartDate(e.target.value)}
                    className="w-full px-2 py-1.5 rounded border border-slate-300 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={absentEndDate}
                    onChange={(e) => setAbsentEndDate(e.target.value)}
                    className="w-full px-2 py-1.5 rounded border border-slate-300 text-xs"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs"
              >
                Record Absence
              </button>
            </form>
          </div>

          {/* Temporary Substitutions Form & List */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <RefreshCw className="w-4 h-4 text-indigo-600" />
              Schedule Team Substitution
            </h2>
            <form onSubmit={handleCreateSubstitution} className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Original Member
                  </label>
                  <select
                    value={subOriginalUserId}
                    onChange={(e) => setSubOriginalUserId(e.target.value)}
                    className="w-full px-2 py-2 rounded border border-slate-300 text-xs"
                  >
                    <option value="">Select...</option>
                    {members.map((m) => (
                      <option key={m.user_id} value={m.user_id}>
                        {m.display_name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Substitute Member
                  </label>
                  <select
                    value={subSubstituteUserId}
                    onChange={(e) => setSubSubstituteUserId(e.target.value)}
                    className="w-full px-2 py-2 rounded border border-slate-300 text-xs"
                  >
                    <option value="">Select...</option>
                    {members.map((m) => (
                      <option key={m.user_id} value={m.user_id}>
                        {m.display_name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={subStartDate}
                    onChange={(e) => setSubStartDate(e.target.value)}
                    className="w-full px-2 py-1.5 rounded border border-slate-300 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={subEndDate}
                    onChange={(e) => setSubEndDate(e.target.value)}
                    className="w-full px-2 py-1.5 rounded border border-slate-300 text-xs"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs"
              >
                Schedule Substitution
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 5. SETTINGS TAB */}
      {activeAdminTab === 'settings' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-6 max-w-xl">
          <h2 className="text-lg font-bold text-slate-900">House Settings & Security</h2>
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
            <div>
              <span className="text-xs font-semibold text-slate-500 uppercase">House Name</span>
              <p className="text-base font-bold text-slate-900">{house.name}</p>
            </div>

            <div>
              <span className="text-xs font-semibold text-slate-500 uppercase">House Join Code</span>
              <div className="flex items-center gap-3 mt-1">
                <span className="font-mono text-lg font-extrabold text-indigo-700 bg-white border border-indigo-200 px-3 py-1 rounded-lg">
                  {house.invite_code}
                </span>
                <button
                  onClick={handleRegenerateCode}
                  className="px-3 py-2 text-xs font-semibold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-lg transition border border-indigo-200 flex items-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Regenerate Code
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
