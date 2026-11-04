import { fireEvent, render, screen } from '@testing-library/react';
import OverviewPage from './OverviewPage';
import { getDailyMotivation } from '../../utils/motivation';

const data = { todos: [], habits: [], routine: {} };
const stats = { done: 0, pending: 0, completedHabits: 0, focusMinutes: 0 };

test('shows dashboard statistic skeletons while data is loading', () => {
  const { container } = render(
    <OverviewPage user={{ firstName: 'Aziza' }} data={data} stats={stats} onNavigate={jest.fn()} isLoading />,
  );

  expect(screen.getByRole('status', { name: 'Dashboard ma’lumotlari yuklanmoqda' })).toBeInTheDocument();
  expect(container.querySelectorAll('.overview-skeleton-stat')).toHaveLength(4);
  expect(container.querySelector('.page-content')).toHaveClass('page-content-loading');
});

test('uses the statistic cards for navigation instead of the quick access section', () => {
  const onNavigate = jest.fn();
  render(<OverviewPage user={{ firstName: 'Aziza' }} data={data} stats={stats} onNavigate={onNavigate} />);

  fireEvent.click(screen.getByRole('button', { name: 'Vazifalar sahifasini ochish' }));
  expect(onNavigate).toHaveBeenLastCalledWith('todo');
  fireEvent.click(screen.getByRole('button', { name: 'Odatlar sahifasini ochish' }));
  expect(onNavigate).toHaveBeenLastCalledWith('habits');
  fireEvent.click(screen.getByRole('button', { name: 'Diqqat vaqti sahifasini ochish' }));
  expect(onNavigate).toHaveBeenLastCalledWith('focus');
  fireEvent.click(screen.getByRole('button', { name: 'Ochiq vazifalar sahifasini ochish' }));
  expect(onNavigate).toHaveBeenLastCalledWith('todo');
  expect(screen.queryByText('TEZKOR KIRISH')).not.toBeInTheDocument();
});

test('shows a themed activity heatmap with accessible daily totals', () => {
  const today = new Date();
  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  render(
    <OverviewPage
      user={{ firstName: 'Aziza' }}
      data={{ todos: [], habits: [], routine: { [todayKey]: [{ done: true }, { done: true }] } }}
      stats={stats}
      onNavigate={jest.fn()}
    />,
  );

  expect(screen.getByRole('group', { name: 'Oxirgi olti oydagi kundalik faollik xaritasi' })).toBeInTheDocument();
  expect(screen.getByLabelText('2 ta bajarilgan ish · ' + new Intl.DateTimeFormat('uz-UZ', { dateStyle: 'long' }).format(today))).toHaveClass('activity-level-2');
  expect(document.querySelectorAll('.activity-cell')).toHaveLength(26 * 7 + 4);
});

test('shows the daily motivation below dashboard activity', () => {
  render(<OverviewPage user={{ firstName: 'Aziza' }} data={data} stats={stats} onNavigate={jest.fn()} />);

  expect(screen.getByRole('complementary', { name: 'BUGUNGI ILHOM' })).toHaveTextContent(getDailyMotivation());
});
