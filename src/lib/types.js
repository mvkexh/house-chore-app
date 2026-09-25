/**
 * Roommate Chore Manager — Data Types & Constants
 */

export const ROLES = {
  ADMIN: 'ADMIN',
  MEMBER: 'MEMBER',
};

export const CHORE_TYPES = {
  SCHEDULED: 'SCHEDULED', // Happens at specific day/time (e.g. Monday 7 PM)
  REPEAT_ON_DEMAND: 'REPEAT_ON_DEMAND', // Responsible for period, completed multiple times (e.g. Trash Duty)
};

export const CHORE_FREQUENCIES = {
  ONCE: 'ONCE',
  DAILY: 'DAILY',
  WEEKLY: 'WEEKLY',
  EVERY_2_WEEKS: 'EVERY_2_WEEKS',
  CUSTOM: 'CUSTOM',
};

export const RESPONSIBILITY_STATUS = {
  PENDING: 'PENDING',
  COMPLETED: 'COMPLETED',
};

export const ASSIGNMENT_SOURCE = {
  AUTO_SCHEDULER: 'AUTO_SCHEDULER',
  MANUAL_OVERRIDE: 'MANUAL_OVERRIDE',
};
