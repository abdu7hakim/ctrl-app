import { fireEvent, render, screen } from '@testing-library/react';
import DashboardLayout from '../components/layout/DashboardLayout';
import SettingsPage from '../components/settings/SettingsPage';
import { getStoredLanguage, saveStoredLanguage, translate } from './language';

test('translates app copy to English and keeps Uzbek as the default', () => {
  expect(translate('Vazifalar', 'en')).toBe('Tasks');
  expect(translate('Vazifalar', 'uz')).toBe('Vazifalar');
  expect(translate('Untranslated user content', 'en')).toBe('Untranslated user content');
});

test('persists supported language choices in browser storage', () => {
  saveStoredLanguage('en');
  expect(getStoredLanguage()).toBe('en');
  saveStoredLanguage('uz');
  expect(getStoredLanguage()).toBe('uz');
  expect(() => saveStoredLanguage('fr')).toThrow('Noma’lum til.');
});

test('shows English navigation and lets the header switch the app language', () => {
  const onChangeLanguage = jest.fn();
  render(
    <DashboardLayout
      user={{ firstName: 'Ada', lastName: 'Lovelace' }}
      page="dashboard"
      darkMode={false}
      themeSaving={false}
      language="en"
      onChangeLanguage={onChangeLanguage}
      onNavigate={jest.fn()}
      onToggleTheme={jest.fn()}
      onLogout={jest.fn()}
    >
      <div />
    </DashboardLayout>,
  );

  expect(screen.getByRole('heading', { name: 'Overview' })).toBeInTheDocument();
  expect(screen.getByRole('navigation', { name: 'Main menu' })).toHaveTextContent('Tasks');
  fireEvent.click(document.querySelector('.language-menu > summary'));
  fireEvent.click(screen.getByRole('button', { name: 'Uzbek' }));
  expect(onChangeLanguage).toHaveBeenCalledWith('uz');
});

test('provides a language selector in English settings', () => {
  const onChangeLanguage = jest.fn();
  render(
    <SettingsPage
      darkMode={false}
      themeSaving={false}
      colorTheme="violet"
      language="en"
      onChangeLanguage={onChangeLanguage}
      onToggleTheme={jest.fn()}
      onSelectColorTheme={jest.fn()}
    />,
  );

  expect(screen.getByText('Choose the language used throughout the app. Your choice is saved to your account.')).toBeInTheDocument();
  fireEvent.change(screen.getByRole('combobox', { name: 'App language' }), { target: { value: 'uz' } });
  expect(onChangeLanguage).toHaveBeenCalledWith('uz');
});
