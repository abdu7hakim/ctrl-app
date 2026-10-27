import { useState } from 'react';
import { createId } from '../../utils/helpers';

const colors = ['#7157e8', '#e47070', '#e9a23b', '#39a982', '#4b91d1', '#d35ca3'];
const todayKey = () => new Date().toLocaleDateString('en-CA');

function HabitsPage({ habits, onChange }) {
  const [name, setName] = useState('');
  const [goal, setGoal] = useState('');
  const [color, setColor] = useState(colors[0]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const today = todayKey();
  const doneCount = habits.filter((habit) => habit.completions?.[today]).length;

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
    const saved = await saveHabits([...habits, {
      id: createId(),
      name: name.trim(),
      goal: goal.trim(),
      color,
      completions: {},
      completedToday: false,
      createdAt: new Date().toISOString(),
    }]);
    if (saved) {
      setName('');
      setGoal('');
    }
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
      <div className="page-intro"><div><span className="eyebrow">IZCHILLIK — KALIT</span><h2>Odatlar</h2><p>Har kuni takrorlang. Kichik odatlar katta o‘zgarishlar yaratadi.</p></div><div className="habit-progress"><span className="habit-progress-ring" style={{ '--progress': `${habits.length ? (doneCount / habits.length) * 100 : 0}%` }}><strong>{habits.length ? Math.round((doneCount / habits.length) * 100) : 0}<small>%</small></strong></span><span>Bugungi natija</span></div></div>
      <div className="habits-layout">
        <section className="surface-card habits-list-card"><div className="section-heading"><div><span className="eyebrow">BUGUN</span><h3>Odatlarim <span className="heading-count">{doneCount}/{habits.length}</span></h3></div><span className="date-pill">{new Date().toLocaleDateString('uz-UZ', { weekday: 'long', day: 'numeric', month: 'long' })}</span></div>
          {habits.length ? <div className="habit-list">{habits.map((habit) => {
            const completed = Boolean(habit.completions?.[today]);
            return <article className={`habit-item ${completed ? 'habit-item-done' : ''}`} key={habit.id} style={{ '--habit-color': habit.color }}>
              <button className={`todo-check ${completed ? 'todo-check-active' : ''}`} aria-label={completed ? 'Bajarilmagan deb belgilash' : 'Bajarildi deb belgilash'} onClick={() => toggleHabit(habit.id)} disabled={saving}><i className="ph ph-check" /></button>
              <span className="habit-color-marker" />
              <div className="todo-item-copy"><h3>{habit.name}</h3>{habit.goal && <p><i className="ph ph-target" /> {habit.goal}</p>}</div>
              <span className={`habit-status ${completed ? 'habit-status-done' : ''}`}>{completed ? 'Bajarildi' : 'Bugun'}</span>
              <button className="icon-button danger-button" aria-label={`${habit.name} odatini o‘chirish`} onClick={() => removeHabit(habit.id)} disabled={saving}><i className="ph ph-trash" /></button>
            </article>;
          })}</div> : <div className="empty-state"><i className="ph ph-plant" /><p>Hali odat qo‘shilmagan. Birinchisini hoziroq yarating.</p></div>}
        </section>
        <aside className="surface-card add-task-card"><span className="eyebrow">YANGI ODAT</span><h3>Yaxshi odat yarating</h3><p>Maqsad sari muntazam kichik qadam qo‘ying.</p>
          <form className="form-stack" onSubmit={addHabit}>
            <label>Odat nomi<input value={name} onChange={(event) => setName(event.target.value)} placeholder="Masalan, ertalab sayr" maxLength="100" required disabled={saving} /></label>
            <label>Maqsad <span className="optional">(ixtiyoriy)</span><input value={goal} onChange={(event) => setGoal(event.target.value)} placeholder="Masalan, 20 daqiqa" maxLength="100" disabled={saving} /></label>
            <fieldset className="color-field" disabled={saving}><legend>Rang</legend><div className="color-options">{colors.map((option) => <button type="button" key={option} className={`color-option ${color === option ? 'color-option-active' : ''}`} style={{ backgroundColor: option }} aria-label={`${option} rang`} aria-pressed={color === option} onClick={() => setColor(option)} />)}</div></fieldset>
            {error && <p className="form-error" role="alert">{error}</p>}
            <button className="button button-primary button-wide" disabled={saving}><i className="ph ph-plus" /> {saving ? 'Saqlanmoqda...' : 'Odat qo‘shish'}</button>
          </form>
        </aside>
      </div>
    </div>
  );
}

export default HabitsPage;
