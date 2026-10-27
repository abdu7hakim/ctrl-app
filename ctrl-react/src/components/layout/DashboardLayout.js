import { useState } from 'react';

const navigation = [
  { id: 'dashboard', title: 'Umumiy', icon: 'ph-squares-four' },
  { id: 'todo', title: 'Vazifalar', icon: 'ph-check-square-offset' },
  { id: 'habits', title: 'Odatlar', icon: 'ph-calendar-check' },
  { id: 'focus', title: 'Diqqat vaqti', icon: 'ph-timer' },
  { id: 'profile', title: 'Profil', icon: 'ph-user-circle' },
  { id: 'contact', title: 'Aloqa', icon: 'ph-chat-circle-dots' },
];

const pageTitles = {
  dashboard: 'Umumiy ko‘rinish',
  todo: 'Vazifalar',
  habits: 'Odatlar',
  focus: 'Diqqat vaqti',
  profile: 'Profil',
  contact: 'Aloqa',
};

function DashboardLayout({ user, page, darkMode, themeSaving, onNavigate, onToggleTheme, onLogout, children }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const initials = `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`.toUpperCase();

  const navigate = (id) => {
    onNavigate(id);
    setMenuOpen(false);
  };

  return (
    <div className="app-shell">
      {menuOpen && <button className="sidebar-backdrop" aria-label="Menyuni yopish" onClick={() => setMenuOpen(false)} />}
      <aside className={`sidebar ${menuOpen ? 'sidebar-open' : ''}`}>
        <button className="brand sidebar-brand" onClick={() => navigate('dashboard')}>
          <span className="brand-mark">C</span><span>CTRL</span>
        </button>
        <div className="sidebar-label">ISH MAYDONI</div>
        <nav className="side-nav" aria-label="Asosiy menyu">
          {navigation.map((item) => (
            <button key={item.id} className={`nav-link ${page === item.id ? 'nav-link-active' : ''}`} onClick={() => navigate(item.id)}>
              <i className={`ph ${item.icon}`} aria-hidden="true" /><span>{item.title}</span>
              {page === item.id && <i className="ph ph-caret-right nav-current" aria-hidden="true" />}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-tip">
            <span className="tip-icon"><i className="ph ph-sparkle" /></span>
            <strong>Kichik qadamlar</strong>
            <p>Har kuni ozgina harakat — katta natijalarga olib keladi.</p>
          </div>
          <button className="nav-link logout-link" onClick={onLogout}><i className="ph ph-sign-out" /><span>Chiqish</span></button>
          <span className="sidebar-version">CTRL · Shaxsiy unumdorlik</span>
        </div>
      </aside>
      <main className="main-area">
        <header className="topbar">
          <button className="icon-button mobile-menu-button" aria-label="Menyuni ochish" onClick={() => setMenuOpen(true)}><i className="ph ph-list" /></button>
          <div className="topbar-title"><span className="topbar-date">{new Intl.DateTimeFormat('uz-UZ', { dateStyle: 'full' }).format(new Date())}</span><h1>{pageTitles[page] || pageTitles.dashboard}</h1></div>
          <div className="topbar-actions">
            <button className="icon-button" aria-label={darkMode ? 'Yorug‘ rejim' : 'Tungi rejim'} onClick={onToggleTheme} disabled={themeSaving}><i className={`ph ${darkMode ? 'ph-sun' : 'ph-moon'}`} /></button>
            <button className="profile-chip" onClick={() => navigate('profile')} aria-label="Profilni ochish">
              <span className="avatar">{initials || 'U'}</span>
              <span className="profile-chip-name">{user.firstName}</span>
              <i className="ph ph-caret-down" />
            </button>
          </div>
        </header>
        <div className="content-area">{children}</div>
      </main>
    </div>
  );
}

export default DashboardLayout;
