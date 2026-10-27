function getLocalDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getTodoDeadline(todo) {
  if (!todo.dueDate || !/^\d{4}-\d{2}-\d{2}$/.test(todo.dueDate)) return null;

  const [year, month, day] = todo.dueDate.split('-').map(Number);
  const deadline = new Date(year, month - 1, day, 23, 59, 0, 0);
  if (getLocalDateKey(deadline) !== todo.dueDate) return null;
  return deadline;
}

export function isTodoOverdue(todo, now = new Date()) {
  if (todo.status === 'done') return false;
  const deadline = getTodoDeadline(todo);
  return Boolean(deadline && deadline <= now);
}

export function isTodoUrgent(todo, now = new Date()) {
  if (todo.status === 'done' || !todo.dueDate) return false;
  const deadline = getTodoDeadline(todo);
  return Boolean(deadline && todo.dueDate === getLocalDateKey(now) && now < deadline);
}
