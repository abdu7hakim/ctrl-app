import { useState } from 'react';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  increment,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import {
  createUserWithEmailAndPassword,
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword,
  updateProfile,
} from 'firebase/auth';
import AuthScreen from './components/auth/AuthScreen';
import App from './App';
import TodoPage from './components/todo/TodoPage';
import { avatarOptions } from './utils/avatars';
import { colorThemes } from './utils/themes';
import { getTodoDeadline, isTodoOverdue, isTodoUrgent } from './utils/todoDeadlines';
import { createFocusMusic, focusMusicOptions } from './utils/focusMusic';
import { getDailyMotivation, motivationalQuotes } from './utils/motivation';
import { getLocalDateKey } from './utils/xp';

const originalAudioContext = window.AudioContext;
jest.setTimeout(15000);

jest.mock('./firebase', () => ({
  auth: { currentUser: { uid: 'user-1', email: 'aziza@example.com' } },
  db: {},
  googleProvider: {},
  signInWithPopup: jest.fn(),
}));

jest.mock('firebase/auth', () => ({
  EmailAuthProvider: { credential: jest.fn((email, password) => ({ email, password })) },
  onAuthStateChanged: jest.fn(),
  reauthenticateWithCredential: jest.fn().mockResolvedValue(),
  signOut: jest.fn().mockResolvedValue(),
  updatePassword: jest.fn().mockResolvedValue(),
  updateProfile: jest.fn().mockResolvedValue(),
  createUserWithEmailAndPassword: jest.fn(),
  signInWithEmailAndPassword: jest.fn(),
}));

jest.mock('firebase/firestore', () => ({
  addDoc: jest.fn().mockResolvedValue({ id: 'message-1' }),
  collection: jest.fn((_db, name) => ({ name })),
  doc: jest.fn((_db, name, id) => ({ name, id })),
  getDoc: jest.fn(),
  getDocs: jest.fn().mockResolvedValue({ docs: [] }),
  increment: jest.fn((amount) => ({ increment: amount })),
  orderBy: jest.fn((field, direction) => ({ field, direction })),
  query: jest.fn((collectionRef, ...constraints) => ({ collectionRef, constraints })),
  runTransaction: jest.fn(),
  serverTimestamp: jest.fn(() => 'server-timestamp'),
  setDoc: jest.fn().mockResolvedValue(),
  updateDoc: jest.fn().mockResolvedValue(),
  where: jest.fn((field, operator, value) => ({ field, operator, value })),
  writeBatch: jest.fn(() => ({
    update: jest.fn(),
    set: jest.fn(),
    delete: jest.fn(),
    commit: jest.fn().mockResolvedValue(),
  })),
}));

import { onAuthStateChanged } from 'firebase/auth';

const storedData = {
  firstName: 'Aziza',
  lastName: 'Aliyeva',
  email: 'aziza@example.com',
  todos: [],
  habits: [],
  focusSessions: 0,
  focusMinutes: 0,
  focusDurationMinutes: 25,
  breakDurationMinutes: 5,
  focusAlarmSound: 'bell',
  focusBackgroundMusic: false,
  focusBackgroundTrack: 'ambient',
};

beforeEach(() => {
  jest.clearAllMocks();
  EmailAuthProvider.credential.mockImplementation((email, password) => ({ email, password }));
  doc.mockImplementation((_db, name, id) => ({ name, id }));
  collection.mockImplementation((_db, name) => ({ name }));
  increment.mockImplementation((amount) => ({ increment: amount }));
  query.mockImplementation((collectionRef, ...constraints) => ({ collectionRef, constraints }));
  runTransaction.mockImplementation(async (_db, updateFunction) => updateFunction({
    get: jest.fn().mockResolvedValue({
      data: () => ({ lastDailyLoginDate: getLocalDateKey() }),
    }),
    update: jest.fn(),
    set: jest.fn(),
  }));
  serverTimestamp.mockReturnValue('server-timestamp');
  updateDoc.mockResolvedValue();
  getDocs.mockResolvedValue({ docs: [] });
  where.mockImplementation((field, operator, value) => ({ field, operator, value }));
  writeBatch.mockImplementation(() => ({
    update: jest.fn(),
    set: jest.fn(),
    delete: jest.fn(),
    commit: jest.fn().mockResolvedValue(),
  }));
  reauthenticateWithCredential.mockResolvedValue();
  updatePassword.mockResolvedValue();
  setDoc.mockResolvedValue();
  addDoc.mockResolvedValue({ id: 'message-1' });
  createUserWithEmailAndPassword.mockResolvedValue({
    user: { uid: 'new-user', email: 'new@example.com' },
  });
  getDoc.mockResolvedValue({ exists: () => true, data: () => storedData });
  window.localStorage.clear();
  onAuthStateChanged.mockImplementation((_auth, callback) => {
    callback({ uid: 'user-1', email: 'aziza@example.com', displayName: 'Aziza Aliyeva' });
    return jest.fn();
  });
});

afterEach(() => {
  jest.useRealTimers();
  if (originalAudioContext) window.AudioContext = originalAudioContext;
  else delete window.AudioContext;
});

async function openPage(name) {
  render(<App />);
  const navigation = await screen.findByRole('navigation', { name: 'Asosiy menyu' });
  const page = {
    'Kun tartibi': 'routine',
    Vazifalar: 'todo',
    Odatlar: 'habits',
    Profil: 'profile',
    Aloqa: 'contact',
  }[name];
  fireEvent.click(within(navigation).getByRole('button', { name: new RegExp(name, 'i') }));
  await waitFor(() => expect(document.querySelector(`[data-page-transition="${page}"]`)).toBeInTheDocument());
}

async function navigateToPage(navigation, label, page) {
  const button = page === 'settings'
    ? screen.getByRole('button', { name: new RegExp(label, 'i') })
    : within(navigation).getByRole('button', { name: new RegExp(label, 'i') });
  fireEvent.click(button);
  await waitFor(() => {
    const pageTransition = document.querySelector(`[data-page-transition="${page}"]`);
    expect(pageTransition).toBeInTheDocument();
    if (page === 'focus') expect(pageTransition).toHaveStyle({ display: 'block' });
  });
}

test('sign-up writes the profile and default app data to the new user document', async () => {
  const onAuthenticated = jest.fn();
  render(<AuthScreen onAuthenticated={onAuthenticated} />);
  fireEvent.change(screen.getByLabelText('Ism'), { target: { value: 'Yangi' } });
  fireEvent.change(screen.getByLabelText('Familiya'), { target: { value: 'Foydalanuvchi' } });
  fireEvent.change(screen.getByLabelText('E-mail manzil'), { target: { value: 'new@example.com' } });
  fireEvent.change(screen.getByLabelText('Parol'), { target: { value: 'secure123' } });
  fireEvent.click(screen.getByRole('checkbox'));
  fireEvent.click(screen.getByRole('button', { name: /hisob yaratish/i }));

  await waitFor(() => expect(setDoc).toHaveBeenCalledWith(
    { name: 'users', id: 'new-user' },
    expect.objectContaining({
      firstName: 'Yangi',
      lastName: 'Foydalanuvchi',
      email: 'new@example.com',
      todos: [],
      habits: [],
      focusSessions: 0,
      focusMinutes: 0,
      colorTheme: 'violet',
      focusDurationMinutes: 25,
      breakDurationMinutes: 5,
      focusAlarmSound: 'bell',
      focusBackgroundMusic: false,
      focusBackgroundTrack: 'ambient',
    }),
    { merge: true },
  ));
  expect(onAuthenticated).toHaveBeenCalledWith({
    uid: 'new-user',
    email: 'new@example.com',
    firstName: 'Yangi',
    lastName: 'Foydalanuvchi',
  });
});

test('creates a profile with the Firebase Auth name and email for a first-time user', async () => {
  getDoc.mockResolvedValue({ exists: () => false, data: () => ({}) });
  render(<App />);

  await waitFor(() => expect(setDoc).toHaveBeenCalledWith(
    { name: 'users', id: 'user-1' },
    expect.objectContaining({
      firstName: 'Aziza',
      lastName: 'Aliyeva',
      email: 'aziza@example.com',
    }),
    { merge: true },
  ));
});

test('auth mode switch swaps the panels without submitting or reloading', async () => {
  render(<AuthScreen />);

  expect(screen.getByRole('heading', { name: 'Hisob yarating' })).toBeInTheDocument();
  expect(document.querySelector('.auth-page')).not.toHaveClass('auth-page-login');

  fireEvent.click(screen.getByRole('button', { name: 'Kirish' }));

  expect(await screen.findByRole('heading', { name: 'Hisobingizga kiring' })).toBeInTheDocument();
  expect(document.querySelector('.auth-page')).toHaveClass('auth-page-login');
  expect(createUserWithEmailAndPassword).not.toHaveBeenCalled();

  fireEvent.click(screen.getByRole('button', { name: 'Ro‘yxatdan o‘tish' }));
  expect(await screen.findByRole('heading', { name: 'Hisob yarating' })).toBeInTheDocument();
  expect(document.querySelector('.auth-page')).not.toHaveClass('auth-page-login');
});

test('dashboard shows the formatted date in its banner without a duplicate header date', async () => {
  render(<App />);
  await screen.findByRole('navigation', { name: 'Asosiy menyu' });

  expect(await screen.findByText(/^BUGUN · [A-Z][a-z]{2} \d{1,2}, \d{4}$/)).toBeInTheDocument();
  expect(document.querySelector('.topbar-date')).not.toBeInTheDocument();
});

test('mobile bottom navigation links the five main pages and marks the active page', async () => {
  render(<App />);

  const mobileNavigation = await screen.findByRole('navigation', { name: 'Mobil navigatsiya' });
  expect(mobileNavigation.querySelectorAll('button')).toHaveLength(5);
  expect(within(mobileNavigation).getByRole('button', { name: 'Umumiy' })).toHaveAttribute('aria-current', 'page');
  expect(within(mobileNavigation).getByRole('button', { name: 'Diqqat vaqti' })).toBeInTheDocument();
  expect(within(mobileNavigation).getByRole('button', { name: 'Vazifalar' })).toBeInTheDocument();
  expect(within(mobileNavigation).getByRole('button', { name: 'Odatlar' })).toBeInTheDocument();
  expect(within(mobileNavigation).getByRole('button', { name: 'Reyting' })).toBeInTheDocument();

  fireEvent.click(within(mobileNavigation).getByRole('button', { name: 'Odatlar' }));
  await waitFor(() => {
    expect(within(mobileNavigation).getByRole('button', { name: 'Odatlar' })).toHaveAttribute('aria-current', 'page');
  });
});

test('analytics page is reachable from the sidebar and shows all three charts', async () => {
  render(<App />);
  const navigation = await screen.findByRole('navigation', { name: 'Asosiy menyu' });

  fireEvent.click(within(navigation).getByRole('button', { name: 'Statistika' }));

  const analyticsPage = await screen.findByRole('region', { name: 'Haftalik grafiklar' });
  expect(analyticsPage).toBeInTheDocument();
  expect(within(analyticsPage).getByRole('heading', { name: 'Haftalik fokus vaqti' })).toBeInTheDocument();
  expect(within(analyticsPage).getByRole('heading', { name: 'Haftalik bajarilgan odatlar' })).toBeInTheDocument();
  expect(within(analyticsPage).getByRole('heading', { name: 'Vazifalar ustuvorligi' })).toBeInTheDocument();
  expect(await screen.findAllByText('Bu hafta uchun ma’lumot yo‘q')).toHaveLength(2);
  expect(getDocs).toHaveBeenCalledTimes(5);
  expect(query).toHaveBeenCalledWith(
    { name: 'pomodoro_sessions' },
    { field: 'userId', operator: '==', value: 'user-1' },
  );
  expect(query).toHaveBeenCalledWith(
    { name: 'habit_logs' },
    { field: 'userId', operator: '==', value: 'user-1' },
  );
  expect(query).toHaveBeenCalledWith(
    { name: 'tasks' },
    { field: 'userId', operator: '==', value: 'user-1' },
  );
});

test('shows loading skeletons on dashboard, todo, and habits until Firebase data arrives', async () => {
  let resolveSnapshot;
  getDoc.mockReturnValue(new Promise((resolve) => { resolveSnapshot = resolve; }));
  render(<App />);

  const navigation = await screen.findByRole('navigation', { name: 'Asosiy menyu' });
  expect(screen.getByRole('status', { name: 'Dashboard ma’lumotlari yuklanmoqda' })).toBeInTheDocument();
  expect(document.querySelectorAll('.overview-skeleton-stat')).toHaveLength(4);

  await navigateToPage(navigation, 'Vazifalar', 'todo');
  expect(screen.getByRole('status', { name: 'Vazifalar yuklanmoqda' })).toBeInTheDocument();
  expect(document.querySelectorAll('.todo-skeleton-row')).toHaveLength(4);

  await navigateToPage(navigation, 'Odatlar', 'habits');
  expect(screen.getByRole('status', { name: 'Odatlar yuklanmoqda' })).toBeInTheDocument();
  expect(document.querySelectorAll('.habit-skeleton-row')).toHaveLength(4);

  await act(async () => {
    resolveSnapshot({
      exists: () => true,
      data: () => ({
        ...storedData,
        todos: [{ id: 'loaded-todo', title: 'Loaded todo', status: 'open' }],
        habits: [{
          id: 'loaded-habit',
          name: 'Loaded habit',
          frequency: [0, 1, 2, 3, 4, 5, 6],
          completions: {},
        }],
      }),
    });
  });

  expect(await screen.findByText('Loaded habit')).toBeInTheDocument();
  expect(document.querySelector('.page-content')).toHaveClass('page-content-loaded');
  expect(screen.queryByRole('status', { name: 'Odatlar yuklanmoqda' })).not.toBeInTheDocument();

  await navigateToPage(navigation, 'Vazifalar', 'todo');
  expect(await screen.findByRole('heading', { name: 'Loaded todo' })).toBeInTheDocument();
  await navigateToPage(navigation, 'Umumiy', 'dashboard');
  expect(await screen.findByText(/^BUGUN · [A-Z][a-z]{2} \d{1,2}, \d{4}$/)).toBeInTheDocument();
});

test('saves daily routine changes to the signed-in user document', async () => {
  await openPage('Kun tartibi');
  const today = new Date();
  const todayKey = [
    today.getFullYear(),
    String(today.getMonth() + 1).padStart(2, '0'),
    String(today.getDate()).padStart(2, '0'),
  ].join('-');
  fireEvent.change(screen.getByLabelText('Yangi vazifa qo‘shish...'), { target: { value: 'Plan the day' } });
  fireEvent.submit(screen.getByLabelText('Yangi vazifa qo‘shish...').closest('form'));

  await waitFor(() => expect(updateDoc).toHaveBeenCalledWith(
    { name: 'users', id: 'user-1' },
    expect.objectContaining({
      routine: expect.objectContaining({
        [todayKey]: expect.arrayContaining([
          expect.objectContaining({ task: 'Plan the day', category: 'General', done: false }),
        ]),
      }),
      routineBadges: [],
    }),
  ));
});

test('loads saved routine tasks and custom badges from the user document', async () => {
  const today = new Date();
  const todayKey = [
    today.getFullYear(),
    String(today.getMonth() + 1).padStart(2, '0'),
    String(today.getDate()).padStart(2, '0'),
  ].join('-');
  getDoc.mockResolvedValue({
    exists: () => true,
    data: () => ({
      ...storedData,
      routine: {
        [todayKey]: [{ id: 'saved-task', time: '08:00', task: 'Saved from Firebase', category: 'Learning', done: true }],
      },
      routineBadges: [{ name: 'Learning', color: 'indigo' }],
    }),
  });
  await openPage('Kun tartibi');

  expect(screen.getByText('Saved from Firebase')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Bajarilmagan deb belgilash: Saved from Firebase' })).toHaveAttribute('aria-pressed', 'true');
  expect(screen.getByText('Learning', { selector: '.routine-badge' })).toHaveClass('routine-badge-indigo');
});

test('awards the daily login XP once through a Firestore transaction', async () => {
  const transaction = {
    get: jest.fn().mockResolvedValue({ data: () => ({ totalXP: 6 }) }),
    update: jest.fn(),
    set: jest.fn(),
  };
  runTransaction.mockImplementation(async (_db, updateFunction) => updateFunction(transaction));

  render(<App />);

  await waitFor(() => expect(transaction.update).toHaveBeenCalledWith(
    { name: 'users', id: 'user-1' },
    { totalXP: 8, lastDailyLoginDate: getLocalDateKey() },
  ));
  expect(transaction.set).toHaveBeenCalledWith(
    expect.anything(),
    expect.objectContaining({
      amount: 2,
      type: 'Login',
      description: 'Kunlik login',
      createdAt: 'server-timestamp',
    }),
  );
});

test('awards habit XP using the current completion streak', async () => {
  const today = new Date();
  const completions = {};
  [1, 2].forEach((daysAgo) => {
    const date = new Date(today);
    date.setDate(today.getDate() - daysAgo);
    completions[getLocalDateKey(date)] = true;
  });
  getDoc.mockResolvedValue({
    exists: () => true,
    data: () => ({
      ...storedData,
      habits: [{
        id: 'habit-1',
        name: 'Daily reading',
        frequency: [0, 1, 2, 3, 4, 5, 6],
        completions,
      }],
    }),
  });

  await openPage('Odatlar');
  fireEvent.click(screen.getByRole('button', { name: 'Bajarildi deb belgilash' }));

  await waitFor(() => {
    const habitBatch = writeBatch.mock.results[writeBatch.mock.results.length - 1].value;
    expect(habitBatch.update.mock.calls[0][1].totalXP).toEqual({ increment: 3 });
    expect(habitBatch.set).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        amount: 3,
        type: 'Habit',
        description: 'Kunlik habit bajarildi (Streak: 3 kun)',
      }),
    );
  });

  const habitUndoButton = await screen.findByRole('button', { name: 'Bajarilmagan deb belgilash' });
  await waitFor(() => expect(habitUndoButton).toBeEnabled());
  fireEvent.click(habitUndoButton);
  await waitFor(() => {
    const undoBatch = writeBatch.mock.results[writeBatch.mock.results.length - 1].value;
    expect(undoBatch.update.mock.calls[0][1].totalXP).toEqual({ increment: -3 });
    expect(undoBatch.delete).toHaveBeenCalled();
  });

  const habitRedoButton = await screen.findByRole('button', { name: 'Bajarildi deb belgilash' });
  await waitFor(() => expect(habitRedoButton).toBeEnabled());
  fireEvent.click(habitRedoButton);
  await waitFor(() => {
    const redoBatch = writeBatch.mock.results[writeBatch.mock.results.length - 1].value;
    expect(redoBatch.update.mock.calls[0][1]).not.toHaveProperty('totalXP');
    expect(redoBatch.set).not.toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ type: 'Habit' }),
    );
  });
});

test('todo creation, completion, and deletion are persisted to the signed-in user document', async () => {
  await openPage('Vazifalar');
  expect(screen.getAllByRole('heading', { name: 'Vazifalar' })).toHaveLength(1);
  expect(screen.queryByText('Rejalaringizni yozib boring va har bir qadamni belgilang.')).not.toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Vazifa nomi'), { target: { value: 'React o‘rganish' } });
  fireEvent.click(screen.getByRole('button', { name: /vazifa yaratish/i }));

  expect(await screen.findByRole('heading', { name: 'React o‘rganish' })).toBeInTheDocument();
  let taskBatch = writeBatch.mock.results[writeBatch.mock.results.length - 1].value;
  expect(taskBatch.update).toHaveBeenCalledWith(
    doc(expect.anything(), 'users', 'user-1'),
    expect.objectContaining({ todos: expect.arrayContaining([expect.objectContaining({ title: 'React o‘rganish', status: 'open' })]) }),
  );

  fireEvent.click(screen.getByRole('button', { name: 'React o‘rganish vazifasini tahrirlash' }));
  fireEvent.change(screen.getByLabelText('Vazifa nomini tahrirlash'), { target: { value: 'React ilovasini o‘rganish' } });
  fireEvent.click(screen.getByRole('button', { name: 'Vazifa tahririni saqlash' }));
  expect(await screen.findByRole('heading', { name: 'React ilovasini o‘rganish' })).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: 'Bajarildi deb belgilash' }));
  await waitFor(() => expect(writeBatch).toHaveBeenCalledTimes(3));
  taskBatch = writeBatch.mock.results[writeBatch.mock.results.length - 1].value;
  expect(taskBatch.update.mock.calls[0][1].todos[0].status).toBe('done');
  expect(await screen.findByRole('button', { name: 'Bajarilmagan deb belgilash' })).toBeInTheDocument();
  const completedTask = taskBatch.update.mock.calls[0][1].todos[0];
  const todayKey = (() => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  })();
  expect(completedTask).toEqual(expect.objectContaining({ status: 'done', completedAt: todayKey }));
  expect(taskBatch.set).toHaveBeenCalledWith(
    { name: 'task_completion_archive', id: `user-1_${completedTask.id}_${todayKey}` },
    { userId: 'user-1', taskId: completedTask.id, completedAt: todayKey, priority: 'medium' },
  );
  expect(taskBatch.update.mock.calls[0][1].totalXP).toEqual({ increment: 2 });
  expect(taskBatch.set).toHaveBeenCalledWith(
    expect.anything(),
    expect.objectContaining({
      amount: 2,
      type: 'Task',
      description: 'O‘rta prioritetli topshiriq bajarildi',
      createdAt: 'server-timestamp',
    }),
  );
  const taskUndoButton = screen.getByRole('button', { name: 'Bajarilmagan deb belgilash' });
  fireEvent.click(taskUndoButton);
  const taskRedoButton = await screen.findByRole('button', { name: 'Bajarildi deb belgilash' });
  await waitFor(() => expect(taskRedoButton).toBeEnabled());
  taskBatch = writeBatch.mock.results[writeBatch.mock.results.length - 1].value;
  expect(taskBatch.update.mock.calls[0][1].totalXP).toEqual({ increment: -2 });
  expect(taskBatch.delete).toHaveBeenCalled();

  fireEvent.click(taskRedoButton);
  const taskCompletedButton = await screen.findByRole('button', { name: 'Bajarilmagan deb belgilash' });
  await waitFor(() => expect(taskCompletedButton).toBeEnabled());
  taskBatch = writeBatch.mock.results[writeBatch.mock.results.length - 1].value;
  expect(taskBatch.update.mock.calls[0][1]).not.toHaveProperty('totalXP');
  expect(taskBatch.set).not.toHaveBeenCalledWith(
    expect.anything(),
    expect.objectContaining({ type: 'Task' }),
  );
  fireEvent.click(screen.getByRole('button', { name: 'React ilovasini o‘rganish vazifasini o‘chirish' }));
  expect(await screen.findByText('Bu ro‘yxatda hali vazifa yo‘q.')).toBeInTheDocument();
}, 30000);

test('todo completion activity date is cleared when a task is reopened', async () => {
  const onChange = jest.fn().mockResolvedValue();
  const TodoPageHarness = () => {
    const [todos, setTodos] = useState([{ id: 'todo-1', title: 'Complete report', status: 'open' }]);
    return <TodoPage todos={todos} onChange={async (nextTodos) => {
      await onChange(nextTodos);
      setTodos(nextTodos);
    }} />;
  };
  render(<TodoPageHarness />);
  const today = new Date();
  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: 'Bajarildi deb belgilash' }));
    await Promise.resolve();
  });
  expect(onChange).toHaveBeenLastCalledWith([
    expect.objectContaining({ status: 'done', completedAt: todayKey }),
  ]);
  const reopenButton = await screen.findByRole('button', { name: 'Bajarilmagan deb belgilash' });
  await act(async () => {
    fireEvent.click(reopenButton);
    await Promise.resolve();
  });
  await waitFor(() => expect(onChange).toHaveBeenCalledTimes(2));
  const reopenedTodo = onChange.mock.calls[1][0][0];
  expect(reopenedTodo.status).toBe('open');
  expect(reopenedTodo).not.toHaveProperty('completedAt');
});

test('purges completed tasks older than thirty days after archiving XP history', async () => {
  jest.useFakeTimers().setSystemTime(new Date(2026, 10, 5, 12));
  const oldCompletion = '2026-10-04';
  const expiredTask = {
    id: 'old-user-task',
    title: 'Completed last month',
    status: 'done',
    completedAt: oldCompletion,
    priority: 'high',
  };
  const taskDocument = {
    id: 'old-collection-task',
    ref: { collection: 'tasks', id: 'old-collection-task' },
    data: () => ({ taskId: 'old-collection-task', status: 'done', completedAt: oldCompletion, priority: 'low' }),
  };
  const oldOpenTaskDocument = {
    id: 'old-open-task',
    ref: { collection: 'tasks', id: 'old-open-task' },
    data: () => ({ taskId: 'old-open-task', status: 'open', completedAt: oldCompletion, priority: 'low' }),
  };
  getDoc.mockResolvedValue({
    exists: () => true,
    data: () => ({ ...storedData, todos: [expiredTask] }),
  });
  getDocs.mockImplementation(({ collectionRef }) => Promise.resolve({
    docs: collectionRef.name === 'tasks' ? [taskDocument, oldOpenTaskDocument] : [],
  }));
  render(<App />);

  await waitFor(() => expect(writeBatch.mock.results.length).toBeGreaterThan(0));
  const purgeBatch = writeBatch.mock.results[writeBatch.mock.results.length - 1].value;
  await waitFor(() => expect(purgeBatch.commit).toHaveBeenCalled());
  expect(purgeBatch.update).toHaveBeenCalledWith(
    { name: 'users', id: 'user-1' },
    { todos: [] },
  );
  expect(purgeBatch.set).toHaveBeenCalledWith(
    { name: 'task_completion_archive', id: `user-1_old-user-task_${oldCompletion}` },
    { userId: 'user-1', taskId: 'old-user-task', completedAt: oldCompletion, priority: 'high' },
  );
  expect(purgeBatch.set).toHaveBeenCalledWith(
    { name: 'task_completion_archive', id: `user-1_old-collection-task_${oldCompletion}` },
    { userId: 'user-1', taskId: 'old-collection-task', completedAt: oldCompletion, priority: 'low' },
  );
  expect(purgeBatch.delete).toHaveBeenCalledWith(taskDocument.ref);
  expect(purgeBatch.delete).not.toHaveBeenCalledWith(oldOpenTaskDocument.ref);
  jest.useRealTimers();
});

test('todo quick dates and priority are saved with the task', async () => {
  jest.useFakeTimers().setSystemTime(new Date(2026, 9, 28, 12));
  const onChange = jest.fn().mockResolvedValue();
  render(<TodoPage todos={[]} onChange={onChange} />);

  fireEvent.click(screen.getByRole('button', { name: 'Bugun' }));
  expect(screen.getByLabelText('Muddat (ixtiyoriy)').value).toBe('2026-10-28');
  fireEvent.click(screen.getByRole('button', { name: 'Ertaga' }));
  expect(screen.getByLabelText('Muddat (ixtiyoriy)').value).toBe('2026-10-29');
  fireEvent.click(screen.getByRole('button', { name: 'Keyingi dushanba' }));
  expect(screen.getByLabelText('Muddat (ixtiyoriy)').value).toBe('2026-11-02');
  fireEvent.change(screen.getByLabelText('Muhimlik darajasi'), { target: { value: 'high' } });
  fireEvent.change(screen.getByLabelText('Vazifa nomi'), { target: { value: 'Muhim topshiriq' } });
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: /vazifa yaratish/i }));
    await Promise.resolve();
  });

  await waitFor(() => expect(onChange).toHaveBeenCalledWith(expect.arrayContaining([
    expect.objectContaining({ title: 'Muhim topshiriq', dueDate: '2026-11-02', priority: 'high' }),
  ])));
  jest.useRealTimers();
});

test('task play button starts the task-specific focus timer and opens focus page', async () => {
  getDoc.mockResolvedValue({
    exists: () => true,
    data: () => ({
      ...storedData,
      focusDurationMinutes: 1,
      todos: [{ id: 'todo-focus-1', title: 'Hisobot yozish', status: 'open' }],
    }),
  });
  render(<App />);
  const navigation = await screen.findByRole('navigation', { name: 'Asosiy menyu' });
  await navigateToPage(navigation, 'vazifalar', 'todo');

  fireEvent.click(screen.getByRole('button', { name: 'Hisobot yozish uchun diqqat vaqtini boshlash' }));

  expect(await screen.findByText('Fokusdagi vazifa')).toBeInTheDocument();
  expect(screen.getByText('Hisobot yozish', { selector: 'strong' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Pauza' })).toBeInTheDocument();
  expect(screen.getByRole('img', { name: '01:00 qoldi' })).toBeInTheDocument();
});

test('deadline-day open tasks show a warning and completed tasks do not', () => {
  const now = new Date(2026, 9, 29, 12, 0);
  const openTodo = { id: 'deadline-todo', status: 'open', dueDate: '2026-10-29' };
  const completedTodo = { ...openTodo, status: 'done' };

  expect(isTodoUrgent(openTodo, now)).toBe(true);
  expect(isTodoOverdue(openTodo, now)).toBe(false);
  expect(isTodoUrgent(completedTodo, now)).toBe(false);
  expect(isTodoOverdue(completedTodo, new Date(2026, 9, 30))).toBe(false);
  expect(isTodoOverdue(openTodo, new Date(2026, 9, 29, 23, 59))).toBe(true);
  expect(getTodoDeadline(openTodo)).toEqual(new Date(2026, 9, 29, 23, 59));
});

test('todo deadline warning explains the automatic deletion time', () => {
  jest.useFakeTimers().setSystemTime(new Date(2026, 9, 29, 12, 0));
  const todo = { id: 'due-today', title: 'Hisobot', status: 'open', dueDate: '2026-10-29' };
  const { unmount } = render(<TodoPage todos={[todo]} onChange={jest.fn()} />);

  expect(screen.getByRole('article')).toHaveClass('todo-item-urgent');
  fireEvent.click(screen.getByRole('button', { name: 'Hisobot uchun muddat ogohlantirishi' }));
  expect(screen.getByRole('alert')).toHaveTextContent('bugun soat 23:59 gacha');
  expect(screen.getByRole('alert')).toHaveTextContent('avtomatik o‘chiriladi');
  unmount();
});

test('expired open todos are deleted from Firestore on app load but completed todos remain', async () => {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const dueDate = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;
  const completedTodo = { id: 'completed-overdue', title: 'Bajarilgan', status: 'done', dueDate };
  getDoc.mockResolvedValue({
    exists: () => true,
    data: () => ({
      ...storedData,
      todos: [
        { id: 'expired-open', title: 'Muddati tugagan', status: 'open', dueDate },
        completedTodo,
      ],
    }),
  });

  render(<App />);
  await screen.findByRole('navigation', { name: 'Asosiy menyu' });

  await waitFor(() => expect(updateDoc).toHaveBeenCalledWith(
    { name: 'users', id: 'user-1' },
    { todos: [completedTodo] },
  ));
});

test('habit creation and completion are saved with completedToday in Firestore', async () => {
  await openPage('Odatlar');
  fireEvent.change(screen.getByLabelText('Odat nomi'), { target: { value: 'Ertalab sayr' } });
  fireEvent.click(screen.getByRole('button', { name: /odat qo‘shish/i }));

  expect(await screen.findByText('Ertalab sayr')).toBeInTheDocument();
  let habitBatch = writeBatch.mock.results[writeBatch.mock.results.length - 1].value;
  expect(habitBatch.update).toHaveBeenCalledWith(
    expect.anything(),
    expect.objectContaining({ habits: expect.arrayContaining([expect.objectContaining({ name: 'Ertalab sayr', completedToday: false })]) }),
  );
  fireEvent.click(screen.getByRole('button', { name: 'Bajarildi deb belgilash' }));
  expect(await screen.findByText('Bajarildi')).toBeInTheDocument();
  habitBatch = writeBatch.mock.results[writeBatch.mock.results.length - 1].value;
  const savedHabit = habitBatch.update.mock.calls[0][1].habits[0];
  const today = new Date();
  const todayKey = [
    today.getFullYear(),
    String(today.getMonth() + 1).padStart(2, '0'),
    String(today.getDate()).padStart(2, '0'),
  ].join('-');
  expect(habitBatch.update).toHaveBeenCalledWith(
    expect.anything(),
    expect.objectContaining({ habits: expect.arrayContaining([expect.objectContaining({ completedToday: true })]) }),
  );
  expect(habitBatch.set).toHaveBeenCalledWith(
    { name: 'habit_logs', id: `user-1_${savedHabit.id}_${todayKey}` },
    expect.objectContaining({
      userId: 'user-1',
      habitId: savedHabit.id,
      date: todayKey,
      completedAt: 'server-timestamp',
    }),
  );
});

test('profile changes update Firebase Auth and the user document', async () => {
  await openPage('Profil');
  fireEvent.change(screen.getByLabelText('Ism'), { target: { value: 'Aziza2' } });
  fireEvent.click(screen.getByRole('button', { name: /o‘zgarishlarni saqlash/i }));

  expect(await screen.findByText('Saqlandi')).toBeInTheDocument();
  expect(updateProfile).toHaveBeenCalledWith(expect.objectContaining({ uid: 'user-1' }), { displayName: 'Aziza2 Aliyeva' });
  expect(updateDoc).toHaveBeenCalledWith(
    expect.anything(),
    expect.objectContaining({ firstName: 'Aziza2', lastName: 'Aliyeva', email: 'aziza@example.com' }),
  );
});

test('password change reauthenticates and validates password confirmation', async () => {
  await openPage('Profil');
  fireEvent.change(screen.getByLabelText('Joriy parol'), { target: { value: 'current123' } });
  fireEvent.change(screen.getByLabelText('Yangi parol', { selector: 'input' }), { target: { value: 'newPass123' } });
  fireEvent.change(screen.getByLabelText('Yangi parolni tasdiqlang'), { target: { value: 'newPass123' } });
  fireEvent.click(screen.getByRole('button', { name: 'Yangi parolni saqlash' }));

  expect(await screen.findByRole('status')).toHaveTextContent('Parolingiz muvaffaqiyatli yangilandi.');
  expect(reauthenticateWithCredential).toHaveBeenCalledWith(
    expect.objectContaining({ uid: 'user-1' }),
    { email: 'aziza@example.com', password: 'current123' },
  );
  expect(updatePassword).toHaveBeenCalledWith(expect.objectContaining({ uid: 'user-1' }), 'newPass123');

  fireEvent.change(screen.getByLabelText('Yangi parol'), { target: { value: 'different1' } });
  fireEvent.change(screen.getByLabelText('Yangi parolni tasdiqlang'), { target: { value: 'different2' } });
  fireEvent.click(screen.getByRole('button', { name: 'Yangi parolni saqlash' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Yangi parol va tasdiqlash paroli bir xil emas.');
  expect(updatePassword).toHaveBeenCalledTimes(1);
});

test('profile avatar can be selected and is restored from local storage after reload', async () => {
  window.localStorage.setItem('userAvatar', 'legacy-avatar-url');
  const { unmount } = render(<App />);
  const navigation = await screen.findByRole('navigation', { name: 'Asosiy menyu' });
  const profileButton = screen.getByRole('button', { name: 'Profilni ochish' });
  expect(profileButton.querySelector('.profile-chip-initials')).toHaveTextContent('AA');
  expect(window.localStorage.getItem('userAvatar')).toBeNull();
  fireEvent.click(within(navigation).getByRole('button', { name: /Profil/i }));
  await waitFor(() => expect(document.querySelector('[data-page-transition="profile"]')).toBeInTheDocument());
  const profileContent = within(document.querySelector('[data-page-transition="profile"]'));
  expect(profileContent.getByLabelText('Aziza profil avatari')).toHaveTextContent('AA');
  expect(screen.queryByLabelText('Profil rasmini yuklash')).not.toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: 'Avatarni o‘zgartirish' }));
  const picker = await screen.findByRole('dialog', { name: 'Avatarni tanlang' });
  expect(within(picker).getAllByRole('button', { name: /^Avatar / })).toHaveLength(avatarOptions.length);
  const selectedAvatar = avatarOptions[11];
  fireEvent.click(within(picker).getByRole('button', { name: 'Avatar 12' }));

  expect(window.localStorage.getItem('userAvatar')).toBe(selectedAvatar.path);
  expect(profileContent.getByRole('img', { name: 'Aziza profil avatari' })).toHaveAttribute(
    'src',
    `${process.env.PUBLIC_URL}${selectedAvatar.path}`,
  );
  expect(profileButton.querySelector('.profile-chip-avatar')).toHaveAttribute(
    'src',
    `${process.env.PUBLIC_URL}${selectedAvatar.path}`,
  );
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());

  unmount();
  await openPage('Profil');
  expect(window.localStorage.getItem('userAvatar')).toBe(selectedAvatar.path);
  expect(within(document.querySelector('[data-page-transition="profile"]')).getByRole('img', {
    name: 'Aziza profil avatari',
  })).toHaveAttribute('src', `${process.env.PUBLIC_URL}${selectedAvatar.path}`);
});

test('dark mode preference is saved to the signed-in user document', async () => {
  render(<App />);
  await screen.findByRole('navigation', { name: 'Asosiy menyu' });
  fireEvent.click(screen.getByRole('button', { name: 'Tungi rejim' }));

  await waitFor(() => expect(updateDoc).toHaveBeenCalledWith(
    { name: 'users', id: 'user-1' },
    { darkMode: true },
  ));
  await waitFor(() => expect(document.documentElement).toHaveAttribute('data-theme', 'dark'));
});

test('settings page can update the saved dark mode preference', async () => {
  render(<App />);
  await screen.findByRole('navigation', { name: 'Asosiy menyu' });
  await navigateToPage(screen.getByRole('navigation', { name: 'Asosiy menyu' }), 'Sozlamalar', 'settings');
  const toggle = await screen.findByRole('switch', { name: 'Tungi rejim' });
  expect(toggle).toHaveAttribute('aria-checked', 'false');
  fireEvent.click(toggle);

  await waitFor(() => expect(updateDoc).toHaveBeenCalledWith(
    { name: 'users', id: 'user-1' },
    { darkMode: true },
  ));
  expect(await screen.findByRole('switch', { name: 'Tungi rejim' })).toHaveAttribute('aria-checked', 'true');
});

test('settings page applies and saves a selected color theme', async () => {
  render(<App />);
  const navigation = await screen.findByRole('navigation', { name: 'Asosiy menyu' });
  await navigateToPage(navigation, 'Sozlamalar', 'settings');
  expect(colorThemes).toHaveLength(7);
  fireEvent.click(await screen.findByRole('button', { name: 'Ko‘k rang mavzusi' }));

  await waitFor(() => expect(updateDoc).toHaveBeenCalledWith(
    { name: 'users', id: 'user-1' },
    { colorTheme: 'blue' },
  ));
  await waitFor(() => expect(document.documentElement.style.getPropertyValue('--primary')).toBe('#3978d4'));
  expect(await screen.findByRole('button', { name: 'Ko‘k rang mavzusi' })).toHaveAttribute('aria-pressed', 'true');

  fireEvent.click(screen.getByRole('switch', { name: 'Tungi rejim' }));
  await waitFor(() => expect(document.documentElement.style.getPropertyValue('--primary')).toBe('#82b4ff'));
});

test('settings reset requires confirmation and only keeps account identity fields', async () => {
  window.localStorage.setItem('ctrl-app-language', 'en');
  window.localStorage.setItem('userAvatar', avatarOptions[2].path);
  render(<App />);
  await screen.findByRole('navigation', { name: 'Main menu' });
  await navigateToPage(screen.getByRole('navigation', { name: 'Main menu' }), 'Settings', 'settings');

  fireEvent.click(await screen.findByRole('button', { name: 'Delete my data' }));
  expect(screen.getByText('This cannot be undone. Are you sure?')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
  expect(setDoc).not.toHaveBeenCalled();

  fireEvent.click(screen.getByRole('button', { name: 'Delete my data' }));
  fireEvent.click(screen.getByRole('button', { name: 'Yes, delete all my data' }));
  await waitFor(() => expect(setDoc).toHaveBeenCalledWith(
    { name: 'users', id: 'user-1' },
    { firstName: 'Aziza', lastName: 'Aliyeva', email: 'aziza@example.com' },
  ));
  expect(await screen.findByText('Ma’lumotlaringiz o‘chirildi. Ism, familiya, email va parolingiz saqlab qolindi.', {
    selector: '.settings-reset-success',
  })).toBeInTheDocument();
  expect(window.localStorage.getItem('ctrl-app-language')).toBeNull();
  expect(window.localStorage.getItem('userAvatar')).toBeNull();
  expect(document.documentElement).toHaveAttribute('lang', 'uz');
  expect(updatePassword).not.toHaveBeenCalled();
});

test('settings reset displays save errors and keeps the confirmation open', async () => {
  setDoc.mockRejectedValueOnce(new Error('Network unavailable'));
  render(<App />);
  const navigation = await screen.findByRole('navigation', { name: 'Asosiy menyu' });
  await navigateToPage(navigation, 'Sozlamalar', 'settings');

  fireEvent.click(await screen.findByRole('button', { name: 'Ma’lumotlarni o‘chirish' }));
  fireEvent.click(screen.getByRole('button', { name: 'Ha, hamma ma’lumotni o‘chirish' }));

  expect(await screen.findByText('Ma’lumotlarni o‘chirib bo‘lmadi. Qayta urinib ko‘ring.')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Bekor qilish' })).toBeInTheDocument();
  expect(screen.queryByText('Ma’lumotlaringiz o‘chirildi. Ism, familiya, email va parolingiz saqlab qolindi.')).not.toBeInTheDocument();
  expect(updatePassword).not.toHaveBeenCalled();
});

test('daily motivation selects a stable quote from its collection', () => {
  const date = new Date(2026, 9, 27);
  expect(motivationalQuotes).toHaveLength(25);
  expect(getDailyMotivation(date)).toBe(getDailyMotivation(date));
  expect(motivationalQuotes).toContain(getDailyMotivation(date));
});

test('contact messages are added to the messages collection with the authenticated user id', async () => {
  await openPage('Aloqa');
  fireEvent.change(screen.getByLabelText('Xabaringiz'), { target: { value: 'Ilova juda foydali.' } });
  fireEvent.click(screen.getByRole('button', { name: /xabarni yuborish/i }));

  expect(await screen.findAllByText('Xabaringiz qabul qilindi. Rahmat!')).toHaveLength(2);
  expect(collection).toHaveBeenCalledWith(expect.anything(), 'messages');
  expect(addDoc).toHaveBeenCalledWith(
    { name: 'messages' },
    expect.objectContaining({ userId: 'user-1', message: 'Ilova juda foydali.', createdAt: 'server-timestamp' }),
  );
  expect(serverTimestamp).toHaveBeenCalled();
});

test('a completed focus session uses Firestore atomic increments', async () => {
  render(<App />);
  const navigation = await screen.findByRole('navigation', { name: 'Asosiy menyu' });
  await navigateToPage(navigation, 'diqqat vaqti', 'focus');
  window.AudioContext = jest.fn(() => ({
    state: 'running',
    currentTime: 0,
    destination: {},
    createOscillator: () => ({
      frequency: { setValueAtTime: jest.fn() },
      connect: jest.fn(),
      start: jest.fn(),
      stop: jest.fn(),
    }),
    createGain: () => ({
      gain: { setValueAtTime: jest.fn(), exponentialRampToValueAtTime: jest.fn() },
      connect: jest.fn(),
    }),
    close: jest.fn(),
  }));
  jest.useFakeTimers();
  fireEvent.click(screen.getByRole('button', { name: 'Boshlash' }));

  act(() => {
    jest.advanceTimersByTime(25 * 60 * 1000);
  });
  await act(async () => Promise.resolve());

  expect(increment).toHaveBeenNthCalledWith(1, 1);
  expect(increment).toHaveBeenNthCalledWith(2, 25);
  expect(increment).toHaveBeenNthCalledWith(3, 10);
  const focusBatch = writeBatch.mock.results[writeBatch.mock.results.length - 1].value;
  expect(focusBatch.update).toHaveBeenCalledWith(
    expect.anything(),
    { focusSessions: { increment: 1 }, focusMinutes: { increment: 25 }, totalXP: { increment: 10 } },
  );
  expect(focusBatch.set).toHaveBeenCalledWith(
    expect.anything(),
    { userId: 'user-1', durationMinutes: 25, completedAt: 'server-timestamp' },
  );
  expect(focusBatch.set).toHaveBeenCalledWith(
    expect.anything(),
    { amount: 10, type: 'Focus', description: '25 daqiqa fokus bajarildi', createdAt: 'server-timestamp' },
  );
  jest.useRealTimers();
});

test('focus task picker accumulates completed focus minutes on the selected task', async () => {
  const task = { id: 'todo-focus', title: 'Kitob o‘qish', status: 'open', focusMinutes: 5 };
  getDoc.mockResolvedValue({
    exists: () => true,
    data: () => ({ ...storedData, focusDurationMinutes: 1, todos: [task] }),
  });
  window.AudioContext = jest.fn(() => ({
    state: 'running',
    currentTime: 0,
    destination: {},
    createOscillator: () => ({
      frequency: { setValueAtTime: jest.fn() },
      connect: jest.fn(),
      start: jest.fn(),
      stop: jest.fn(),
    }),
    createGain: () => ({
      gain: { setValueAtTime: jest.fn(), exponentialRampToValueAtTime: jest.fn() },
      connect: jest.fn(),
    }),
    close: jest.fn(),
  }));
  render(<App />);
  const navigation = await screen.findByRole('navigation', { name: 'Asosiy menyu' });
  await navigateToPage(navigation, 'diqqat vaqti', 'focus');
  fireEvent.change(screen.getByLabelText('Fokus vazifasi'), { target: { value: 'todo-focus' } });

  expect(screen.getByText('Kitob o‘qish', { selector: 'strong' })).toBeInTheDocument();
  jest.useFakeTimers();
  fireEvent.click(screen.getByRole('button', { name: 'Boshlash' }));
  act(() => jest.advanceTimersByTime(60 * 1000));
  await act(async () => Promise.resolve());

  const focusBatch = writeBatch.mock.results[writeBatch.mock.results.length - 1].value;
  expect(focusBatch.update).toHaveBeenLastCalledWith(
    { name: 'users', id: 'user-1' },
    {
      focusSessions: { increment: 1 },
      focusMinutes: { increment: 1 },
      totalXP: { increment: 0.4 },
      todos: [expect.objectContaining({ id: 'todo-focus', focusMinutes: 6 })],
    },
  );
  jest.useRealTimers();
});

test('resuming a paused focus session preserves its remaining time and records one session', async () => {
  getDoc.mockResolvedValue({
    exists: () => true,
    data: () => ({ ...storedData, focusDurationMinutes: 1 }),
  });
  render(<App />);
  const navigation = await screen.findByRole('navigation', { name: 'Asosiy menyu' });
  await navigateToPage(navigation, 'diqqat vaqti', 'focus');
  window.AudioContext = jest.fn(() => ({
    state: 'running',
    currentTime: 0,
    destination: {},
    createOscillator: () => ({
      frequency: { setValueAtTime: jest.fn() },
      connect: jest.fn(),
      start: jest.fn(),
      stop: jest.fn(),
    }),
    createGain: () => ({
      gain: { setValueAtTime: jest.fn(), exponentialRampToValueAtTime: jest.fn() },
      connect: jest.fn(),
    }),
    close: jest.fn(),
  }));
  jest.useFakeTimers();

  fireEvent.click(screen.getByRole('button', { name: 'Boshlash' }));
  act(() => jest.advanceTimersByTime(15 * 1000));
  fireEvent.click(screen.getByRole('button', { name: 'Pauza' }));
  expect(screen.getByRole('img', { name: '00:45 qoldi' })).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: 'Davom ettirish' }));
  expect(screen.getByRole('img', { name: '00:45 qoldi' })).toBeInTheDocument();
  act(() => jest.advanceTimersByTime(45 * 1000));
  await act(async () => Promise.resolve());

  expect(increment).toHaveBeenCalledTimes(3);
  expect(increment).toHaveBeenNthCalledWith(1, 1);
  expect(increment).toHaveBeenNthCalledWith(2, 1);
  expect(increment).toHaveBeenNthCalledWith(3, 0.4);
  jest.useRealTimers();
});

test('focus timer continues while navigating to another page and back', async () => {
  getDoc.mockResolvedValue({
    exists: () => true,
    data: () => ({ ...storedData, focusDurationMinutes: 1 }),
  });
  render(<App />);
  const navigation = await screen.findByRole('navigation', { name: 'Asosiy menyu' });
  await navigateToPage(navigation, 'diqqat vaqti', 'focus');
  window.AudioContext = jest.fn(() => ({
    state: 'running',
    currentTime: 0,
    destination: {},
    createOscillator: () => ({
      frequency: { setValueAtTime: jest.fn() },
      connect: jest.fn(),
      start: jest.fn(),
      stop: jest.fn(),
    }),
    createGain: () => ({
      gain: { setValueAtTime: jest.fn(), exponentialRampToValueAtTime: jest.fn() },
      connect: jest.fn(),
    }),
    close: jest.fn(),
  }));
  jest.useFakeTimers();

  fireEvent.click(screen.getByRole('button', { name: 'Boshlash' }));
  act(() => jest.advanceTimersByTime(15 * 1000));
  fireEvent.click(within(navigation).getByRole('button', { name: 'Vazifalar' }));
  act(() => jest.advanceTimersByTime(10 * 1000));
  fireEvent.click(within(navigation).getByRole('button', { name: 'Diqqat vaqti' }));

  expect(screen.getByRole('img', { name: '00:35 qoldi' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Pauza' })).toBeInTheDocument();
  jest.useRealTimers();
});

test('focus background tracks can be generated and stopped', () => {
  const createOscillator = jest.fn(() => ({
    frequency: { setValueAtTime: jest.fn() },
    detune: { setValueAtTime: jest.fn() },
    connect: jest.fn(),
    start: jest.fn(),
    stop: jest.fn(),
  }));
  const audioContext = {
    currentTime: 0,
    sampleRate: 8000,
    destination: {},
    createGain: () => ({
      gain: {
        value: 0.08,
        setValueAtTime: jest.fn(),
        exponentialRampToValueAtTime: jest.fn(),
        cancelScheduledValues: jest.fn(),
      },
      connect: jest.fn(),
    }),
    createOscillator,
    createBuffer: jest.fn(() => ({ getChannelData: () => new Float32Array(16000) })),
    createBufferSource: jest.fn(() => ({
      connect: jest.fn(),
      start: jest.fn(),
      stop: jest.fn(),
    })),
    createBiquadFilter: jest.fn(() => ({
      frequency: { setValueAtTime: jest.fn() },
      connect: jest.fn(),
    })),
  };

  expect(focusMusicOptions).toHaveLength(3);
  ['ambient', 'rain', 'soft'].forEach((track) => {
    createFocusMusic(audioContext, track).stop();
  });
  expect(createOscillator).toHaveBeenCalled();
});

test('focus background music starts with the timer and stops when paused', async () => {
  getDoc.mockResolvedValue({
    exists: () => true,
    data: () => ({
      ...storedData,
      focusBackgroundMusic: true,
      focusBackgroundTrack: 'rain',
    }),
  });
  const source = { connect: jest.fn(), start: jest.fn(), stop: jest.fn() };
  window.AudioContext = jest.fn(() => ({
    state: 'running',
    currentTime: 0,
    sampleRate: 8000,
    destination: {},
    createGain: () => ({
      gain: {
        value: 0.08,
        setValueAtTime: jest.fn(),
        exponentialRampToValueAtTime: jest.fn(),
        cancelScheduledValues: jest.fn(),
      },
      connect: jest.fn(),
    }),
    createBuffer: jest.fn(() => ({ getChannelData: () => new Float32Array(16000) })),
    createBufferSource: jest.fn(() => source),
    createBiquadFilter: jest.fn(() => ({
      frequency: { setValueAtTime: jest.fn() },
      connect: jest.fn(),
    })),
    close: jest.fn(),
  }));
  render(<App />);
  const navigation = await screen.findByRole('navigation', { name: 'Asosiy menyu' });
  fireEvent.click(within(navigation).getByRole('button', { name: /diqqat vaqti/i }));
  fireEvent.click(await screen.findByRole('button', { name: 'Boshlash' }));

  await waitFor(() => expect(source.start).toHaveBeenCalled());
  fireEvent.click(screen.getByRole('button', { name: 'Pauza' }));
  expect(source.stop).toHaveBeenCalled();
});

test('focus timer saves custom durations and alarm preference', async () => {
  render(<App />);
  const navigation = await screen.findByRole('navigation', { name: 'Asosiy menyu' });
  fireEvent.click(within(navigation).getByRole('button', { name: /diqqat vaqti/i }));
  fireEvent.change(await screen.findByLabelText('Fokus davomiyligi'), { target: { value: '37' } });
  fireEvent.change(screen.getByLabelText('Tanaffus davomiyligi'), { target: { value: '12' } });
  fireEvent.click(screen.getByLabelText('Ohang'));
  fireEvent.click(screen.getByRole('button', { name: 'Sozlamalarni saqlash' }));

  await waitFor(() => expect(updateDoc).toHaveBeenCalledWith(
    { name: 'users', id: 'user-1' },
    {
      focusDurationMinutes: 37,
      breakDurationMinutes: 12,
      focusAlarmSound: 'chime',
      focusBackgroundMusic: false,
      focusBackgroundTrack: 'ambient',
    },
  ));
  expect(await screen.findByRole('button', { name: 'Fokus · 37 daq' })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Tanaffus · 12 daq' }));
  expect(screen.getByRole('img', { name: '12:00 qoldi' })).toBeInTheDocument();

  fireEvent.change(screen.getByLabelText('Tanaffus davomiyligi'), { target: { value: '1' } });
  fireEvent.click(screen.getByRole('button', { name: 'Sozlamalarni saqlash' }));
  await waitFor(() => expect(updateDoc).toHaveBeenLastCalledWith(
    { name: 'users', id: 'user-1' },
    {
      focusDurationMinutes: 37,
      breakDurationMinutes: 1,
      focusAlarmSound: 'chime',
      focusBackgroundMusic: false,
      focusBackgroundTrack: 'ambient',
    },
  ));

  const createOscillator = jest.fn(() => ({
    frequency: { setValueAtTime: jest.fn() },
    connect: jest.fn(),
    start: jest.fn(),
    stop: jest.fn(),
  }));
  window.AudioContext = jest.fn(() => ({
    state: 'running',
    currentTime: 0,
    destination: {},
    createOscillator,
    createGain: () => ({
      gain: { setValueAtTime: jest.fn(), exponentialRampToValueAtTime: jest.fn() },
      connect: jest.fn(),
    }),
    close: jest.fn(),
  }));
  jest.useFakeTimers();
  fireEvent.click(screen.getByRole('button', { name: 'Boshlash' }));
  act(() => jest.advanceTimersByTime(60 * 1000));
  expect(createOscillator).toHaveBeenCalledTimes(3);
  expect(screen.getByRole('img', { name: '01:00 qoldi' })).toBeInTheDocument();
});

test('changing the language in settings updates the whole app and persists the preference', async () => {
  const descriptionMeta = document.createElement('meta');
  descriptionMeta.name = 'description';
  document.head.appendChild(descriptionMeta);
  render(<App />);
  const navigation = await screen.findByRole('navigation', { name: 'Asosiy menyu' });
  await navigateToPage(navigation, 'Sozlamalar', 'settings');

  fireEvent.change(await screen.findByRole('combobox', { name: 'Ilova tili' }), { target: { value: 'en' } });
  await waitFor(() => expect(updateDoc).toHaveBeenCalledWith(
    { name: 'users', id: 'user-1' },
    { language: 'en' },
  ));
  expect(await screen.findByRole('heading', { name: 'App language' })).toBeInTheDocument();
  expect(screen.getByRole('navigation', { name: 'Main menu' })).toHaveTextContent('Tasks');
  expect(document.documentElement).toHaveAttribute('lang', 'en');
  expect(document.title).toBe('CTRL App — Take control of your life');
  expect(document.querySelector('meta[name="description"]')).toHaveAttribute(
    'content',
    'CTRL App — an app for managing daily tasks, habits, and focus.',
  );

  fireEvent.click(document.querySelector('.language-menu > summary'));
  fireEvent.click(screen.getByRole('button', { name: 'Uzbek' }));
  await waitFor(() => expect(updateDoc).toHaveBeenLastCalledWith(
    { name: 'users', id: 'user-1' },
    { language: 'uz' },
  ));
  expect(await screen.findByRole('heading', { name: 'Ilova tili' })).toBeInTheDocument();
  expect(document.documentElement).toHaveAttribute('lang', 'uz');
  expect(descriptionMeta).toHaveAttribute(
    'content',
    'CTRL App — kundalik vazifalar, odatlar va fokusni boshqarish ilovasi.',
  );
  descriptionMeta.remove();
});
