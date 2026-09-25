'use client';

import { useState } from 'react';
import { CheckSquare, User, Users, X, Check } from 'lucide-react';

export default function CompletionChoiceModal({
  isOpen,
  onClose,
  choreTitle,
  assignedMembers = [],
  allHouseMembers = [],
  currentUser,
  onConfirm,
}) {
  const [showTeammateSelector, setShowTeammateSelector] = useState(false);
  
  // Filter out current user from potential teammates list
  const currentUserId = currentUser?.id;
  const initialAssignedTeammates = assignedMembers.filter((m) => m.id !== currentUserId);

  const [selectedTeammateIds, setSelectedTeammateIds] = useState(
    initialAssignedTeammates.map((m) => m.id)
  );

  if (!isOpen) return null;

  const currentUserName = currentUser?.full_name || currentUser?.display_name || 'Roommate';

  // Toggle teammate checkbox selection
  const handleToggleTeammate = (memberId) => {
    setSelectedTeammateIds((prev) =>
      prev.includes(memberId) ? prev.filter((id) => id !== memberId) : [...prev, memberId]
    );
  };

  const handleAloneSubmit = () => {
    onConfirm({
      completionType: 'ALONE',
      participantIds: [currentUserId],
    });
  };

  const handleTogetherSubmit = () => {
    const finalParticipantIds = Array.from(new Set([currentUserId, ...selectedTeammateIds]));
    if (finalParticipantIds.length < 2) return; // Prevent single-person together submission

    onConfirm({
      completionType: 'TOGETHER',
      participantIds: finalParticipantIds,
    });
  };

  const hasTeammatesSelected = selectedTeammateIds.length > 0;
  const availableTeammateList = allHouseMembers.length > 0 ? allHouseMembers : assignedMembers;
  const eligibleTeammates = availableTeammateList.filter((m) => m.id !== currentUserId);

  return (
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150"
      onClick={(e) => {
        e.stopPropagation();
        onClose();
      }}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-2xl border border-slate-200 dark:border-gray-700 text-slate-900 dark:text-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-gray-700 pb-3">
          <div className="flex items-center gap-2 min-w-0">
            <CheckSquare className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0" />
            <h3 className="font-extrabold text-slate-900 dark:text-slate-100 text-base truncate">
              Complete {choreTitle || 'Chore'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg transition shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {!showTeammateSelector ? (
          <>
            <div className="space-y-1">
              <p className="text-xs font-extrabold text-slate-800 dark:text-slate-200">
                How was this chore completed?
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Logged by: <b>{currentUserName}</b>
              </p>
            </div>

            <div className="space-y-2 pt-1">
              {/* ALONE BUTTON */}
              <button
                type="button"
                onClick={handleAloneSubmit}
                className="w-full p-3 rounded-2xl border border-slate-200 dark:border-gray-700 bg-slate-50 hover:bg-indigo-50 dark:bg-gray-700/50 dark:hover:bg-indigo-950/40 text-left transition flex items-center justify-between group cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 font-bold shrink-0">
                    <User className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-extrabold text-slate-900 dark:text-slate-100">
                      I completed it alone
                    </div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400">
                      Record solo completion by {currentUserName}
                    </div>
                  </div>
                </div>
              </button>

              {/* TOGETHER BUTTON */}
              <button
                type="button"
                onClick={() => {
                  if (eligibleTeammates.length === 0) {
                    alert('No other house members are available to select for team completion.');
                    return;
                  }
                  setShowTeammateSelector(true);
                }}
                className="w-full p-3 rounded-2xl border border-slate-200 dark:border-gray-700 bg-slate-50 hover:bg-emerald-50 dark:bg-gray-700/50 dark:hover:bg-emerald-950/40 text-left transition flex items-center justify-between group cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 font-bold shrink-0">
                    <Users className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-extrabold text-slate-900 dark:text-slate-100">
                      We completed it together
                    </div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400">
                      Select participating assigned teammates (2+ people)
                    </div>
                  </div>
                </div>
              </button>
            </div>
          </>
        ) : (
          /* TEAMMATE SELECTION PANEL FOR "TOGETHER" COMPLETIONS */
          <div className="space-y-3 animate-in fade-in duration-150">
            <div className="space-y-1">
              <p className="text-xs font-extrabold text-slate-800 dark:text-slate-200">
                Select Participating Teammates
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Who worked together on this chore with <b>{currentUserName}</b>?
              </p>
            </div>

            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
              {eligibleTeammates.map((member) => {
                const isChecked = selectedTeammateIds.includes(member.id);
                return (
                  <label
                    key={member.id}
                    onClick={() => handleToggleTeammate(member.id)}
                    className={`flex items-center justify-between p-2.5 rounded-xl border text-xs font-bold cursor-pointer transition ${
                      isChecked
                        ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
                        : 'bg-slate-50 dark:bg-gray-700/40 border-slate-200 dark:border-gray-600 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <span className="truncate">{member.name}</span>
                    <div
                      className={`w-5 h-5 rounded-md border flex items-center justify-center ${
                        isChecked
                          ? 'bg-emerald-600 border-emerald-600 text-white'
                          : 'border-slate-300 dark:border-gray-500 bg-white dark:bg-gray-800'
                      }`}
                    >
                      {isChecked && <Check className="w-3.5 h-3.5" />}
                    </div>
                  </label>
                );
              })}
            </div>

            {!hasTeammatesSelected && (
              <p className="text-[11px] font-extrabold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 p-2 rounded-lg border border-amber-200 dark:border-amber-900">
                ⚠️ Select at least 1 teammate to record a "Together" completion.
              </p>
            )}

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowTeammateSelector(false)}
                className="flex-1 py-2.5 border border-slate-200 dark:border-gray-700 text-slate-600 dark:text-slate-300 rounded-xl font-bold text-xs hover:bg-slate-100 dark:hover:bg-gray-700 transition"
              >
                ‹ Back
              </button>
              <button
                type="button"
                disabled={!hasTeammatesSelected}
                onClick={handleTogetherSubmit}
                className={`flex-1 py-2.5 text-white rounded-xl font-extrabold text-xs shadow-xs transition ${
                  hasTeammatesSelected
                    ? 'bg-emerald-600 hover:bg-emerald-700 cursor-pointer'
                    : 'bg-slate-300 dark:bg-gray-700 cursor-not-allowed opacity-60'
                }`}
              >
                Submit Together
              </button>
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={onClose}
          className="w-full py-2.5 border border-slate-200 dark:border-gray-700 text-slate-600 dark:text-slate-300 rounded-xl font-bold text-xs hover:bg-slate-100 dark:hover:bg-gray-700 transition"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
