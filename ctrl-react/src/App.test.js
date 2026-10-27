import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { addDoc, collection, doc, getDoc, increment, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import AuthScreen from './components/auth/AuthScreen';
import App from './App';

jest.mock('./firebase', () => ({
  auth: { currentUser: { uid: 'user-1' } },
  db: {},
}));

jest.mock('firebase/auth', () => ({
  onAuthStateChanged: jest.fn(),
  signOut: jest.fn().mockResolvedValue(),
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
};

beforeEach(() => {
  jest.clearAllMocks();
  doc.mockImplementation((_db, name, id) => ({ name, id }));
  collection.mockImplementation((_db, name) => ({ name }));
  increment.mockImplementation((amount) => ({ increment: amount }));
  serverTimestamp.mockReturnValue('server-timestamp');
  updateDoc.mockResolvedValue();
  setDoc.mockResolvedValue();
  addDoc.mockResolvedValue({ id: 'message-1' });
  createUserWithEmailAndPassword.mockResolvedValue({
    user: { uid: 'new-user', email: 'new@example.com' },
  });
  getDoc.mockResolvedValue({ exists: () => true, data: () => storedData });
  onAuthStateChanged.mockImplementation((_auth, callback) => {
    callback({ uid: 'user-1', email: 'aziza@example.com', displayName: 'Aziza Aliyeva' });
    return jest.fn();
  });
});

afterEach(() => {
  jest.useRealTimers();
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

test('todo creation, completion, and deletion are persisted to the signed-in user document', async () => {
  await openPage('Vazifalar');
  fireEvent.change(screen.getByLabelText('Vazifa nomi'), { target: { value: 'React o‘rganish' } });
  fireEvent.click(screen.getByRole('button', { name: /vazifa yaratish/i }));

  expect(await screen.findByText('React o‘rganish')).toBeInTheDocument();
  expect(updateDoc).toHaveBeenLastCalledWith(
    doc(expect.anything(), 'users', 'user-1'),
    expect.objectContaining({ todos: expect.arrayContaining([expect.objectContaining({ title: 'React o‘rganish', status: 'open' })]) }),
  );

  fireEvent.click(screen.getByRole('button', { name: 'React o‘rganish vazifasini tahrirlash' }));
  fireEvent.change(screen.getByLabelText('Vazifa nomini tahrirlash'), { target: { value: 'React ilovasini o‘rganish' } });
  fireEvent.click(screen.getByRole('button', { name: 'Vazifa tahririni saqlash' }));
  expect(await screen.findByText('React ilovasini o‘rganish')).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: 'Bajarildi deb belgilash' }));
  expect(await screen.findByRole('button', { name: 'Bajarilmagan deb belgilash' })).toBeInTheDocument();
  expect(updateDoc).toHaveBeenLastCalledWith(
    expect.anything(),
    expect.objectContaining({ todos: expect.arrayContaining([expect.objectContaining({ status: 'done' })]) }),
  );

  fireEvent.click(screen.getByRole('button', { name: 'React ilovasini o‘rganish vazifasini o‘chirish' }));
  expect(await screen.findByText('Bu ro‘yxatda hali vazifa yo‘q.')).toBeInTheDocument();
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
