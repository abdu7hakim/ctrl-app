import { useEffect, useState } from 'react';
import { getDailyMotivation } from '../../utils/motivation';
import { translate } from '../../utils/language';

function OverviewPage({ user, data, stats, onNavigate, language = 'uz' }) {
  const t = (text) => translate(text, language);
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const today = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(currentDate);
  const progress = data.habits.length ? Math.round((stats.completedHabits / data.habits.length) * 100) : 0;
  const nextTodos = data.todos.filter((todo) => todo.status === 'open').slice(0, 4);

  useEffect(() => {
    const timer = window.setInterval(() => {
      const now = new Date();
      setCurrentDate((previousDate) => (
        now.toDateString() === previousDate.toDateString() ? previousDate : now
      ));
    }, 60 * 1000);

    return () => window.clearInterval(timer);
  }, []);

  const motivation = getDailyMotivation(currentDate);

  return (
    <div className="page-content">
      <section className="welcome-banner">
        <div className="welcome-copy">
          <span className="welcome-date"><span aria-hidden="true" />{t('BUGUN')} · {today}</span>
          <h2>{t('Salom,')} {user.firstName}! <i className="ph ph-hand-waving wave" aria-hidden="true" /></h2>
          <p>{t('Bugun maqsadlaringizga yaqinlashish uchun ajoyib kun.')}</p>
          <button className="button welcome-button" onClick={() => onNavigate('todo')}>{t('Vazifalarni ko‘rish')} <i className="ph ph-arrow-up-right" /></button>
        </div>
        <div className="welcome-art" aria-hidden="true">
          <div className="welcome-orbit" />
          <div className="welcome-logo-tile"><img className="brand-mark" src={`${process.env.PUBLIC_URL}/assets/ctrl-app-logo.png`} alt="" /><i className="ph ph-sparkle" /></div>
          <div className="welcome-preview">
            <div className="welcome-preview-top"><strong>CTRL App</strong><span><i className="ph ph-sun" /><span className="avatar">A</span></span></div>
            <h3>{t('Diqqat. Erishing. Rivojlaning.')}</h3>
            <p>{t('Maqsadlaringizga yana bir qadam.')}</p>
            <div className="welcome-streak"><i className="ph ph-fire" /><strong>12</strong><span>{t('kunlik izchillik')}</span><i className="ph ph-trend-up" /></div>
            <div className="welcome-preview-tasks"><strong>{t('Bugungi vazifalar')}</strong><span><i className="ph ph-circle" /> {t('Muhim ishni rejalashtiring')} <i className="ph ph-arrow-right" /></span></div>
          </div>
          <div className="welcome-chart"><i className="ph ph-chart-bar" /></div>
          <i className="ph ph-sparkle welcome-star" />
        </div>
      </section>
      <section className="stat-grid" aria-label={t('Bugungi statistika')}>
        <article className="stat-card"><div className="stat-card-top"><span className="stat-icon violet"><i className="ph ph-check-circle" /></span><span className="stat-caption">{t('Vazifalar')}</span></div><strong>{stats.done}<small> / {data.todos.length}</small></strong><p>{t('Bajarilgan vazifalar')}</p></article>
        <article className="stat-card"><div className="stat-card-top"><span className="stat-icon green"><i className="ph ph-leaf" /></span><span className="stat-caption">{t('Odatlar')}</span></div><strong>{progress}<small>%</small></strong><p>{stats.completedHabits} {t('ta odat bajarildi')}</p></article>
        <article className="stat-card"><div className="stat-card-top"><span className="stat-icon orange"><i className="ph ph-timer" /></span><span className="stat-caption">{t('Diqqat vaqti')}</span></div><strong>{stats.focusMinutes}<small> {t('daq')}</small></strong><p>{data.focusSessions} {t('ta fokus sessiyasi')}</p></article>
        <article className="stat-card"><div className="stat-card-top"><span className="stat-icon blue"><i className="ph ph-list-checks" /></span><span className="stat-caption">{t('Kutilmoqda')}</span></div><strong>{stats.pending}</strong><p>{t('Ochiq vazifalar')}</p></article>
      </section>
      <aside className="daily-motivation">
        <span className="tip-icon"><i className="ph ph-sparkle" aria-hidden="true" /></span>
        <div><span className="eyebrow">{t('BUGUNGI ILHOM')}</span><p>{t(motivation)}</p></div>
      </aside>
      <div className="overview-grid">
        <section className="surface-card overview-tasks">
          <div className="section-heading"><div><span className="eyebrow">{t('REJA')}</span><h3>{t('Bugungi vazifalar')}</h3></div><button className="text-button" onClick={() => onNavigate('todo')}>{t('Barchasi')} <i className="ph ph-arrow-right" /></button></div>
          {nextTodos.length ? <ul className="overview-list">{nextTodos.map((todo) => <li key={todo.id}><span className="list-dot" /><span>{todo.title}</span>{todo.dueDate && <time>{todo.dueDate}</time>}</li>)}</ul> : <div className="empty-state"><i className="ph ph-check-circle" /><p>{t('Hozircha ochiq vazifa yo‘q.')}</p><button className="text-button" onClick={() => onNavigate('todo')}>{t('Yangi vazifa qo‘shish')}</button></div>}
        </section>
        <section className="surface-card focus-promo">
          <span className="eyebrow">{t('DIQQATNI JAMLANG')}</span><span className="promo-icon"><i className="ph ph-hourglass-medium" /></span><h3>{t('Bir vazifa.')}<br />{t('To‘liq diqqat.')}</h3><p>{t('Qisqa fokus sessiyasini boshlang va unumdorligingizni oshiring.')}</p><button className="button button-primary" onClick={() => onNavigate('focus')}>{t('Fokusni boshlash')} <i className="ph ph-arrow-right" /></button>
        </section>
      </div>
      <section className="surface-card quick-actions">
        <div className="section-heading"><div><span className="eyebrow">{t('TEZKOR KIRISH')}</span><h3>{t('Qayerdan boshlaymiz?')}</h3></div></div>
        <div className="quick-action-grid">
          <button onClick={() => onNavigate('todo')}><i className="ph ph-plus-circle" /><span><strong>{t('Vazifa qo‘shish')}</strong><small>{t('Rejangizni tartiblang')}</small></span><i className="ph ph-arrow-up-right" /></button>
          <button onClick={() => onNavigate('habits')}><i className="ph ph-plant" /><span><strong>{t('Odatlarni kuzatish')}</strong><small>{t('Yaxshi odat yarating')}</small></span><i className="ph ph-arrow-up-right" /></button>
          <button onClick={() => onNavigate('profile')}><i className="ph ph-user-circle" /><span><strong>{t('Profil sozlamalari')}</strong><small>{t('Hisobingizni boshqaring')}</small></span><i className="ph ph-arrow-up-right" /></button>
        </div>
      </section>
    </div>
  );
}

export default OverviewPage;
