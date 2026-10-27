import { useCallback, useEffect, useRef, useState } from 'react';

const presets = [25, 50, 5];

function FocusPage({ onSessionComplete }) {
  const [minutes, setMinutes] = useState(25);
  const [remaining, setRemaining] = useState(25 * 60);
  const [running, setRunning] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [completedPending, setCompletedPending] = useState(false);
  const onCompleteRef = useRef(onSessionComplete);
  const circumference = 2 * Math.PI * 138;
  const progress = 1 - remaining / (minutes * 60);

  useEffect(() => { onCompleteRef.current = onSessionComplete; }, [onSessionComplete]);

  const saveCompletedSession = useCallback(async () => {
    setSaving(true);
    setError('');
    try {
      await onCompleteRef.current(minutes);
      setCompletedPending(false);
      setRemaining(minutes * 60);
    } catch (saveError) {
      console.error('Fokus sessiyasini saqlashda xatolik:', saveError);
      setCompletedPending(true);
      setError(saveError.message || 'Sessiyani saqlab bo‘lmadi. Qayta urinib ko‘ring.');
    } finally {
      setSaving(false);
    }
  }, [minutes]);

  useEffect(() => {
    if (!running) return undefined;
    if (remaining <= 0) {
      setRunning(false);
      if (minutes === 5) {
        setRemaining(minutes * 60);
      } else {
        saveCompletedSession();
      }
      return undefined;
    }
    const timerId = window.setInterval(() => setRemaining((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(timerId);
  }, [minutes, remaining, running, saveCompletedSession]);

  const changeDuration = (value) => {
    if (saving) return;
    setRunning(false);
    setMinutes(value);
    setRemaining(value * 60);
    setError('');
    setCompletedPending(false);
  };
  const reset = () => {
    if (saving) return;
    setRunning(false);
    setRemaining(minutes * 60);
    setError('');
    setCompletedPending(false);
  };
  const displayTime = `${String(Math.floor(remaining / 60)).padStart(2, '0')}:${String(remaining % 60).padStart(2, '0')}`;

  return (
    <div className="page-content focus-page">
      <div className="page-intro"><div><span className="eyebrow">CHALG‘ITUVCHILARSIZ VAQT</span><h2>Diqqat vaqti</h2><p>Bitta vazifani tanlang va unga to‘liq e’tibor qarating.</p></div></div>
      <div className="focus-layout">
        <section className="surface-card focus-timer-card">
          <div className="timer-presets">{presets.map((preset) => <button key={preset} className={minutes === preset ? 'preset-active' : ''} onClick={() => changeDuration(preset)} disabled={saving || completedPending}>{preset === 5 ? 'Tanaffus' : `${preset} daqiqa`}</button>)}</div>
          <div className="timer-wrap">
            <svg viewBox="0 0 300 300" role="img" aria-label={`${displayTime} qoldi`}>
              <circle className="timer-track" cx="150" cy="150" r="138" />
              <circle className="timer-progress" cx="150" cy="150" r="138" strokeDasharray={circumference} strokeDashoffset={circumference * (1 - progress)} />
            </svg>
            <div className="timer-value"><strong>{displayTime}</strong><span>{saving ? 'Sessiya saqlanmoqda...' : minutes === 5 ? 'Tanaffus vaqti' : running ? 'Diqqat jamlanmoqda' : completedPending ? 'Sessiya tugadi' : 'Tayyor bo‘lsangiz boshlang'}</span></div>
          </div>
          <div className="timer-actions">{completedPending ? <button className="button button-primary timer-start" onClick={saveCompletedSession} disabled={saving}>{saving ? 'Saqlanmoqda...' : 'Saqlashni qayta urinish'}</button> : <button className="button button-primary timer-start" onClick={() => setRunning((value) => !value)} disabled={saving}><i className={`ph ${running ? 'ph-pause' : 'ph-play'}`} />{running ? 'Pauza' : 'Boshlash'}</button>}<button className="button button-secondary" onClick={reset} disabled={saving || completedPending}><i className="ph ph-arrow-counter-clockwise" /> Qayta boshlash</button></div>
          {error && <p className="form-error" role="alert">{error}</p>}
          <p className="timer-hint"><i className="ph ph-lightbulb" /> Kichik maslahat: boshlashdan oldin telefoningizni chetga qo‘ying.</p>
        </section>
        <aside className="focus-aside">
          <section className="surface-card focus-guide"><span className="promo-icon"><i className="ph ph-brain" /></span><span className="eyebrow">POMODORO USULI</span><h3>Chuqur ish uchun vaqt ajrating</h3><p>25 daqiqa diqqat bilan ishlang, keyin qisqa tanaffus qiling. Takrorlang — natijani sezasiz.</p></section>
          <section className="surface-card focus-rule"><i className="ph ph-quotes" /><blockquote>“Yaxshi boshlangan ish — yarim bitgan ish.”</blockquote><span>Bugungi eslatma</span></section>
        </aside>
      </div>
    </div>
  );
}

export default FocusPage;
