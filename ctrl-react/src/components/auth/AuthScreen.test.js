import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { sendPasswordResetEmail } from 'firebase/auth';
import { googleProvider, signInWithPopup } from '../../firebase';
import AuthScreen from './AuthScreen';

jest.mock('../../firebase', () => ({
  auth: {},
  db: {},
  googleProvider: {},
  signInWithPopup: jest.fn(),
}));

jest.mock('firebase/auth', () => ({
  createUserWithEmailAndPassword: jest.fn(),
  sendPasswordResetEmail: jest.fn(),
  signInWithEmailAndPassword: jest.fn(),
  updateProfile: jest.fn(),
}));

jest.mock('firebase/firestore', () => ({
  doc: jest.fn(),
  setDoc: jest.fn(),
}));

beforeEach(() => {
  jest.clearAllMocks();
  sendPasswordResetEmail.mockResolvedValue();
});

test('Google sign-in calls Firebase and reports the authenticated profile', async () => {
  signInWithPopup.mockResolvedValue({
    user: { uid: 'google-user', email: 'google@example.com', displayName: 'Google User' },
  });
  const onAuthenticated = jest.fn();
  render(<AuthScreen onAuthenticated={onAuthenticated} />);
  fireEvent.click(screen.getByRole('button', { name: 'Google orqali davom etish' }));

  await waitFor(() => {
    expect(signInWithPopup).toHaveBeenCalledWith({}, googleProvider);
    expect(onAuthenticated).toHaveBeenCalledWith({
      uid: 'google-user',
      email: 'google@example.com',
      firstName: 'Google',
      lastName: 'User',
    });
  });
});

test('Google sign-in shows a cancellation message when the popup fails', async () => {
  signInWithPopup.mockRejectedValue({ code: 'auth/popup-closed-by-user' });
  render(<AuthScreen />);
  fireEvent.click(screen.getByRole('button', { name: 'Google orqali davom etish' }));

  expect(await screen.findByRole('alert')).toHaveTextContent('Google bilan kirish bekor qilindi');
});

async function openLoginResetModal() {
  render(<AuthScreen />);
  fireEvent.click(screen.getByRole('button', { name: 'Kirish' }));
  await screen.findByRole('button', { name: 'Parolni unutdingizmi?' });
  fireEvent.click(screen.getByRole('button', { name: 'Parolni unutdingizmi?' }));
  return screen.getByRole('dialog');
}

test('forgot password opens a modal and sends a reset link to the entered email', async () => {
  const dialog = await openLoginResetModal();
  const emailInput = within(dialog).getByLabelText('E-mail manzil');
  fireEvent.change(emailInput, { target: { value: 'person@example.com' } });
  fireEvent.click(within(dialog).getByRole('button', { name: 'Tiklash havolasini yuborish' }));

  await waitFor(() => {
    expect(sendPasswordResetEmail).toHaveBeenCalledWith({}, 'person@example.com');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent(
      'Parolni tiklash havolasi emailingizga yuborildi. Iltimos, pochtangizni tekshiring.',
    );
  });
});

test('forgot password displays a helpful error when the account is not found', async () => {
  sendPasswordResetEmail.mockRejectedValue({ code: 'auth/user-not-found' });
  const dialog = await openLoginResetModal();
  fireEvent.change(within(dialog).getByLabelText('E-mail manzil'), { target: { value: 'unknown@example.com' } });
  fireEvent.click(within(dialog).getByRole('button', { name: 'Tiklash havolasini yuborish' }));

  expect(await within(dialog).findByRole('alert')).toHaveTextContent('Bunday email topilmadi.');
  expect(screen.getByRole('dialog')).toBeInTheDocument();
});
