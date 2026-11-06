import { fireEvent, render, screen } from '@testing-library/react';
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

test('keeps task essentials visible on compact layouts and expands the remaining details on demand', () => {
  const originalMatchMedia = Object.getOwnPropertyDescriptor(window, 'matchMedia');
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: jest.fn().mockReturnValue({
      matches: true,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    }),
  });
  const onStartFocus = jest.fn();
  const { container } = render(
    <TodoPage
      todos={[{
        id: 'compact-task',
        title: 'Check task',
        description: 'Additional task information',
        dueDate: '2026-11-07',
        priority: 'high',
        status: 'open',
      }]}
      onChange={jest.fn()}
      onStartFocus={onStartFocus}
    />,
  );
  const summary = screen.getByRole('button', { name: 'Check task, Yuqori, Batafsil ko‘rish' });
  const details = container.querySelector('#todo-details-compact-task');

  expect(container.querySelector('.todo-priority')).toHaveTextContent('Yuqori');
  expect(screen.getByRole('button', { name: 'Check task uchun diqqat vaqtini boshlash' })).toBeInTheDocument();
  expect(summary).toHaveAttribute('aria-expanded', 'false');
  expect(details).toHaveAttribute('aria-hidden', 'true');

  fireEvent.click(screen.getByRole('button', { name: 'Check task uchun diqqat vaqtini boshlash' }));
  expect(onStartFocus).toHaveBeenCalledWith(expect.objectContaining({ id: 'compact-task' }));
  expect(summary).toHaveAttribute('aria-expanded', 'false');

  fireEvent.click(summary);
  expect(screen.getByRole('button', { name: 'Check task, Yuqori, Batafsilni yopish' })).toHaveAttribute('aria-expanded', 'true');
  expect(details).toHaveAttribute('aria-hidden', 'false');
  expect(screen.getByText('Additional task information')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Check task vazifasini tahrirlash' })).toBeInTheDocument();

  if (originalMatchMedia) Object.defineProperty(window, 'matchMedia', originalMatchMedia);
  else delete window.matchMedia;
});

test('mobile add-task prompt scrolls to the form without creating a task or auto-focusing it', () => {
  const scrollIntoView = jest.fn();
  const originalScrollIntoView = HTMLElement.prototype.scrollIntoView;
  HTMLElement.prototype.scrollIntoView = scrollIntoView;
  const onChange = jest.fn();
  render(<TodoPage todos={[]} onChange={onChange} />);

  fireEvent.click(screen.getByRole('button', { name: 'Yangi vazifa' }));

  expect(scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'start' });
  expect(onChange).not.toHaveBeenCalled();
  expect(screen.getByLabelText('Vazifa nomi')).not.toHaveFocus();
  if (originalScrollIntoView) HTMLElement.prototype.scrollIntoView = originalScrollIntoView;
  else delete HTMLElement.prototype.scrollIntoView;
});
