'use client';

import { useState } from 'react';
import {
  Home,
  Shield,
  Sun,
  Copy,
  Check,
  Edit2,
  Trash2,
  Plus,
  AlertTriangle,
  UserCheck,
  UserX,
  LogOut,
  Calendar,
  Users,
  Info,
  Sparkles,
} from 'lucide-react';
import { store } from '../lib/storage';
import { ROLES } from '../lib/types';
import { formatDateRange } from '../lib/formatters';

export default function HouseSettings({ house, currentUser, members, onShowToast, onHouseDeleted, onHouseLeft }) {
  const [isEditingName, setIsEditingName] = useState(false);
  const [houseNameInput, setHouseNameInput] = useState(house?.name || '');
  const [isCopied, setIsCopied] = useState(false);

  // House Holiday Form State
  const [holidayStartDate, setHolidayStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [holidayEndDate, setHolidayEndDate] = useState('');
  const [holidayReason, setHolidayReason] = useState('');

  // Modals state
  const [showLeaveConfirmModal, setShowLeaveConfirmModal] = useState(false);
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [deleteConfirmInput, setDeleteConfirmInput] = useState('');
  const [actionError, setActionError] = useState('');

  if (!house || !currentUser) return null;

  const currentMember = members.find((m) => m.user_id === currentUser.id);
  const isAdmin = house.created_by === currentUser.id || currentMember?.role === ROLES.ADMIN || currentMember?.role === 'ADMIN';
  const activeHolidays = store.getHouseHolidays(house.id);
  const activeHolidayNow = store.isDateInHouseHoliday(house.id, new Date());

  const activeMembers = members.filter((m) => m.is_active !== false);
  const adminMembers = activeMembers.filter((m) => m.role === ROLES.ADMIN || m.role === 'ADMIN' || house.created_by === m.user_id);

  // Handlers
  const handleSaveName = (e) => {
    e.preventDefault();
    if (!houseNameInput.trim()) return;
    try {
      store.updateHouseName(house.id, houseNameInput.trim());
      setIsEditingName(false);
      onShowToast?.({ type: 'success', message: 'House name updated successfully!' });
    } catch (err) {
      setActionError(err.message);
    }
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(house.invite_code);
    setIsCopied(true);
    onShowToast?.({ type: 'success', message: 'House code copied to clipboard!' });
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleCreateHoliday = (e) => {
    e.preventDefault();
    setActionError('');
    try {
      store.createHouseHoliday(
        house.id,
        {
          startDate: holidayStartDate,
          endDate: holidayEndDate,
          reason: holidayReason,
        },
        currentUser.id
      );
      setHolidayEndDate('');
      setHolidayReason('');
      onShowToast?.({ type: 'success', message: 'House Holiday created successfully! Reminders & penalties paused.' });
    } catch (err) {
      setActionError(err.message);
    }
  };

  const handleDeleteHoliday = (holidayId) => {
    try {
      store.deleteHouseHoliday(holidayId);
      onShowToast?.({ type: 'info', message: 'House Holiday removed.' });
    } catch (err) {
      onShowToast?.({ type: 'error', message: err.message });
    }
  };

  const handlePromoteMember = (houseMemberId, displayName) => {
    try {
      store.promoteMemberToAdmin(houseMemberId);
      onShowToast?.({ type: 'success', message: `${displayName} promoted to House Admin!` });
    } catch (err) {
      onShowToast?.({ type: 'error', message: err.message });
    }
  };

  const handleDemoteMember = (houseMemberId, displayName) => {
    try {
      store.demoteAdminToMember(houseMemberId);
      onShowToast?.({ type: 'info', message: `${displayName} demoted to Member.` });
    } catch (err) {
      onShowToast?.({ type: 'error', message: err.message });
    }
  };

  const handleConfirmLeave = async () => {
    setActionError('');
    try {
      await store.leaveHouse(house.id, currentUser.id);
      setShowLeaveConfirmModal(false);
      onShowToast?.({ type: 'success', message: `Left ${house.name}. Historical records preserved.` });
      onHouseLeft?.();
    } catch (err) {
      setActionError(err.message);
    }
  };

  const handleConfirmDelete = async (e) => {
    e.preventDefault();
    if (deleteConfirmInput.trim().toLowerCase() !== house.name.trim().toLowerCase() && deleteConfirmInput.trim().toUpperCase() !== 'DELETE') {
      setActionError(`Please type "${house.name}" or "DELETE" to confirm.`);
      return;
    }

    try {
      await store.deleteHouse(house.id, currentUser.id);
      setShowDeleteConfirmModal(false);
      onShowToast?.({ type: 'success', message: `House "${house.name}" permanently deleted.` });
      onHouseDeleted?.();
    } catch (err) {
      setActionError(err.message);
    }
  };

  return (
    <div className="space-y-6 max-w-full overflow-x-hidden text-slate-900 dark:text-slate-100">
      
      {/* ERROR BANNER */}
      {actionError && (
        <div className="bg-rose-50 dark:bg-rose-950/80 border border-rose-200 dark:border-rose-900 p-3.5 rounded-2xl flex items-center justify-between text-xs text-rose-800 dark:text-rose-200 font-bold">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{actionError}</span>
          </div>
          <button onClick={() => setActionError('')} className="p-1 hover:bg-rose-100 dark:hover:bg-rose-900 rounded">
            ✕
          </button>
        </div>
      )}

      {/* 1. HOUSE INFORMATION CARD */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-slate-200 dark:border-gray-700 p-4 sm:p-6 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 dark:border-gray-700 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-50 dark:bg-indigo-950/50 rounded-xl text-indigo-600 dark:text-indigo-400">
              <Home className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                House Profile
                {isAdmin && (
                  <span className="text-[10px] uppercase tracking-wider font-extrabold px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                    Admin Access
                  </span>
                )}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">General information & invite code</p>
            </div>
          </div>
        </div>

        {/* House Name Editing */}
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              House Name
            </label>
            {isEditingName ? (
              <form onSubmit={handleSaveName} className="flex gap-2">
                <input
                  type="text"
                  value={houseNameInput}
                  onChange={(e) => setHouseNameInput(e.target.value)}
                  className="flex-1 px-3 py-2 text-xs font-bold rounded-xl border border-indigo-300 dark:border-indigo-600 bg-white dark:bg-gray-700 text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
                <button
                  type="submit"
                  className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs transition shrink-0"
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsEditingName(false);
                    setHouseNameInput(house.name);
                  }}
                  className="px-3 py-2 bg-slate-100 dark:bg-gray-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold hover:bg-slate-200 transition shrink-0"
                >
                  Cancel
                </button>
              </form>
            ) : (
              <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-gray-900/50 rounded-xl border border-slate-200 dark:border-gray-700">
                <span className="text-sm font-extrabold text-slate-900 dark:text-slate-100 truncate">{house.name}</span>
                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => setIsEditingName(true)}
                    className="flex items-center gap-1 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline shrink-0"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    Edit Name
                  </button>
                )}
              </div>
            )}
          </div>

          {/* House Code & Copy */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              House Join Code
            </label>
            <div className="flex items-center justify-between p-3 bg-indigo-50/50 dark:bg-indigo-950/30 rounded-xl border border-indigo-100 dark:border-indigo-900/50">
              <span className="font-mono font-extrabold text-indigo-700 dark:text-indigo-300 tracking-wider text-sm">
                {house.invite_code}
              </span>
              <button
                type="button"
                onClick={handleCopyCode}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-gray-700 border border-indigo-200 dark:border-gray-600 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-gray-600 rounded-lg text-xs font-bold transition shadow-2xs shrink-0"
              >
                {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{isCopied ? 'Copied!' : 'Copy Code'}</span>
              </button>
            </div>
          </div>

          {/* Stats Summary Grid */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <div className="p-3 bg-slate-50 dark:bg-gray-700/50 rounded-xl border border-slate-200 dark:border-gray-700 text-center">
              <div className="text-xs text-slate-500 dark:text-slate-400 font-semibold">Total Members</div>
              <div className="text-lg font-extrabold text-slate-900 dark:text-slate-100 mt-0.5">{activeMembers.length}</div>
            </div>
            <div className="p-3 bg-slate-50 dark:bg-gray-700/50 rounded-xl border border-slate-200 dark:border-gray-700 text-center">
              <div className="text-xs text-slate-500 dark:text-slate-400 font-semibold">House Admins</div>
              <div className="text-lg font-extrabold text-indigo-600 dark:text-indigo-400 mt-0.5">{adminMembers.length}</div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. HOUSE HOLIDAYS SECTION */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-slate-200 dark:border-gray-700 p-4 sm:p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-gray-700 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-50 dark:bg-amber-950/50 rounded-xl text-amber-600 dark:text-amber-400">
              <Sun className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                House Holidays & Break Periods
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Pause chore rotations and check-in reminders</p>
            </div>
          </div>
        </div>

        {/* Informational Card */}
        <div className="p-3.5 bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 rounded-xl text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2.5">
          <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1 leading-relaxed">
            <p className="font-bold">How House Holidays Work:</p>
            <p className="text-amber-800 dark:text-amber-300">
              During a House Holiday, scheduled chore assignments and daily check reminders are automatically paused. Uncompleted chores during holidays do not trigger missed work penalties or retention consequences.
            </p>
          </div>
        </div>

        {/* Active Holiday Banner if active right now */}
        {activeHolidayNow && (
          <div className="bg-gradient-to-r from-amber-500 to-orange-600 text-white p-3.5 rounded-xl font-bold text-xs flex items-center justify-between gap-2 shadow-sm">
            <div className="flex items-center gap-2 min-w-0">
              <Sparkles className="w-4 h-4 shrink-0" />
              <span className="truncate">Active Now: "{activeHolidayNow.reason}" ({formatDateRange(activeHolidayNow.start_date, activeHolidayNow.end_date)})</span>
            </div>
            <span className="bg-white/20 px-2 py-0.5 rounded text-[10px] uppercase tracking-wider shrink-0">Holiday Active</span>
          </div>
        )}

        {/* Form to create holiday (Admin only) */}
        {isAdmin && (
          <form onSubmit={handleCreateHoliday} className="p-4 bg-slate-50 dark:bg-gray-900/50 rounded-xl border border-slate-200 dark:border-gray-700 space-y-3">
            <h4 className="text-xs font-extrabold text-slate-800 dark:text-slate-200 uppercase tracking-wider">Add House Holiday Period</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">Start Date</label>
                <input
                  type="date"
                  value={holidayStartDate}
                  onChange={(e) => setHolidayStartDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-semibold rounded-lg border border-slate-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-amber-500"
                  required
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">End Date</label>
                <input
                  type="date"
                  value={holidayEndDate}
                  onChange={(e) => setHolidayEndDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-semibold rounded-lg border border-slate-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-amber-500"
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">Holiday Reason / Title</label>
              <input
                type="text"
                value={holidayReason}
                onChange={(e) => setHolidayReason(e.target.value)}
                placeholder="e.g. Festival Break, Spring Recess"
                className="w-full px-3 py-2 text-xs font-semibold rounded-lg border border-slate-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-amber-500"
                required
              />
            </div>
            <button
              type="submit"
              className="w-full py-2.5 px-4 bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-xs rounded-xl shadow-xs transition flex items-center justify-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Schedule House Holiday</span>
            </button>
          </form>
        )}

        {/* Existing Holidays List */}
        <div className="space-y-2">
          <h4 className="text-xs font-extrabold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Scheduled Holidays</h4>
          {activeHolidays.length === 0 ? (
            <p className="text-xs text-slate-400 dark:text-slate-500 italic p-3 text-center border border-dashed border-slate-200 dark:border-gray-700 rounded-xl">
              No house holidays scheduled yet.
            </p>
          ) : (
            <div className="space-y-2">
              {activeHolidays.map((hol) => (
                <div key={hol.id} className="p-3 bg-slate-50 dark:bg-gray-700/40 rounded-xl border border-slate-200 dark:border-gray-700 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-xs font-extrabold text-slate-800 dark:text-slate-200 truncate">{hol.reason}</div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                      {formatDateRange(hol.start_date, hol.end_date)}
                    </div>
                  </div>
                  {isAdmin && (
                    <button
                      type="button"
                      onClick={() => handleDeleteHoliday(hol.id)}
                      className="p-1.5 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg transition shrink-0"
                      title="Delete Holiday"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 3. ADMIN ROLES & TRANSFER SECTION */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-slate-200 dark:border-gray-700 p-4 sm:p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-gray-700 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-50 dark:bg-indigo-950/50 rounded-xl text-indigo-600 dark:text-indigo-400">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                House Admins & Roles
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Manage administrator privileges & role transfers</p>
            </div>
          </div>
        </div>

        <div className="divide-y divide-slate-100 dark:divide-gray-700">
          {activeMembers.map((m) => {
            const isMemberAdmin = m.role === ROLES.ADMIN || m.role === 'ADMIN' || house.created_by === m.user_id;
            const isSelf = m.user_id === currentUser.id;

            return (
              <div key={m.id} className="py-3 flex items-center justify-between gap-2 first:pt-0 last:pb-0">
                <div className="min-w-0 flex items-center gap-2.5">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${isMemberAdmin ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300' : 'bg-slate-100 text-slate-600 dark:bg-gray-700 dark:text-slate-300'}`}>
                    {m.display_name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5 truncate">
                      <span className="truncate">{m.display_name}</span>
                      {isSelf && <span className="text-[10px] text-indigo-600 font-extrabold">(You)</span>}
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                      {isMemberAdmin ? 'House Admin' : 'Member'}
                    </div>
                  </div>
                </div>

                {isAdmin && !isSelf && (
                  <div>
                    {isMemberAdmin ? (
                      <button
                        type="button"
                        onClick={() => handleDemoteMember(m.id, m.display_name)}
                        className="px-2.5 py-1 bg-slate-100 dark:bg-gray-700 hover:bg-rose-50 dark:hover:bg-rose-950 text-slate-700 dark:text-slate-300 hover:text-rose-600 rounded-lg text-xs font-bold transition shrink-0"
                      >
                        Demote to Member
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handlePromoteMember(m.id, m.display_name)}
                        className="px-2.5 py-1 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 text-indigo-700 dark:text-indigo-300 rounded-lg text-xs font-bold transition shrink-0 border border-indigo-200 dark:border-indigo-800"
                      >
                        Make Admin
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. LEAVE HOUSE SECTION */}
      <div className="bg-amber-50/50 dark:bg-amber-950/20 rounded-2xl border border-amber-200/80 dark:border-amber-900/50 p-4 sm:p-6 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-amber-900 dark:text-amber-200">
            <LogOut className="w-5 h-5 text-amber-600" />
            <h3 className="text-sm font-extrabold">Leave House</h3>
          </div>
          <button
            type="button"
            onClick={() => {
              setActionError('');
              setShowLeaveConfirmModal(true);
            }}
            className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-xs rounded-xl shadow-xs transition shrink-0"
          >
            Leave House
          </button>
        </div>
        <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
          Leaving this house removes you from active chore rotations. Your past contribution history and reports remain stored for the house.
        </p>
      </div>

      {/* 5. DANGER ZONE: DELETE HOUSE (Admin Only) */}
      {isAdmin && (
        <div className="bg-rose-50/50 dark:bg-rose-950/20 rounded-2xl border border-rose-200 dark:border-rose-900/60 p-4 sm:p-6 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-rose-900 dark:text-rose-200">
              <AlertTriangle className="w-5 h-5 text-rose-600" />
              <h3 className="text-sm font-extrabold">Danger Zone — Delete House</h3>
            </div>
            <button
              type="button"
              onClick={() => {
                setActionError('');
                setDeleteConfirmInput('');
                setShowDeleteConfirmModal(true);
              }}
              className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs rounded-xl shadow-xs transition shrink-0"
            >
              Delete House
            </button>
          </div>
          <p className="text-xs text-rose-800 dark:text-rose-300 leading-relaxed">
            Permanently delete "{house.name}" and all associated chores, schedules, completion records, and history. This action cannot be undone.
          </p>
        </div>
      )}

      {/* LEAVE HOUSE CONFIRMATION MODAL */}
      {showLeaveConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-gray-800 rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 dark:border-gray-700 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3 text-amber-600">
              <div className="p-2.5 bg-amber-100 dark:bg-amber-950 rounded-2xl">
                <LogOut className="w-6 h-6" />
              </div>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-slate-100">Leave {house.name}?</h3>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Are you sure you want to leave this house? You will no longer be assigned chores here. If you rejoin using the house code later, your historical records will be automatically restored.
            </p>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowLeaveConfirmModal(false)}
                className="flex-1 py-2.5 bg-slate-100 dark:bg-gray-700 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-xl hover:bg-slate-200 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmLeave}
                className="flex-1 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-xs rounded-xl shadow-md transition"
              >
                Confirm Leave
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE HOUSE CONFIRMATION MODAL */}
      {showDeleteConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-gray-800 rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 dark:border-gray-700 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="p-2.5 bg-rose-100 dark:bg-rose-950 rounded-2xl">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-slate-100">Delete Entire House?</h3>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              This will permanently remove <strong>{house.name}</strong> and all its chores, history, and assignments for all members.
            </p>

            <form onSubmit={handleConfirmDelete} className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Type <strong>{house.name}</strong> or <strong>DELETE</strong> to confirm:
                </label>
                <input
                  type="text"
                  value={deleteConfirmInput}
                  onChange={(e) => setDeleteConfirmInput(e.target.value)}
                  placeholder={house.name}
                  className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-rose-300 dark:border-rose-900 bg-white dark:bg-gray-700 text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-rose-500"
                  required
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirmModal(false)}
                  className="flex-1 py-2.5 bg-slate-100 dark:bg-gray-700 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-xl hover:bg-slate-200 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs rounded-xl shadow-md transition"
                >
                  Delete House
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
