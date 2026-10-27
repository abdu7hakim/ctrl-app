import { useEffect, useMemo, useState } from 'react';
import { createId } from '../../utils/helpers';
import { isTodoUrgent } from '../../utils/todoDeadlines';

function TodoPage({ todos, onChange }) {
  const [filter, setFilter] = useState('all');
  const [query, setQuery] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', dueDate: '' });
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ title: '', description: '', dueDate: '' });
  const [currentTime, setCurrentTime] = useState(() => new Date());
  const [warningTodoId, setWarningTodoId] = useState(null);

  useEffect(() => {
    const intervalId = window.setInterval(() => setCurrentTime(new Date()), 30 * 1000);
    return () => window.clearInterval(intervalId);
  }, []);

  const visibleTodos = useMemo(() => todos.filter((todo) => {
    const matchesStatus = filter === 'all' || todo.status === filter;
    const matchesQuery = `${todo.title} ${todo.description || ''}`.toLowerCase().includes(query.toLowerCase());
    return matchesStatus && matchesQuery;
  }), [filter, query, todos]);

  const saveTodos = async (nextTodos) => {
    setError('');
    setSaving(true);
    try {
      await onChange(nextTodos);
      return true;
    } catch (saveError) {
      console.error('Vazifalarni saqlashda xatolik:', saveError);
      setError(saveError.message || 'Vazifalarni saqlab bo‘lmadi. Qayta urinib ko‘ring.');
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
    if (saved) setForm({ title: '', description: '', dueDate: '' });
  };

  const toggleTodo = (id) => saveTodos(todos.map((todo) => todo.id === id ? { ...todo, status: todo.status === 'done' ? 'open' : 'done' } : todo));
  const removeTodo = (id) => saveTodos(todos.filter((todo) => todo.id !== id));
  const startEditing = (todo) => {
    setError('');
    setEditingId(todo.id);
    setEditForm({ title: todo.title, description: todo.description || '', dueDate: todo.dueDate || '' });
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

  return (
    <div className="page-content">
      <div className="todo-layout">
        <section className="surface-card todo-list-panel">
          <div className="todo-toolbar"><div className="filter-tabs" role="group" aria-label="Vazifalarni saralash">{[['all', 'Barchasi'], ['open', 'Ochiq'], ['done', 'Bajarilgan']].map(([value, label]) => <button key={value} className={filter === value ? 'filter-active' : ''} onClick={() => setFilter(value)}>{label}<span>{value === 'all' ? todos.length : todos.filter((todo) => todo.status === value).length}</span></button>)}</div><label className="search-field"><i className="ph ph-magnifying-glass" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Vazifani qidirish" /></label></div>
          <div className="todo-items">
            {visibleTodos.map((todo) => {
              const urgent = isTodoUrgent(todo, currentTime);
              return <article key={todo.id} className={`todo-item ${todo.status === 'done' ? 'todo-item-done' : ''} ${urgent ? 'todo-item-urgent' : ''}`}>
              <button className={`todo-check ${todo.status === 'done' ? 'todo-check-active' : ''}`} aria-label={todo.status === 'done' ? 'Bajarilmagan deb belgilash' : 'Bajarildi deb belgilash'} onClick={() => toggleTodo(todo.id)} disabled={saving}><i className="ph ph-check" /></button>
              {editingId === todo.id ? (
                <div className="todo-item-copy todo-edit-fields">
                  <input aria-label="Vazifa nomini tahrirlash" value={editForm.title} onChange={(event) => setEditForm({ ...editForm, title: event.target.value })} maxLength="120" disabled={saving} />
                  <textarea aria-label="Izohni tahrirlash" value={editForm.description} onChange={(event) => setEditForm({ ...editForm, description: event.target.value })} maxLength="500" rows="2" disabled={saving} />
                  <input aria-label="Muddatni tahrirlash" type="date" value={editForm.dueDate} onChange={(event) => setEditForm({ ...editForm, dueDate: event.target.value })} disabled={saving} />
                </div>
              ) : (
                <div className="todo-item-copy">
                  <h3>{todo.title}</h3>
                  {todo.description && <p>{todo.description}</p>}
                  {todo.dueDate && <span className={`todo-due ${urgent ? 'todo-due-urgent' : ''}`}><i className="ph ph-clock" /> {todo.dueDate}</span>}
                  {urgent && warningTodoId === todo.id && <p className="todo-deadline-warning" role="alert">Bu vazifani bugun soat 23:59 gacha bajaring. Bajarilmasa, avtomatik o‘chiriladi.</p>}
                </div>
              )}
              {editingId !== todo.id && urgent && <button className="todo-deadline-alert" type="button" aria-label={`${todo.title} uchun muddat ogohlantirishi`} aria-expanded={warningTodoId === todo.id} onClick={() => setWarningTodoId((current) => current === todo.id ? null : todo.id)}><i className="ph ph-warning-circle" aria-hidden="true" /></button>}
              {editingId === todo.id ? (
                <>
                  <button className="icon-button" aria-label="Vazifa tahririni saqlash" onClick={saveEdit} disabled={saving}><i className="ph ph-check" /></button>
                  <button className="icon-button" aria-label="Tahrirni bekor qilish" onClick={() => setEditingId(null)} disabled={saving}><i className="ph ph-x" /></button>
                </>
              ) : (
                <>
                  <button className="icon-button" aria-label={`${todo.title} vazifasini tahrirlash`} onClick={() => startEditing(todo)} disabled={saving}><i className="ph ph-pencil-simple" /></button>
                  <button className="icon-button danger-button" aria-label={`${todo.title} vazifasini o‘chirish`} onClick={() => removeTodo(todo.id)} disabled={saving}><i className="ph ph-trash" /></button>
                </>
              )}
            </article>;
            })}
            {!visibleTodos.length && <div className="empty-state"><i className="ph ph-notepad" /><p>{query ? 'Qidiruv bo‘yicha vazifa topilmadi.' : 'Bu ro‘yxatda hali vazifa yo‘q.'}</p></div>}
          </div>
        </section>
        <aside className="surface-card add-task-card"><span className="eyebrow">YANGI REJA</span><h3>Vazifa qo‘shish</h3><p>Keyingi muhim qadamingiz nima?</p>
          <form className="form-stack" onSubmit={addTodo}>
            <label>Vazifa nomi<input autoFocus name="title" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="Masalan, kitob o‘qish" maxLength="120" required disabled={saving} /></label>
            <label>Izoh <span className="optional">(ixtiyoriy)</span><textarea rows="3" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder="Qo‘shimcha ma’lumot..." maxLength="500" disabled={saving} /></label>
            <label>Muddat <span className="optional">(ixtiyoriy)</span><input type="date" value={form.dueDate} onChange={(event) => setForm({ ...form, dueDate: event.target.value })} disabled={saving} /></label>
            {error && <p className="form-error" role="alert">{error}</p>}
            <button className="button button-primary button-wide" disabled={saving}><i className="ph ph-plus" /> {saving ? 'Saqlanmoqda...' : 'Vazifa yaratish'}</button>
          </form>
        </aside>
      </div>
    </div>
  );
}

export default TodoPage;
