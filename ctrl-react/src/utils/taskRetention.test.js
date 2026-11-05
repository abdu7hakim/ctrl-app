import {
  getTaskCompletionArchive,
  getTaskCompletionArchiveId,
  isCompletedTaskOlderThan,
} from './taskRetention';

const now = new Date(2026, 10, 5, 12);

test('completed tasks become hidden only when their completion date is over seven days old', () => {
  expect(isCompletedTaskOlderThan({ status: 'done', completedAt: '2026-10-29' }, 7, now)).toBe(false);
  expect(isCompletedTaskOlderThan({ status: 'done', completedAt: '2026-10-28' }, 7, now)).toBe(true);
  expect(isCompletedTaskOlderThan({ status: 'open', completedAt: '2026-10-01' }, 7, now)).toBe(false);
});

test('completed tasks are eligible for deletion only after thirty days', () => {
  expect(isCompletedTaskOlderThan({ status: 'done', completedAt: '2026-10-06' }, 30, now)).toBe(false);
  expect(isCompletedTaskOlderThan({ status: 'done', completedAt: '2026-10-05' }, 30, now)).toBe(true);
  expect(isCompletedTaskOlderThan({ status: 'done' }, 30, now)).toBe(false);
});

test('creates a stable archive record with the fields needed for future XP scoring', () => {
  expect(getTaskCompletionArchive('user/1', {
    id: 'task/1',
    completedAt: '2026-10-05',
    priority: 'high',
  })).toEqual({
    id: 'user%2F1_task%2F1_2026-10-05',
    data: {
      userId: 'user/1',
      taskId: 'task/1',
      completedAt: '2026-10-05',
      priority: 'high',
    },
  });
  expect(getTaskCompletionArchiveId('user-1', 'task-1', 'invalid')).toBeNull();
  expect(getTaskCompletionArchive('user-1', {
    id: 'timestamp-task',
    completedAt: new Date(2026, 9, 5, 23, 30),
    priority: 'medium',
  }).data.completedAt).toBe('2026-10-05');
});
