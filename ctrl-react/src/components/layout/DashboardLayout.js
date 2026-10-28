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
  settings: 'Sozlamalar',
};

const pageDescriptions = {
  todo: {
    subtitle: 'KUNLIK REJANGIZ',
    description: 'Rejalaringizni yozib boring va har bir qadamni belgilang.',
  },
  habits: {
    subtitle: 'IZCHILLIK — KALIT',
    description: 'Har kuni takrorlang. Kichik odatlar katta o‘zgarishlar yaratadi.',
  },
  focus: {
    subtitle: 'CHALG‘ITUVCHILARSIZ VAQT',
    description: 'Fokus va tanaffus davomiyligini o‘zingiz belgilang.',
  },
  profile: {
    subtitle: 'SHAXSIY MA’LUMOTLAR',
    description: 'Hisobingizdagi ism va ma’lumotlarni yangilang.',
  },
  contact: {
    subtitle: 'BIZ BILAN BOG‘LANING',
    description: 'Savol yoki takliflaringiz bormi? Bizga yozing.',
  },
  settings: {
    subtitle: 'ILOVA SOZLAMALARI',
    description: 'CTRL App ilovasining ko‘rinishini o‘zingizga moslang.',
  },
};

function DashboardLayout({ user, page, darkMode, themeSaving, onNavigate, onToggleTheme, onLogout, children }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const initials = `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`.toUpperCase();
  const pageDescription = pageDescriptions[page];

  const navigate = (id) => {
    onNavigate(id);
    setMenuOpen(false);
  };

  return (
    <div className="app-shell">
      {menuOpen && <button className="sidebar-backdrop" aria-label="Menyuni yopish" onClick={() => setMenuOpen(false)} />}
      <aside className={`sidebar ${menuOpen ? 'sidebar-open' : ''}`}>
        <button className="brand sidebar-brand" onClick={() => navigate('dashboard')}>
          <img className="brand-mark" src={`${process.env.PUBLIC_URL}/assets/ctrl-app-logo.png`} alt="" /><span>CTRL App</span>
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
          <button className={`nav-link ${page === 'settings' ? 'nav-link-active' : ''}`} onClick={() => navigate('settings')}>
            <i className="ph ph-gear-six" aria-hidden="true" /><span>Sozlamalar</span>
            {page === 'settings' && <i className="ph ph-caret-right nav-current" aria-hidden="true" />}
          </button>
          <button className="nav-link logout-link" onClick={onLogout}><i className="ph ph-sign-out" /><span>Chiqish</span></button>
          <span className="sidebar-version">CTRL App · Shaxsiy unumdorlik</span>
        </div>
      </aside>
      <main className="main-area">
        <header className="topbar">
          <button className="icon-button mobile-menu-button" aria-label="Menyuni ochish" onClick={() => setMenuOpen(true)}><i className="ph ph-list" /></button>
          <div className="topbar-title">
            <div className="topbar-heading-row">
              <h1>{pageTitles[page] || pageTitles.dashboard}</h1>
              {pageDescription && <div className="topbar-page-meta"><span className="eyebrow">{pageDescription.subtitle}</span><p>{pageDescription.description}</p></div>}
            </div>
          </div>
          <div className="topbar-actions">
            <button className="icon-button" aria-label={darkMode ? 'Yorug‘ rejim' : 'Tungi rejim'} onClick={onToggleTheme} disabled={themeSaving}><i className={`ph ${darkMode ? 'ph-sun' : 'ph-moon'}`} /></button>
            <button className="profile-chip" onClick={() => navigate('profile')} aria-label="Profilni ochish">
              {user.photoURL
                ? <img className="avatar profile-chip-avatar" src={user.photoURL} alt="" />
                : <span className="avatar">{initials || 'U'}</span>}
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
