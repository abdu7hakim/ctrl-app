import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Plus, Check, Clock, Tag } from 'lucide-react';

const defaultBadgeColors = {
  Health: 'emerald',
  Work: 'indigo',
  Personal: 'amber',
  General: 'slate',
};

const weekdays = [
  { label: 'Du', name: 'Monday', index: 0 },
  { label: 'Se', name: 'Tuesday', index: 1 },
  { label: 'Cho', name: 'Wednesday', index: 2 },
  { label: 'Pa', name: 'Thursday', index: 3 },
  { label: 'Ju', name: 'Friday', index: 4 },
  { label: 'Sha', name: 'Saturday', index: 5 },
  { label: 'Ya', name: 'Sunday', index: 6 },
];

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

function RoutinePage({ routines, routineBadges: savedBadges, onSave }) {
  const [today, setToday] = useState(() => new Date());
  const [routine, setRoutine] = useState(() => routines || (onSave ? {} : makeInitialRoutine(today)));
  const [newTask, setNewTask] = useState('');
  const [newTime, setNewTime] = useState('08:00');
  const [newCategory, setNewCategory] = useState('General');
  const [customBadges, setCustomBadges] = useState(() => savedBadges || []);
  const [newBadgeName, setNewBadgeName] = useState('');
  const [newBadgeColor, setNewBadgeColor] = useState('slate');
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
        setSaveError(error.message || 'Routine’ni saqlab bo‘lmadi. Internet aloqasini tekshiring.');
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
      ? `Routine saved for ${copiedDateCount} ${copiedDateCount === 1 ? 'day' : 'days'}.`
      : 'Routine saved for the selected date.');
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
      return;
    }

    const nextBadges = [...currentBadges, { name, color: newBadgeColor }];
    const result = persistRoutine(routineRef.current, nextBadges);
    const applyBadge = () => {
      setNewCategory(name);
      setNewBadgeName('');
    };
    if (result === true) applyBadge();
    else result.then((saved) => { if (saved) applyBadge(); });
  };

  const monthLabel = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(calendarMonth);
  const selectedLabel = new Intl.DateTimeFormat('en-US', {
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
            <section className="routine-card routine-calendar-card" aria-label="Calendar">
              <div className="routine-card-heading">
                <div>
                  <span className="routine-eyebrow">YOUR SCHEDULE</span>
                  <h2>Calendar</h2>
                </div>
                <div className="routine-month-controls">
                  <button type="button" aria-label="Previous month" onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1))}><ChevronLeft size={15} aria-hidden="true" /></button>
                  <button type="button" aria-label="Next month" onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1))}><ChevronRight size={15} aria-hidden="true" /></button>
                </div>
              </div>
              <div className="routine-month-label">{monthLabel}</div>
              <div className="routine-calendar-grid" role="grid" aria-label={monthLabel}>
                {['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map((day) => (
                  <span className="routine-weekday" key={day} role="columnheader">{day}</span>
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
                      aria-label={cell.date.toLocaleDateString('en-US', { dateStyle: 'full' })}
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
              <div className="routine-calendar-legend"><i className="routine-calendar-dot" /> Routine scheduled</div>
            </section>

            <section className="routine-card routine-weekdays-card" aria-labelledby="routine-weekdays-title">
              <div className="routine-card-heading">
                <div>
                  <span className="routine-eyebrow">REPEAT YOUR ROUTINE</span>
                  <h2 id="routine-weekdays-title">Select Weekdays</h2>
                </div>
              </div>
              <div className="routine-weekday-options" role="group" aria-label="Select weekdays">
                {weekdays.map((weekday) => {
                  const isSelected = selectedWeekdays.includes(weekday.index);
                  return (
                    <button
                      type="button"
                      key={weekday.index}
                      className={`routine-weekday-option ${isSelected ? 'routine-weekday-option-selected' : ''}`}
                      aria-label={weekday.name}
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
                  <span className="routine-eyebrow">PLAN AHEAD</span>
                  <h2>Date range</h2>
                </div>
                <span className="routine-range-icon" aria-hidden="true">↗</span>
              </div>
              <div className="routine-range-inputs">
                <label>
                  <span>Start date</span>
                  <input aria-label="Start date" type="date" min={dateWindow.minDate} max={dateWindow.maxDate} value={startDate} onChange={(event) => setStartDate(event.target.value)} />
                </label>
                <label>
                  <span>End date</span>
                  <input aria-label="End date" type="date" min={startDate || dateWindow.minDate} max={dateWindow.maxDate} value={endDate} onChange={(event) => setEndDate(event.target.value)} />
                </label>
              </div>
              {Boolean(startDate) !== Boolean(endDate)
                ? <p className="routine-range-note routine-range-error" role="alert">Select both dates to apply a date range.</p>
                : rangeDays === -1
                ? <p className="routine-range-note routine-range-error" role="alert">End date must be on or after the start date.</p>
                : ((startDate && !isDateAllowed(startDate)) || (endDate && !isDateAllowed(endDate)))
                ? <p className="routine-range-note routine-range-error" role="alert">Choose dates within the current planning window.</p>
                : rangeDays && <p className="routine-range-note">Routine will apply for <strong>{rangeDays}</strong> {rangeDays === 1 ? 'day' : 'days'}.</p>}
              <button
                type="button"
                className="routine-save-button"
                onClick={saveRoutine}
                disabled={saving || !showRoutineTable || !selectedRoutine.length || (Boolean(startDate) !== Boolean(endDate)) || rangeDays === -1 || (startDate && !isDateAllowed(startDate)) || (endDate && !isDateAllowed(endDate))}
              >
                {saving ? 'Saving...' : 'Save Routine'}
              </button>
              {saveMessage && <p className="routine-save-message" role="status">{saveMessage}</p>}
              {saveError && <p className="routine-range-note routine-range-error" role="alert">{saveError}</p>}
            </section>
          </aside>

          {showRoutineTable && <section className="routine-card routine-table-card">
            <div className="routine-table-heading">
              <div>
                <span className="routine-eyebrow">A LITTLE PROGRESS, EVERY DAY</span>
                <h2>Daily Routine</h2>
                <p>{selectedLabel}</p>
              </div>
              <span className="routine-count">{selectedRoutine.filter((item) => item.done).length} / {selectedRoutine.length} done</span>
            </div>

            <div className="routine-table" role="table" aria-label="Daily routine">
              <div className="routine-table-header" role="row">
                <span className="routine-column-label" role="columnheader"><Clock size={12} aria-hidden="true" />Time</span>
                <span role="columnheader">Task</span>
                <span className="routine-column-label" role="columnheader"><Tag size={12} aria-hidden="true" />Badge</span>
                <span role="columnheader">Done</span>
              </div>
              <div className="routine-table-body">
                {selectedRoutine.map((item) => (
                  <div className={`routine-row ${item.done ? 'routine-row-done' : ''}`} role="row" key={item.id}>
                    <time className="routine-time" role="cell">{item.time}</time>
                    <span className="routine-task-name" role="cell">{item.task}</span>
                    <span role="cell"><span className={`routine-badge routine-badge-${badgeColors[item.category] || 'slate'}`}>{item.category}</span></span>
                    <span className="routine-done-cell" role="cell">
                      <button
                        type="button"
                        className={`routine-checkbox ${item.done ? 'routine-checkbox-checked' : ''}`}
                        aria-label={`${item.done ? 'Mark incomplete' : 'Mark complete'}: ${item.task}`}
                        aria-pressed={item.done}
                        onClick={() => toggleTask(item.id)}
                        disabled={saving}
                      >
                        {item.done && <Check size={12} aria-hidden="true" />}
                      </button>
                    </span>
                  </div>
                ))}
                {!selectedRoutine.length && <p className="routine-empty">No routine for this day</p>}
              </div>
            </div>

            <form className="routine-add-form" onSubmit={addTask}>
              <label className="routine-time-input">
                <span className="routine-visually-hidden">Task time</span>
                <input type="time" value={newTime} onChange={(event) => setNewTime(event.target.value)} aria-label="Task time" required disabled={saving || !isDateAllowed(selectedDate)} />
              </label>
              <label className="routine-task-input">
                <span className="routine-visually-hidden">New task</span>
                <input value={newTask} onChange={(event) => setNewTask(event.target.value)} placeholder="Add a new task..." aria-label="Add a new task..." maxLength="120" required disabled={saving || !isDateAllowed(selectedDate)} />
              </label>
              <label className={`routine-category-select routine-category-${badgeColors[newCategory] || 'slate'}`}>
                <span className="routine-visually-hidden">Task badge</span>
                <select aria-label="Task badge" value={newCategory} onChange={(event) => setNewCategory(event.target.value)} disabled={saving || !isDateAllowed(selectedDate)}>
                  <option value="Health">Health</option>
                  <option value="Work">Work</option>
                  <option value="Personal">Personal</option>
                  <option value="General">General</option>
                  {customBadges.map((badge) => <option key={badge.name} value={badge.name}>{badge.name}</option>)}
                </select>
              </label>
              <button type="submit" className="routine-add-button" aria-label="Add task" disabled={saving || !isDateAllowed(selectedDate)}><Plus size={19} aria-hidden="true" /></button>
            </form>
            <form className="routine-custom-badge-form" onSubmit={addCustomBadge}>
              <label className="routine-custom-badge-name">
                <span className="routine-visually-hidden">New badge name</span>
                <input
                  aria-label="New badge name"
                  placeholder="Create a badge..."
                  value={newBadgeName}
                  onChange={(event) => setNewBadgeName(event.target.value)}
                  maxLength="24"
                  disabled={saving}
                />
              </label>
              <label className="routine-custom-badge-color">
                <span className="routine-visually-hidden">New badge color</span>
                <select aria-label="New badge color" value={newBadgeColor} onChange={(event) => setNewBadgeColor(event.target.value)} disabled={saving}>
                  <option value="emerald">Emerald</option>
                  <option value="indigo">Indigo</option>
                  <option value="amber">Amber</option>
                  <option value="slate">Slate</option>
                </select>
              </label>
              <button type="submit" className="routine-create-badge-button" aria-label="Create badge" disabled={saving || !newBadgeName.trim()}>
                <Tag size={13} aria-hidden="true" /> Add badge
              </button>
            </form>
          </section>}
        </div>
      </div>
    </div>
  );
}

export default RoutinePage;
