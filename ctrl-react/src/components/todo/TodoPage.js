import { useEffect, useMemo, useRef, useState } from 'react';
import { createId } from '../../utils/helpers';
import { isTodoUrgent } from '../../utils/todoDeadlines';
import { isCompletedTaskOlderThan } from '../../utils/taskRetention';
import { translate } from '../../utils/language';
import Skeleton from '../ui/Skeleton';

const priorities = [
  { value: 'high', label: 'Yuqori' },
  { value: 'medium', label: 'O‘rta' },
  { value: 'low', label: 'Past' },
];

const getDateKey = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getQuickDueDates = () => {
  const today = new Date();
  const tomorrow = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
  const daysUntilMonday = (8 - today.getDay()) % 7 || 7;
  const nextMonday = new Date(today.getFullYear(), today.getMonth(), today.getDate() + daysUntilMonday);
  return [
    { label: 'Bugun', value: getDateKey(today) },
    { label: 'Ertaga', value: getDateKey(tomorrow) },
    { label: 'Keyingi dushanba', value: getDateKey(nextMonday) },
  ];
};

function TodoPage({ todos, onChange, onStartFocus, isLoading = false, language = 'uz' }) {
  const t = (text) => translate(text, language);
  const translatedPriorities = priorities.map((priority) => ({ ...priority, label: t(priority.label) }));
  const [filter, setFilter] = useState('all');
  const [query, setQuery] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', dueDate: '', priority: 'medium' });
  const [editingId, setEditingId] = useState(null);
  const [expandedTodoId, setExpandedTodoId] = useState(null);
  const [isCompactLayout, setIsCompactLayout] = useState(() => (
    typeof window !== 'undefined'
    && window.matchMedia?.('(max-width: 760px)').matches
  ));
  const [editForm, setEditForm] = useState({ title: '', description: '', dueDate: '', priority: 'medium' });
  const [currentTime, setCurrentTime] = useState(() => new Date());
  const [warningTodoId, setWarningTodoId] = useState(null);
  const addTaskRef = useRef(null);
  const quickDueDates = getQuickDueDates();

  useEffect(() => {
    const intervalId = window.setInterval(() => setCurrentTime(new Date()), 30 * 1000);
    return () => window.clearInterval(intervalId);
  }, []);

  useEffect(() => {
    if (!window.matchMedia) return undefined;
    const mediaQuery = window.matchMedia('(max-width: 760px)');
    const updateLayout = () => setIsCompactLayout(mediaQuery.matches);
    updateLayout();
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', updateLayout);
      return () => mediaQuery.removeEventListener('change', updateLayout);
    }
    mediaQuery.addListener?.(updateLayout);
    return () => mediaQuery.removeListener?.(updateLayout);
  }, []);

  const activeTodos = useMemo(() => todos.filter((todo) => !isCompletedTaskOlderThan(todo, 7, currentTime)), [currentTime, todos]);
  const visibleTodos = useMemo(() => activeTodos.filter((todo) => {
    const matchesStatus = filter === 'all' || todo.status === filter;
    const matchesQuery = `${todo.title} ${todo.description || ''}`.toLowerCase().includes(query.toLowerCase());
    return matchesStatus && matchesQuery;
  }), [activeTodos, filter, query]);

  const saveTodos = async (nextTodos) => {
    setError('');
    setSaving(true);
    try {
      await onChange(nextTodos);
      return true;
    } catch (saveError) {
      console.error('Vazifalarni saqlashda xatolik:', saveError);
      setError('Vazifalarni saqlab bo‘lmadi. Qayta urinib ko‘ring.');
      return false;
    } finally {
      setSaving(false);
    }
  };

  const addTodo = async (event) => {
    event.preventDefault();
    if (!form.title.trim()) {
      setError('Vazifa nomini kiriting.');
      return;
    }
    const saved = await saveTodos([{
      ...form,
      title: form.title.trim(),
      id: createId(),
      status: 'open',
      createdAt: new Date().toISOString(),
    }, ...todos]);
    if (saved) setForm({ title: '', description: '', dueDate: '', priority: 'medium' });
  };

  const toggleTodo = (id) => saveTodos(todos.map((todo) => {
    if (todo.id !== id) return todo;
    if (todo.status === 'done') {
      const { completedAt, ...reopenedTodo } = todo;
      return { ...reopenedTodo, status: 'open' };
    }
    return { ...todo, status: 'done', completedAt: getDateKey(new Date()) };
  }));
  const removeTodo = (id) => saveTodos(todos.filter((todo) => todo.id !== id));
  const startEditing = (todo) => {
    setError('');
    setEditingId(todo.id);
    setExpandedTodoId(todo.id);
    setEditForm({
      title: todo.title,
      description: todo.description || '',
      dueDate: todo.dueDate || '',
      priority: priorities.some(({ value }) => value === todo.priority) ? todo.priority : 'medium',
    });
  };
  const saveEdit = async () => {
    if (!editForm.title.trim()) {
      setError('Vazifa nomi bo‘sh bo‘lishi mumkin emas.');
      return;
    }
    const saved = await saveTodos(todos.map((todo) => (
      todo.id === editingId
        ? { ...todo, ...editForm, title: editForm.title.trim(), description: editForm.description.trim() }
        : todo
    )));
    if (saved) setEditingId(null);
  };
  const toggleTodoDetails = (id) => setExpandedTodoId((current) => (current === id ? null : id));
  const scrollToTaskForm = () => addTaskRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'start' });

  const renderQuickDueDates = (setTargetForm, selectedDate, disabled) => (
    <div className="todo-quick-dates" role="group" aria-label={t('Muddatni tez tanlash')}>
      {quickDueDates.map(({ label, value }) => (
        <button
          key={label}
          type="button"
          className={`todo-quick-date ${selectedDate === value ? 'todo-quick-date-active' : ''}`}
          aria-pressed={selectedDate === value}
          onClick={() => setTargetForm((current) => ({ ...current, dueDate: value }))}
          disabled={disabled}
        >
          {t(label)}
        </button>
      ))}
    </div>
  );

  return (
    <div className={`page-content todo-page ${isLoading ? 'page-content-loading' : 'page-content-loaded'}`}>
      {isLoading ? (
        <div className="todo-layout todo-skeleton" role="status" aria-label={t('Vazifalar yuklanmoqda')}>
          <section className="surface-card todo-list-panel">
            <div className="todo-toolbar">
              <div className="todo-skeleton-filters">
                <Skeleton className="skeleton-filter" />
                <Skeleton className="skeleton-filter" />
                <Skeleton className="skeleton-filter" />
              </div>
              <Skeleton className="skeleton-search" />
            </div>
            <div className="todo-items">
              {Array.from({ length: 4 }, (_, index) => (
                <div className="todo-skeleton-row" key={index}>
                  <Skeleton className="skeleton-circle" />
                  <div className="todo-skeleton-copy">
                    <Skeleton className="skeleton-line skeleton-line-title" />
                    <Skeleton className="skeleton-line skeleton-line-short" />
                  </div>
                  <Skeleton className="skeleton-square" />
                </div>
              ))}
            </div>
          </section>
          <aside className="surface-card add-task-card todo-skeleton-form">
            <Skeleton className="skeleton-line skeleton-line-short" />
            <Skeleton className="skeleton-line skeleton-line-heading" />
            <Skeleton className="skeleton-line skeleton-line-wide" />
            <Skeleton className="skeleton-form-field" />
            <Skeleton className="skeleton-form-field" />
            <Skeleton className="skeleton-form-button" />
          </aside>
        </div>
      ) : (
      <>
      <div className="mobile-add-prompt">
        <p>{t('Yangi vazifa qo‘shmoqchimisiz?')}</p>
        <button type="button" className="button button-primary" onClick={scrollToTaskForm}><i className="ph ph-plus" /> {t('Yangi vazifa')}</button>
      </div>
      <div className="todo-layout">
        <section className="surface-card todo-list-panel">
          <div className="todo-toolbar"><div className="filter-tabs" role="group" aria-label={t('Vazifalarni saralash')}>{[['all', 'Barchasi'], ['open', 'Ochiq'], ['done', 'Bajarilgan']].map(([value, label]) => <button key={value} className={filter === value ? 'filter-active' : ''} onClick={() => setFilter(value)}>{t(label)}<span>{value === 'all' ? activeTodos.length : activeTodos.filter((todo) => todo.status === value).length}</span></button>)}</div><label className="search-field"><i className="ph ph-magnifying-glass" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t('Vazifani qidirish')} /></label></div>
          <div className="todo-items">
            {visibleTodos.map((todo) => {
              const urgent = isTodoUrgent(todo, currentTime);
              const expanded = expandedTodoId === todo.id;
              return <article key={todo.id} className={`todo-item ${todo.status === 'done' ? 'todo-item-done' : ''} ${urgent ? 'todo-item-urgent' : ''} ${expanded ? 'todo-item-expanded' : ''}`}>
              <button className={`todo-check ${todo.status === 'done' ? 'todo-check-active' : ''}`} aria-label={t(todo.status === 'done' ? 'Bajarilmagan deb belgilash' : 'Bajarildi deb belgilash')} onClick={() => toggleTodo(todo.id)} disabled={saving}><i className="ph ph-check" /></button>
              {editingId === todo.id ? (
                <div className="todo-item-copy todo-edit-fields">
                  <input aria-label={t('Vazifa nomini tahrirlash')} value={editForm.title} onChange={(event) => setEditForm({ ...editForm, title: event.target.value })} maxLength="120" disabled={saving} />
                  <textarea aria-label={t('Izohni tahrirlash')} value={editForm.description} onChange={(event) => setEditForm({ ...editForm, description: event.target.value })} maxLength="500" rows="2" disabled={saving} />
                  <input aria-label={t('Muddatni tahrirlash')} type="date" value={editForm.dueDate} onChange={(event) => setEditForm({ ...editForm, dueDate: event.target.value })} disabled={saving} />
                  {renderQuickDueDates(setEditForm, editForm.dueDate, saving)}
                  <select aria-label={t('Muhimlik darajasini tahrirlash')} value={editForm.priority} onChange={(event) => setEditForm({ ...editForm, priority: event.target.value })} disabled={saving}>
                    {translatedPriorities.map((priority) => <option key={priority.value} value={priority.value}>{priority.label}</option>)}
                  </select>
                </div>
              ) : (
                <div className="todo-item-copy">
                  <h3 className="todo-title-row" aria-label={todo.title}>
                    <button type="button" className="todo-summary" aria-label={`${todo.title}, ${translatedPriorities.find(({ value }) => value === todo.priority)?.label || t('O‘rta')}, ${t(expanded ? 'Batafsilni yopish' : 'Batafsil ko‘rish')}`} aria-expanded={!isCompactLayout || expanded} aria-controls={`todo-details-${todo.id}`} onClick={() => toggleTodoDetails(todo.id)}>
                      <span className="todo-summary-title">{todo.title}</span>
                      <span className={`todo-priority todo-priority-${priorities.some(({ value }) => value === todo.priority) ? todo.priority : 'medium'}`}>{translatedPriorities.find(({ value }) => value === todo.priority)?.label || t('O‘rta')}</span>
                      <i className="ph ph-caret-down todo-expand-icon" aria-hidden="true" />
                    </button>
                  </h3>
                  <div className="todo-primary-meta">
                    {todo.status !== 'done' && <button className="todo-focus-button" type="button" aria-label={`${todo.title} ${t('uchun diqqat vaqtini boshlash')}`} onClick={() => onStartFocus?.(todo)} disabled={saving}><i className="ph ph-play" aria-hidden="true" /><span>{t('Pomodoro')}</span></button>}
                  </div>
                  <div className={`todo-details ${expanded ? 'todo-details-expanded' : ''}`} id={`todo-details-${todo.id}`} aria-hidden={isCompactLayout ? !expanded : undefined}>
                    {todo.description && <p>{todo.description}</p>}
                    {todo.dueDate && <span className={`todo-due ${urgent ? 'todo-due-urgent' : ''}`}><i className="ph ph-clock" /> {todo.dueDate}</span>}
                    {todo.focusMinutes > 0 && <span className="todo-focus-time"><i className="ph ph-timer" /> {t('Fokus:')} {todo.focusMinutes} {t('daq')}</span>}
                    {urgent && <div className="todo-deadline-details"><button className="todo-deadline-alert" type="button" aria-label={`${todo.title} ${t('uchun muddat ogohlantirishi')}`} aria-expanded={warningTodoId === todo.id} onClick={() => setWarningTodoId((current) => current === todo.id ? null : todo.id)}><i className="ph ph-warning-circle" aria-hidden="true" /></button>{warningTodoId === todo.id && <p className="todo-deadline-warning" role="alert">{t('Bu vazifani bugun soat 23:59 gacha bajaring. Bajarilmasa, avtomatik o‘chiriladi.')}</p>}</div>}
                  </div>
                </div>
              )}
              {editingId === todo.id ? (
                <div className="todo-actions">
                  <button className="icon-button" aria-label={t('Vazifa tahririni saqlash')} onClick={saveEdit} disabled={saving}><i className="ph ph-check" /></button>
                  <button className="icon-button" aria-label={t('Tahrirni bekor qilish')} onClick={() => setEditingId(null)} disabled={saving}><i className="ph ph-x" /></button>
                </div>
              ) : (
                <div className="todo-actions">
                  <button className="icon-button" aria-label={`${todo.title} ${t('vazifasini tahrirlash')}`} onClick={() => startEditing(todo)} disabled={saving}><i className="ph ph-pencil-simple" /></button>
                  <button className="icon-button danger-button" aria-label={`${todo.title} ${t('vazifasini o‘chirish')}`} onClick={() => removeTodo(todo.id)} disabled={saving}><i className="ph ph-trash" /></button>
                </div>
              )}
            </article>;
            })}
            {!visibleTodos.length && <div className="empty-state"><i className="ph ph-notepad" /><p>{t(query ? 'Qidiruv bo‘yicha vazifa topilmadi.' : 'Bu ro‘yxatda hali vazifa yo‘q.')}</p></div>}
          </div>
        </section>
        <aside className="surface-card add-task-card" ref={addTaskRef}><h3>{t('Vazifa qo‘shish')}</h3>
          <form className="form-stack" onSubmit={addTodo}>
            <label>{t('Vazifa nomi')}<input name="title" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder={t('Masalan, kitob o‘qish')} maxLength="120" required disabled={saving} /></label>
            <label>{t('Izoh')} <span className="optional">{t('(ixtiyoriy)')}</span><textarea rows="3" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder={t('Qo‘shimcha ma’lumot...')} maxLength="500" disabled={saving} /></label>
            <label>{t('Muddat')} <span className="optional">{t('(ixtiyoriy)')}</span><input type="date" value={form.dueDate} onChange={(event) => setForm({ ...form, dueDate: event.target.value })} disabled={saving} /></label>
            {renderQuickDueDates(setForm, form.dueDate, saving)}
            <label>{t('Muhimlik darajasi')}<select value={form.priority} onChange={(event) => setForm({ ...form, priority: event.target.value })} disabled={saving}>{translatedPriorities.map((priority) => <option key={priority.value} value={priority.value}>{priority.label}</option>)}</select></label>
            {error && <p className="form-error" role="alert">{t(error)}</p>}
            <button className="button button-primary button-wide" disabled={saving}><i className="ph ph-plus" /> {t(saving ? 'Saqlanmoqda...' : 'Vazifa yaratish')}</button>
          </form>
        </aside>
      </div>
      </>
      )}
    </div>
  );
}

export default TodoPage;
