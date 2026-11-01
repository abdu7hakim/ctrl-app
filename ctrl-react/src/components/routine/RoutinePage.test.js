import { act, fireEvent, render, screen } from '@testing-library/react';
import RoutinePage from './RoutinePage';

afterEach(() => {
  jest.useRealTimers();
});

const renderEnglishRoutine = (props = {}) => render(<RoutinePage language="en" {...props} />);

test('marks routine dates in the calendar and changes the visible date', () => {
  renderEnglishRoutine();

  const today = new Date();
  const todayButton = screen.getByRole('button', {
    name: today.toLocaleDateString('en-US', { dateStyle: 'full' }),
  });

  expect(screen.getByRole('button', { name: 'Mark complete: Morning stretch' })).toBeInTheDocument();
  expect(todayButton.querySelector('.routine-calendar-dot')).toBeInTheDocument();
  fireEvent.click(todayButton);
  expect(todayButton).toHaveAttribute('aria-pressed', 'true');
  expect(screen.getByText('Review priorities')).toBeInTheDocument();
});

test('renders routine controls in Uzbek when Uzbek is selected', () => {
  render(<RoutinePage routines={{}} routineBadges={[]} onSave={jest.fn()} language="uz" />);

  expect(screen.getByRole('heading', { name: 'Taqvim' })).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'Hafta kunlarini tanlang' })).toBeInTheDocument();
  expect(screen.getByLabelText('Boshlanish sanasi')).toBeInTheDocument();
  expect(screen.getByLabelText('Yangi vazifa qo‘shish...')).toBeInTheDocument();
  expect(screen.queryByText('Save Routine')).not.toBeInTheDocument();
});

test('shows an inclusive date range and adds a task to the selected day', () => {
  renderEnglishRoutine();

  const today = new Date();
  const rangeEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 2);
  const dateKey = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  fireEvent.change(screen.getByLabelText('Start date'), { target: { value: dateKey(today) } });
  fireEvent.change(screen.getByLabelText('End date'), { target: { value: dateKey(rangeEnd) } });
  expect(document.querySelector('.routine-range-note').textContent).toBe('Routine will apply for 3 days.');

  fireEvent.change(screen.getByLabelText('Task time'), { target: { value: '07:30' } });
  fireEvent.change(screen.getByLabelText('Add a new task...'), { target: { value: 'Morning walk' } });
  fireEvent.submit(screen.getByLabelText('Add a new task...').closest('form'));

  expect(screen.getByText('Morning walk')).toBeInTheDocument();
  expect(screen.getAllByText('General').find((element) => element.classList.contains('routine-badge'))).toHaveClass('routine-badge-slate');
  fireEvent.click(screen.getByRole('button', { name: 'Mark complete: Morning walk' }));
  expect(screen.getByRole('button', { name: 'Mark incomplete: Morning walk' })).toHaveAttribute('aria-pressed', 'true');
});

test('assigns the selected badge color to a new task', () => {
  renderEnglishRoutine();

  fireEvent.change(screen.getByLabelText('Task badge'), { target: { value: 'Health' } });
  fireEvent.change(screen.getByLabelText('Add a new task...'), { target: { value: 'Drink water' } });
  fireEvent.submit(screen.getByLabelText('Add a new task...').closest('form'));

  expect(screen.getByText('Drink water')).toBeInTheDocument();
  expect(screen.getAllByText('Health').find((element) => element.classList.contains('routine-badge'))).toHaveClass('routine-badge-emerald');
});

test('shows only tasks for the selected date and an empty state for dates without tasks', () => {
  jest.useFakeTimers().setSystemTime(new Date(2026, 9, 31, 12));
  renderEnglishRoutine();

  const today = new Date();
  const nextMonthFirst = new Date(today.getFullYear(), today.getMonth() + 1, 1);
  fireEvent.click(screen.getByRole('button', { name: 'Next month' }));
  fireEvent.click(screen.getByRole('button', {
    name: nextMonthFirst.toLocaleDateString('en-US', { dateStyle: 'full' }),
  }));
  expect(screen.getByText('No routine for this day')).toBeInTheDocument();

  fireEvent.change(screen.getByLabelText('Add a new task...'), { target: { value: 'Plan next month' } });
  fireEvent.submit(screen.getByLabelText('Add a new task...').closest('form'));
  expect(screen.getByText('Plan next month')).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: 'Previous month' }));
  fireEvent.click(screen.getByRole('button', {
    name: today.toLocaleDateString('en-US', { dateStyle: 'full' }),
  }));
  expect(screen.queryByText('Plan next month')).not.toBeInTheDocument();
  expect(screen.getByText('Morning stretch')).toBeInTheDocument();
});

test('copies the current routine to dates matching selected weekdays', async () => {
  jest.useFakeTimers().setSystemTime(new Date(2026, 9, 31, 12));
  renderEnglishRoutine();

  const nextMonthFirst = new Date(2026, 10, 1);
  const weekdayLabels = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const selectedWeekday = (nextMonthFirst.getDay() + 6) % 7;
  fireEvent.click(screen.getByRole('button', { name: weekdayLabels[selectedWeekday] }));
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: 'Save Routine' }));
    await Promise.resolve();
  });
  expect(screen.getByRole('status')).toHaveTextContent('Routine saved for');

  fireEvent.click(screen.getByRole('button', { name: 'Next month' }));
  fireEvent.click(screen.getByRole('button', { name: nextMonthFirst.toLocaleDateString('en-US', { dateStyle: 'full' }) }));
  expect(screen.getByText('Morning stretch')).toBeInTheDocument();
  expect(screen.getByRole('button', {
    name: nextMonthFirst.toLocaleDateString('en-US', { dateStyle: 'full' }),
  }).querySelector('.routine-calendar-dot')).toBeInTheDocument();
});

test('saves a routine to a date range without selecting weekdays', () => {
  jest.useFakeTimers().setSystemTime(new Date(2026, 9, 31, 12));
  renderEnglishRoutine();

  const nextMonthFirst = new Date(2026, 10, 1);
  const nextMonthSecond = new Date(2026, 10, 2);
  const nextMonthSecondKey = [
    nextMonthSecond.getFullYear(),
    String(nextMonthSecond.getMonth() + 1).padStart(2, '0'),
    String(nextMonthSecond.getDate()).padStart(2, '0'),
  ].join('-');

  fireEvent.click(screen.getByRole('button', { name: 'Next month' }));
  fireEvent.click(screen.getByRole('button', {
    name: nextMonthFirst.toLocaleDateString('en-US', { dateStyle: 'full' }),
  }));
  fireEvent.change(screen.getByLabelText('Add a new task...'), { target: { value: 'One day plan' } });
  fireEvent.submit(screen.getByLabelText('Add a new task...').closest('form'));
  fireEvent.change(screen.getByLabelText('Start date'), { target: { value: nextMonthSecondKey } });
  fireEvent.change(screen.getByLabelText('End date'), { target: { value: nextMonthSecondKey } });
  fireEvent.click(screen.getByRole('button', { name: 'Save Routine' }));

  const targetDayButton = screen.getByRole('button', {
    name: nextMonthSecond.toLocaleDateString('en-US', { dateStyle: 'full' }),
  });
  expect(targetDayButton.querySelector('.routine-calendar-dot')).toBeInTheDocument();
  fireEvent.click(targetDayButton);
  expect(screen.getByText('One day plan')).toBeInTheDocument();
});

test('creates a custom badge and uses it on a new task', async () => {
  renderEnglishRoutine();

  fireEvent.click(screen.getByRole('button', { name: 'Add badge' }));
  fireEvent.change(screen.getByLabelText('New badge name'), { target: { value: 'Learning' } });
  fireEvent.change(screen.getByLabelText('New badge color'), { target: { value: 'indigo' } });
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: 'Create badge' }));
    await Promise.resolve();
  });
  expect(screen.getByLabelText('Task badge')).toHaveValue('Learning');

  fireEvent.change(screen.getByLabelText('Add a new task...'), { target: { value: 'Study Spanish' } });
  fireEvent.submit(screen.getByLabelText('Add a new task...').closest('form'));
  const learningBadge = screen.getByText('Learning', { selector: '.routine-badge' });
  expect(learningBadge).toHaveClass('routine-badge-indigo');
});

test('places the task entry controls in a new editable table row', () => {
  renderEnglishRoutine();

  const taskInput = screen.getByLabelText('Add a new task...');
  expect(taskInput).toHaveAttribute('placeholder', 'Type a task...');
  expect(taskInput.closest('[role="row"]')).toBeInTheDocument();
  expect(taskInput.closest('[role="table"]')).toBeInTheDocument();
});

test('reveals task actions on selection and edits the task inline', () => {
  renderEnglishRoutine();

  expect(screen.queryByRole('button', { name: 'Edit' })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Morning stretch' }));
  fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
  fireEvent.change(screen.getByLabelText('Edit task'), { target: { value: 'Morning yoga' } });
  fireEvent.change(screen.getByLabelText('Edit task time'), { target: { value: '08:30' } });
  fireEvent.change(screen.getByLabelText('Edit task badge'), { target: { value: 'Personal' } });
  fireEvent.click(screen.getByRole('button', { name: 'Save task edit' }));

  expect(screen.getByText('Morning yoga')).toBeInTheDocument();
  expect(screen.queryByText('Morning stretch')).not.toBeInTheDocument();
  expect(screen.getByText('08:30')).toBeInTheDocument();
  expect(screen.getAllByText('Personal').find((element) => element.classList.contains('routine-badge'))).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Edit' })).not.toBeInTheDocument();
});

test('deletes a task from its revealed row actions', () => {
  renderEnglishRoutine();

  fireEvent.click(screen.getByRole('button', { name: 'Morning stretch' }));
  fireEvent.click(screen.getByRole('button', { name: 'Delete' }));

  expect(screen.queryByText('Morning stretch')).not.toBeInTheDocument();
  expect(screen.getByText('Review priorities')).toBeInTheDocument();
});

test('confirms custom badge deletion and moves its tasks to General', () => {
  const today = new Date();
  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  render(
    <RoutinePage
      routines={{
        [todayKey]: [
          { id: 'learning-task', time: '10:00', task: 'Study', category: 'Learning', done: false },
        ],
      }}
      routineBadges={[{ name: 'Learning', color: 'indigo' }]}
      language="en"
    />,
  );

  fireEvent.click(screen.getByRole('button', { name: 'Add badge' }));
  fireEvent.click(screen.getByRole('button', { name: 'Delete Learning badge' }));
  expect(screen.getByText('Tasks using this badge will become General.')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Delete' }));

  expect(screen.getByText('Study')).toBeInTheDocument();
  expect(screen.getAllByText('General').find((element) => element.classList.contains('routine-badge'))).toBeInTheDocument();
  expect(screen.queryByRole('option', { name: 'Learning' })).not.toBeInTheDocument();
});

test('persists task changes and custom badges through the provided save handler', async () => {
  const onSave = jest.fn().mockResolvedValue();
  renderEnglishRoutine({ routines: {}, routineBadges: [], onSave });

  fireEvent.change(screen.getByLabelText('Add a new task...'), { target: { value: 'Plan the day' } });
  await act(async () => {
    fireEvent.submit(screen.getByLabelText('Add a new task...').closest('form'));
    await Promise.resolve();
  });
  const currentDate = new Date();
  const todayKey = [
    currentDate.getFullYear(),
    String(currentDate.getMonth() + 1).padStart(2, '0'),
    String(currentDate.getDate()).padStart(2, '0'),
  ].join('-');
  expect(onSave).toHaveBeenLastCalledWith({
    routine: {
      [todayKey]: [expect.objectContaining({ task: 'Plan the day', category: 'General', done: false })],
    },
    routineBadges: [],
  });

  fireEvent.click(screen.getByRole('button', { name: 'Add badge' }));
  fireEvent.change(screen.getByLabelText('New badge name'), { target: { value: 'Learning' } });
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: 'Create badge' }));
    await Promise.resolve();
  });
  expect(onSave).toHaveBeenLastCalledWith({
    routine: expect.objectContaining({ [todayKey]: expect.any(Array) }),
    routineBadges: [{ name: 'Learning', color: 'slate' }],
  });
});

test('limits planning to three recent days and the allowed current-month window', () => {
  jest.useFakeTimers().setSystemTime(new Date(2026, 9, 31, 12));
  renderEnglishRoutine();

  fireEvent.click(screen.getByRole('button', { name: 'Next month' }));
  const allowedNextWeekDay = screen.getByRole('button', { name: 'Sunday, November 8, 2026' });
  expect(allowedNextWeekDay).toBeDisabled();
  expect(screen.queryByRole('table', { name: 'Daily routine' })).not.toBeInTheDocument();
  const allowedMonthEndDay = screen.getByRole('button', { name: 'Saturday, November 7, 2026' });
  fireEvent.click(allowedMonthEndDay);
  expect(allowedMonthEndDay).toHaveAttribute('aria-pressed', 'true');
  expect(screen.getByRole('table', { name: 'Daily routine' })).toBeInTheDocument();
  expect(screen.getByLabelText('Add a new task...')).toBeEnabled();
  expect(screen.getByRole('button', { name: 'Save Routine' })).toBeDisabled();
  expect(screen.getByLabelText('Start date')).toHaveAttribute('max', '2026-11-07');

  fireEvent.click(screen.getByRole('button', { name: 'Previous month' }));
  expect(screen.getByRole('button', { name: 'Wednesday, October 28, 2026' })).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Thursday, October 29, 2026' })).toBeEnabled();
  expect(screen.queryByRole('table', { name: 'Daily routine' })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Thursday, October 29, 2026' }));
  expect(screen.getByRole('table', { name: 'Daily routine' })).toBeInTheDocument();
  expect(screen.getByLabelText('Add a new task...')).toBeEnabled();
  expect(screen.getByRole('button', { name: 'Thursday, October 1, 2026' })).toBeDisabled();
  fireEvent.click(screen.getByRole('button', { name: 'Previous month' }));
  expect(screen.getByRole('button', { name: 'Tuesday, September 1, 2026' })).toBeDisabled();
  expect(screen.queryByRole('table', { name: 'Daily routine' })).not.toBeInTheDocument();
});

test('automatically removes routines older than the last three calendar days', () => {
  jest.useFakeTimers().setSystemTime(new Date(2026, 9, 31, 12));
  renderEnglishRoutine();

  fireEvent.change(screen.getByLabelText('Add a new task...'), { target: { value: 'Temporary routine' } });
  fireEvent.submit(screen.getByLabelText('Add a new task...').closest('form'));
  expect(screen.getByText('Temporary routine')).toBeInTheDocument();

  act(() => {
    jest.setSystemTime(new Date(2026, 10, 3, 12));
    jest.advanceTimersByTime(13 * 60 * 60 * 1000);
  });

  expect(screen.queryByText('Temporary routine')).not.toBeInTheDocument();
  expect(screen.queryByRole('table', { name: 'Daily routine' })).not.toBeInTheDocument();
});

test.each([
  {
    today: new Date(2027, 1, 28, 12),
    allowedDate: new Date(2027, 2, 7),
    blockedDate: new Date(2027, 2, 8),
    allowedMax: '2027-03-07',
  },
  {
    today: new Date(2027, 11, 31, 12),
    allowedDate: new Date(2028, 0, 7),
    blockedDate: new Date(2028, 0, 8),
    allowedMax: '2028-01-07',
  },
])('applies the month-end planning window dynamically for $today', ({ today, allowedDate, blockedDate, allowedMax }) => {
  jest.useFakeTimers().setSystemTime(today);
  renderEnglishRoutine();

  expect(screen.getByLabelText('End date')).toHaveAttribute('max', allowedMax);

  const weekdayLabels = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  fireEvent.click(screen.getByRole('button', { name: weekdayLabels[(allowedDate.getDay() + 6) % 7] }));
  fireEvent.click(screen.getByRole('button', { name: 'Save Routine' }));

  fireEvent.click(screen.getByRole('button', { name: 'Next month' }));
  const allowedDayButton = screen.getByRole('button', {
    name: allowedDate.toLocaleDateString('en-US', { dateStyle: 'full' }),
  });
  const blockedDayButton = screen.getByRole('button', {
    name: blockedDate.toLocaleDateString('en-US', { dateStyle: 'full' }),
  });
  expect(allowedDayButton.querySelector('.routine-calendar-dot')).toBeInTheDocument();
  expect(blockedDayButton.querySelector('.routine-calendar-dot')).not.toBeInTheDocument();
  expect(allowedDayButton).toBeEnabled();
  expect(blockedDayButton).toBeDisabled();
  fireEvent.click(blockedDayButton);
  expect(screen.queryByRole('table', { name: 'Daily routine' })).not.toBeInTheDocument();
  fireEvent.click(allowedDayButton);
  expect(screen.getByRole('table', { name: 'Daily routine' })).toBeInTheDocument();
});
