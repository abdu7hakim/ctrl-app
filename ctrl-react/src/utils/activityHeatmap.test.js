import { getActivityHeatmap } from './activityHeatmap';

test('builds six months of daily activity from completed tasks, habits, and routines', () => {
  const today = new Date(2026, 5, 15, 12);
  const activity = getActivityHeatmap({
    todos: [
      { status: 'done', completedAt: '2026-06-15' },
      { status: 'done' },
      { status: 'open', completedAt: '2026-06-15' },
    ],
    habits: [
      { completions: { '2026-06-15': true, '2026-06-14': true, '2026-06-13': false } },
    ],
    routine: {
      '2026-06-15': [
        { done: true },
        { done: true },
        { done: true },
        { done: false },
      ],
    },
  }, today);

  expect(activity.cells).toHaveLength(26 * 7);
  expect(activity.months[0].label).toBeTruthy();
  expect(activity.cells.find(({ date }) => date === '2026-06-15')).toEqual({
    date: '2026-06-15',
    count: 5,
    level: 3,
    future: false,
  });
  expect(activity.cells.find(({ date }) => date === '2026-06-14')).toMatchObject({ count: 1, level: 1 });
  expect(activity.cells.find(({ date }) => date === '2026-06-13')).toMatchObject({ count: 0, level: 0 });
});
