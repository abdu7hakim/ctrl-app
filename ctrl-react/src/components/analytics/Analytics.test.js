import { act, render, screen, within } from '@testing-library/react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import Analytics, { getWeekRange } from './Analytics';

jest.mock('../../firebase', () => ({ db: {} }));

jest.mock('firebase/firestore', () => ({
  collection: jest.fn((_db, name) => ({ name })),
  getDocs: jest.fn(),
  query: jest.fn((collectionRef, ...constraints) => ({ collectionRef, constraints })),
  where: jest.fn((field, operator, value) => ({ field, operator, value })),
}));

function makeSnapshot(records) {
  return {
    docs: records.map((record, index) => ({
      id: record.id || `record-${index}`,
      data: () => record,
    })),
  };
}

function getWeekDateKey(offset = 0) {
  const date = getWeekRange().start;
  date.setDate(date.getDate() + offset);
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-');
}

beforeEach(() => {
  jest.clearAllMocks();
  collection.mockImplementation((_db, name) => ({ name }));
  query.mockImplementation((collectionRef, ...constraints) => ({ collectionRef, constraints }));
  where.mockImplementation((field, operator, value) => ({ field, operator, value }));
  getDocs.mockImplementation(() => Promise.resolve(makeSnapshot([])));
});

test('loads this user’s sessions, habit logs, and tasks into the weekly charts', async () => {
  const date = `${getWeekDateKey()}T12:00:00`;
  const previousWeekDate = `${getWeekDateKey(-7)}T12:00:00`;
  const collectionRecords = {
    pomodoro_sessions: [
      { durationMinutes: 45, completedAt: date },
      { durationMinutes: 120, completedAt: previousWeekDate },
    ],
    habit_logs: [
      { habitId: 'habit-1', date: getWeekDateKey() },
      { habitId: 'habit-2', date: getWeekDateKey() },
    ],
    tasks: [
      { id: 'task-1', priority: 'high' },
      { id: 'task-2', priority: 'medium' },
      { id: 'task-3', priority: 'low' },
      { id: 'task-4', priority: 'high' },
    ],
  };
  getDocs.mockImplementation(({ collectionRef }) => Promise.resolve(
    makeSnapshot(collectionRecords[collectionRef.name]),
  ));

  render(<Analytics userId="user-1" />);

  const charts = await screen.findByRole('region', { name: 'Haftalik grafiklar' });
  expect(getDocs).toHaveBeenCalledTimes(3);
  ['pomodoro_sessions', 'habit_logs', 'tasks'].forEach((name) => {
    expect(collection).toHaveBeenCalledWith({}, name);
    expect(query).toHaveBeenCalledWith(
      { name },
      { field: 'userId', operator: '==', value: 'user-1' },
    );
  });
  expect(within(charts).getByRole('img', { name: 'Haftalik fokus vaqti grafigi' })).toBeInTheDocument();
  expect(within(charts).getByRole('img', { name: 'Haftalik bajarilgan odatlar grafigi' })).toBeInTheDocument();
  expect(within(charts).getByRole('img', { name: 'Vazifalar ustuvorligi grafigi' })).toBeInTheDocument();
  expect(document.querySelectorAll('.analytics-summary-card strong')[0]).toHaveTextContent('45 daq');
  expect(document.querySelectorAll('.analytics-summary-card strong')[1]).toHaveTextContent('2');
  expect(document.querySelectorAll('.analytics-summary-card strong')[2]).toHaveTextContent('4');
  expect(within(charts).getAllByText(/50%/)).toHaveLength(1);
});

test('shows skeleton cards while Firestore analytics queries are pending', async () => {
  let resolveQuery;
  getDocs.mockReturnValue(new Promise((resolve) => {
    resolveQuery = resolve;
  }));
  render(<Analytics userId="user-1" />);

  expect(screen.getByRole('status', { name: 'Statistika yuklanmoqda' })).toBeInTheDocument();
  expect(document.querySelectorAll('.analytics-skeleton-card')).toHaveLength(3);

  await act(async () => resolveQuery(makeSnapshot([])));
  expect(await screen.findAllByText('Bu hafta uchun ma’lumot yo‘q')).toHaveLength(2);
});

test('falls back to existing profile habits and tasks when analytics collections are empty', async () => {
  render(
    <Analytics
      userId="user-1"
      habits={[{ id: 'legacy-habit', completions: { [getWeekDateKey()]: true } }]}
      tasks={[{ id: 'legacy-task', priority: 'high' }]}
    />,
  );

  const charts = await screen.findByRole('region', { name: 'Haftalik grafiklar' });
  expect(within(charts).getByRole('img', { name: 'Haftalik bajarilgan odatlar grafigi' })).toBeInTheDocument();
  expect(within(charts).getByRole('img', { name: 'Vazifalar ustuvorligi grafigi' })).toBeInTheDocument();
  expect(screen.queryAllByText('Bu hafta uchun ma’lumot yo‘q')).toHaveLength(1);
});

test('shows an explicit retry state when a Firestore query fails', async () => {
  const queryError = new Error('Permission denied');
  getDocs.mockRejectedValue(queryError);
  const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
  render(<Analytics userId="user-1" />);

  expect(await screen.findByRole('alert')).toHaveTextContent(
    'Statistikalarni yuklab bo‘lmadi. Internet aloqasini tekshirib qayta urinib ko‘ring.',
  );
  expect(consoleError).toHaveBeenCalledWith('Statistika ma’lumotlarini yuklashda xatolik:', queryError);
  consoleError.mockRestore();
});
