import { useCallback, useEffect, useRef, useState } from 'react';
import { playFocusAlarm } from '../../utils/focusAlarm';
import { createFocusMusic, focusMusicOptions } from '../../utils/focusMusic';

const soundOptions = [
  { id: 'bell', label: 'Qo‘ng‘iroq' },
  { id: 'chime', label: 'Ohang' },
  { id: 'digital', label: 'Raqamli' },
];

function isValidDuration(value) {
  return Number.isSafeInteger(value) && value > 0 && value <= Math.floor(Number.MAX_SAFE_INTEGER / 60);
}

function FocusPage({
  onSessionComplete,
  focusDurationMinutes,
  breakDurationMinutes,
  focusAlarmSound,
  focusBackgroundMusic,
  focusBackgroundTrack,
  onSavePreferences,
}) {
  const [mode, setMode] = useState('focus');
  const [focusDraft, setFocusDraft] = useState(String(focusDurationMinutes));
  const [breakDraft, setBreakDraft] = useState(String(breakDurationMinutes));
  const [soundDraft, setSoundDraft] = useState(focusAlarmSound);
  const [backgroundMusicDraft, setBackgroundMusicDraft] = useState(focusBackgroundMusic);
  const [backgroundTrackDraft, setBackgroundTrackDraft] = useState(focusBackgroundTrack);
  const [remaining, setRemaining] = useState(focusDurationMinutes * 60);
  const [running, setRunning] = useState(false);
  const [saving, setSaving] = useState(false);
  const [preferencesSaving, setPreferencesSaving] = useState(false);
  const [error, setError] = useState('');
  const [audioError, setAudioError] = useState('');
  const [completedPending, setCompletedPending] = useState(false);
  const [completedMinutes, setCompletedMinutes] = useState(focusDurationMinutes);
  const onCompleteRef = useRef(onSessionComplete);
  const onSavePreferencesRef = useRef(onSavePreferences);
  const audioContextRef = useRef(null);
  const activeDuration = mode === 'focus' ? focusDurationMinutes : breakDurationMinutes;
  const circumference = 2 * Math.PI * 138;
  const progress = 1 - remaining / (activeDuration * 60);

  useEffect(() => { onCompleteRef.current = onSessionComplete; }, [onSessionComplete]);
  useEffect(() => { onSavePreferencesRef.current = onSavePreferences; }, [onSavePreferences]);

  useEffect(() => {
    setFocusDraft(String(focusDurationMinutes));
    setBreakDraft(String(breakDurationMinutes));
    setSoundDraft(focusAlarmSound);
    setBackgroundMusicDraft(focusBackgroundMusic);
    setBackgroundTrackDraft(focusBackgroundTrack);
    if (!completedPending) {
      setRemaining((mode === 'focus' ? focusDurationMinutes : breakDurationMinutes) * 60);
    }
  }, [breakDurationMinutes, completedPending, focusAlarmSound, focusBackgroundMusic, focusBackgroundTrack, focusDurationMinutes, mode]);

  useEffect(() => () => {
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close();
    }
  }, []);

  const saveCompletedSession = useCallback(async (duration = completedMinutes) => {
    setSaving(true);
    setError('');
    try {
      await onCompleteRef.current(duration);
      setCompletedPending(false);
      setRemaining(duration * 60);
    } catch (saveError) {
      console.error('Fokus sessiyasini saqlashda xatolik:', saveError);
      setCompletedPending(true);
      setCompletedMinutes(duration);
      setError(saveError.message || 'Sessiyani saqlab bo‘lmadi. Qayta urinib ko‘ring.');
    } finally {
      setSaving(false);
    }
  }, [completedMinutes]);

  const playAlarm = useCallback(() => {
    try {
      playFocusAlarm(audioContextRef.current, focusAlarmSound);
      setAudioError('');
    } catch (audioErrorWhilePlaying) {
      console.error('Yakun signalini ijro etishda xatolik:', audioErrorWhilePlaying);
      setAudioError('Yakun signalini ijro etib bo‘lmadi. Brauzer ovoz sozlamalarini tekshiring.');
    }
  }, [focusAlarmSound]);

  useEffect(() => {
    if (!running) return undefined;
    if (remaining <= 0) {
      setRunning(false);
      playAlarm();
      if (mode === 'focus') {
        saveCompletedSession(activeDuration);
      } else {
        setRemaining(activeDuration * 60);
      }
      return undefined;
    }
    const timerId = window.setInterval(() => setRemaining((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(timerId);
  }, [activeDuration, mode, playAlarm, remaining, running, saveCompletedSession]);

  useEffect(() => {
    if (!running || !focusBackgroundMusic) return undefined;
    if (!audioContextRef.current) {
      setAudioError('Fon musiqasini ishga tushirib bo‘lmadi. Brauzeringiz audio qo‘llab-quvvatlashini tekshiring.');
      return undefined;
    }

    try {
      const playback = createFocusMusic(audioContextRef.current, focusBackgroundTrack);
      setAudioError('');
      return () => playback.stop();
    } catch (musicError) {
      console.error('Fon musiqasini ijro etishda xatolik:', musicError);
      setAudioError('Fon musiqasini ijro etib bo‘lmadi. Qayta urinib ko‘ring.');
      return undefined;
    }
  }, [focusBackgroundMusic, focusBackgroundTrack, running]);

  const start = () => {
    if (running) {
      setRunning(false);
      return;
    }

    setAudioError('');
    if (!audioContextRef.current) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) {
        try {
          audioContextRef.current = new AudioContextClass();
        } catch (audioContextError) {
          console.error('Ovoz qurilmasini ishga tushirishda xatolik:', audioContextError);
          setAudioError('Ovoz signalini yoqib bo‘lmadi. Brauzer ovoz sozlamalarini tekshiring.');
        }
      }
    }
    if (audioContextRef.current?.state === 'suspended') {
      audioContextRef.current.resume().catch((audioResumeError) => {
        console.error('Ovoz qurilmasini ishga tushirishda xatolik:', audioResumeError);
        setAudioError('Ovoz signalini yoqib bo‘lmadi. Brauzer ovoz sozlamalarini tekshiring.');
      });
    } else if (!audioContextRef.current) {
      setAudioError('Brauzeringiz ovozli signalni qo‘llab-quvvatlamaydi.');
    }
    setRunning(true);
  };

  const selectMode = (nextMode) => {
    if (running || saving || completedPending || mode === nextMode) return;
    setMode(nextMode);
    setRemaining((nextMode === 'focus' ? focusDurationMinutes : breakDurationMinutes) * 60);
    setError('');
  };

  const reset = () => {
    if (saving || completedPending) return;
    setRunning(false);
    setRemaining(activeDuration * 60);
    setError('');
  };

  const savePreferences = async (event) => {
    event.preventDefault();
    const focusDuration = Number(focusDraft);
    const breakDuration = Number(breakDraft);
    if (!isValidDuration(focusDuration) || !isValidDuration(breakDuration)) {
      setError('Fokus va tanaffus vaqtini 1 daqiqadan kam bo‘lmagan butun son bilan kiriting.');
      return;
    }

    setError('');
    setPreferencesSaving(true);
    try {
      await onSavePreferencesRef.current({
        focusDurationMinutes: focusDuration,
        breakDurationMinutes: breakDuration,
        focusAlarmSound: soundDraft,
        focusBackgroundMusic: backgroundMusicDraft,
        focusBackgroundTrack: backgroundTrackDraft,
      });
      setRunning(false);
      setRemaining((mode === 'focus' ? focusDuration : breakDuration) * 60);
    } catch (saveError) {
      console.error('Pomodoro sozlamalarini saqlashda xatolik:', saveError);
      setError(saveError.message || 'Pomodoro sozlamalarini saqlab bo‘lmadi. Qayta urinib ko‘ring.');
    } finally {
      setPreferencesSaving(false);
    }
  };

  const previewSound = () => {
    if (!audioContextRef.current) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) {
        try {
          audioContextRef.current = new AudioContextClass();
        } catch (audioContextError) {
          console.error('Sinov ovoz qurilmasini ishga tushirishda xatolik:', audioContextError);
          setAudioError('Ovoz signalini yoqib bo‘lmadi. Brauzer ovoz sozlamalarini tekshiring.');
        }
      }
    }
    if (!audioContextRef.current) {
      if (!audioError) setAudioError('Brauzeringiz ovozli signalni qo‘llab-quvvatlamaydi.');
      return;
    }
    if (audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume().catch((audioResumeError) => {
        console.error('Sinov signalini yoqishda xatolik:', audioResumeError);
        setAudioError('Ovoz signalini yoqib bo‘lmadi. Brauzer ovoz sozlamalarini tekshiring.');
      });
    }
    try {
      playFocusAlarm(audioContextRef.current, soundDraft);
      setAudioError('');
    } catch (audioPreviewError) {
      console.error('Sinov signalini ijro etishda xatolik:', audioPreviewError);
      setAudioError('Sinov signalini ijro etib bo‘lmadi. Brauzer ovoz sozlamalarini tekshiring.');
    }
  };

  const displayTime = `${String(Math.floor(remaining / 60)).padStart(2, '0')}:${String(remaining % 60).padStart(2, '0')}`;
  const sessionPaused = !running && remaining < activeDuration * 60;

  return (
    <div className="page-content focus-page">
      <div className="focus-layout">
        <section className="surface-card focus-timer-card">
          <div className="timer-modes" role="group" aria-label="Taymer rejimi">
            <button type="button" className={mode === 'focus' ? 'timer-mode-active' : ''} onClick={() => selectMode('focus')} disabled={running || saving || completedPending}>Fokus · {focusDurationMinutes} daq</button>
            <button type="button" className={mode === 'break' ? 'timer-mode-active' : ''} onClick={() => selectMode('break')} disabled={running || saving || completedPending}>Tanaffus · {breakDurationMinutes} daq</button>
          </div>
          <div className="timer-wrap">
            <svg viewBox="0 0 300 300" role="img" aria-label={`${displayTime} qoldi`}>
              <circle className="timer-track" cx="150" cy="150" r="138" />
              <circle className="timer-progress" cx="150" cy="150" r="138" strokeDasharray={circumference} strokeDashoffset={circumference * (1 - progress)} />
            </svg>
            <div className="timer-value"><strong>{displayTime}</strong><span>{saving ? 'Sessiya saqlanmoqda...' : mode === 'break' ? 'Tanaffus vaqti' : running ? 'Diqqat jamlanmoqda' : completedPending ? 'Sessiya tugadi' : 'Tayyor bo‘lsangiz boshlang'}</span></div>
          </div>
          <div className="timer-actions">
            {completedPending
              ? <button className="button button-primary timer-start" onClick={() => saveCompletedSession()} disabled={saving}>{saving ? 'Saqlanmoqda...' : 'Saqlashni qayta urinish'}</button>
              : <button className="button button-primary timer-start" onClick={start} disabled={saving || preferencesSaving}><i className={`ph ${running ? 'ph-pause' : 'ph-play'}`} />{running ? 'Pauza' : sessionPaused ? 'Davom ettirish' : 'Boshlash'}</button>}
            <button className="button button-secondary" onClick={reset} disabled={saving || preferencesSaving || completedPending}><i className="ph ph-arrow-counter-clockwise" /> {sessionPaused ? 'Yangi seans' : 'Qayta boshlash'}</button>
          </div>
          {error && <p className="form-error" role="alert">{error}</p>}
          {audioError && <p className="form-error" role="status">{audioError}</p>}
          <p className="timer-hint"><i className="ph ph-lightbulb" /> Kichik maslahat: boshlashdan oldin telefoningizni chetga qo‘ying.</p>
        </section>
        <aside className="focus-aside">
          <section className="surface-card focus-settings">
            <div className="section-heading"><div><span className="eyebrow">O‘ZINGIZGA MOSLANG</span><h3>Pomodoro sozlamalari</h3></div></div>
            <form className="focus-settings-form" onSubmit={savePreferences}>
              <label>Fokus (daqiqa)<input aria-label="Fokus davomiyligi" type="number" min="1" step="1" inputMode="numeric" value={focusDraft} onChange={(event) => setFocusDraft(event.target.value)} disabled={running || saving || preferencesSaving || completedPending} /></label>
              <label>Tanaffus (daqiqa)<input aria-label="Tanaffus davomiyligi" type="number" min="1" step="1" inputMode="numeric" value={breakDraft} onChange={(event) => setBreakDraft(event.target.value)} disabled={running || saving || preferencesSaving || completedPending} /></label>
              <fieldset className="alarm-options" disabled={running || saving || preferencesSaving || completedPending}>
                <legend>Yakun signali</legend>
                <div>{soundOptions.map((sound) => (
                  <label key={sound.id} className="alarm-option">
                    <input type="radio" name="focusAlarmSound" value={sound.id} checked={soundDraft === sound.id} onChange={() => setSoundDraft(sound.id)} />
                    <span>{sound.label}</span>
                  </label>
                ))}</div>
              </fieldset>
              <fieldset className="alarm-options music-options" disabled={running || saving || preferencesSaving || completedPending}>
                <legend>Fon musiqasi</legend>
                <label className="music-enabled-option">
                  <input type="checkbox" checked={backgroundMusicDraft} onChange={(event) => setBackgroundMusicDraft(event.target.checked)} />
                  <span>Taymer ishlaganda fon musiqasini yoqish</span>
                </label>
                <div>{focusMusicOptions.map((track) => (
                  <label key={track.id} className="alarm-option">
                    <input type="radio" name="focusBackgroundTrack" value={track.id} checked={backgroundTrackDraft === track.id} onChange={() => setBackgroundTrackDraft(track.id)} />
                    <span>{track.label}</span>
                  </label>
                ))}</div>
                <p className="music-description">Original ambient tovushlar brauzerda yaratiladi, MP3 yuklab olinmaydi.</p>
              </fieldset>
              <div className="focus-settings-actions">
                <button className="button button-secondary" type="button" onClick={previewSound} disabled={preferencesSaving}><i className="ph ph-speaker-high" /> Sinab ko‘rish</button>
                <button className="button button-primary" type="submit" disabled={running || saving || preferencesSaving || completedPending}>{preferencesSaving ? 'Saqlanmoqda...' : 'Sozlamalarni saqlash'}</button>
              </div>
            </form>
          </section>
          <section className="surface-card focus-guide"><span className="promo-icon"><i className="ph ph-brain" /></span><span className="eyebrow">POMODORO USULI</span><h3>Chuqur ish uchun vaqt ajrating</h3><p>Fokus va tanaffus vaqtini o‘zingizga mos belgilang. Navbatma-navbat ishlang va dam oling.</p></section>
          <section className="surface-card focus-rule"><i className="ph ph-quotes" /><blockquote>“Yaxshi boshlangan ish — yarim bitgan ish.”</blockquote><span>Bugungi eslatma</span></section>
        </aside>
      </div>
    </div>
  );
}

export default FocusPage;
