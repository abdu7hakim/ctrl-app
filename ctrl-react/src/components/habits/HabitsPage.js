import { useRef, useState } from 'react';
import { createId } from '../../utils/helpers';

const colors = ['#7157e8', '#e47070', '#e9a23b', '#39a982', '#4b91d1', '#d35ca3'];
const weekdayNames = ['Du', 'Se', 'Ch', 'Pa', 'Ju', 'Sh', 'Ya'];
const fullWeekdayNames = ['Yakshanba', 'Dushanba', 'Seshanba', 'Chorshanba', 'Payshanba', 'Juma', 'Shanba'];
const allWeekdays = [0, 1, 2, 3, 4, 5, 6];
const icons = [
  { value: '📚', label: 'Kitob' },
  { value: '🏃', label: 'Sport' },
  { value: '💧', label: 'Suv' },
  { value: '🧘', label: 'Dam olish' },
  { value: '✍️', label: 'Yozish' },
  { value: '🎯', label: 'Maqsad' },
  { value: '🌱', label: 'O‘sish' },
  { value: '💻', label: 'Ish' },
];

const getWeekdayIndex = (date) => (date.getDay() + 6) % 7;
const getHabitFrequency = (habit) => (
  Array.isArray(habit.frequency)
    ? allWeekdays.filter((day) => habit.frequency.includes(day))
    : allWeekdays
);

const dateKey = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getWeekDays = (date) => {
  const today = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const mondayOffset = (today.getDay() + 6) % 7;
  return Array.from({ length: 7 }, (_, index) => {
    const day = new Date(today);
    day.setDate(today.getDate() - mondayOffset + index);
    return { date: day, key: dateKey(day), label: weekdayNames[index] };
  });
};

const getCurrentStreak = (completions, today, frequency) => {
  const checkDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  if (frequency.includes(getWeekdayIndex(checkDate)) && !completions?.[dateKey(checkDate)]) {
    checkDate.setDate(checkDate.getDate() - 1);
  }

  let streak = 0;
  let daysChecked = 0;

  while (daysChecked < 366) {
    if (frequency.includes(getWeekdayIndex(checkDate))) {
      if (!completions?.[dateKey(checkDate)]) break;
      streak += 1;
    }
    checkDate.setDate(checkDate.getDate() - 1);
    daysChecked += 1;
  }

  return streak;
};

function HabitsPage({ habits, onChange }) {
  const nameInputRef = useRef(null);
  const [name, setName] = useState('');
  const [goal, setGoal] = useState('');
  const [reason, setReason] = useState('');
  const [color, setColor] = useState(colors[0]);
  const [icon, setIcon] = useState('🌱');
  const [frequency, setFrequency] = useState(allWeekdays);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const currentDate = new Date();
  const today = dateKey(currentDate);
  const weekDays = getWeekDays(currentDate);
  const todayHabits = habits.filter((habit) => getHabitFrequency(habit).includes(getWeekdayIndex(currentDate)));
  const doneCount = todayHabits.filter((habit) => habit.completions?.[today]).length;

  const saveHabits = async (nextHabits) => {
    setError('');
    setSaving(true);
    try {
      await onChange(nextHabits);
      return true;
    } catch (saveError) {
      console.error('Odatlarni saqlashda xatolik:', saveError);
      setError(saveError.message || 'Odatlarni saqlab bo‘lmadi. Qayta urinib ko‘ring.');
      return false;
    } finally {
      setSaving(false);
    }
  };

  const addHabit = async (event) => {
    event.preventDefault();
    if (!name.trim()) {
      setError('Odat nomini kiriting.');
      return;
    }
    if (!frequency.length) {
      setError('Kamida bitta kunni tanlang.');
      return;
    }
    const newHabit = {
      id: createId(),
      name: name.trim(),
      goal: goal.trim(),
      reason: reason.trim(),
      color,
      icon,
      frequency,
      completions: {},
      completedToday: false,
      createdAt: new Date().toISOString(),
    };
    const saved = await saveHabits([...habits, newHabit]);
    if (saved) {
      resetForm();
    }
  };

  const resetForm = () => {
    setName('');
    setGoal('');
    setReason('');
    setColor(colors[0]);
    setIcon('🌱');
    setFrequency(allWeekdays);
    setEditingId(null);
    setError('');
  };

  const startEditing = (habit) => {
    setError('');
    setEditingId(habit.id);
    setName(habit.name);
    setGoal(habit.goal || '');
    setReason(habit.reason || '');
    setColor(habit.color || colors[0]);
    setIcon(habit.icon || '🌱');
    setFrequency(getHabitFrequency(habit));
    nameInputRef.current?.focus();
  };

  const saveEdit = async (event) => {
    event.preventDefault();
    if (!name.trim()) {
      setError('Odat nomini kiriting.');
      return;
    }
    if (!frequency.length) {
      setError('Kamida bitta kunni tanlang.');
      return;
    }
    const saved = await saveHabits(habits.map((habit) => (
      habit.id === editingId
        ? { ...habit, name: name.trim(), goal: goal.trim(), reason: reason.trim(), color, icon, frequency }
        : habit
    )));
    if (saved) resetForm();
  };

  const toggleFrequency = (day) => {
    setFrequency((current) => (
      current.includes(day)
        ? current.filter((value) => value !== day)
        : allWeekdays.filter((value) => current.includes(value) || value === day)
    ));
  };

  const toggleHabit = (id) => saveHabits(habits.map((habit) => {
    if (habit.id !== id) return habit;
    const completions = { ...habit.completions };
    if (completions[today]) delete completions[today];
    else completions[today] = true;
    return { ...habit, completions, completedToday: Boolean(completions[today]) };
  }));

  const removeHabit = (id) => saveHabits(habits.filter((habit) => habit.id !== id));

  return (
    <div className="page-content">
      <div className="habits-layout">
        <section className="surface-card habits-list-card"><div className="section-heading"><div><span className="eyebrow">BUGUN</span><h3>Odatlarim <span className="heading-count">{doneCount}/{todayHabits.length}</span></h3></div><div className="habit-progress"><span className="habit-progress-ring" style={{ '--progress': `${todayHabits.length ? (doneCount / todayHabits.length) * 100 : 0}%` }}><strong>{todayHabits.length ? Math.round((doneCount / todayHabits.length) * 100) : 0}<small>%</small></strong></span><span>Bugungi natija</span></div></div>
          {habits.length ? <div className="habit-list">{habits.map((habit) => {
            const completed = Boolean(habit.completions?.[today]);
            const habitFrequency = getHabitFrequency(habit);
            const scheduledToday = habitFrequency.includes(getWeekdayIndex(currentDate));
            const streak = getCurrentStreak(habit.completions, currentDate, habitFrequency);
            const createdDate = habit.createdAt ? new Date(habit.createdAt) : weekDays[0].date;
            const createdDateKey = Number.isNaN(createdDate.getTime()) ? weekDays[0].key : dateKey(createdDate);
            const activeWeekDays = weekDays.filter((day) => (
              day.key >= createdDateKey
              && day.key <= today
              && habitFrequency.includes(getWeekdayIndex(day.date))
            ));
            const habitWeekDone = activeWeekDays.filter((day) => habit.completions?.[day.key]).length;
            const habitWeekProgress = activeWeekDays.length
              ? Math.round((habitWeekDone / activeWeekDays.length) * 100)
              : 0;
            const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
            const monthDays = Array.from({ length: currentDate.getDate() }, (_, index) => {
              const date = new Date(monthStart);
              date.setDate(monthStart.getDate() + index);
              return { date, key: dateKey(date) };
            }).filter((day) => (
              day.key >= createdDateKey
              && habitFrequency.includes(getWeekdayIndex(day.date))
            ));
            const monthDone = monthDays.filter((day) => habit.completions?.[day.key]).length;
            const monthProgress = monthDays.length ? Math.round((monthDone / monthDays.length) * 100) : 0;
            const monthWeeks = Array.from({ length: Math.ceil(currentDate.getDate() / 7) }, (_, index) => {
              const days = monthDays.filter((day) => Math.floor((day.date.getDate() - 1) / 7) === index);
              const done = days.filter((day) => habit.completions?.[day.key]).length;
              return {
                label: `${index * 7 + 1}–${Math.min((index + 1) * 7, currentDate.getDate())}`,
                progress: days.length ? Math.round((done / days.length) * 100) : 0,
                done,
                total: days.length,
              };
            });
            return <article className={`habit-item ${completed ? 'habit-item-done' : ''}`} key={habit.id} style={{ '--habit-color': habit.color }}>
              <button className={`todo-check ${completed ? 'todo-check-active' : ''}`} aria-label={completed ? 'Bajarilmagan deb belgilash' : 'Bajarildi deb belgilash'} onClick={() => toggleHabit(habit.id)} disabled={saving || !scheduledToday} title={!scheduledToday ? 'Bugun dam olish kuni' : undefined}><i className="ph ph-check" /></button>
              <span className="habit-icon" aria-hidden="true">{habit.icon || '🌱'}</span>
              <div className="todo-item-copy">
                <div className="habit-title-row"><h3>{habit.name}</h3><span className={`habit-streak ${streak >= 7 ? 'habit-streak-week' : ''}`} aria-label={`${streak} kun davomiylik`}><i className="ph ph-fire" /> {streak} kun</span></div>
                {streak >= 21 && <span className="habit-formed-badge"><i className="ph ph-seal-check" /> Odat shakllandi</span>}
                {habit.goal && <p><i className="ph ph-target" /> {habit.goal}</p>}
                <div className="habit-week">
                  <span className="habit-week-count">Hafta {habitWeekDone}/{activeWeekDays.length} kun</span>
                  <div className="habit-week-progress" role="progressbar" aria-label={`${habit.name}: haftalik progress`} aria-valuenow={habitWeekProgress} aria-valuemin="0" aria-valuemax="100"><span style={{ width: `${habitWeekProgress}%` }} /></div>
                  <div className="habit-week-days" aria-label={`${habit.name}: haftalik natija`}>
                    {weekDays.map((day, index) => {
                      const dayCreated = day.key >= createdDateKey;
                      const dayScheduled = habitFrequency.includes(getWeekdayIndex(day.date));
                      const dayAvailable = dayCreated && day.key <= today && dayScheduled;
                      const dayCompleted = dayAvailable && Boolean(habit.completions?.[day.key]);
                      const isToday = day.key === today;
                      const dayStatus = !dayCreated
                        ? 'odat mavjud emas'
                        : day.key > today
                          ? 'kun hali kelmadi'
                          : !dayScheduled
                            ? 'rejalashtirilmagan kun'
                            : dayCompleted
                              ? 'bajarildi'
                              : 'bajarilmadi';
                      return <span key={day.key} className={`habit-week-day ${dayCompleted ? 'habit-week-day-done' : ''} ${!dayAvailable ? 'habit-week-day-unavailable' : ''} ${isToday ? 'habit-week-day-today' : ''}`} aria-label={`${habit.name}, ${fullWeekdayNames[day.date.getDay()]}${isToday ? ', bugun' : ''}: ${dayStatus}`} title={`${fullWeekdayNames[day.date.getDay()]}: ${dayStatus}`}>{dayCreated && dayScheduled ? weekdayNames[index] : '–'}</span>;
                    })}
                  </div>
                </div>
                <div className="habit-reports">
                  <p className="habit-report-summary">Bu hafta <strong>{habitWeekDone}/{activeWeekDays.length} kun ({habitWeekProgress}%)</strong>; bu oy <strong>{monthDone}/{monthDays.length} kun ({monthProgress}%)</strong> bajardingiz.</p>
                  <div className="habit-month-chart" role="img" aria-label={`${habit.name}: oylik hisobot, ${monthDone} kun ${monthDays.length} rejalashtirilgan kundan`}>
                    {monthWeeks.map((week) => (
                      <div className="habit-month-chart-column" key={week.label} title={`${week.label}-kunlar: ${week.done}/${week.total} (${week.progress}%)`}>
                        <span className="habit-month-chart-track"><span style={{ height: `${week.progress}%` }} /></span>
                        <small>{week.label}</small>
                      </div>
                    ))}
                  </div>
                </div>
                {habit.reason && <p className="habit-reason"><i className="ph ph-heart" /> <span><strong>Nega boshlagandim?</strong> {habit.reason}</span></p>}
              </div>
              <span className={`habit-status ${completed ? 'habit-status-done' : ''}`}>{completed ? 'Bajarildi' : scheduledToday ? 'Bugun' : 'Dam olish'}</span>
              <button className="icon-button" aria-label={`${habit.name} odatini tahrirlash`} onClick={() => startEditing(habit)} disabled={saving}><i className="ph ph-pencil-simple" /></button>
              <button className="icon-button danger-button" aria-label={`${habit.name} odatini o‘chirish`} onClick={() => removeHabit(habit.id)} disabled={saving}><i className="ph ph-trash" /></button>
            </article>;
          })}</div> : <div className="habits-empty-state">
            <svg className="habits-empty-illustration" viewBox="0 0 240 180" role="img" aria-label="O‘sib borayotgan nihol tasviri">
              <circle cx="120" cy="87" r="67" fill="var(--primary-soft)" />
              <path d="M75 143h90l-9 13H84z" fill="#d9c8a9" />
              <path d="M90 143c0-23 13-38 30-45 17 7 30 22 30 45z" fill="#b87953" />
              <path d="M120 137V83" stroke="#3b9b70" strokeWidth="7" strokeLinecap="round" />
              <path d="M120 103c-20 1-31-9-33-27 19-1 32 7 33 27z" fill="#64c58d" />
              <path d="M120 91c1-21 14-33 34-34 0 20-11 33-34 34z" fill="#42a977" />
              <circle cx="70" cy="79" r="4" fill="#e9a23b" />
              <circle cx="176" cy="103" r="4" fill="#e47070" />
              <path d="m60 113 4 7 8 1-6 5 1 8-7-4-7 4 2-8-6-5 8-1z" fill="#e9a23b" />
              <path d="m184 60 3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1z" fill="#7157e8" />
            </svg>
            <h4>Hali odatlaringiz yo‘q. Eng kichik qadamdan boshlang!</h4>
            <p>Bugun boshlagan kichik odatingiz ertangi katta o‘zgarishlarga yo‘l ochadi.</p>
            <button type="button" className="button button-primary" onClick={() => nameInputRef.current?.focus()}><i className="ph ph-plus" /> Birinchi odatni qo‘shish</button>
          </div>}
        </section>
        <aside className="surface-card add-task-card"><span className="eyebrow">{editingId ? 'ODATNI TAHRIRLASH' : 'YANGI ODAT'}</span><h3>{editingId ? 'Odatni yangilang' : 'Yaxshi odat yarating'}</h3><p>Maqsad sari muntazam kichik qadam qo‘ying.</p>
          <form className="form-stack" onSubmit={editingId ? saveEdit : addHabit}>
            <label>Odat nomi<input ref={nameInputRef} value={name} onChange={(event) => setName(event.target.value)} placeholder="Masalan, ertalab sayr" maxLength="100" required disabled={saving} /></label>
            <label>Maqsad <span className="optional">(ixtiyoriy)</span><input value={goal} onChange={(event) => setGoal(event.target.value)} placeholder="Masalan, 20 daqiqa" maxLength="100" disabled={saving} /></label>
            <label>Nega men bu odatni qilmoqchiman? <span className="optional">(ixtiyoriy)</span><textarea rows="2" value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Masalan, sog‘lom va tetik bo‘lish uchun" maxLength="240" disabled={saving} /></label>
            <fieldset className="color-field" disabled={saving}><legend>Rang</legend><div className="color-options">{colors.map((option) => <button type="button" key={option} className={`color-option ${color === option ? 'color-option-active' : ''}`} style={{ backgroundColor: option }} aria-label={`${option} rang`} aria-pressed={color === option} onClick={() => setColor(option)} />)}</div></fieldset>
            <fieldset className="habit-icon-field" disabled={saving}><legend>Ikonka</legend><div className="habit-icon-options">{icons.map((option) => <button type="button" key={option.value} className={`habit-icon-option ${icon === option.value ? 'habit-icon-option-active' : ''}`} aria-label={option.label} aria-pressed={icon === option.value} onClick={() => setIcon(option.value)}>{option.value}</button>)}</div></fieldset>
            <fieldset className="habit-frequency-field" disabled={saving}><legend>Qaysi kunlari?</legend><div className="habit-frequency-options">{weekdayNames.map((day, index) => <button type="button" key={day} className={`habit-frequency-option ${frequency.includes(index) ? 'habit-frequency-option-active' : ''}`} aria-label={fullWeekdayNames[(index + 1) % 7]} aria-pressed={frequency.includes(index)} onClick={() => toggleFrequency(index)}>{day}</button>)}</div></fieldset>
            {error && <p className="form-error" role="alert">{error}</p>}
            {editingId && <button type="button" className="button button-secondary button-wide" onClick={resetForm} disabled={saving}>Bekor qilish</button>}
            <button className="button button-primary button-wide" disabled={saving}><i className={`ph ${editingId ? 'ph-floppy-disk' : 'ph-plus'}`} /> {saving ? 'Saqlanmoqda...' : editingId ? 'O‘zgarishlarni saqlash' : 'Odat qo‘shish'}</button>
          </form>
        </aside>
      </div>
    </div>
  );
}

export default HabitsPage;
