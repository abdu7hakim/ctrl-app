import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Plus, Check, Clock, Tag, Pencil, Trash2, X } from 'lucide-react';
import { translate } from '../../utils/language';

const defaultBadgeColors = {
  Health: 'emerald',
  Work: 'indigo',
  Personal: 'amber',
  General: 'slate',
};

const weekdays = [
  { label: 'Du', name: 'Dushanba', index: 0 },
  { label: 'Se', name: 'Seshanba', index: 1 },
  { label: 'Ch', name: 'Chorshanba', index: 2 },
  { label: 'Pa', name: 'Payshanba', index: 3 },
  { label: 'Ju', name: 'Juma', index: 4 },
  { label: 'Sh', name: 'Shanba', index: 5 },
  { label: 'Ya', name: 'Yakshanba', index: 6 },
];

const defaultBadgeLabels = {
  Health: 'Salomatlik',
  Work: 'Ish',
  Personal: 'Shaxsiy',
  General: 'Umumiy belgi',
};

const mondayIndex = (date) => (date.getDay() + 6) % 7;

const toDateKey = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getDateWindow = (today) => {
  const firstAllowedDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 2);
  const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const isNearMonthEnd = today.getDate() > lastDayOfMonth - 7;
  const lastAllowedDate = isNearMonthEnd
    ? new Date(today.getFullYear(), today.getMonth() + 1, 7)
    : new Date(today.getFullYear(), today.getMonth() + 1, 0);

  return {
    minDate: toDateKey(firstAllowedDate),
    maxDate: toDateKey(lastAllowedDate),
  };
};

const makeInitialRoutine = (today) => ({
  [toDateKey(today)]: [
    { id: 'stretch', time: '08:00', task: 'Morning stretch', category: 'Health', done: false },
    { id: 'priorities', time: '09:00', task: 'Review priorities', category: 'Work', done: false },
    { id: 'deep-work', time: '11:00', task: 'Deep work session', category: 'Work', done: false },
    { id: 'lunch', time: '13:00', task: 'Take a mindful lunch break', category: 'Personal', done: false },
    { id: 'reading', time: '20:00', task: 'Read for 20 minutes', category: 'Health', done: false },
  ],
});

function RoutinePage({ routines, routineBadges: savedBadges, onSave, language = 'uz' }) {
  const t = (text) => translate(text, language);
  const badgeLabel = (name) => (defaultBadgeLabels[name] ? t(defaultBadgeLabels[name]) : name);
  const [today, setToday] = useState(() => new Date());
  const [routine, setRoutine] = useState(() => routines || (onSave ? {} : makeInitialRoutine(today)));
  const [newTask, setNewTask] = useState('');
  const [newTime, setNewTime] = useState('08:00');
  const [newCategory, setNewCategory] = useState('General');
  const [customBadges, setCustomBadges] = useState(() => savedBadges || []);
  const [newBadgeName, setNewBadgeName] = useState('');
  const [newBadgeColor, setNewBadgeColor] = useState('slate');
  const [isBadgeFormOpen, setIsBadgeFormOpen] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState(null);
  const [editingTaskId, setEditingTaskId] = useState(null);
  const [taskEdit, setTaskEdit] = useState({ task: '', time: '', category: '' });
  const [pendingBadgeDeletion, setPendingBadgeDeletion] = useState(null);
  const [selectedWeekdays, setSelectedWeekdays] = useState([]);
  const [saveMessage, setSaveMessage] = useState('');
  const [saveError, setSaveError] = useState('');
  const [saving, setSaving] = useState(false);
  const [selectedDate, setSelectedDate] = useState(toDateKey(today));
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [calendarMonth, setCalendarMonth] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const routineRef = useRef(routine);
  const badgesRef = useRef(customBadges);
  const selectedDateRef = useRef(selectedDate);

  useEffect(() => {
    if (routines) {
      routineRef.current = routines;
      setRoutine(routines);
    }
  }, [routines]);

  useEffect(() => {
    if (savedBadges) {
      badgesRef.current = savedBadges;
      setCustomBadges(savedBadges);
    }
  }, [savedBadges]);

  const persistRoutine = (nextRoutine, nextBadges = badgesRef.current) => {
    setSaveMessage('');
    setSaveError('');
    routineRef.current = nextRoutine;
    badgesRef.current = nextBadges;
    setRoutine(nextRoutine);
    setCustomBadges(nextBadges);
    if (!onSave) return true;

    setSaving(true);
    return onSave({ routine: nextRoutine, routineBadges: nextBadges })
      .then(() => true)
      .catch((error) => {
        console.error('Kunlik tartibni Firebase’ga saqlashda xatolik:', error);
        setSaveError('Routine’ni saqlab bo‘lmadi. Internet aloqasini tekshiring.');
        if (routineRef.current === nextRoutine && badgesRef.current === nextBadges) {
          routineRef.current = routines || {};
          badgesRef.current = savedBadges || [];
          setRoutine(routineRef.current);
          setCustomBadges(badgesRef.current);
        }
        return false;
      })
      .finally(() => setSaving(false));
  };
  const persistRoutineRef = useRef(persistRoutine);
  persistRoutineRef.current = persistRoutine;

  useEffect(() => {
    let timeoutId;
    let active = true;
    const refreshAtMidnight = () => {
      const currentDate = new Date();
      const dateWindow = getDateWindow(currentDate);
      setToday(currentDate);
      const currentRoutine = routineRef.current;
      const nextRoutine = Object.fromEntries(
        Object.entries(currentRoutine).filter(([dateKey]) => (
          dateKey >= dateWindow.minDate && dateKey <= dateWindow.maxDate
        )),
      );
      const finishRefresh = () => {
        if (!active) return;
        if (selectedDateRef.current < dateWindow.minDate) {
          const nextSelectedDate = toDateKey(currentDate);
          selectedDateRef.current = nextSelectedDate;
          setSelectedDate(nextSelectedDate);
        }
        const nextMidnight = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate() + 1);
        timeoutId = setTimeout(refreshAtMidnight, nextMidnight.getTime() - currentDate.getTime() + 25);
      };
      const shouldPrune = Object.keys(nextRoutine).length !== Object.keys(currentRoutine).length;
      const saveResult = shouldPrune ? persistRoutineRef.current(nextRoutine) : true;
      if (saveResult && typeof saveResult.then === 'function') saveResult.then(finishRefresh);
      else finishRefresh();
    };

    refreshAtMidnight();
    return () => {
      active = false;
      clearTimeout(timeoutId);
    };
  }, []);

  const dateWindow = getDateWindow(today);
  const isDateAllowed = (dateKey) => dateKey >= dateWindow.minDate && dateKey <= dateWindow.maxDate;
  const selected = new Date(`${selectedDate}T12:00:00`);
  const monthStart = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), 1);
  const daysInMonth = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 0).getDate();
  const calendarCells = [
    ...Array.from({ length: mondayIndex(monthStart) }, (_, index) => ({ key: `empty-${index}` })),
    ...Array.from({ length: daysInMonth }, (_, index) => {
      const date = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), index + 1);
      return { key: toDateKey(date), date };
    }),
  ];
  const selectedRoutine = [...(routine[selectedDate] || [])]
    .sort((first, second) => first.time.localeCompare(second.time));
  const isSelectedMonthVisible = (
    selected.getFullYear() === calendarMonth.getFullYear()
    && selected.getMonth() === calendarMonth.getMonth()
  );
  const showRoutineTable = isSelectedMonthVisible && isDateAllowed(selectedDate);
  const badgeColors = {
    ...defaultBadgeColors,
    ...Object.fromEntries(customBadges.map((badge) => [badge.name, badge.color])),
  };

  const rangeDays = (() => {
    if (!startDate || !endDate) return null;
    const start = new Date(`${startDate}T00:00:00`);
    const end = new Date(`${endDate}T00:00:00`);
    if (end < start) return -1;
    return Math.floor((end - start) / 86400000) + 1;
  })();

  const addTask = (event) => {
    event.preventDefault();
    const taskName = newTask.trim();
    if (!taskName || saving || !isDateAllowed(selectedDate)) return;

    const currentRoutine = routineRef.current;
    const nextRoutine = {
      ...currentRoutine,
      [selectedDate]: [
        ...(currentRoutine[selectedDate] || []),
        {
        id: `${Date.now()}-${taskName}`,
        time: newTime,
        task: taskName,
        category: newCategory,
        done: false,
        },
      ],
    };
    const result = persistRoutine(nextRoutine);
    if (result === true) setNewTask('');
    else result.then((saved) => { if (saved) setNewTask(''); });
  };

  const toggleTask = (id) => {
    if (saving) return;
    const currentRoutine = routineRef.current;
    const nextRoutine = {
      ...currentRoutine,
      [selectedDate]: (currentRoutine[selectedDate] || []).map((item) => (
        item.id === id ? { ...item, done: !item.done } : item
      )),
    };
    persistRoutine(nextRoutine);
  };

  const startTaskEdit = (item) => {
    setEditingTaskId(item.id);
    setTaskEdit({ task: item.task, time: item.time, category: item.category });
  };

  const cancelTaskEdit = () => {
    setEditingTaskId(null);
    setSelectedTaskId(null);
  };

  const saveTaskEdit = (event, item) => {
    event.preventDefault();
    const taskName = taskEdit.task.trim();
    if (!taskName || saving) return;
    const currentRoutine = routineRef.current;
    const nextRoutine = {
      ...currentRoutine,
      [selectedDate]: (currentRoutine[selectedDate] || []).map((task) => (
        task.id === item.id
          ? { ...task, task: taskName, time: taskEdit.time, category: taskEdit.category }
          : task
      )),
    };
    const result = persistRoutine(nextRoutine);
    const finishEdit = () => {
      setEditingTaskId(null);
      setSelectedTaskId(null);
    };
    if (result === true) finishEdit();
    else result.then((saved) => { if (saved) finishEdit(); });
  };

  const deleteTask = (id) => {
    if (saving) return;
    const currentRoutine = routineRef.current;
    const nextRoutine = {
      ...currentRoutine,
      [selectedDate]: (currentRoutine[selectedDate] || []).filter((item) => item.id !== id),
    };
    const result = persistRoutine(nextRoutine);
    const closeTaskActions = () => {
      setSelectedTaskId(null);
      setEditingTaskId(null);
    };
    if (result === true) closeTaskActions();
    else result.then((saved) => { if (saved) closeTaskActions(); });
  };

  const toggleWeekday = (weekday) => {
    setSelectedWeekdays((current) => (
      current.includes(weekday)
        ? current.filter((day) => day !== weekday)
        : [...current, weekday]
    ));
    setSaveMessage('');
  };

  const saveRoutine = () => {
    if (
      !selectedRoutine.length
      || saving
      || !isDateAllowed(selectedDate)
      || (Boolean(startDate) !== Boolean(endDate))
      || rangeDays === -1
      || (startDate && !isDateAllowed(startDate))
      || (endDate && !isDateAllowed(endDate))
    ) return;

    const currentRoutine = routineRef.current;
    const sourceTasks = [...(currentRoutine[selectedDate] || [])]
      .sort((first, second) => first.time.localeCompare(second.time));
    const sourceTaskIds = new Set(sourceTasks.map((task) => task.id));
    let targetDates;
    if (startDate && endDate) {
      const start = new Date(`${startDate}T12:00:00`);
      const end = new Date(`${endDate}T12:00:00`);
      targetDates = [];
      for (const date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
        const dateKey = toDateKey(date);
        if (isDateAllowed(dateKey) && (!selectedWeekdays.length || selectedWeekdays.includes(mondayIndex(date)))) {
          targetDates.push(dateKey);
        }
      }
    } else if (selectedWeekdays.length) {
      targetDates = Array.from({ length: daysInMonth + 7 }, (_, index) => {
        const date = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), index + 1);
        return toDateKey(date);
      }).filter((dateKey) => (
        isDateAllowed(dateKey)
        && selectedWeekdays.includes(mondayIndex(new Date(`${dateKey}T12:00:00`)))
      ));
    } else {
      targetDates = isDateAllowed(selectedDate) ? [selectedDate] : [];
    }
    if (!targetDates.length) return;

    const nextRoutine = { ...currentRoutine };
    targetDates.forEach((dateKey) => {
      if (dateKey === selectedDate) return;
      const existingTasks = nextRoutine[dateKey] || [];
      const retainedTasks = existingTasks.filter((task) => !sourceTaskIds.has(task.copiedFrom));
      const copiedTasks = sourceTasks.map((task) => ({
        ...task,
        id: `${task.id}-copy-${dateKey}`,
        copiedFrom: task.id,
        done: false,
      }));
      nextRoutine[dateKey] = [...retainedTasks, ...copiedTasks];
    });
    const copiedDateCount = targetDates.filter((dateKey) => dateKey !== selectedDate).length;
    const setSuccessMessage = () => setSaveMessage(copiedDateCount
      ? { key: 'Routine saved for', count: copiedDateCount }
      : { key: 'Routine saved for the selected date.' });
    const result = persistRoutine(nextRoutine);
    if (result === true) setSuccessMessage();
    else result.then((saved) => { if (saved) setSuccessMessage(); });
  };

  const addCustomBadge = (event) => {
    event.preventDefault();
    const name = newBadgeName.trim();
    if (!name || saving) return;

    const currentBadges = badgesRef.current;
    const existingBadge = [...Object.keys(defaultBadgeColors), ...currentBadges.map((badge) => badge.name)]
      .find((badgeName) => badgeName.toLowerCase() === name.toLowerCase());
    if (existingBadge) {
      setNewCategory(existingBadge);
      setNewBadgeName('');
      setIsBadgeFormOpen(false);
      return;
    }

    const nextBadges = [...currentBadges, { name, color: newBadgeColor }];
    const result = persistRoutine(routineRef.current, nextBadges);
    const applyBadge = () => {
      setNewCategory(name);
      setNewBadgeName('');
      setIsBadgeFormOpen(false);
    };
    if (result === true) applyBadge();
    else result.then((saved) => { if (saved) applyBadge(); });
  };

  const deleteCustomBadge = (badgeName) => {
    if (saving) return;
    const nextBadges = badgesRef.current.filter((badge) => badge.name !== badgeName);
    const currentRoutine = routineRef.current;
    const nextRoutine = Object.fromEntries(
      Object.entries(currentRoutine).map(([dateKey, tasks]) => [
        dateKey,
        tasks.map((task) => (
          task.category === badgeName ? { ...task, category: 'General' } : task
        )),
      ]),
    );
    const result = persistRoutine(nextRoutine, nextBadges);
    const finishDelete = () => {
      if (newCategory === badgeName) setNewCategory('General');
      setPendingBadgeDeletion(null);
    };
    if (result === true) finishDelete();
    else result.then((saved) => { if (saved) finishDelete(); });
  };

  const locale = language === 'en' ? 'en-US' : 'uz-UZ';
  const monthLabel = new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }).format(calendarMonth);
  const selectedLabel = new Intl.DateTimeFormat(locale, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(selected);

  return (
    <div className="page-content">
      <div className="routine-page">
        <div className="routine-layout">
          <aside className="routine-sidebar">
            <section className="routine-card routine-calendar-card" aria-label={t('Calendar')}>
              <div className="routine-card-heading">
                <div>
                  <span className="routine-eyebrow">{t('YOUR SCHEDULE')}</span>
                  <h2>{t('Calendar')}</h2>
                </div>
                <div className="routine-month-controls">
                  <button type="button" aria-label={t('Previous month')} onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1))}><ChevronLeft size={15} aria-hidden="true" /></button>
                  <button type="button" aria-label={t('Next month')} onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1))}><ChevronRight size={15} aria-hidden="true" /></button>
                </div>
              </div>
              <div className="routine-month-label">{monthLabel}</div>
              <div className="routine-calendar-grid" role="grid" aria-label={monthLabel}>
                {weekdays.map((weekday) => (
                  <span className="routine-weekday" key={weekday.index} role="columnheader">{t(weekday.label)}</span>
                ))}
                {calendarCells.map((cell) => {
                  if (!cell.date) return <span className="routine-calendar-empty" key={cell.key} />;
                  const key = cell.key;
                  const hasRoutine = Boolean(routine[key]?.length);
                  const isSelected = selectedDate === key;
                  const isToday = toDateKey(today) === key;
                  return (
                    <button
                      type="button"
                      key={key}
                      className={`routine-calendar-day ${isSelected ? 'routine-calendar-day-selected' : ''} ${isToday ? 'routine-calendar-day-today' : ''}`}
                      aria-label={cell.date.toLocaleDateString(locale, { dateStyle: 'full' })}
                      aria-pressed={isSelected}
                      disabled={!isDateAllowed(key)}
                      onClick={() => {
                        selectedDateRef.current = key;
                        setSelectedDate(key);
                      }}
                    >
                      <span>{cell.date.getDate()}</span>
                      {hasRoutine && <i className="routine-calendar-dot" aria-hidden="true" />}
                    </button>
                  );
                })}
              </div>
              <div className="routine-calendar-legend"><i className="routine-calendar-dot" /> {t('Routine scheduled')}</div>
            </section>

            <section className="routine-card routine-weekdays-card" aria-labelledby="routine-weekdays-title">
              <div className="routine-card-heading">
                <div>
                  <span className="routine-eyebrow">{t('REPEAT YOUR ROUTINE')}</span>
                  <h2 id="routine-weekdays-title">{t('Select Weekdays')}</h2>
                </div>
              </div>
              <div className="routine-weekday-options" role="group" aria-label={t('Select weekdays')}>
                {weekdays.map((weekday) => {
                  const isSelected = selectedWeekdays.includes(weekday.index);
                  return (
                    <button
                      type="button"
                      key={weekday.index}
                      className={`routine-weekday-option ${isSelected ? 'routine-weekday-option-selected' : ''}`}
                      aria-label={t(weekday.name)}
                      aria-pressed={isSelected}
                      onClick={() => toggleWeekday(weekday.index)}
                    >
                      {weekday.label}
                    </button>
                  );
                })}
              </div>
            </section>

            <section className="routine-card routine-range-card">
              <div className="routine-card-heading">
                <div>
                  <span className="routine-eyebrow">{t('PLAN AHEAD')}</span>
                  <h2>{t('Date range')}</h2>
                </div>
                <span className="routine-range-icon" aria-hidden="true">↗</span>
              </div>
              <div className="routine-range-inputs">
                <label>
                  <span>{t('Start date')}</span>
                  <input aria-label={t('Start date')} type="date" min={dateWindow.minDate} max={dateWindow.maxDate} value={startDate} onChange={(event) => setStartDate(event.target.value)} />
                </label>
                <label>
                  <span>{t('End date')}</span>
                  <input aria-label={t('End date')} type="date" min={startDate || dateWindow.minDate} max={dateWindow.maxDate} value={endDate} onChange={(event) => setEndDate(event.target.value)} />
                </label>
              </div>
              {Boolean(startDate) !== Boolean(endDate)
                ? <p className="routine-range-note routine-range-error" role="alert">{t('Select both dates to apply a date range.')}</p>
                : rangeDays === -1
                ? <p className="routine-range-note routine-range-error" role="alert">{t('End date must be on or after the start date.')}</p>
                : ((startDate && !isDateAllowed(startDate)) || (endDate && !isDateAllowed(endDate)))
                ? <p className="routine-range-note routine-range-error" role="alert">{t('Choose dates within the current planning window.')}</p>
                : rangeDays && <p className="routine-range-note">{t('Routine will apply for')} <strong>{rangeDays}</strong> {t(rangeDays === 1 ? 'day' : 'days')}.</p>}
              <button
                type="button"
                className="routine-save-button"
                onClick={saveRoutine}
                disabled={saving || !showRoutineTable || !selectedRoutine.length || (Boolean(startDate) !== Boolean(endDate)) || rangeDays === -1 || (startDate && !isDateAllowed(startDate)) || (endDate && !isDateAllowed(endDate))}
              >
                {saving ? t('Saving...') : t('Save Routine')}
              </button>
              {saveMessage && <p className="routine-save-message" role="status">
                {saveMessage.count
                  ? `${t(saveMessage.key)} ${saveMessage.count} ${t(saveMessage.count === 1 ? 'day' : 'days')}.`
                  : t(saveMessage.key)}
              </p>}
              {saveError && <p className="routine-range-note routine-range-error" role="alert">{t(saveError)}</p>}
            </section>
          </aside>

          {showRoutineTable && <section className="routine-card routine-table-card">
            <div className="routine-table-heading">
              <div>
                <span className="routine-eyebrow">{t('A LITTLE PROGRESS, EVERY DAY')}</span>
                <h2>{t('Daily Routine')}</h2>
                <p>{selectedLabel}</p>
              </div>
              <span className="routine-count">{selectedRoutine.filter((item) => item.done).length} / {selectedRoutine.length} {t('done')}</span>
            </div>

            <div className="routine-table" role="table" aria-label={t('Daily routine')}>
              <div className="routine-table-header" role="row">
                <span className="routine-column-label" role="columnheader"><Clock size={12} aria-hidden="true" />{t('Time')}</span>
                <span role="columnheader">{t('Task')}</span>
                <span className="routine-column-label" role="columnheader"><Tag size={12} aria-hidden="true" />{t('Badge')}</span>
                <span role="columnheader">{t('Done')}</span>
              </div>
              <div className="routine-table-body">
                {selectedRoutine.map((item) => (
                  <form
                    className={`routine-row ${item.done ? 'routine-row-done' : ''} ${selectedTaskId === item.id ? 'routine-row-selected' : ''}`}
                    role="row"
                    key={item.id}
                    onSubmit={(event) => saveTaskEdit(event, item)}
                  >
                    <span className="routine-time" role="cell">
                      {editingTaskId === item.id
                        ? <input className="routine-inline-edit-input" aria-label={t('Edit task time')} type="time" value={taskEdit.time} onChange={(event) => setTaskEdit({ ...taskEdit, time: event.target.value })} required disabled={saving} />
                        : item.time}
                    </span>
                    <div className="routine-task-cell" role="cell">
                      {editingTaskId === item.id
                        ? <input className="routine-inline-edit-input" aria-label={t('Edit task')} value={taskEdit.task} onChange={(event) => setTaskEdit({ ...taskEdit, task: event.target.value })} maxLength="120" required disabled={saving} />
                        : <button
                          type="button"
                          className="routine-task-name-button"
                          aria-expanded={selectedTaskId === item.id}
                          onClick={() => setSelectedTaskId((current) => current === item.id ? null : item.id)}
                        >
                          <span className="routine-task-name">{item.task}</span>
                        </button>}
                      {selectedTaskId === item.id && editingTaskId !== item.id && (
                        <div className="routine-task-actions">
                          <button type="button" onClick={() => startTaskEdit(item)} disabled={saving}><Pencil size={13} aria-hidden="true" />{t('Edit')}</button>
                          <button type="button" onClick={() => deleteTask(item.id)} disabled={saving}><Trash2 size={13} aria-hidden="true" />{t('Delete')}</button>
                        </div>
                      )}
                    </div>
                    <span role="cell">
                      {editingTaskId === item.id
                        ? <label className={`routine-category-select routine-category-${badgeColors[taskEdit.category] || 'slate'}`}>
                          <span className="routine-visually-hidden">{t('Edit task badge')}</span>
                          <select aria-label={t('Edit task badge')} value={taskEdit.category} onChange={(event) => setTaskEdit({ ...taskEdit, category: event.target.value })} disabled={saving}>
                            <option value="Health">{badgeLabel('Health')}</option>
                            <option value="Work">{badgeLabel('Work')}</option>
                            <option value="Personal">{badgeLabel('Personal')}</option>
                            <option value="General">{badgeLabel('General')}</option>
                            {customBadges.map((badge) => <option key={badge.name} value={badge.name}>{badge.name}</option>)}
                          </select>
                        </label>
                        : <span className={`routine-badge routine-badge-${badgeColors[item.category] || 'slate'}`}>{badgeLabel(item.category)}</span>}
                    </span>
                    <span className="routine-done-cell" role="cell">
                      {editingTaskId === item.id
                        ? <div className="routine-edit-actions">
                          <button type="submit" className="routine-edit-save" aria-label={t('Save task edit')} disabled={saving}><Check size={14} aria-hidden="true" /></button>
                          <button type="button" className="routine-edit-cancel" aria-label={t('Cancel task edit')} onClick={cancelTaskEdit} disabled={saving}><X size={14} aria-hidden="true" /></button>
                        </div>
                        : <button
                          type="button"
                          className={`routine-checkbox ${item.done ? 'routine-checkbox-checked' : ''}`}
                          aria-label={`${t(item.done ? 'Mark incomplete' : 'Mark complete')}: ${item.task}`}
                          aria-pressed={item.done}
                          onClick={() => toggleTask(item.id)}
                          disabled={saving}
                        >
                          {item.done && <Check size={12} aria-hidden="true" />}
                        </button>}
                    </span>
                  </form>
                ))}
                {!selectedRoutine.length && <p className="routine-empty">{t('No routine for this day')}</p>}
                <form className="routine-add-form routine-row" onSubmit={addTask} role="row">
                  <label className="routine-time-input" role="cell">
                    <span className="routine-visually-hidden">{t('Task time')}</span>
                    <input type="time" value={newTime} onChange={(event) => setNewTime(event.target.value)} aria-label={t('Task time')} required disabled={saving || !isDateAllowed(selectedDate)} />
                  </label>
                  <label className="routine-task-input" role="cell">
                    <span className="routine-visually-hidden">{t('New task')}</span>
                    <input value={newTask} onChange={(event) => setNewTask(event.target.value)} placeholder={t('Type a task...')} aria-label={t('Add a new task...')} maxLength="120" required disabled={saving || !isDateAllowed(selectedDate)} />
                  </label>
                  <label className={`routine-category-select routine-category-${badgeColors[newCategory] || 'slate'}`} role="cell">
                    <span className="routine-visually-hidden">{t('Task badge')}</span>
                    <select aria-label={t('Task badge')} value={newCategory} onChange={(event) => setNewCategory(event.target.value)} disabled={saving || !isDateAllowed(selectedDate)}>
                      <option value="Health">{badgeLabel('Health')}</option>
                      <option value="Work">{badgeLabel('Work')}</option>
                      <option value="Personal">{badgeLabel('Personal')}</option>
                      <option value="General">{badgeLabel('General')}</option>
                      {customBadges.map((badge) => <option key={badge.name} value={badge.name}>{badge.name}</option>)}
                    </select>
                  </label>
                  <span className="routine-done-cell" role="cell">
                    <button type="submit" className="routine-add-button" aria-label={t('Add task')} disabled={saving || !isDateAllowed(selectedDate)}><Plus size={19} aria-hidden="true" /></button>
                  </span>
                </form>
              </div>
            </div>
            <div className="routine-badge-manager">
              <button
                type="button"
                className="routine-create-badge-button"
                aria-expanded={isBadgeFormOpen}
                onClick={() => setIsBadgeFormOpen((isOpen) => !isOpen)}
                disabled={saving}
              >
                <Plus size={13} aria-hidden="true" />{isBadgeFormOpen ? t('Cancel') : t('Add badge')}
              </button>
              {isBadgeFormOpen && <form className="routine-custom-badge-form" onSubmit={addCustomBadge}>
                <label className="routine-custom-badge-name">
                  <span className="routine-visually-hidden">{t('New badge name')}</span>
                  <input
                    aria-label={t('New badge name')}
                    placeholder={t('Badge name')}
                    value={newBadgeName}
                    onChange={(event) => setNewBadgeName(event.target.value)}
                    maxLength="24"
                    required
                    disabled={saving}
                  />
                </label>
                <label className="routine-custom-badge-color">
                  <span className="routine-visually-hidden">{t('New badge color')}</span>
                  <select aria-label={t('New badge color')} value={newBadgeColor} onChange={(event) => setNewBadgeColor(event.target.value)} disabled={saving}>
                    <option value="emerald">{t('Emerald')}</option>
                    <option value="indigo">{t('Indigo')}</option>
                    <option value="amber">{t('Amber')}</option>
                    <option value="slate">{t('Slate')}</option>
                  </select>
                </label>
                <button type="submit" className="routine-create-badge-button" aria-label={t('Create badge')} disabled={saving}>{t('Create')}</button>
              </form>}
              {isBadgeFormOpen && customBadges.length > 0 && <div className="routine-custom-badge-list" aria-label={t('Your custom badges')}>
                {customBadges.map((badge) => (
                  <div className="routine-custom-badge-item" key={badge.name}>
                    <span className={`routine-badge routine-badge-${badge.color}`}>{badge.name}</span>
                    {pendingBadgeDeletion === badge.name
                      ? <span className="routine-badge-delete-confirm">
                        <span>{t('Tasks using this badge will become General.')}</span>
                        <button type="button" onClick={() => deleteCustomBadge(badge.name)} disabled={saving}>{t('Delete')}</button>
                        <button type="button" aria-label={`${t('Cancel deleting')} ${badge.name}`} onClick={() => setPendingBadgeDeletion(null)} disabled={saving}>{t('Cancel')}</button>
                      </span>
                      : <button type="button" className="routine-badge-delete-button" aria-label={language === 'en' ? `Delete ${badge.name} badge` : `${badge.name} ${t('Belgini o‘chirish')}`} onClick={() => setPendingBadgeDeletion(badge.name)} disabled={saving}><Trash2 size={13} aria-hidden="true" /></button>}
                  </div>
                ))}
              </div>}
            </div>
          </section>}
        </div>
      </div>
    </div>
  );
}

export default RoutinePage;
