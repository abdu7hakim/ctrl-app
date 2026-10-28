import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { addDoc, collection, doc, getDoc, increment, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
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
import { createProfileImageDataUrl } from './utils/profileImage';
import { getDailyMotivation, motivationalQuotes } from './utils/motivation';
import { colorThemes } from './utils/themes';
import { getTodoDeadline, isTodoOverdue, isTodoUrgent } from './utils/todoDeadlines';
import { createFocusMusic, focusMusicOptions } from './utils/focusMusic';

const originalAudioContext = window.AudioContext;

jest.mock('./utils/profileImage', () => ({
  ...jest.requireActual('./utils/profileImage'),
  createProfileImageDataUrl: jest.fn(),
}));

jest.mock('./firebase', () => ({
  auth: { currentUser: { uid: 'user-1', email: 'aziza@example.com' } },
  db: {},
  storage: {},
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
  increment: jest.fn((amount) => ({ increment: amount })),
  serverTimestamp: jest.fn(() => 'server-timestamp'),
  setDoc: jest.fn().mockResolvedValue(),
  updateDoc: jest.fn().mockResolvedValue(),
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
  serverTimestamp.mockReturnValue('server-timestamp');
  updateDoc.mockResolvedValue();
  createProfileImageDataUrl.mockResolvedValue('data:image/jpeg;base64,local-avatar');
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
  fireEvent.click(within(navigation).getByRole('button', { name: new RegExp(name, 'i') }));
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

test('dashboard shows the formatted date in its banner without a duplicate header date', async () => {
  render(<App />);
  await screen.findByRole('navigation', { name: 'Asosiy menyu' });

  expect(screen.getByText(/^BUGUN · [A-Z][a-z]{2} \d{1,2}, \d{4}$/)).toBeInTheDocument();
  expect(document.querySelector('.topbar-date')).not.toBeInTheDocument();
});

test('todo creation, completion, and deletion are persisted to the signed-in user document', async () => {
  await openPage('Vazifalar');
  expect(screen.getAllByRole('heading', { name: 'Vazifalar' })).toHaveLength(1);
  expect(screen.getByText('Rejalaringizni yozib boring va har bir qadamni belgilang.')).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Vazifa nomi'), { target: { value: 'React o‘rganish' } });
  fireEvent.click(screen.getByRole('button', { name: /vazifa yaratish/i }));

  expect(await screen.findByRole('heading', { name: 'React o‘rganish' })).toBeInTheDocument();
  expect(updateDoc).toHaveBeenLastCalledWith(
    doc(expect.anything(), 'users', 'user-1'),
    expect.objectContaining({ todos: expect.arrayContaining([expect.objectContaining({ title: 'React o‘rganish', status: 'open' })]) }),
  );

  fireEvent.click(screen.getByRole('button', { name: 'React o‘rganish vazifasini tahrirlash' }));
  fireEvent.change(screen.getByLabelText('Vazifa nomini tahrirlash'), { target: { value: 'React ilovasini o‘rganish' } });
  fireEvent.click(screen.getByRole('button', { name: 'Vazifa tahririni saqlash' }));
  expect(await screen.findByRole('heading', { name: 'React ilovasini o‘rganish' })).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: 'Bajarildi deb belgilash' }));
  expect(await screen.findByRole('button', { name: 'Bajarilmagan deb belgilash' })).toBeInTheDocument();
  expect(updateDoc).toHaveBeenLastCalledWith(
    expect.anything(),
    expect.objectContaining({ todos: expect.arrayContaining([expect.objectContaining({ status: 'done' })]) }),
  );

  fireEvent.click(screen.getByRole('button', { name: 'React ilovasini o‘rganish vazifasini o‘chirish' }));
  expect(await screen.findByText('Bu ro‘yxatda hali vazifa yo‘q.')).toBeInTheDocument();
}, 10000);

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
  fireEvent.click(within(navigation).getByRole('button', { name: /vazifalar/i }));

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
  expect(updateDoc).toHaveBeenLastCalledWith(
    expect.anything(),
    expect.objectContaining({ habits: expect.arrayContaining([expect.objectContaining({ name: 'Ertalab sayr', completedToday: false })]) }),
  );
  fireEvent.click(screen.getByRole('button', { name: 'Bajarildi deb belgilash' }));
  expect(await screen.findByText('Bajarildi')).toBeInTheDocument();
  expect(updateDoc).toHaveBeenLastCalledWith(
    expect.anything(),
    expect.objectContaining({ habits: expect.arrayContaining([expect.objectContaining({ completedToday: true })]) }),
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

test('profile image upload saves a resized image locally without writing it to Firebase', async () => {
  await openPage('Profil');
  const uploadInput = screen.getByLabelText('Profil rasmini yuklash');
  const image = new File(['profile image'], 'profile.png', { type: 'image/png' });
  fireEvent.change(uploadInput, { target: { files: [image] } });

  expect(await screen.findByAltText('Aziza profil rasmi')).toBeInTheDocument();
  expect(createProfileImageDataUrl).toHaveBeenCalledWith(image);
  expect(window.localStorage.getItem('ctrl-profile-image-user-1')).toBe('data:image/jpeg;base64,local-avatar');
  expect(updateProfile).not.toHaveBeenCalledWith(expect.anything(), { photoURL: expect.anything() });
  expect(updateDoc).not.toHaveBeenCalledWith(expect.anything(), { photoURL: expect.anything() });
});

test('profile image is restored from local storage after loading the account', async () => {
  window.localStorage.setItem('ctrl-profile-image-user-1', 'data:image/jpeg;base64,saved-avatar');

  await openPage('Profil');

  expect(await screen.findByAltText('Aziza profil rasmi')).toHaveAttribute(
    'src',
    'data:image/jpeg;base64,saved-avatar',
  );
});

test('profile image does not fall back to a Firebase photo URL when no local image exists', async () => {
  getDoc.mockResolvedValue({
    exists: () => true,
    data: () => ({ ...storedData, photoURL: 'https://storage.example.com/previous-avatar' }),
  });
  onAuthStateChanged.mockImplementation((_auth, callback) => {
    callback({
      uid: 'user-1',
      email: 'aziza@example.com',
      displayName: 'Aziza Aliyeva',
      photoURL: 'https://storage.example.com/previous-auth-avatar',
    });
    return jest.fn();
  });

  await openPage('Profil');

  expect(screen.queryByAltText('Aziza profil rasmi')).not.toBeInTheDocument();
  expect(screen.getAllByText('AA').length).toBeGreaterThan(0);
});

test('profile image upload rejects unsupported image types', async () => {
  await openPage('Profil');
  const uploadInput = screen.getByLabelText('Profil rasmini yuklash');
  fireEvent.change(uploadInput, {
    target: { files: [new File(['not an image'], 'profile.gif', { type: 'image/gif' })] },
  });

  expect(await screen.findByRole('alert')).toHaveTextContent('Rasm JPG, PNG yoki WebP formatida bo‘lishi kerak.');
  expect(createProfileImageDataUrl).not.toHaveBeenCalled();
});

test('profile image upload rejects files larger than 5 MB', async () => {
  await openPage('Profil');
  const image = new File([new Uint8Array(5 * 1024 * 1024 + 1)], 'profile.png', { type: 'image/png' });
  fireEvent.change(screen.getByLabelText('Profil rasmini yuklash'), { target: { files: [image] } });

  expect(await screen.findByRole('alert')).toHaveTextContent('Rasm hajmi 5 MB dan oshmasligi kerak.');
  expect(createProfileImageDataUrl).not.toHaveBeenCalled();
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
  fireEvent.click(screen.getByRole('button', { name: 'Sozlamalar' }));
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
  await screen.findByRole('navigation', { name: 'Asosiy menyu' });
  fireEvent.click(screen.getByRole('button', { name: 'Sozlamalar' }));
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

test('daily motivation selects a stable quote from the 25-message collection', () => {
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
  fireEvent.click(within(navigation).getByRole('button', { name: /diqqat vaqti/i }));
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
  expect(updateDoc).toHaveBeenCalledWith(
    expect.anything(),
    { focusSessions: { increment: 1 }, focusMinutes: { increment: 25 } },
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
  fireEvent.click(within(navigation).getByRole('button', { name: /diqqat vaqti/i }));
  fireEvent.change(screen.getByLabelText('Fokus vazifasi'), { target: { value: 'todo-focus' } });

  expect(screen.getByText('Kitob o‘qish', { selector: 'strong' })).toBeInTheDocument();
  jest.useFakeTimers();
  fireEvent.click(screen.getByRole('button', { name: 'Boshlash' }));
  act(() => jest.advanceTimersByTime(60 * 1000));
  await act(async () => Promise.resolve());

  expect(updateDoc).toHaveBeenLastCalledWith(
    { name: 'users', id: 'user-1' },
    {
      focusSessions: { increment: 1 },
      focusMinutes: { increment: 1 },
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
  fireEvent.click(within(navigation).getByRole('button', { name: /diqqat vaqti/i }));
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

  expect(increment).toHaveBeenCalledTimes(2);
  expect(increment).toHaveBeenNthCalledWith(1, 1);
  expect(increment).toHaveBeenNthCalledWith(2, 1);
  jest.useRealTimers();
});

test('focus timer continues while navigating to another page and back', async () => {
  getDoc.mockResolvedValue({
    exists: () => true,
    data: () => ({ ...storedData, focusDurationMinutes: 1 }),
  });
  render(<App />);
  const navigation = await screen.findByRole('navigation', { name: 'Asosiy menyu' });
  fireEvent.click(within(navigation).getByRole('button', { name: /diqqat vaqti/i }));
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
  await screen.findByRole('navigation', { name: 'Asosiy menyu' });
  fireEvent.click(screen.getByRole('button', { name: 'Sozlamalar' }));

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
