import { fireEvent, render, screen } from '@testing-library/react';
import LeaderboardPage from './LeaderboardPage';

test('shows the coming soon message and a QR code for the referral link', () => {
  render(<LeaderboardPage />);

  expect(screen.getByRole('heading', { name: 'Leaderboard is Coming Soon' })).toBeInTheDocument();
  expect(screen.getByText('We are working hard to bring you a competitive ranking system. Soon you will be able to compete with friends, earn XP, and climb the ranks!')).toBeInTheDocument();
  expect(screen.getByTitle('Scan to open CTRL App')).toBeInTheDocument();
  expect(screen.getByText("We will notify you when it's ready.")).toBeInTheDocument();
});

test('copies the referral link and confirms it to the user', async () => {
  const writeText = jest.fn().mockResolvedValue(undefined);
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: { writeText },
  });
  render(<LeaderboardPage />);

  fireEvent.click(screen.getByRole('button', { name: 'Invite Friends' }));

  expect(writeText).toHaveBeenCalledWith('https://ctrlwebapp.web.app');
  expect(await screen.findByText('Link copied!')).toBeInTheDocument();
});
