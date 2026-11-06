import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import AuthScreen from './components/auth/AuthScreen';
import DashboardLayout from './components/layout/DashboardLayout';
import OverviewPage from './components/dashboard/OverviewPage';
import LeaderboardPage from './components/leaderboard/LeaderboardPage';
import TodoPage from './components/todo/TodoPage';
import HabitsPage from './components/habits/HabitsPage';
import RoutinePage from './components/routine/RoutinePage';
import FocusPage from './components/focus/FocusPage';
import ProfilePage from './components/profile/ProfilePage';
import ContactPage from './components/contact/ContactPage';
import SettingsPage from './components/settings/SettingsPage';
import Analytics from './components/analytics/Analytics';
import { defaultThemeId, getColorTheme } from './utils/themes';
import { isTodoOverdue } from './utils/todoDeadlines';
import { getTaskCompletionArchive, isCompletedTaskOlderThan } from './utils/taskRetention';
import { clearStoredAvatar, getStoredAvatar } from './utils/avatars';
import { getStoredLanguage, saveStoredLanguage, translate } from './utils/language';
import {
  calculateFocusXP,
  calculateHabitXP,
  calculateTaskXP,
  getHabitStreak,
  getHabitXpLogId,
  getLocalDateKey,
  getTaskXpLogId,
} from './utils/xp';
import { playXpRewardSound } from './utils/xpSound';
import { auth, db } from './firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  increment,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import './App.css';

const initialData = {
  todos: [],
  habits: [],
  routine: {},
  routineBadges: [],
  focusSessions: 0,
  focusMinutes: 0,
  darkMode: false,
  colorTheme: defaultThemeId,
  focusDurationMinutes: 25,
  breakDurationMinutes: 5,
  focusAlarmSound: 'bell',
  focusBackgroundMusic: false,
  focusBackgroundTrack: 'ambient',
  language: 'uz',
};

function getHabitCompletionLogs(habits, userId) {
  const logs = new Map();
  habits.forEach((habit) => {
    Object.entries(habit.completions || {}).forEach(([date, completed]) => {
      if (!completed || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return;
      const logId = `${userId}_${encodeURIComponent(habit.id)}_${date}`;
      logs.set(logId, {
        userId,
        habitId: habit.id,
        date,
      });
    });
  });
  return logs;
}

function getLogDateKey(value) {
  if (typeof value?.toDate === 'function') return getLocalDateKey(value.toDate());
  if (value instanceof Date) return getLocalDateKey(value);
  if (typeof value === 'string') {
    const dateOnly = /^(\d{4}-\d{2}-\d{2})/.exec(value);
    if (dateOnly) return dateOnly[1];
  }
  return '';
}

function findLegacyXpLog(logs, { type, date, amount, description }, consumedLogIds) {
  return logs.find((log) => (
    log.type === type
    && !consumedLogIds.has(log.id)
    && !log.sourceId
    && getLogDateKey(log.createdAt) === date
    && Number(log.amount) === amount
    && log.description === description
  ));
}

function getNameParts(displayName, email) {
  const [firstName = '', ...lastNameParts] = (displayName || '').trim().split(/\s+/);
  return {
    firstName: firstName || email?.split('@')[0] || '',
    lastName: lastNameParts.join(' '),
  };
}

function App() {
  const [user, setUser] = useState(null);
  const [language, setLanguageState] = useState(getStoredLanguage);
  const [page, setPage] = useState('dashboard');
  const [focusPageVisible, setFocusPageVisible] = useState(false);
  const [data, setData] = useState(initialData);
  const [darkMode, setDarkMode] = useState(false);
  const [colorTheme, setColorTheme] = useState(defaultThemeId);
  const [notice, setNotice] = useState('');
  const [xpNotice, setXpNotice] = useState(null);
  const [themeSaving, setThemeSaving] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState('');
  const [dataLoading, setDataLoading] = useState(false);
  const [dataError, setDataError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const authGeneration = useRef(0);
  const latestData = useRef(data);
  const expiryErrorKey = useRef('');
  const focusTaskStarter = useRef(null);
  const xpNoticeSequence = useRef(0);

  const showXpNotice = useCallback((amount, reason) => {
    if (amount > 0) {
      xpNoticeSequence.current += 1;
      setXpNotice({ amount, id: xpNoticeSequence.current, reason });
      playXpRewardSound();
    }
  }, []);

  useEffect(() => {
    if (page === 'focus') setFocusPageVisible(true);
  }, [page]);

  const registerFocusTaskStarter = useCallback((starter) => {
    focusTaskStarter.current = starter;
  }, []);

  const startTodoFocus = useCallback((todo) => {
    if (focusTaskStarter.current?.(todo)) setPage('focus');
  }, []);

  useEffect(() => {
    latestData.current = data;
  }, [data]);

  useEffect(() => {
    document.documentElement.lang = language;
    document.title = language === 'en'
      ? 'CTRL App — Take control of your life'
      : 'CTRL App — Hayotingizni boshqaring';
    const description = document.querySelector('meta[name="description"]');
    if (description) {
      description.setAttribute('content', language === 'en'
        ? 'CTRL App — an app for managing daily tasks, habits, and focus.'
        : 'CTRL App — kundalik vazifalar, odatlar va fokusni boshqarish ilovasi.');
    }
    document.documentElement.dataset.theme = darkMode ? 'dark' : 'light';
    const palette = getColorTheme(colorTheme)[darkMode ? 'dark' : 'light'];
    Object.entries(palette).forEach(([name, value]) => {
      document.documentElement.style.setProperty(`--${name.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)}`, value);
    });
  }, [darkMode, colorTheme, language]);

  useEffect(() => {
    let active = true;
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      const generation = ++authGeneration.current;
      if (!firebaseUser) {
        setAuthError('');
        setUser(null);
        setData(initialData);
        setDarkMode(false);
        setColorTheme(defaultThemeId);
        setDataLoading(false);
        setDataError('');
        setAuthLoading(false);
        setPage('dashboard');
        return;
      }

      const identity = {
        uid: firebaseUser.uid,
        email: firebaseUser.email || '',
        ...getNameParts(firebaseUser.displayName, firebaseUser.email),
        avatar: getStoredAvatar(),
      };
      setUser(identity);
      setAuthError('');
      setData(initialData);
      setDataLoading(true);
      setDataError('');
      setAuthLoading(false);

      const load = async () => {
        try {
          const userRef = doc(db, 'users', firebaseUser.uid);
          const snapshot = await getDoc(userRef);
          const profileDefaults = {
            firstName: identity.firstName,
            lastName: identity.lastName,
            email: identity.email,
          };
          const storedData = snapshot.exists() ? snapshot.data() : {};
          const nextData = {
            ...initialData,
            ...storedData,
            todos: Array.isArray(storedData.todos) ? storedData.todos : [],
            habits: Array.isArray(storedData.habits) ? storedData.habits : [],
            routine: storedData.routine && typeof storedData.routine === 'object' && !Array.isArray(storedData.routine)
              ? storedData.routine
              : {},
            routineBadges: Array.isArray(storedData.routineBadges) ? storedData.routineBadges : [],
            darkMode: typeof storedData.darkMode === 'boolean' ? storedData.darkMode : false,
            colorTheme: getColorTheme(storedData.colorTheme).id,
            focusDurationMinutes: Number.isSafeInteger(storedData.focusDurationMinutes)
              && storedData.focusDurationMinutes > 0
              && storedData.focusDurationMinutes <= Math.floor(Number.MAX_SAFE_INTEGER / 60)
              ? storedData.focusDurationMinutes
              : initialData.focusDurationMinutes,
            breakDurationMinutes: Number.isSafeInteger(storedData.breakDurationMinutes)
              && storedData.breakDurationMinutes > 0
              && storedData.breakDurationMinutes <= Math.floor(Number.MAX_SAFE_INTEGER / 60)
              ? storedData.breakDurationMinutes
              : initialData.breakDurationMinutes,
            focusAlarmSound: ['bell', 'chime', 'digital'].includes(storedData.focusAlarmSound)
              ? storedData.focusAlarmSound
              : initialData.focusAlarmSound,
            focusBackgroundMusic: typeof storedData.focusBackgroundMusic === 'boolean'
              ? storedData.focusBackgroundMusic
              : initialData.focusBackgroundMusic,
            focusBackgroundTrack: ['ambient', 'rain', 'soft'].includes(storedData.focusBackgroundTrack)
              ? storedData.focusBackgroundTrack
              : initialData.focusBackgroundTrack,
            language: ['uz', 'en'].includes(storedData.language) ? storedData.language : getStoredLanguage(),
          };
          if (!snapshot.exists()) {
            await setDoc(userRef, { ...profileDefaults, ...initialData, language: nextData.language }, { merge: true });
          } else {
            const missingProfile = {};
            Object.entries(profileDefaults).forEach(([key, value]) => {
              if (typeof storedData[key] !== 'string') missingProfile[key] = value;
            });
            if (storedData.email !== identity.email) missingProfile.email = identity.email;
            if (Object.keys(missingProfile).length) {
              await setDoc(userRef, missingProfile, { merge: true });
            }
          }
          const loginDate = getLocalDateKey();
          const loginLogRef = doc(collection(db, 'users', firebaseUser.uid, 'xp_logs'));
          const loginResult = await runTransaction(db, async (transaction) => {
            const currentProfile = await transaction.get(userRef);
            const currentProfileData = currentProfile.data() || {};
            const currentTotalXP = Number.isFinite(currentProfileData.totalXP) ? currentProfileData.totalXP : 0;
            if (currentProfileData.lastDailyLoginDate === loginDate) {
              return { awarded: false, totalXP: currentTotalXP };
            }
            transaction.update(userRef, {
              totalXP: currentTotalXP + 2,
              lastDailyLoginDate: loginDate,
            });
            transaction.set(loginLogRef, {
              amount: 2,
              type: 'Login',
              description: 'Kunlik login',
              createdAt: serverTimestamp(),
            });
            return { awarded: true, totalXP: currentTotalXP + 2 };
          });
          nextData.totalXP = loginResult.totalXP;
          if (loginResult.awarded && active && generation === authGeneration.current) {
            showXpNotice(2, 'Kunlik kirish uchun');
          }
          if (active && generation === authGeneration.current) {
            setUser({
              ...identity,
              firstName: storedData.firstName || identity.firstName,
              lastName: storedData.lastName || identity.lastName,
            });
          }
          if (active && generation === authGeneration.current) setData(nextData);
          if (active && generation === authGeneration.current) setDarkMode(nextData.darkMode);
          if (active && generation === authGeneration.current) setColorTheme(nextData.colorTheme);
          if (active && generation === authGeneration.current) {
            setLanguageState(nextData.language);
            try {
              saveStoredLanguage(nextData.language);
            } catch (error) {
              console.error('Til sozlamasini saqlashda xatolik:', error);
            }
          }
        } catch (error) {
          console.error('Foydalanuvchi ma’lumotlarini yuklashda xatolik:', error);
          if (active && generation === authGeneration.current) {
            setDataError('Ma’lumotlarni yuklab bo‘lmadi. Internet aloqasini tekshirib qayta urinib ko‘ring.');
          }
        } finally {
          if (active && generation === authGeneration.current) setDataLoading(false);
        }
      };
      load();
    }, (error) => {
      console.error('Firebase Auth holatini aniqlashda xatolik:', error);
      if (active) {
        setAuthError('Hisob holatini aniqlab bo‘lmadi. Internet aloqasini tekshirib qayta urinib ko‘ring.');
        setAuthLoading(false);
      }
    });

    return () => {
      active = false;
      authGeneration.current += 1;
      unsubscribe();
    };
  }, [reloadKey, showXpNotice]);

  useEffect(() => {
    if (!notice) return undefined;
    const timer = window.setTimeout(() => setNotice(''), 3000);
    return () => window.clearTimeout(timer);
  }, [notice]);

  useEffect(() => {
    if (!user || dataLoading) return undefined;
    let active = true;
    let removingExpiredTodos = false;

    const removeExpiredTodos = async () => {
      if (removingExpiredTodos) return;
      const currentTodos = latestData.current.todos;
      const expiredTodos = currentTodos.filter((todo) => isTodoOverdue(todo));
      if (!expiredTodos.length) {
        expiryErrorKey.current = '';
        return;
      }

      removingExpiredTodos = true;
      const expiredIds = new Set(expiredTodos.map((todo) => todo.id));
      const errorKey = expiredTodos.map((todo) => todo.id).sort().join(',');
      try {
        await updateDoc(doc(db, 'users', user.uid), {
          todos: currentTodos.filter((todo) => !expiredIds.has(todo.id)),
        });
        expiryErrorKey.current = '';
        if (active) {
          setData((current) => ({
            ...current,
            todos: current.todos.filter((todo) => !expiredIds.has(todo.id)),
          }));
        }
      } catch (error) {
        console.error('Muddati tugagan vazifalarni o‘chirishda xatolik:', error);
        if (active && expiryErrorKey.current !== errorKey) {
          expiryErrorKey.current = errorKey;
          setNotice('Muddati tugagan vazifalarni o‘chirib bo‘lmadi. Internet aloqasini tekshiring.');
        }
      } finally {
        removingExpiredTodos = false;
      }
    };

    removeExpiredTodos();
    const intervalId = window.setInterval(removeExpiredTodos, 15 * 1000);
    return () => {
      active = false;
      window.clearInterval(intervalId);
    };
  }, [dataLoading, user]);

  useEffect(() => {
    if (!user || dataLoading) return undefined;
    let active = true;
    let purgingCompletedTasks = false;
    let lastRetentionError = '';

    const purgeCompletedTasks = async () => {
      if (purgingCompletedTasks || auth.currentUser?.uid !== user.uid) return;
      purgingCompletedTasks = true;
      try {
        const [tasksSnapshot] = await Promise.all([
          getDocs(query(collection(db, 'tasks'), where('userId', '==', user.uid))),
        ]);
        if (!active) return;

        const expiredTodos = latestData.current.todos.filter((todo) => isCompletedTaskOlderThan(todo, 30));
        const expiredTaskDocuments = tasksSnapshot.docs.filter((taskDocument) => (
          isCompletedTaskOlderThan(taskDocument.data(), 30)
        ));
        if (!expiredTodos.length && !expiredTaskDocuments.length) {
          lastRetentionError = '';
          return;
        }

        const archiveRecords = new Map();
        [...expiredTodos, ...expiredTaskDocuments.map((taskDocument) => ({
          ...taskDocument.data(),
          id: taskDocument.data().taskId || taskDocument.id,
        }))].forEach((task) => {
          const archive = getTaskCompletionArchive(user.uid, task);
          if (archive) archiveRecords.set(archive.id, archive.data);
        });

        const expiredTodoIds = new Set(expiredTodos.map((todo) => todo.id));
        const remainingTodos = latestData.current.todos.filter((todo) => !expiredTodoIds.has(todo.id));
        const writes = [
          ...Array.from(archiveRecords, ([id, record]) => ({
            type: 'archive',
            id,
            record,
          })),
          ...expiredTaskDocuments.map((taskDocument) => ({
            type: 'delete',
            reference: taskDocument.ref,
          })),
        ];
        if (!writes.length && !expiredTodos.length) return;

        for (let index = 0; index < Math.max(writes.length, 1); index += 450) {
          const batch = writeBatch(db);
          if (index === 0 && expiredTodos.length) {
            batch.update(doc(db, 'users', user.uid), { todos: remainingTodos });
          }
          writes.slice(index, index + 450).forEach((write) => {
            if (write.type === 'archive') {
              batch.set(doc(db, 'task_completion_archive', write.id), write.record);
            } else {
              batch.delete(write.reference);
            }
          });
          await batch.commit();
        }

        lastRetentionError = '';
        if (active && expiredTodos.length) {
          latestData.current = { ...latestData.current, todos: remainingTodos };
          setData((current) => ({ ...current, todos: current.todos.filter((todo) => !expiredTodoIds.has(todo.id)) }));
        }
      } catch (error) {
        console.error('Eski bajarilgan vazifalarni tozalashda xatolik:', error);
        if (active && lastRetentionError !== error.message) {
          lastRetentionError = error.message;
          setNotice('Eski bajarilgan vazifalarni tozalab bo‘lmadi. Internet aloqasini tekshiring.');
        }
      } finally {
        purgingCompletedTasks = false;
      }
    };

    purgeCompletedTasks();
    const intervalId = window.setInterval(purgeCompletedTasks, 24 * 60 * 60 * 1000);
    return () => {
      active = false;
      window.clearInterval(intervalId);
    };
  }, [dataLoading, user]);

  const stats = useMemo(() => ({
    done: data.todos.filter((todo) => todo.status === 'done').length,
    pending: data.todos.filter((todo) => todo.status === 'open').length,
    completedHabits: data.habits.filter((habit) => habit.completions?.[new Date().toLocaleDateString('en-CA')]).length,
    focusMinutes: data.focusMinutes || 0,
  }), [data]);

  const saveCollection = async (field, value) => {
    if (!user || auth.currentUser?.uid !== user.uid) {
      throw new Error('Ma’lumotni saqlash uchun hisobingizga kiring.');
    }
    if (!['todos', 'habits'].includes(field)) {
      throw new Error('Noma’lum ma’lumot turi.');
    }
    let xpChange = 0;
    if (field === 'todos') {
      const previousTodos = new Map(latestData.current.todos.map((todo) => [todo.id, todo]));
      const updatedTodos = value.map((todo) => ({ ...todo }));
      const legacyUndoCandidates = updatedTodos.filter((todo) => (
        previousTodos.get(todo.id)?.status === 'done'
        && todo.status !== 'done'
        && !Number.isFinite(previousTodos.get(todo.id)?.xpAwardAmount)
      ));
      const legacyLogs = legacyUndoCandidates.length
        ? (await getDocs(collection(db, 'users', user.uid, 'xp_logs'))).docs.map((logDocument) => ({
          ...logDocument.data(),
          id: logDocument.id,
          reference: logDocument.ref,
        }))
        : [];
      const consumedLegacyLogIds = new Set();
      const batch = writeBatch(db);
      const taskRewards = [];
      const taskRefunds = [];
      updatedTodos.forEach((todo) => {
        const previousTodo = previousTodos.get(todo.id);
        if (todo.status === 'done' && previousTodo?.status !== 'done') {
          if (!Number.isFinite(todo.xpAwardAmount)) {
            const amount = calculateTaskXP(todo.priority);
            const normalizedPriority = String(todo.priority || '').trim().toLowerCase();
            const priorityName = normalizedPriority === 'high' || normalizedPriority === 'yuqori'
              ? 'Yuqori'
              : normalizedPriority === 'low' || normalizedPriority === 'past'
                ? 'Past'
                : 'O‘rta';
            const date = todo.completedAt || getLocalDateKey();
            todo.xpAwardAmount = amount;
            todo.xpAwardDate = date;
            taskRewards.push({
              id: getTaskXpLogId(todo.id),
              sourceId: todo.id,
              sourceDate: date,
              amount,
              type: 'Task',
              description: `${priorityName} prioritetli topshiriq bajarildi`,
            });
          }
        } else if (previousTodo?.status === 'done' && todo.status !== 'done') {
          let amount = previousTodo.xpAwardAmount;
          let date = previousTodo.xpAwardDate || previousTodo.completedAt || getLocalDateKey();
          let legacyLog;
          if (!Number.isFinite(amount)) {
            const normalizedPriority = String(previousTodo.priority || '').trim().toLowerCase();
            const priorityName = normalizedPriority === 'high' || normalizedPriority === 'yuqori'
              ? 'Yuqori'
              : normalizedPriority === 'low' || normalizedPriority === 'past'
                ? 'Past'
                : 'O‘rta';
            amount = calculateTaskXP(previousTodo.priority);
            legacyLog = findLegacyXpLog(legacyLogs, {
              type: 'Task',
              date,
              amount,
              description: `${priorityName} prioritetli topshiriq bajarildi`,
            }, consumedLegacyLogIds);
            if (!legacyLog) amount = 0;
            else {
              consumedLegacyLogIds.add(legacyLog.id);
              date = getLogDateKey(legacyLog.createdAt) || date;
            }
            todo.xpAwardAmount = amount;
            todo.xpAwardDate = date;
          }
          if (amount > 0) {
            taskRefunds.push({ id: todo.id, amount });
            batch.delete(legacyLog?.reference || doc(
              db,
              'users',
              user.uid,
              'xp_logs',
              getTaskXpLogId(todo.id),
            ));
          }
        }
        if (
          todo.status === 'done'
          && todo.completedAt
          && (previousTodo?.status !== 'done' || previousTodo.completedAt !== todo.completedAt)
        ) {
          const archive = getTaskCompletionArchive(user.uid, todo);
          if (archive) {
            batch.set(doc(db, 'task_completion_archive', archive.id), archive.data);
          }
        }
      });
      const taskXPChange = taskRewards.reduce((total, reward) => total + reward.amount, 0)
        - taskRefunds.reduce((total, refund) => total + refund.amount, 0);
      xpChange = taskXPChange;
      batch.update(doc(db, 'users', user.uid), {
        todos: updatedTodos,
        ...(taskXPChange ? { totalXP: increment(taskXPChange) } : {}),
      });
      taskRewards.forEach((reward) => {
        const { id, ...log } = reward;
        batch.set(doc(db, 'users', user.uid, 'xp_logs', id), {
          ...log,
          createdAt: serverTimestamp(),
        });
      });
      await batch.commit();
      if (taskRewards.length) {
        const amount = taskRewards.reduce((total, reward) => total + reward.amount, 0);
        showXpNotice(
          amount,
          taskRewards.length > 1 ? 'Vazifalarni bajarganingiz uchun' : 'Vazifani bajarganingiz uchun',
        );
      }
      value = updatedTodos;
    } else {
      const previousHabits = new Map(latestData.current.habits.map((habit) => [habit.id, habit]));
      const updatedHabits = value.map((habit) => ({
        ...habit,
        xpAwardedDates: { ...(habit.xpAwardedDates || {}) },
      }));
      const previousLogs = getHabitCompletionLogs(latestData.current.habits, user.uid);
      const nextLogs = getHabitCompletionLogs(updatedHabits, user.uid);
      const newlyUndoneLogs = Array.from(previousLogs, ([id, log]) => (
        !nextLogs.has(id) && !Number.isFinite(previousHabits.get(log.habitId)?.xpAwardedDates?.[log.date])
          ? { ...log, id }
          : null
      )).filter(Boolean);
      const legacyLogs = newlyUndoneLogs.length
        ? (await getDocs(collection(db, 'users', user.uid, 'xp_logs'))).docs.map((logDocument) => ({
          ...logDocument.data(),
          id: logDocument.id,
          reference: logDocument.ref,
        }))
        : [];
      const consumedLegacyLogIds = new Set();
      const batch = writeBatch(db);
      const nextHabits = new Map(updatedHabits.map((habit) => [habit.id, habit]));
      const habitRefunds = [];
      const habitRewards = [];
      nextLogs.forEach((log, id) => {
        if (!previousLogs.has(id)) {
          batch.set(doc(db, 'habit_logs', id), { ...log, completedAt: serverTimestamp() });
          const habit = nextHabits.get(log.habitId);
          if (habit && !Number.isFinite(habit.xpAwardedDates[log.date])) {
            const [year, month, day] = log.date.split('-').map(Number);
            const completionDate = new Date(year, month - 1, day);
            const streak = getHabitStreak(habit.completions, completionDate, habit.frequency);
            const reward = {
              id: getHabitXpLogId(log.habitId, log.date),
              sourceId: log.habitId,
              sourceDate: log.date,
              amount: calculateHabitXP(streak),
              type: 'Habit',
              description: `Kunlik habit bajarildi (Streak: ${streak} kun)`,
            };
            habit.xpAwardedDates[log.date] = reward.amount;
            habitRewards.push(reward);
          }
        }
      });
      previousLogs.forEach((log, id) => {
        if (!nextLogs.has(id)) {
          batch.delete(doc(db, 'habit_logs', id));
          const habit = nextHabits.get(log.habitId);
          if (!habit) return;
          const previousHabit = previousHabits.get(log.habitId);
          let amount = previousHabit?.xpAwardedDates?.[log.date];
          let legacyLog;
          if (!Number.isFinite(amount)) {
            const [year, month, day] = log.date.split('-').map(Number);
            const completionDate = new Date(year, month - 1, day);
            const streak = getHabitStreak(
              previousHabit?.completions,
              completionDate,
              previousHabit?.frequency,
            );
            amount = calculateHabitXP(streak);
            legacyLog = findLegacyXpLog(legacyLogs, {
              type: 'Habit',
              date: log.date,
              amount,
              description: `Kunlik habit bajarildi (Streak: ${streak} kun)`,
            }, consumedLegacyLogIds);
            if (!legacyLog) amount = 0;
            else consumedLegacyLogIds.add(legacyLog.id);
            if (habit) habit.xpAwardedDates[log.date] = amount;
          } else {
            batch.delete(doc(
              db,
              'users',
              user.uid,
              'xp_logs',
              getHabitXpLogId(log.habitId, log.date),
            ));
          }
          if (legacyLog) batch.delete(legacyLog.reference);
          if (amount > 0) habitRefunds.push({ id, amount });
        }
      });
      const habitXPChange = habitRewards.reduce((total, reward) => total + reward.amount, 0)
        - habitRefunds.reduce((total, refund) => total + refund.amount, 0);
      xpChange = habitXPChange;
      batch.update(doc(db, 'users', user.uid), {
        habits: updatedHabits,
        ...(habitXPChange ? { totalXP: increment(habitXPChange) } : {}),
      });
      habitRewards.forEach((reward) => {
        const { id, ...log } = reward;
        batch.set(doc(db, 'users', user.uid, 'xp_logs', id), {
          ...log,
          createdAt: serverTimestamp(),
        });
      });
      await batch.commit();
      if (habitRewards.length) {
        const amount = habitRewards.reduce((total, reward) => total + reward.amount, 0);
        showXpNotice(
          amount,
          habitRewards.length > 1 ? 'Odatlarni bajarganingiz uchun' : 'Odatni bajarganingiz uchun',
        );
      }
      value = updatedHabits;
    }
    setData((current) => ({
      ...current,
      [field]: value,
      ...(xpChange ? { totalXP: (Number(current.totalXP) || 0) + xpChange } : {}),
    }));
  };

  const resetUserData = async () => {
    if (!user || auth.currentUser?.uid !== user.uid) {
      throw new Error('Ma’lumotlarni o‘chirish uchun hisobingizga kiring.');
    }

    const userCollections = ['pomodoro_sessions', 'habit_logs', 'tasks', 'task_completion_archive'];
    const [userCollectionSnapshots, xpLogSnapshot] = await Promise.all([
      Promise.all(userCollections.map((name) => (
        getDocs(query(collection(db, name), where('userId', '==', user.uid)))
      ))),
      getDocs(collection(db, 'users', user.uid, 'xp_logs')),
    ]);
    const userDocuments = [...userCollectionSnapshots.flatMap((snapshot) => snapshot.docs), ...xpLogSnapshot.docs];
    for (let index = 0; index < userDocuments.length; index += 450) {
      const batch = writeBatch(db);
      userDocuments.slice(index, index + 450).forEach((userDocument) => {
        batch.delete(userDocument.ref);
      });
      await batch.commit();
    }

    await setDoc(doc(db, 'users', user.uid), {
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      email: auth.currentUser.email || user.email || '',
    });

    latestData.current = initialData;
    setData(initialData);
    setDarkMode(initialData.darkMode);
    setColorTheme(initialData.colorTheme);
    setLanguageState(initialData.language);
    setUser((currentUser) => ({ ...currentUser, avatar: null }));

    const localStorageErrors = [];
    try {
      clearStoredAvatar();
    } catch (error) {
      console.error('Tanlangan avatarni brauzer xotirasidan o‘chirishda xatolik:', error);
      localStorageErrors.push(error);
    }
    try {
      window.localStorage.removeItem('ctrl-app-language');
    } catch (error) {
      console.error('Til sozlamasini brauzer xotirasidan o‘chirishda xatolik:', error);
      localStorageErrors.push(error);
    }
    setNotice(localStorageErrors.length
      ? 'Ma’lumotlar hisobingizdan o‘chirildi, ammo ayrim brauzer ma’lumotlarini o‘chira olmadik.'
      : '');
  };

  const saveRoutine = async ({ routine, routineBadges }) => {
    if (!user || auth.currentUser?.uid !== user.uid) {
      throw new Error('Routine’ni saqlash uchun hisobingizga kiring.');
    }
    if (!routine || typeof routine !== 'object' || Array.isArray(routine) || !Array.isArray(routineBadges)) {
      throw new Error('Routine ma’lumotlari noto‘g‘ri formatda.');
    }
    await updateDoc(doc(db, 'users', user.uid), { routine, routineBadges });
    setData((current) => ({ ...current, routine, routineBadges }));
  };

  const saveFocusSession = async (minutes, todoId = null) => {
    if (!user || auth.currentUser?.uid !== user.uid) {
      throw new Error('Fokus sessiyasini saqlash uchun hisobingizga kiring.');
    }
    const updates = {
      focusSessions: increment(1),
      focusMinutes: increment(minutes),
      totalXP: increment(calculateFocusXP(minutes)),
    };
    let updatedTodos = latestData.current.todos;
    if (todoId) {
      updatedTodos = latestData.current.todos.map((todo) => (
        todo.id === todoId
          ? { ...todo, focusMinutes: (Number.isSafeInteger(todo.focusMinutes) ? todo.focusMinutes : 0) + minutes }
          : todo
      ));
      updates.todos = updatedTodos;
    }
    const batch = writeBatch(db);
    batch.update(doc(db, 'users', user.uid), updates);
    batch.set(doc(collection(db, 'users', user.uid, 'xp_logs')), {
      amount: calculateFocusXP(minutes),
      type: 'Focus',
      description: `${minutes} daqiqa fokus bajarildi`,
      createdAt: serverTimestamp(),
    });
    batch.set(doc(collection(db, 'pomodoro_sessions')), {
      userId: user.uid,
      durationMinutes: minutes,
      completedAt: serverTimestamp(),
    });
    await batch.commit();
    showXpNotice(calculateFocusXP(minutes), 'Fokus qilganingiz uchun');
    setData((current) => ({
      ...current,
      focusSessions: (current.focusSessions || 0) + 1,
      focusMinutes: (current.focusMinutes || 0) + minutes,
      ...(todoId ? { todos: updatedTodos } : {}),
    }));
  };

  const saveFocusPreferences = async (preferences) => {
    if (!user || auth.currentUser?.uid !== user.uid) {
      throw new Error('Pomodoro sozlamalarini saqlash uchun hisobingizga kiring.');
    }
    await updateDoc(doc(db, 'users', user.uid), preferences);
    setData((current) => ({ ...current, ...preferences }));
  };

  const toggleTheme = async () => {
    if (!user || auth.currentUser?.uid !== user.uid) {
      setNotice('Mavzuni saqlash uchun hisobingizga kiring.');
      return;
    }

    const nextTheme = !darkMode;
    setThemeSaving(true);
    try {
      await updateDoc(doc(db, 'users', user.uid), { darkMode: nextTheme });
      setDarkMode(nextTheme);
      setData((current) => ({ ...current, darkMode: nextTheme }));
    } catch (error) {
      console.error('Mavzu sozlamasini saqlashda xatolik:', error);
      setNotice('Mavzu sozlamasini saqlab bo‘lmadi. Qayta urinib ko‘ring.');
    } finally {
      setThemeSaving(false);
    }
  };

  const saveColorTheme = async (themeId) => {
    const selectedTheme = getColorTheme(themeId);
    if (!user || auth.currentUser?.uid !== user.uid) {
      setNotice('Rang mavzusini saqlash uchun hisobingizga kiring.');
      return;
    }

    setThemeSaving(true);
    try {
      await updateDoc(doc(db, 'users', user.uid), { colorTheme: selectedTheme.id });
      setColorTheme(selectedTheme.id);
      setData((current) => ({ ...current, colorTheme: selectedTheme.id }));
    } catch (error) {
      console.error('Rang mavzusini saqlashda xatolik:', error);
      setNotice('Rang mavzusini saqlab bo‘lmadi. Qayta urinib ko‘ring.');
    } finally {
      setThemeSaving(false);
    }
  };

  const changeLanguage = async (nextLanguage) => {
    if (!['uz', 'en'].includes(nextLanguage) || nextLanguage === language) return;
    if (!user || auth.currentUser?.uid !== user.uid) {
      try {
        saveStoredLanguage(nextLanguage);
        setLanguageState(nextLanguage);
      } catch (error) {
        console.error('Til sozlamasini saqlashda xatolik:', error);
        setLanguageState(nextLanguage);
        setNotice('Til sozlamasini saqlab bo‘lmadi. Qayta urinib ko‘ring.');
      }
      return;
    }

    setThemeSaving(true);
    try {
      await updateDoc(doc(db, 'users', user.uid), { language: nextLanguage });
      setLanguageState(nextLanguage);
      setData((current) => ({ ...current, language: nextLanguage }));
      try {
        saveStoredLanguage(nextLanguage);
      } catch (error) {
        console.error('Til sozlamasini brauzer xotirasiga saqlashda xatolik:', error);
      }
    } catch (error) {
      console.error('Til sozlamasini saqlashda xatolik:', error);
      setNotice('Til sozlamasini saqlab bo‘lmadi. Qayta urinib ko‘ring.');
    } finally {
      setThemeSaving(false);
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      setNotice('Tizimdan muvaffaqiyatli chiqdingiz.');
    } catch (error) {
      console.error('Tizimdan chiqishda xatolik:', error);
      setDataError('Tizimdan chiqib bo‘lmadi. Qayta urinib ko‘ring.');
    }
  };

  if (authLoading) {
    return <div className="app-loading" role="status">{translate('Hisob tekshirilmoqda...', language)}</div>;
  }
  if (authError) {
    return (
      <main className="app-loading app-error" role="alert">
        <p>{translate(authError, language)}</p>
        <button className="button button-primary" onClick={() => { setAuthError(''); setAuthLoading(true); setReloadKey((key) => key + 1); }}>{translate('Qayta urinish', language)}</button>
      </main>
    );
  }
  if (!user) {
    return (
      <>
        <AuthScreen language={language} onChangeLanguage={changeLanguage} onAuthenticated={(authenticatedUser) => {
          setUser(authenticatedUser);
          setReloadKey((key) => key + 1);
        }} />
        {notice && <div className="toast" role="status">{translate(notice, language)}</div>}
      </>
    );
  }
  if (dataLoading && !['dashboard', 'todo', 'habits'].includes(page)) {
    return <div className="app-loading" role="status">{translate('Ma’lumotlar yuklanmoqda...', language)}</div>;
  }
  if (dataError) {
    return (
      <main className="app-loading app-error" role="alert">
        <p>{translate(dataError, language)}</p>
        <button className="button button-primary" onClick={() => setReloadKey((key) => key + 1)}>{translate('Qayta urinish', language)}</button>
        <button className="text-button" onClick={logout}>{translate('Chiqish', language)}</button>
      </main>
    );
  }

  const pages = {
    dashboard: <OverviewPage user={user} data={data} stats={stats} onNavigate={setPage} isLoading={dataLoading} language={language} />,
    analytics: <Analytics userId={user.uid} habits={data.habits} tasks={data.todos} language={language} />,
    leaderboard: <LeaderboardPage />,
    todo: <TodoPage todos={data.todos} onChange={(todos) => saveCollection('todos', todos)} onStartFocus={startTodoFocus} isLoading={dataLoading} language={language} />,
    habits: <HabitsPage habits={data.habits} onChange={(habits) => saveCollection('habits', habits)} isLoading={dataLoading} language={language} />,
    routine: <RoutinePage routines={data.routine} routineBadges={data.routineBadges} onSave={saveRoutine} language={language} />,
    profile: <ProfilePage user={user} onSave={(updatedUser) => {
      setUser(updatedUser);
      setNotice('Profil ma’lumotlari saqlandi.');
    }} language={language} />,
    contact: <ContactPage user={user} onSend={() => setNotice('Xabaringiz qabul qilindi. Rahmat!')} language={language} />,
    settings: <SettingsPage
      userId={user.uid}
      darkMode={darkMode}
      themeSaving={themeSaving}
      colorTheme={colorTheme}
      language={language}
      onChangeLanguage={changeLanguage}
      onToggleTheme={toggleTheme}
      onSelectColorTheme={saveColorTheme}
      onResetData={resetUserData}
    />,
  };

  return (
    <>
      <DashboardLayout
        user={user}
        page={page}
        darkMode={darkMode}
        themeSaving={themeSaving}
        onNavigate={setPage}
        onToggleTheme={toggleTheme}
        onLogout={logout}
        language={language}
        onChangeLanguage={changeLanguage}
      >
        <AnimatePresence mode="wait">
          {page !== 'focus' && (
            <motion.div
              key={`/${page}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
              data-page-transition={page}
            >
              {pages[page] || pages.dashboard}
            </motion.div>
          )}
        </AnimatePresence>
        <motion.div
          animate={page === 'focus'
            ? { opacity: 1, y: 0 }
            : { opacity: 0, y: -20 }}
          transition={{ duration: 0.3, ease: 'easeInOut' }}
          initial={false}
          data-page-transition="focus"
          onAnimationComplete={() => {
            if (page !== 'focus') setFocusPageVisible(false);
          }}
          style={{ display: focusPageVisible || page === 'focus' ? 'block' : 'none' }}
        >
          <FocusPage
            todos={data.todos}
            onSessionComplete={saveFocusSession}
            focusDurationMinutes={data.focusDurationMinutes}
            breakDurationMinutes={data.breakDurationMinutes}
            focusAlarmSound={data.focusAlarmSound}
            focusBackgroundMusic={data.focusBackgroundMusic}
            focusBackgroundTrack={data.focusBackgroundTrack}
            onSavePreferences={saveFocusPreferences}
            onRegisterTaskStarter={registerFocusTaskStarter}
            language={language}
          />
        </motion.div>
      </DashboardLayout>
      <AnimatePresence>
        {xpNotice && (
          <motion.div
            key={xpNotice.id}
            className="xp-toast"
            role="status"
            aria-live="polite"
            initial={{ opacity: 0, y: -18, scale: 0.92 }}
            animate={{ opacity: [0, 1, 1, 0], y: [-18, 0, 0, -10], scale: [0.92, 1, 1, 0.98] }}
            transition={{ duration: 2.8, times: [0, 0.16, 0.82, 1], ease: 'easeInOut' }}
            onAnimationComplete={() => setXpNotice((current) => (
              current?.id === xpNotice.id ? null : current
            ))}
          >
            <span className="xp-toast-icon"><i className="ph ph-sparkle" aria-hidden="true" /></span>
            <span className="xp-toast-copy">
              <span>{translate(xpNotice.reason, language)}</span>
              <strong>+ {xpNotice.amount} XP</strong>
            </span>
          </motion.div>
        )}
      </AnimatePresence>
      {notice && <div className="toast" role="status">{translate(notice, language)}</div>}
    </>
  );
}

export default App;
