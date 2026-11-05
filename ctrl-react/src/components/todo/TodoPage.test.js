import { render, screen } from '@testing-library/react';
import TodoPage from './TodoPage';

test('shows skeleton rows while todos are loading', () => {
  const { container } = render(<TodoPage todos={[]} onChange={jest.fn()} isLoading />);

  expect(screen.getByRole('status', { name: 'Vazifalar yuklanmoqda' })).toBeInTheDocument();
  expect(container.querySelectorAll('.todo-skeleton-row')).toHaveLength(4);
  expect(container.querySelector('.page-content')).toHaveClass('page-content-loading');
});

test('hides completed tasks older than seven days without hiding open tasks', () => {
  jest.useFakeTimers().setSystemTime(new Date(2026, 10, 5, 12));
  const { unmount } = render(
    <TodoPage
      todos={[
        { id: 'old-completed', title: 'Old completed task', status: 'done', completedAt: '2026-10-27' },
        { id: 'recent-completed', title: 'Recent completed task', status: 'done', completedAt: '2026-10-29' },
        { id: 'old-open', title: 'Old open task', status: 'open', completedAt: '2026-10-01' },
      ]}
      onChange={jest.fn()}
    />,
  );

  expect(screen.queryByRole('heading', { name: 'Old completed task' })).not.toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'Recent completed task' })).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'Old open task' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /Barchasi/ })).toHaveTextContent('2');
  unmount();
  jest.useRealTimers();
});
