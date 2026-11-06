import {
  calculateFocusXP,
  calculateHabitXP,
  calculateTaskXP,
  getHabitStreak,
  getLocalDateKey,
} from './xp';

test.each([
  [25, 10],
  [50, 20],
  [1, 0.4],
  [0, 0],
  [-5, 0],
])('calculates focus XP for %s minutes', (minutes, expected) => {
  expect(calculateFocusXP(minutes)).toBe(expected);
});

test.each([
  [0, 2],
  [2, 2],
  [3, 3],
  [7, 3],
  [8, 5],
])('calculates habit XP for a %s-day streak', (streak, expected) => {
  expect(calculateHabitXP(streak)).toBe(expected);
});

test.each([
  ['low', 1],
  ['medium', 2],
  ['high', 3],
  ['Past', 1],
  ['Yuqori', 3],
])('calculates task XP for %s priority', (priority, expected) => {
  expect(calculateTaskXP(priority)).toBe(expected);
});

test('counts a habit streak by its scheduled weekdays', () => {
  const today = new Date(2026, 10, 6);
  const completions = {};
  [0, 2, 4].forEach((daysAgo) => {
    const date = new Date(today);
    date.setDate(today.getDate() - daysAgo);
    completions[getLocalDateKey(date)] = true;
  });

  expect(getHabitStreak(completions, today, [0, 2, 4])).toBe(3);
});
