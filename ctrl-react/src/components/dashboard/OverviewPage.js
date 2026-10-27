function OverviewPage({ user, data, stats, onNavigate }) {
  const today = new Date().toLocaleDateString('uz-UZ', { day: 'numeric', month: 'long' });
  const progress = data.habits.length ? Math.round((stats.completedHabits / data.habits.length) * 100) : 0;
  const nextTodos = data.todos.filter((todo) => todo.status === 'open').slice(0, 4);

  return (
    <div className="page-content">
      <section className="welcome-banner">
        <div>
          <span className="eyebrow">BUGUN · {today.toUpperCase()}</span>
          <h2>Salom, {user.firstName}! <span className="wave">✦</span></h2>
          <p>Bugun maqsadlaringizga yaqinlashish uchun ajoyib kun.</p>
          <button className="button button-light" onClick={() => onNavigate('todo')}>Vazifalarni ko‘rish <i className="ph ph-arrow-up-right" /></button>
        </div>
        <div className="banner-decoration" aria-hidden="true"><span>CTRL</span><i className="ph ph-sparkle" /></div>
      </section>
      <section className="stat-grid" aria-label="Bugungi statistika">
        <article className="stat-card"><div className="stat-card-top"><span className="stat-icon violet"><i className="ph ph-check-circle" /></span><span className="stat-caption">Vazifalar</span></div><strong>{stats.done}<small> / {data.todos.length}</small></strong><p>Bajarilgan vazifalar</p></article>
        <article className="stat-card"><div className="stat-card-top"><span className="stat-icon green"><i className="ph ph-leaf" /></span><span className="stat-caption">Odatlar</span></div><strong>{progress}<small>%</small></strong><p>{stats.completedHabits} ta odat bajarildi</p></article>
        <article className="stat-card"><div className="stat-card-top"><span className="stat-icon orange"><i className="ph ph-timer" /></span><span className="stat-caption">Diqqat vaqti</span></div><strong>{stats.focusMinutes}<small> daq</small></strong><p>{data.focusSessions} ta fokus sessiyasi</p></article>
        <article className="stat-card"><div className="stat-card-top"><span className="stat-icon blue"><i className="ph ph-list-checks" /></span><span className="stat-caption">Kutilmoqda</span></div><strong>{stats.pending}</strong><p>Ochiq vazifalar</p></article>
      </section>
      <div className="overview-grid">
        <section className="surface-card overview-tasks">
          <div className="section-heading"><div><span className="eyebrow">REJA</span><h3>Bugungi vazifalar</h3></div><button className="text-button" onClick={() => onNavigate('todo')}>Barchasi <i className="ph ph-arrow-right" /></button></div>
          {nextTodos.length ? <ul className="overview-list">{nextTodos.map((todo) => <li key={todo.id}><span className="list-dot" /><span>{todo.title}</span>{todo.dueDate && <time>{todo.dueDate}</time>}</li>)}</ul> : <div className="empty-state"><i className="ph ph-check-circle" /><p>Hozircha ochiq vazifa yo‘q.</p><button className="text-button" onClick={() => onNavigate('todo')}>Yangi vazifa qo‘shish</button></div>}
        </section>
        <section className="surface-card focus-promo">
          <span className="eyebrow">DIQQATNI JAMLANG</span><span className="promo-icon"><i className="ph ph-hourglass-medium" /></span><h3>Bir vazifa.<br />To‘liq diqqat.</h3><p>Qisqa fokus sessiyasini boshlang va unumdorligingizni oshiring.</p><button className="button button-primary" onClick={() => onNavigate('focus')}>Fokusni boshlash <i className="ph ph-arrow-right" /></button>
        </section>
      </div>
      <section className="surface-card quick-actions">
        <div className="section-heading"><div><span className="eyebrow">TEZKOR KIRISH</span><h3>Qayerdan boshlaymiz?</h3></div></div>
        <div className="quick-action-grid">
          <button onClick={() => onNavigate('todo')}><i className="ph ph-plus-circle" /><span><strong>Vazifa qo‘shish</strong><small>Rejangizni tartiblang</small></span><i className="ph ph-arrow-up-right" /></button>
          <button onClick={() => onNavigate('habits')}><i className="ph ph-plant" /><span><strong>Odatlarni kuzatish</strong><small>Yaxshi odat yarating</small></span><i className="ph ph-arrow-up-right" /></button>
          <button onClick={() => onNavigate('profile')}><i className="ph ph-user-circle" /><span><strong>Profil sozlamalari</strong><small>Hisobingizni boshqaring</small></span><i className="ph ph-arrow-up-right" /></button>
        </div>
      </section>
    </div>
  );
}

export default OverviewPage;
