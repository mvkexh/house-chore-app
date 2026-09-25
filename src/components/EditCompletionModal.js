'use client';

import { useState, useEffect } from 'react';
import { X, Check, Users, User, Tag, Edit2 } from 'lucide-react';
import { store } from '../lib/storage';

export default function EditCompletionModal({
  isOpen,
  onClose,
  completionEvent,
  chore,
  assignedMembers = [],
  allHouseMembers = [],
  currentUser,
  onSave,
}) {
  const [selectedSubItemIds, setSelectedSubItemIds] = useState([]);
  const [completionType, setCompletionType] = useState('ALONE');
  const [selectedParticipantIds, setSelectedParticipantIds] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (completionEvent) {
      const initialSubIds = completionEvent.sub_item_ids || (completionEvent.sub_item_id ? [completionEvent.sub_item_id] : []);
      setSelectedSubItemIds(initialSubIds);
      setCompletionType(completionEvent.completion_type || 'ALONE');

      const initialParts = completionEvent.participants || [completionEvent.completed_by_user_id || currentUser.id];
      setSelectedParticipantIds(initialParts);
      setErrorMsg('');
    }
  }, [completionEvent, currentUser]);

  if (!isOpen || !completionEvent) return null;

  const subItems = chore?.sub_items || [];

  const handleToggleSubItem = (id) => {
    setSelectedSubItemIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleToggleParticipant = (id) => {
    setSelectedParticipantIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSave = (e) => {
    e.preventDefault();
    if (subItems.length > 0 && selectedSubItemIds.length === 0) {
      setErrorMsg('Please select at least one sub-item / area.');
      return;
    }

    if (completionType === 'TOGETHER' && selectedParticipantIds.length < 2) {
      setErrorMsg('Group completion requires at least 2 participating members.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');

    try {
      store.updateCompletionEvent(completionEvent.id, currentUser.id, {
        sub_item_input: selectedSubItemIds.length === subItems.length ? 'ALL' : selectedSubItemIds,
        completion_type: completionType,
        participant_ids: selectedParticipantIds,
      });

      if (onSave) onSave();
      onClose();
    } catch (err) {
      setErrorMsg(err.message || 'Failed to update completion record.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 max-w-md w-full space-y-5 shadow-2xl border border-slate-200 dark:border-gray-700 text-slate-900 dark:text-slate-100">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-gray-700 pb-3">
          <div>
            <span className="text-[10px] font-extrabold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
              {chore ? chore.title : 'Chore'}
            </span>
            <h3 className="text-base font-extrabold flex items-center gap-1.5">
              <Edit2 className="w-4 h-4 text-indigo-600" />
              Correct Completion Record
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMsg && (
          <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-200 rounded-xl text-xs font-semibold">
            ⚠️ {errorMsg}
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-4">
          
          {/* Sub-items / Areas Selection */}
          {subItems.length > 0 && (
            <div className="space-y-2">
              <label className="block text-xs font-extrabold text-slate-700 dark:text-slate-300">
                Completed Sub-items / Areas:
              </label>
              <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                <button
                  type="button"
                  onClick={() => {
                    if (selectedSubItemIds.length === subItems.length) {
                      setSelectedSubItemIds([]);
                    } else {
                      setSelectedSubItemIds(subItems.map((s) => s.id));
                    }
                  }}
                  className="w-full text-left px-3 py-1.5 rounded-xl text-xs font-bold border border-slate-200 dark:border-gray-700 bg-slate-50 dark:bg-gray-700/50 flex items-center justify-between text-indigo-600 dark:text-indigo-400"
                >
                  <span>Select All ({subItems.length} areas)</span>
                  {selectedSubItemIds.length === subItems.length && <Check className="w-4 h-4" />}
                </button>

                {subItems.map((s) => {
                  const isSel = selectedSubItemIds.includes(s.id);
                  return (
                    <button
                      type="button"
                      key={s.id}
                      onClick={() => handleToggleSubItem(s.id)}
                      className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold border transition flex items-center justify-between ${
                        isSel
                          ? 'bg-indigo-600 text-white border-indigo-600'
                          : 'bg-white dark:bg-gray-700 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-gray-600'
                      }`}
                    >
                      <span>{s.name}</span>
                      {isSel && <Check className="w-4 h-4 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Completion Mode */}
          <div className="space-y-2">
            <label className="block text-xs font-extrabold text-slate-700 dark:text-slate-300">
              Completion Mode:
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setCompletionType('ALONE')}
                className={`p-2.5 rounded-xl text-xs font-extrabold border transition flex items-center justify-center gap-1.5 ${
                  completionType === 'ALONE'
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                    : 'bg-white dark:bg-gray-700 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-gray-600'
                }`}
              >
                <User className="w-4 h-4" />
                Solo (Alone)
              </button>

              <button
                type="button"
                onClick={() => setCompletionType('TOGETHER')}
                className={`p-2.5 rounded-xl text-xs font-extrabold border transition flex items-center justify-center gap-1.5 ${
                  completionType === 'TOGETHER'
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                    : 'bg-white dark:bg-gray-700 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-gray-600'
                }`}
              >
                <Users className="w-4 h-4" />
                Together (Group)
              </button>
            </div>
          </div>

          {/* Participant Selection for Together */}
          {completionType === 'TOGETHER' && (
            <div className="space-y-2 p-3 bg-indigo-50/50 dark:bg-indigo-950/40 rounded-2xl border border-indigo-200 dark:border-indigo-900 animate-in fade-in">
              <label className="block text-xs font-bold text-indigo-900 dark:text-indigo-200">
                Select participating assigned members ({selectedParticipantIds.length} selected):
              </label>
              <div className="grid grid-cols-2 gap-2">
                {assignedMembers.map((m) => {
                  const isSel = selectedParticipantIds.includes(m.id);
                  return (
                    <button
                      type="button"
                      key={m.id}
                      onClick={() => handleToggleParticipant(m.id)}
                      className={`p-2 rounded-xl text-xs font-bold border transition text-left flex items-center justify-between ${
                        isSel
                          ? 'bg-indigo-600 text-white border-indigo-600'
                          : 'bg-white dark:bg-gray-700 text-slate-700 dark:text-slate-200 border-slate-300 dark:border-gray-600'
                      }`}
                    >
                      <span className="truncate">{m.name}</span>
                      {isSel && <Check className="w-3.5 h-3.5 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Audit Note */}
          <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium italic">
            ℹ️ Changes will update the original completion event and preserve an audit log.
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-slate-300 dark:border-gray-600 text-slate-600 dark:text-slate-300 text-xs font-bold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-extrabold shadow-sm transition"
            >
              {isSubmitting ? 'Saving Changes...' : 'Save Correction'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
