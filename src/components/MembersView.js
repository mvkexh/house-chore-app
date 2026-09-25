'use client';

import { useState } from 'react';
import { Users, UserCheck, UserX, Edit2 } from 'lucide-react';
import { store } from '../lib/storage';
import { ROLES } from '../lib/types';

export default function MembersView({ house, members }) {
  const [editingMemberId, setEditingMemberId] = useState(null);
  const [editDisplayName, setEditDisplayName] = useState('');

  const handleSaveMemberName = (memberId) => {
    if (editDisplayName.trim()) {
      store.updateMemberDisplayName(memberId, editDisplayName.trim());
      setEditingMemberId(null);
    }
  };

  const handleToggleMember = (memberId) => {
    store.toggleMemberActive(memberId);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16 md:pb-6">
      <div className="bg-white dark:bg-gray-800 rounded-3xl border border-slate-200 dark:border-gray-700 p-6 shadow-xs flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Users className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            House Members
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            View house members, update display names, and toggle active status.
          </p>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-3xl border border-slate-200 dark:border-gray-700 p-6 shadow-xs space-y-4">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
            <thead className="bg-slate-50 dark:bg-gray-700/50 text-slate-700 dark:text-slate-200 uppercase tracking-wider font-extrabold border-b border-slate-200 dark:border-gray-700">
              <tr>
                <th className="px-4 py-3">Member Name</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Toggle Active</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-gray-700/50 font-medium">
              {members.map((m) => {
                const isEditing = editingMemberId === m.id;
                return (
                  <tr key={m.id} className="hover:bg-slate-50/50 dark:hover:bg-gray-700/30 transition">
                    <td className="px-4 py-3 text-slate-900 dark:text-slate-100 font-extrabold">
                      {isEditing ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={editDisplayName}
                            onChange={(e) => setEditDisplayName(e.target.value)}
                            className="px-2 py-1 rounded-lg border border-slate-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-xs font-semibold"
                          />
                          <button
                            onClick={() => handleSaveMemberName(m.id)}
                            className="px-2.5 py-1 bg-emerald-600 text-white rounded-lg text-[11px] font-bold shadow-xs"
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
                            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </td>

                    <td className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-300">
                      {m.role || ROLES.MEMBER}
                    </td>

                    <td className="px-4 py-3">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          m.is_active !== false
                            ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300'
                            : 'bg-slate-100 dark:bg-gray-700 text-slate-500 dark:text-slate-400'
                        }`}
                      >
                        {m.is_active !== false ? 'ACTIVE' : 'INACTIVE'}
                      </span>
                    </td>

                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleToggleMember(m.id)}
                        className={`p-1.5 rounded-lg transition ${
                          m.is_active !== false
                            ? 'text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/30'
                            : 'text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/30'
                        }`}
                        title={m.is_active !== false ? 'Deactivate Member' : 'Activate Member'}
                      >
                        {m.is_active !== false ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
