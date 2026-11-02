import { useEffect, useState } from 'react';
import { getDailyMotivation } from '../../utils/motivation';
import { translate } from '../../utils/language';
import { getActivityHeatmap } from '../../utils/activityHeatmap';
import Skeleton from '../ui/Skeleton';

function OverviewPage({ user, data, stats, onNavigate, isLoading = false, language = 'uz' }) {
  const t = (text) => translate(text, language);
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const today = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(currentDate);
  const progress = data.habits.length ? Math.round((stats.completedHabits / data.habits.length) * 100) : 0;
  const nextTodos = data.todos.filter((todo) => todo.status === 'open').slice(0, 4);
  const activityHeatmap = getActivityHeatmap(data, currentDate);

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
    <div className={`page-content ${isLoading ? 'page-content-loading' : 'page-content-loaded'}`}>
      {isLoading ? (
        <div className="overview-skeleton" role="status" aria-label={t('Dashboard ma’lumotlari yuklanmoqda')}>
          <section className="welcome-banner overview-skeleton-welcome">
            <div>
              <Skeleton className="skeleton-line skeleton-line-short" />
              <Skeleton className="skeleton-line skeleton-line-heading" />
              <Skeleton className="skeleton-line skeleton-line-wide" />
              <Skeleton className="skeleton-form-button" />
            </div>
            <Skeleton className="overview-skeleton-art" />
          </section>
          <div className="stat-grid overview-skeleton-stats">
            {Array.from({ length: 4 }, (_, index) => (
              <div className="stat-card overview-skeleton-stat" key={index}>
                <Skeleton className="skeleton-line skeleton-line-short" />
                <Skeleton className="skeleton-line skeleton-line-heading" />
                <Skeleton className="skeleton-line skeleton-line-wide" />
              </div>
            ))}
          </div>
          <section className="surface-card overview-skeleton-activity">
            <Skeleton className="skeleton-line skeleton-line-heading" />
            <div>{Array.from({ length: 4 }, (_, index) => <Skeleton className="skeleton-line skeleton-line-wide" key={index} />)}</div>
          </section>
          <div className="overview-grid">
            <section className="surface-card overview-skeleton-card">
              <Skeleton className="skeleton-line skeleton-line-heading" />
              {Array.from({ length: 3 }, (_, index) => <Skeleton className="skeleton-line skeleton-line-wide" key={index} />)}
            </section>
            <section className="surface-card overview-skeleton-card">
              <Skeleton className="skeleton-line skeleton-line-heading" />
              {Array.from({ length: 3 }, (_, index) => <Skeleton className="skeleton-line skeleton-line-wide" key={index} />)}
            </section>
          </div>
        </div>
      ) : (
      <>
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
        <button className="stat-card stat-card-link" type="button" aria-label={t('Vazifalar sahifasini ochish')} onClick={() => onNavigate('todo')}><span className="stat-card-top"><span className="stat-icon violet"><i className="ph ph-check-circle" /></span><span className="stat-caption">{t('Vazifalar')}</span></span><strong>{stats.done}<small> / {data.todos.length}</small></strong><span className="stat-card-description">{t('Bajarilgan vazifalar')}</span></button>
        <button className="stat-card stat-card-link" type="button" aria-label={t('Odatlar sahifasini ochish')} onClick={() => onNavigate('habits')}><span className="stat-card-top"><span className="stat-icon green"><i className="ph ph-leaf" /></span><span className="stat-caption">{t('Odatlar')}</span></span><strong>{progress}<small>%</small></strong><span className="stat-card-description">{stats.completedHabits} {t('ta odat bajarildi')}</span></button>
        <button className="stat-card stat-card-link" type="button" aria-label={t('Diqqat vaqti sahifasini ochish')} onClick={() => onNavigate('focus')}><span className="stat-card-top"><span className="stat-icon orange"><i className="ph ph-timer" /></span><span className="stat-caption">{t('Diqqat vaqti')}</span></span><strong>{stats.focusMinutes}<small> {t('daq')}</small></strong><span className="stat-card-description">{data.focusSessions} {t('ta fokus sessiyasi')}</span></button>
        <button className="stat-card stat-card-link" type="button" aria-label={t('Ochiq vazifalar sahifasini ochish')} onClick={() => onNavigate('todo')}><span className="stat-card-top"><span className="stat-icon blue"><i className="ph ph-list-checks" /></span><span className="stat-caption">{t('Kutilmoqda')}</span></span><strong>{stats.pending}</strong><span className="stat-card-description">{t('Ochiq vazifalar')}</span></button>
      </section>
      <section className="surface-card activity-card" aria-labelledby="activity-heading">
        <div className="activity-heading">
          <div><span className="eyebrow">{t('IZCHILLIK')}</span><h3 id="activity-heading">{t('Faollik')}</h3></div>
          <span className="activity-period">{t('Oxirgi 6 oy')}</span>
        </div>
        <div className="activity-chart" role="group" aria-label={t('Oxirgi olti oydagi kundalik faollik xaritasi')}>
          <div className="activity-months" aria-hidden="true">
            {activityHeatmap.months.map((month) => (
              <span key={`${month.label}-${month.week}`} style={{ gridColumn: month.week + 1 }}>{t(month.label)}</span>
            ))}
          </div>
          <div className="activity-cells" role="list" aria-label={t('Kunlik faollik')}>
            {activityHeatmap.cells.map((cell) => {
              const date = new Date(`${cell.date}T12:00:00`);
              const label = cell.count
                ? `${cell.count} ${t('ta bajarilgan ish')} · ${date.toLocaleDateString(language === 'en' ? 'en-US' : 'uz-UZ', { dateStyle: 'long' })}`
                : `${t('Faollik yo‘q')} · ${date.toLocaleDateString(language === 'en' ? 'en-US' : 'uz-UZ', { dateStyle: 'long' })}`;
              return <span
                className={`activity-cell activity-level-${cell.level} ${cell.future ? 'activity-cell-future' : ''}`}
                key={cell.date}
                title={label}
                aria-label={label}
                role="listitem"
              />;
            })}
          </div>
          <div className="activity-legend" aria-hidden="true">
            <span>{t('Kam')}</span>
            {[0, 1, 2, 3].map((level) => <i className={`activity-cell activity-level-${level}`} key={level} />)}
            <span>{t('Ko‘p')}</span>
          </div>
        </div>
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
      </>
      )}
    </div>
  );
}

export default OverviewPage;
