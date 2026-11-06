import { useEffect, useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { collection, doc, getDoc, getDocs, orderBy, query, where } from 'firebase/firestore';
import { db } from '../../firebase';
import { translate } from '../../utils/language';
import Skeleton from '../ui/Skeleton';

const taskPriorities = [
  { name: 'Yuqori', value: 0, color: '#EF6461' },
  { name: 'O‘rta', value: 0, color: '#F59E0B' },
  { name: 'Past', value: 0, color: '#34A77B' },
];
const emptyRecords = [];
const axisStyle = { fill: 'var(--muted)', fontSize: 11 };
const gridStyle = { stroke: 'var(--line)', strokeDasharray: '3 5' };
const tooltipStyle = {
  backgroundColor: 'var(--surface)',
  border: '1px solid var(--line)',
  borderRadius: 12,
  color: 'var(--ink)',
  boxShadow: 'var(--shadow)',
  fontSize: 12,
};

function getDateKey(date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-');
}

function getRecordDate(record, fields) {
  const value = fields.map((field) => record[field]).find((fieldValue) => fieldValue != null);
  if (!value) return null;
  if (typeof value?.toDate === 'function') return value.toDate();
  if (value instanceof Date) return value;
  if (typeof value === 'string') {
    const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    if (dateOnly) return new Date(Number(dateOnly[1]), Number(dateOnly[2]) - 1, Number(dateOnly[3]));
    const parsedDate = new Date(value);
    return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
  }
  if (typeof value === 'number') {
    const parsedDate = new Date(value);
    return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
  }
  return null;
}

function getWeekRange(date = new Date()) {
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
  const end = new Date(start);
  end.setDate(start.getDate() + 7);
  return { start, end };
}

function getPriorityKey(priority) {
  const normalized = String(priority || '').trim().toLowerCase();
  if (normalized === 'high' || normalized === 'yuqori') return 'Yuqori';
  if (normalized === 'low' || normalized === 'past') return 'Past';
  return 'O‘rta';
}

function buildAnalyticsData(focusRecords, habitRecords, legacyHabits, taskRecords, legacyTasks, week) {
  const days = ['Du', 'Se', 'Cho', 'Pay', 'Ju', 'Sha', 'Ya'];
  const focusByDate = new Map();
  focusRecords.forEach((record) => {
    const date = getRecordDate(record, ['completedAt', 'timestamp', 'createdAt', 'date']);
    if (!date || date < week.start || date >= week.end) return;
    const minutes = Number(record.durationMinutes ?? record.minutes ?? record.focusMinutes ?? record.duration);
    if (!Number.isFinite(minutes) || minutes <= 0) return;
    const key = getDateKey(date);
    focusByDate.set(key, (focusByDate.get(key) || 0) + minutes);
  });
  const focusData = days.map((day, index) => {
    const date = new Date(week.start);
    date.setDate(week.start.getDate() + index);
    return { day, minutes: focusByDate.get(getDateKey(date)) || 0 };
  });

  const habitCompletions = new Map();
  const addHabitCompletion = (habitId, dateValue) => {
    if (!dateValue) return;
    const date = getRecordDate({ date: dateValue }, ['date']);
    if (!date || date < week.start || date >= week.end) return;
    const dateKey = getDateKey(date);
    habitCompletions.set(`${habitId || 'habit'}_${dateKey}`, { dateKey });
  };
  habitRecords.forEach((record) => {
    if (record.completed === false || record.status === 'incomplete') return;
    const date = getRecordDate(record, ['date', 'completedOn', 'completedAt', 'timestamp', 'createdAt']);
    if (date) addHabitCompletion(record.habitId || record.id, getDateKey(date));
  });
  legacyHabits.forEach((habit) => {
    Object.entries(habit.completions || {}).forEach(([date, completed]) => {
      if (completed) addHabitCompletion(habit.id || habit.name, date);
    });
  });
  const habitsByDate = new Map();
  habitCompletions.forEach(({ dateKey }) => {
    habitsByDate.set(dateKey, (habitsByDate.get(dateKey) || 0) + 1);
  });
  const habitData = days.map((day, index) => {
    const date = new Date(week.start);
    date.setDate(week.start.getDate() + index);
    return { day, completed: habitsByDate.get(getDateKey(date)) || 0 };
  });

  const priorities = taskPriorities.map((priority) => ({ ...priority }));
  const priorityTotals = new Map(priorities.map(({ name }) => [name, 0]));
  const tasksById = new Map();
  legacyTasks.forEach((task) => tasksById.set(task.id || `${task.title}_${tasksById.size}`, task));
  taskRecords.forEach((task) => tasksById.set(task.id || `${task.title}_${tasksById.size}`, task));
  tasksById.forEach((task) => {
    const priority = getPriorityKey(task.priority);
    priorityTotals.set(priority, priorityTotals.get(priority) + 1);
  });
  priorities.forEach((priority) => {
    priority.value = priorityTotals.get(priority.name);
  });

  return { focusData, habitData, priorities };
}

function Analytics({ userId, habits = emptyRecords, tasks = emptyRecords, language = 'uz' }) {
  const t = (text) => translate(text, language);
  const [analyticsData, setAnalyticsData] = useState(null);
  const [xpHistory, setXpHistory] = useState([]);
  const [totalXP, setTotalXP] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [retryKey, setRetryKey] = useState(0);
  const week = useMemo(() => getWeekRange(), []);
  const days = language === 'en'
    ? ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
    : ['Du', 'Se', 'Cho', 'Pay', 'Ju', 'Sha', 'Ya'];

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    setError('');

    const loadAnalytics = async () => {
      try {
        const currentWeek = getWeekRange();
        const [focusSnapshot, habitSnapshot, taskSnapshot, xpSnapshot, userSnapshot] = await Promise.all([
          getDocs(query(collection(db, 'pomodoro_sessions'), where('userId', '==', userId))),
          getDocs(query(collection(db, 'habit_logs'), where('userId', '==', userId))),
          getDocs(query(collection(db, 'tasks'), where('userId', '==', userId))),
          getDocs(query(collection(db, 'users', userId, 'xp_logs'), orderBy('createdAt', 'desc'))),
          getDoc(doc(db, 'users', userId)),
        ]);
        if (!active) return;

        const recordsFromSnapshot = (snapshot) => snapshot.docs.map((document) => ({
          ...document.data(),
          id: document.id,
        }));
        const data = buildAnalyticsData(
          recordsFromSnapshot(focusSnapshot),
          recordsFromSnapshot(habitSnapshot),
          habits,
          recordsFromSnapshot(taskSnapshot),
          tasks,
          currentWeek,
        );
        const history = recordsFromSnapshot(xpSnapshot)
          .map((record) => ({ ...record, date: getRecordDate(record, ['createdAt']) }))
          .sort((first, second) => (second.date?.getTime() || 0) - (first.date?.getTime() || 0));
        setAnalyticsData(data);
        setXpHistory(history);
        const profileXP = userSnapshot.exists() ? Number(userSnapshot.data().totalXP) : 0;
        setTotalXP(Number.isFinite(profileXP) ? profileXP : 0);
      } catch (loadError) {
        console.error('Statistika ma’lumotlarini yuklashda xatolik:', loadError);
        if (active) setError('Statistikalarni yuklab bo‘lmadi. Internet aloqasini tekshirib qayta urinib ko‘ring.');
      } finally {
        if (active) setIsLoading(false);
      }
    };

    loadAnalytics();
    return () => {
      active = false;
    };
  }, [userId, habits, tasks, retryKey]);

  const focusData = days.map((day, index) => ({
    day,
    minutes: analyticsData?.focusData[index]?.minutes || 0,
  }));
  const habitData = days.map((day, index) => ({
    day,
    completed: analyticsData?.habitData[index]?.completed || 0,
  }));
  const priorities = (analyticsData?.priorities || taskPriorities).map((priority) => ({
    ...priority,
    name: t(priority.name),
  }));
  const focusTotal = focusData.reduce((total, day) => total + day.minutes, 0);
  const habitsTotal = habitData.reduce((total, day) => total + day.completed, 0);
  const tasksTotal = priorities.reduce((total, priority) => total + priority.value, 0);
  const hasFocusData = focusTotal > 0;
  const hasHabitData = habitsTotal > 0;
  const hasTaskData = tasksTotal > 0;
  const summary = [
    { label: 'Haftalik fokus vaqti', value: `${Math.floor(focusTotal / 60)} ${t('soat')} ${focusTotal % 60} ${t('daq')}`, detail: t('shu haftada') },
    { label: 'Bajarilgan odatlar', value: habitsTotal, detail: t('shu haftada') },
    { label: 'Vazifalar soni', value: tasksTotal, detail: t('ustuvorlik bo‘yicha') },
  ];

  if (isLoading) {
    return (
      <div className="page-content analytics-page">
        <section className="xp-total-skeleton" aria-hidden="true">
          <Skeleton className="skeleton-line skeleton-line-short" />
          <Skeleton className="skeleton-line xp-total-skeleton-value" />
        </section>
        <div className="analytics-skeleton" role="status" aria-label={t('Statistika yuklanmoqda')}>
          <div className="analytics-skeleton-intro">
            <Skeleton className="skeleton-line skeleton-line-short" />
            <Skeleton className="skeleton-line skeleton-line-heading" />
            <Skeleton className="skeleton-line skeleton-line-wide" />
          </div>
          <div className="analytics-skeleton-summary">
            {Array.from({ length: 3 }, (_, index) => <Skeleton className="analytics-skeleton-summary-card" key={index} />)}
          </div>
          <div className="analytics-grid">
            {Array.from({ length: 3 }, (_, index) => (
              <section className="analytics-card analytics-skeleton-card" key={index}>
                <Skeleton className="skeleton-line skeleton-line-heading" />
                <Skeleton className="analytics-skeleton-chart" />
              </section>
            ))}
          </div>
          <section className="analytics-card xp-history-card xp-history-skeleton" aria-hidden="true">
            <Skeleton className="skeleton-line skeleton-line-heading" />
            {Array.from({ length: 4 }, (_, index) => (
              <div className="xp-history-skeleton-row" key={index}>
                <Skeleton className="skeleton-circle" />
                <Skeleton className="skeleton-line skeleton-line-wide" />
                <Skeleton className="skeleton-line skeleton-line-short" />
              </div>
            ))}
          </section>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-content analytics-page">
        <section className="analytics-error" role="alert">
          <i className="ph ph-warning-circle" aria-hidden="true" />
          <p>{t(error)}</p>
          <button type="button" className="button button-primary" onClick={() => setRetryKey((current) => current + 1)}>
            {t('Qayta urinish')}
          </button>
        </section>
      </div>
    );
  }

  return (
    <div className="page-content analytics-page">
      <section className="xp-total-card" aria-label={t('Umumiy XP')}>
        <span>{t('Umumiy XP')}</span>
        <strong>{totalXP} <small>XP</small></strong>
      </section>
      <section className="analytics-intro">
        <div>
          <span className="analytics-eyebrow">{t('Shaxsiy tahlil')}</span>
          <h2>{t('Haftalik statistika')}</h2>
          <p>{t('Bu hafta odatlaringiz va fokus vaqtingiz qanday o‘tganini ko‘ring.')}</p>
        </div>
        <span className="analytics-sample-badge">
          <i className="ph ph-chart-line-up" aria-hidden="true" />
          {t('Hafta')} · {getDateKey(week.start)} – {getDateKey(new Date(week.end.getTime() - 86400000))}
        </span>
      </section>

      <section className="analytics-summary" aria-label={t('Haftalik xulosa')}>
        {summary.map((item) => (
          <article className="analytics-summary-card" key={item.label}>
            <span>{t(item.label)}</span>
            <strong>{item.value}</strong>
            <small>{item.detail}</small>
          </article>
        ))}
      </section>

      <section className="analytics-grid" aria-label={t('Haftalik grafiklar')}>
        <article className="analytics-card">
          <header className="analytics-card-heading">
            <span className="analytics-card-icon analytics-focus-icon"><i className="ph ph-timer" aria-hidden="true" /></span>
            <div>
              <h3>{t('Haftalik fokus vaqti')}</h3>
              <p>{t('Kunlik fokus vaqtingiz, daqiqalarda.')}</p>
            </div>
          </header>
          {hasFocusData ? (
            <div className="analytics-chart" role="img" aria-label={t('Haftalik fokus vaqti grafigi')}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={focusData} margin={{ top: 16, right: 8, left: -18, bottom: 0 }}>
                  <defs>
                    <linearGradient id="focusAreaFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.22} />
                      <stop offset="100%" stopColor="var(--primary)" stopOpacity={0.01} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} stroke={gridStyle.stroke} strokeDasharray={gridStyle.strokeDasharray} />
                  <XAxis dataKey="day" tick={axisStyle} tickLine={false} axisLine={false} tickMargin={12} />
                  <YAxis tick={axisStyle} tickLine={false} axisLine={false} tickMargin={8} width={34} />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    cursor={{ stroke: 'var(--primary)', strokeDasharray: '4 4' }}
                    formatter={(value) => [`${value} ${t('daq')}`, t('Fokus vaqti')]}
                  />
                  <Area
                    type="monotone"
                    dataKey="minutes"
                    stroke="var(--primary)"
                    strokeWidth={3}
                    fill="url(#focusAreaFill)"
                    activeDot={{ r: 5, strokeWidth: 0, fill: 'var(--primary)' }}
                    dot={{ r: 3, strokeWidth: 2, stroke: 'var(--surface)', fill: 'var(--primary)' }}
                    name={t('Fokus vaqti')}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : <div className="analytics-no-data">{t('Bu hafta uchun ma’lumot yo‘q')}</div>}
          <footer className="analytics-chart-footer">
            <span><i className="analytics-legend-dot analytics-focus-dot" />{t('Fokus vaqti')}</span>
            <strong>{focusTotal} {t('daq')} <small>{t('jami')}</small></strong>
          </footer>
        </article>

        <article className="analytics-card">
          <header className="analytics-card-heading">
            <span className="analytics-card-icon analytics-habits-icon"><i className="ph ph-check-circle" aria-hidden="true" /></span>
            <div>
              <h3>{t('Haftalik bajarilgan odatlar')}</h3>
              <p>{t('Har kuni bajarilgan odatlar soni.')}</p>
            </div>
          </header>
          {hasHabitData ? (
            <div className="analytics-chart" role="img" aria-label={t('Haftalik bajarilgan odatlar grafigi')}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={habitData} margin={{ top: 16, right: 8, left: -18, bottom: 0 }}>
                  <CartesianGrid vertical={false} stroke={gridStyle.stroke} strokeDasharray={gridStyle.strokeDasharray} />
                  <XAxis dataKey="day" tick={axisStyle} tickLine={false} axisLine={false} tickMargin={12} />
                  <YAxis allowDecimals={false} tick={axisStyle} tickLine={false} axisLine={false} tickMargin={8} width={34} />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    cursor={{ fill: '#F59E0B', opacity: 0.08 }}
                    formatter={(value) => [value, t('Bajarilgan odatlar')]}
                  />
                  <Bar dataKey="completed" fill="#F59E0B" radius={[7, 7, 2, 2]} maxBarSize={34} name={t('Bajarilgan odatlar')} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : <div className="analytics-no-data">{t('Bu hafta uchun ma’lumot yo‘q')}</div>}
          <footer className="analytics-chart-footer">
            <span><i className="analytics-legend-dot analytics-habits-dot" />{t('Bajarilgan odatlar')}</span>
            <strong>{habitsTotal} <small>{t('jami')}</small></strong>
          </footer>
        </article>

        <article className="analytics-card analytics-priority-card">
          <header className="analytics-card-heading">
            <span className="analytics-card-icon analytics-priority-icon"><i className="ph ph-chart-donut" aria-hidden="true" /></span>
            <div>
              <h3>{t('Vazifalar ustuvorligi')}</h3>
              <p>{t('Vazifalar ustuvorlik darajasi bo‘yicha.')}</p>
            </div>
          </header>
          {hasTaskData ? (
            <>
              <div className="analytics-donut-wrap" role="img" aria-label={t('Vazifalar ustuvorligi grafigi')}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={priorities}
                      dataKey="value"
                      nameKey="name"
                      innerRadius="66%"
                      outerRadius="88%"
                      paddingAngle={4}
                      stroke="none"
                    >
                      {priorities.map((priority) => (
                        <Cell key={priority.name} fill={priority.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} formatter={(value) => [value, t('Vazifalar')]} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="analytics-donut-center" aria-hidden="true">
                  <strong>{tasksTotal}</strong>
                  <span>{t('vazifa')}</span>
                </div>
              </div>
              <ul className="analytics-priority-legend">
                {priorities.map((priority) => (
                  <li key={priority.name}>
                    <span><i style={{ backgroundColor: priority.color }} />{priority.name}</span>
                    <strong>{priority.value}<small> · {Math.round((priority.value / tasksTotal) * 100)}%</small></strong>
                  </li>
                ))}
              </ul>
            </>
          ) : <div className="analytics-no-data">{t('Vazifalar topilmadi')}</div>}
        </article>
      </section>
      <section className="analytics-card xp-history-card" aria-label={t('XP tarixi')}>
        <header className="analytics-card-heading">
          <span className="analytics-card-icon xp-history-icon"><i className="ph ph-sparkle" aria-hidden="true" /></span>
          <div>
            <h3>{t('XP tarixi')}</h3>
            <p>{t('Yig‘ilgan tajriba ballari hisoboti.')}</p>
          </div>
          <strong className="xp-history-total">
            {xpHistory.reduce((total, log) => total + (Number(log.amount) || 0), 0)} XP
          </strong>
        </header>
        {xpHistory.length ? (
          <ul className="xp-history-list">
            {xpHistory.map((log) => (
              <li className="xp-history-item" key={log.id}>
                <span className="xp-history-item-icon">
                  <i
                    className={`ph ${log.type === 'Focus' ? 'ph-timer' : log.type === 'Habit' ? 'ph-target' : log.type === 'Task' ? 'ph-check-square' : 'ph-calendar-check'}`}
                    aria-hidden="true"
                  />
                </span>
                <span className="xp-history-copy">
                  <span>{log.description || ''}</span>
                </span>
                <span className="xp-history-meta">
                  <strong className="xp-history-amount">+ {Number(log.amount) || 0} XP</strong>
                  {log.date && (
                    <time dateTime={log.date.toISOString()}>
                      {log.date.toLocaleString(language === 'en' ? 'en-US' : 'uz-UZ')}
                    </time>
                  )}
                </span>
              </li>
            ))}
          </ul>
        ) : <div className="xp-history-empty">{t('Hozircha XP tarixi mavjud emas.')}</div>}
      </section>
    </div>
  );
}

export default Analytics;
export { buildAnalyticsData, getWeekRange };
