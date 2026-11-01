const getDateKey = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const addActivity = (counts, dateKey) => {
  if (typeof dateKey === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateKey)) {
    counts[dateKey] = (counts[dateKey] || 0) + 1;
  }
};

export function getActivityHeatmap(data, today = new Date()) {
  const counts = {};
  const currentDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const currentWeekday = (currentDate.getDay() + 6) % 7;
  const currentMonday = new Date(currentDate);
  currentMonday.setDate(currentDate.getDate() - currentWeekday);
  const firstMonday = new Date(currentMonday);
  firstMonday.setDate(currentMonday.getDate() - (25 * 7));

  (data.todos || []).forEach((todo) => {
    if (todo.status === 'done') addActivity(counts, todo.completedAt);
  });
  (data.habits || []).forEach((habit) => {
    Object.entries(habit.completions || {}).forEach(([dateKey, completed]) => {
      if (completed) addActivity(counts, dateKey);
    });
  });
  Object.entries(data.routine || {}).forEach(([dateKey, tasks]) => {
    (tasks || []).forEach((task) => {
      if (task.done) addActivity(counts, dateKey);
    });
  });

  const weeks = Array.from({ length: 26 }, (_, weekIndex) => {
    const weekStart = new Date(firstMonday);
    weekStart.setDate(firstMonday.getDate() + weekIndex * 7);
    return weekStart;
  });
  const months = weeks.reduce((labels, weekStart, weekIndex) => {
    const month = weekStart.getMonth();
    if (weekIndex === 0 || month !== weeks[weekIndex - 1].getMonth()) {
      labels.push({
        label: new Intl.DateTimeFormat('en-US', { month: 'short' }).format(weekStart),
        week: weekIndex,
      });
    }
    return labels;
  }, []);
  const cells = weeks.flatMap((weekStart) => Array.from({ length: 7 }, (_, dayIndex) => {
    const date = new Date(weekStart);
    date.setDate(weekStart.getDate() + dayIndex);
    const key = getDateKey(date);
    const count = counts[key] || 0;
    return {
      date: key,
      count,
      level: count === 0 ? 0 : count === 1 ? 1 : count < 5 ? 2 : 3,
      future: date > currentDate,
    };
  }));

  return { cells, months };
}
