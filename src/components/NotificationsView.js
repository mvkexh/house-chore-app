'use client';

import { useState } from 'react';
import { Bell, Check, Clock, ShieldCheck } from 'lucide-react';
import { store } from '../lib/storage';
import { isNotificationSupported, getNotificationPermission, requestNotificationPermission } from '../lib/notifications';

export default function NotificationsView({ notifications, onMarkRead }) {
  const [pushPermission, setPushPermission] = useState(getNotificationPermission());

  const handleTogglePush = async () => {
    const perm = await requestNotificationPermission();
    setPushPermission(perm);
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto pb-16 md:pb-6">
      <div className="bg-white dark:bg-gray-800 rounded-3xl border border-slate-200 dark:border-gray-700 p-6 shadow-xs flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Bell className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            House Notifications
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Real-time alerts for chore requests, reminders, and schedule updates.
          </p>
        </div>

        {isNotificationSupported() && (
          <button
            onClick={handleTogglePush}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition ${
              pushPermission === 'granted'
                ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900'
                : 'bg-indigo-600 text-white border-indigo-600 hover:bg-indigo-700 shadow-xs'
            }`}
          >
            {pushPermission === 'granted' ? 'Browser Push Enabled ✓' : 'Enable Browser Push'}
          </button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-3xl border border-slate-200 dark:border-gray-700 p-12 text-center text-slate-400">
          <Bell className="w-10 h-10 text-slate-300 dark:text-gray-600 mx-auto mb-2" />
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">You have no notifications yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map((n) => (
            <div
              key={n.id}
              className={`p-4 rounded-2xl border transition flex items-start justify-between gap-4 ${
                n.is_read
                  ? 'bg-slate-50 dark:bg-gray-800/50 border-slate-200 dark:border-gray-800 opacity-75'
                  : 'bg-white dark:bg-gray-800 border-indigo-200 dark:border-indigo-900 shadow-xs'
              }`}
            >
              <div className="space-y-1">
                <h3 className="font-extrabold text-slate-900 dark:text-slate-100 text-sm flex items-center gap-2">
                  {n.title}
                  {!n.is_read && (
                    <span className="h-2 w-2 rounded-full bg-indigo-600 dark:bg-indigo-400"></span>
                  )}
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">{n.message}</p>
                <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-1 font-medium">
                  <Clock className="w-3 h-3" />
                  {new Date(n.created_at).toLocaleString()}
                </div>
              </div>

              {!n.is_read && (
                <button
                  onClick={() => store.markNotificationRead(n.id)}
                  className="p-1.5 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-gray-700 rounded-lg transition"
                  title="Mark as Read"
                >
                  <Check className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
