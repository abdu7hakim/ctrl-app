import { useEffect, useMemo, useRef, useState } from 'react';
import AuthScreen from './components/auth/AuthScreen';
import DashboardLayout from './components/layout/DashboardLayout';
import OverviewPage from './components/dashboard/OverviewPage';
import TodoPage from './components/todo/TodoPage';
import HabitsPage from './components/habits/HabitsPage';
import FocusPage from './components/focus/FocusPage';
import ProfilePage from './components/profile/ProfilePage';
import ContactPage from './components/contact/ContactPage';
import SettingsPage from './components/settings/SettingsPage';
import { defaultThemeId, getColorTheme } from './utils/themes';
import { isTodoOverdue } from './utils/todoDeadlines';
import { auth, db } from './firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc, increment, setDoc, updateDoc } from 'firebase/firestore';
import './App.css';

const initialData = {
  todos: [],
  habits: [],
  focusSessions: 0,
  focusMinutes: 0,
  darkMode: false,
  colorTheme: defaultThemeId,
  focusDurationMinutes: 25,
  breakDurationMinutes: 5,
  focusAlarmSound: 'bell',
  focusBackgroundMusic: false,
  focusBackgroundTrack: 'ambient',
};

function getNameParts(displayName, email) {
  const [firstName = '', ...lastNameParts] = (displayName || '').trim().split(/\s+/);
  return {
    firstName: firstName || email?.split('@')[0] || '',
    lastName: lastNameParts.join(' '),
  };
}

function App() {
  const [user, setUser] = useState(null);
  const [page, setPage] = useState('dashboard');
  const [data, setData] = useState(initialData);
  const [darkMode, setDarkMode] = useState(false);
  const [colorTheme, setColorTheme] = useState(defaultThemeId);
  const [notice, setNotice] = useState('');
  const [themeSaving, setThemeSaving] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState('');
  const [dataLoading, setDataLoading] = useState(false);
  const [dataError, setDataError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const authGeneration = useRef(0);
  const latestData = useRef(data);
  const expiryErrorKey = useRef('');

  useEffect(() => {
    latestData.current = data;
  }, [data]);

  useEffect(() => {
    document.documentElement.dataset.theme = darkMode ? 'dark' : 'light';
    const palette = getColorTheme(colorTheme)[darkMode ? 'dark' : 'light'];
    Object.entries(palette).forEach(([name, value]) => {
      document.documentElement.style.setProperty(`--${name.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)}`, value);
    });
  }, [darkMode, colorTheme]);

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
        photoURL: firebaseUser.photoURL || '',
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
            darkMode: typeof storedData.darkMode === 'boolean' ? storedData.darkMode : false,
            colorTheme: getColorTheme(storedData.colorTheme).id,
            photoURL: typeof storedData.photoURL === 'string' ? storedData.photoURL : identity.photoURL,
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
          };
          if (!snapshot.exists()) {
            await setDoc(userRef, { ...profileDefaults, ...initialData }, { merge: true });
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
          if (active && generation === authGeneration.current) {
            setUser({
              ...identity,
              firstName: storedData.firstName || identity.firstName,
              lastName: storedData.lastName || identity.lastName,
              photoURL: nextData.photoURL,
            });
          }
          if (active && generation === authGeneration.current) setData(nextData);
          if (active && generation === authGeneration.current) setDarkMode(nextData.darkMode);
          if (active && generation === authGeneration.current) setColorTheme(nextData.colorTheme);
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
  }, [reloadKey]);

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
    await updateDoc(doc(db, 'users', user.uid), { [field]: value });
    setData((current) => ({ ...current, [field]: value }));
  };

  const saveFocusSession = async (minutes) => {
    if (!user || auth.currentUser?.uid !== user.uid) {
      throw new Error('Fokus sessiyasini saqlash uchun hisobingizga kiring.');
    }
    await updateDoc(doc(db, 'users', user.uid), {
      focusSessions: increment(1),
      focusMinutes: increment(minutes),
    });
    setData((current) => ({
      ...current,
      focusSessions: (current.focusSessions || 0) + 1,
      focusMinutes: (current.focusMinutes || 0) + minutes,
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
    return <div className="app-loading" role="status">Hisob tekshirilmoqda...</div>;
  }
  if (authError) {
    return (
      <main className="app-loading app-error" role="alert">
        <p>{authError}</p>
        <button className="button button-primary" onClick={() => { setAuthError(''); setAuthLoading(true); setReloadKey((key) => key + 1); }}>Qayta urinish</button>
      </main>
    );
  }
  if (!user) {
    return <AuthScreen onAuthenticated={(authenticatedUser) => {
      setUser(authenticatedUser);
      setReloadKey((key) => key + 1);
    }} />;
  }
  if (dataLoading) {
    return <div className="app-loading" role="status">Ma’lumotlar yuklanmoqda...</div>;
  }
  if (dataError) {
    return (
      <main className="app-loading app-error" role="alert">
        <p>{dataError}</p>
        <button className="button button-primary" onClick={() => setReloadKey((key) => key + 1)}>Qayta urinish</button>
        <button className="text-button" onClick={logout}>Chiqish</button>
      </main>
    );
  }

  const pages = {
    dashboard: <OverviewPage user={user} data={data} stats={stats} onNavigate={setPage} />,
    todo: <TodoPage todos={data.todos} onChange={(todos) => saveCollection('todos', todos)} />,
    habits: <HabitsPage habits={data.habits} onChange={(habits) => saveCollection('habits', habits)} />,
    profile: <ProfilePage user={user} onSave={(updatedUser) => {
      setUser(updatedUser);
      setNotice('Profil ma’lumotlari saqlandi.');
    }} />,
    contact: <ContactPage user={user} onSend={() => setNotice('Xabaringiz qabul qilindi. Rahmat!')} />,
    settings: <SettingsPage
      darkMode={darkMode}
      themeSaving={themeSaving}
      colorTheme={colorTheme}
      onToggleTheme={toggleTheme}
      onSelectColorTheme={saveColorTheme}
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
      >
        {page !== 'focus' && (pages[page] || pages.dashboard)}
        <div hidden={page !== 'focus'}>
          <FocusPage
            onSessionComplete={saveFocusSession}
            focusDurationMinutes={data.focusDurationMinutes}
            breakDurationMinutes={data.breakDurationMinutes}
            focusAlarmSound={data.focusAlarmSound}
            focusBackgroundMusic={data.focusBackgroundMusic}
            focusBackgroundTrack={data.focusBackgroundTrack}
            onSavePreferences={saveFocusPreferences}
          />
        </div>
      </DashboardLayout>
      {notice && <div className="toast" role="status">{notice}</div>}
    </>
  );
}

export default App;
