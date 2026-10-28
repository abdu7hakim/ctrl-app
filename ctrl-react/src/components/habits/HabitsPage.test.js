import { act, fireEvent, render, screen } from '@testing-library/react';
import HabitsPage from './HabitsPage';

const dateKey = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

afterEach(() => {
  jest.useRealTimers();
});

test('shows separate weekly progress and excludes days before a habit was created', () => {
  jest.useFakeTimers().setSystemTime(new Date(2026, 9, 28, 12));
  const today = new Date();
  const monday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 2);
  const habits = [
    {
      id: 'older-habit',
      name: 'Kitob o‘qish',
      color: '#7157e8',
      createdAt: monday.toISOString(),
      completions: {
        [dateKey(monday)]: true,
        [dateKey(today)]: true,
      },
    },
    {
      id: 'new-habit',
      name: 'Yangi odat',
      color: '#e47070',
      createdAt: today.toISOString(),
      completions: { [dateKey(today)]: true },
    },
  ];

  render(<HabitsPage habits={habits} onChange={jest.fn()} />);

  expect(screen.queryByText('Haftalik natija')).not.toBeInTheDocument();
  expect(screen.getByText('Hafta 2/3 kun')).toBeInTheDocument();
  expect(screen.getByText('Hafta 1/1 kun')).toBeInTheDocument();
  expect(screen.getByLabelText('Kitob o‘qish: haftalik progress')).toHaveAttribute('aria-valuenow', '67');
  expect(screen.getByLabelText('Yangi odat: haftalik progress')).toHaveAttribute('aria-valuenow', '100');
  expect(screen.getByLabelText('Yangi odat, Dushanba: odat mavjud emas')).toBeInTheDocument();
  expect(screen.getAllByText('1 kun', { selector: '.habit-streak' })).toHaveLength(2);
});

test('shows an illustrated prompt when there are no habits', () => {
  render(<HabitsPage habits={[]} onChange={jest.fn()} />);

  expect(screen.getByText('Hali odatlaringiz yo‘q. Eng kichik qadamdan boshlang!')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Birinchi odatni qo‘shish' }));
  expect(screen.getByLabelText('Odat nomi')).toHaveFocus();
});

test('creates a habit with a selected icon and selected weekdays', async () => {
  jest.useFakeTimers().setSystemTime(new Date(2026, 9, 28, 12));
  const onChange = jest.fn().mockResolvedValue();
  render(<HabitsPage habits={[]} onChange={onChange} />);

  fireEvent.change(screen.getByLabelText('Odat nomi'), { target: { value: 'Yugurish' } });
  fireEvent.change(screen.getByLabelText('Nega men bu odatni qilmoqchiman? (ixtiyoriy)'), { target: { value: 'Sog‘lom bo‘lish uchun' } });
  fireEvent.click(screen.getByRole('button', { name: 'Sport' }));
  ['Dushanba', 'Seshanba', 'Payshanba', 'Juma', 'Shanba', 'Yakshanba'].forEach((day) => {
    fireEvent.click(screen.getByRole('button', { name: day }));
  });
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: 'Odat qo‘shish' }));
    await Promise.resolve();
  });

  expect(onChange).toHaveBeenCalledWith([
    expect.objectContaining({
      name: 'Yugurish',
      reason: 'Sog‘lom bo‘lish uchun',
      icon: '🏃',
      frequency: [2],
    }),
  ]);
  jest.useRealTimers();
});

test('edits a habit name, goal, icon, and frequency', async () => {
  const onChange = jest.fn().mockResolvedValue();
  const habit = {
    id: 'habit-edit',
    name: 'Kitob',
    goal: '10 bet',
    color: '#7157e8',
    icon: '📚',
    frequency: [0, 1, 2, 3, 4, 5, 6],
    completions: {},
  };
  render(<HabitsPage habits={[habit]} onChange={onChange} />);

  fireEvent.click(screen.getByRole('button', { name: 'Kitob odatini tahrirlash' }));
  fireEvent.change(screen.getByLabelText('Odat nomi'), { target: { value: 'Yangi kitob' } });
  fireEvent.change(screen.getByLabelText('Maqsad (ixtiyoriy)'), { target: { value: '20 bet' } });
  fireEvent.change(screen.getByLabelText('Nega men bu odatni qilmoqchiman? (ixtiyoriy)'), { target: { value: 'Bilimimni oshirish uchun' } });
  fireEvent.click(screen.getByRole('button', { name: 'Yozish' }));
  fireEvent.click(screen.getByRole('button', { name: 'Dushanba' }));
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: 'O‘zgarishlarni saqlash' }));
    await Promise.resolve();
  });

  expect(onChange).toHaveBeenCalledWith([
    expect.objectContaining({
      id: 'habit-edit',
      name: 'Yangi kitob',
      goal: '20 bet',
      reason: 'Bilimimni oshirish uchun',
      icon: '✍️',
      frequency: [1, 2, 3, 4, 5, 6],
      completions: {},
    }),
  ]);
});

test('weekly progress counts only scheduled days', () => {
  jest.useFakeTimers().setSystemTime(new Date(2026, 9, 28, 12));
  const monday = new Date(2026, 9, 26, 12);
  const today = new Date();
  const habit = {
    id: 'habit-frequency',
    name: 'Sport',
    color: '#39a982',
    createdAt: monday.toISOString(),
    frequency: [0, 2, 4],
    completions: { [dateKey(today)]: true },
  };
  render(<HabitsPage habits={[habit]} onChange={jest.fn()} />);

  expect(screen.getByText('Hafta 1/2 kun')).toBeInTheDocument();
  expect(screen.getByLabelText('Sport: haftalik progress')).toHaveAttribute('aria-valuenow', '50');
  expect(screen.getByLabelText('Sport, Seshanba: rejalashtirilmagan kun')).toBeInTheDocument();
  jest.useRealTimers();
});

test('highlights a seven-day streak, awards the formed-habit badge, and shows the reason', () => {
  jest.useFakeTimers().setSystemTime(new Date(2026, 9, 28, 12));
  const today = new Date();
  const createCompletions = (length) => Object.fromEntries(
    Array.from({ length }, (_, index) => {
      const date = new Date(today.getFullYear(), today.getMonth(), today.getDate() - index);
      return [dateKey(date), true];
    }),
  );
  const habits = [
    {
      id: 'seven-day-streak',
      name: 'Yetti kunlik odat',
      createdAt: new Date(2026, 9, 1).toISOString(),
      frequency: [0, 1, 2, 3, 4, 5, 6],
      completions: createCompletions(7),
    },
    {
      id: 'formed-habit',
      name: 'Yigirma bir kunlik odat',
      reason: 'O‘zimni yaxshi his qilish uchun',
      createdAt: new Date(2026, 9, 1).toISOString(),
      frequency: [0, 1, 2, 3, 4, 5, 6],
      completions: createCompletions(21),
    },
  ];

  render(<HabitsPage habits={habits} onChange={jest.fn()} />);

  expect(screen.getByLabelText('7 kun davomiylik')).toHaveClass('habit-streak-week');
  expect(screen.getByLabelText('21 kun davomiylik')).toHaveClass('habit-streak-week');
  expect(screen.getByText('Odat shakllandi')).toBeInTheDocument();
  expect(screen.getByText('O‘zimni yaxshi his qilish uchun')).toBeInTheDocument();
  expect(screen.getByRole('img', { name: /Yigirma bir kunlik odat: oylik hisobot/ })).toBeInTheDocument();
  jest.useRealTimers();
});
