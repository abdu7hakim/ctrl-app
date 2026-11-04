import { fireEvent, render, screen } from '@testing-library/react';
import { useNotifications } from '../../hooks/useNotifications';
import SettingsPage from './SettingsPage';

jest.mock('../../hooks/useNotifications', () => ({
  useNotifications: jest.fn(),
}));

function renderSettings() {
  return render(
    <SettingsPage
      userId="user-123"
      darkMode={false}
      themeSaving={false}
      colorTheme="violet"
      language="en"
      onChangeLanguage={jest.fn()}
      onToggleTheme={jest.fn()}
      onSelectColorTheme={jest.fn()}
    />,
  );
}

test('notification card offers Enable and requests permission when clicked', () => {
  const requestNotifications = jest.fn();
  useNotifications.mockReturnValue({
    requestNotifications,
    isRequesting: false,
    error: '',
    success: '',
    permission: 'default',
  });

  renderSettings();

  expect(screen.getByRole('heading', { name: 'Browser Notifications' })).toBeInTheDocument();
  expect(screen.getByText('Get reminders for your tasks and Pomodoro sessions.')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Enable' }));
  expect(requestNotifications).toHaveBeenCalledTimes(1);
});

test('notification card shows Enabled when browser permission is granted', () => {
  useNotifications.mockReturnValue({
    requestNotifications: jest.fn(),
    isRequesting: false,
    error: '',
    success: '',
    permission: 'granted',
  });

  renderSettings();

  expect(screen.getByText('Enabled')).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Enable' })).not.toBeInTheDocument();
});

test('notification card shows Blocked when browser permission is denied', () => {
  useNotifications.mockReturnValue({
    requestNotifications: jest.fn(),
    isRequesting: false,
    error: '',
    success: '',
    permission: 'denied',
  });

  renderSettings();

  expect(screen.getByText('Blocked')).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Enable' })).not.toBeInTheDocument();
});
