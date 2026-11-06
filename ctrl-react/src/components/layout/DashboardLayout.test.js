import { fireEvent, render, screen, within } from '@testing-library/react';
import DashboardLayout from './DashboardLayout';

test('logout stays in the sidebar and is not added to mobile navigation', () => {
  const onLogout = jest.fn();
  render(
    <DashboardLayout
      user={{ uid: 'user-1', firstName: 'Aziza', lastName: 'Aliyeva' }}
      page="dashboard"
      darkMode={false}
      themeSaving={false}
      onNavigate={jest.fn()}
      onToggleTheme={jest.fn()}
      onLogout={onLogout}
      onChangeLanguage={jest.fn()}
    >
      <div />
    </DashboardLayout>,
  );

  const sidebar = within(screen.getByRole('complementary'));
  fireEvent.click(sidebar.getByRole('button', { name: 'Chiqish' }));

  expect(onLogout).toHaveBeenCalledTimes(1);
  expect(within(screen.getByRole('navigation', { name: 'Mobil navigatsiya' })).queryByRole('button', { name: 'Chiqish' })).not.toBeInTheDocument();
});

test('scrolls to the top when navigating to another page', () => {
  const props = {
    user: { uid: 'user-1', firstName: 'Aziza', lastName: 'Aliyeva' },
    darkMode: false,
    themeSaving: false,
    onNavigate: jest.fn(),
    onToggleTheme: jest.fn(),
    onLogout: jest.fn(),
    onChangeLanguage: jest.fn(),
  };
  const { rerender } = render(<DashboardLayout {...props} page="dashboard"><div /></DashboardLayout>);

  document.documentElement.scrollTop = 500;
  document.body.scrollTop = 500;
  rerender(<DashboardLayout {...props} page="todo"><div /></DashboardLayout>);

  expect(document.documentElement.scrollTop).toBe(0);
  expect(document.body.scrollTop).toBe(0);
});
