function parseDate(value) {
  if (typeof value?.toDate === 'function') return value.toDate();
  if (value instanceof Date) return value;
  if (typeof value !== 'string') return null;

  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (dateOnly) return new Date(Number(dateOnly[1]), Number(dateOnly[2]) - 1, Number(dateOnly[3]));

  const parsedDate = new Date(value);
  return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
}

export function getTaskCompletionDate(value) {
  return parseDate(value);
}

function getDateKey(date) {
  if (!date) return null;
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-');
}

export function isCompletedTaskOlderThan(todo, days, now = new Date()) {
  if (todo.status !== 'done' || !Number.isSafeInteger(days) || days < 0) return false;
  const completedAt = parseDate(todo.completedAt);
  if (!completedAt) return false;

  const cutoff = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  cutoff.setDate(cutoff.getDate() - days);
  const completionDate = new Date(
    completedAt.getFullYear(),
    completedAt.getMonth(),
    completedAt.getDate(),
  );
  return completionDate < cutoff;
}

export function getTaskCompletionArchiveId(userId, taskId, completedAt) {
  const date = parseDate(completedAt);
  if (!userId || !taskId || !date) return null;
  return `${encodeURIComponent(userId)}_${encodeURIComponent(taskId)}_${getDateKey(date)}`;
}

export function getTaskCompletionArchive(userId, task) {
  const completedAt = getDateKey(parseDate(task.completedAt));
  const id = getTaskCompletionArchiveId(userId, task.id, completedAt);
  if (!id) return null;
  return {
    id,
    data: {
      userId,
      taskId: task.id,
      completedAt,
      priority: task.priority || 'medium',
    },
  };
}
