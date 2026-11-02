import { render, screen } from '@testing-library/react';
import TodoPage from './TodoPage';

test('shows skeleton rows while todos are loading', () => {
  const { container } = render(<TodoPage todos={[]} onChange={jest.fn()} isLoading />);

  expect(screen.getByRole('status', { name: 'Vazifalar yuklanmoqda' })).toBeInTheDocument();
  expect(container.querySelectorAll('.todo-skeleton-row')).toHaveLength(4);
  expect(container.querySelector('.page-content')).toHaveClass('page-content-loading');
});
