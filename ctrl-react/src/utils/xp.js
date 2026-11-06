const allWeekdays = [0, 1, 2, 3, 4, 5, 6];

export function calculateFocusXP(minutes) {
  const validMinutes = Number(minutes);
  if (!Number.isFinite(validMinutes) || validMinutes <= 0) return 0;
  return Math.round(validMinutes * 0.4 * 10) / 10;
}

export function calculateHabitXP(streak) {
  if (streak < 3) return 2;
  if (streak <= 7) return 3;
  return 5;
}

export function calculateTaskXP(priority) {
  const normalizedPriority = String(priority || '').trim().toLowerCase();
  if (normalizedPriority === 'high' || normalizedPriority === 'yuqori') return 3;
  if (normalizedPriority === 'low' || normalizedPriority === 'past') return 1;
  return 2;
}

export function getLocalDateKey(date = new Date()) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-');
}

export function getTaskXpLogId(taskId) {
  return `task_${encodeURIComponent(taskId)}`;
}

export function getHabitXpLogId(habitId, date) {
  return `habit_${encodeURIComponent(habitId)}_${date}`;
}

export function getHabitStreak(completions, today = new Date(), frequency = allWeekdays) {
  const scheduledDays = Array.isArray(frequency)
    ? allWeekdays.filter((day) => frequency.includes(day))
    : allWeekdays;
  const checkDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const weekdayIndex = (date) => (date.getDay() + 6) % 7;

  if (scheduledDays.includes(weekdayIndex(checkDate)) && !completions?.[getLocalDateKey(checkDate)]) {
    checkDate.setDate(checkDate.getDate() - 1);
  }

  let streak = 0;
  let daysChecked = 0;
  while (daysChecked < 366) {
    if (scheduledDays.includes(weekdayIndex(checkDate))) {
      if (!completions?.[getLocalDateKey(checkDate)]) break;
      streak += 1;
    }
    checkDate.setDate(checkDate.getDate() - 1);
    daysChecked += 1;
  }
  return streak;
}
