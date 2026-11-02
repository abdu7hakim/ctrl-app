import { useState } from 'react';
import { CalendarCheck, CheckSquare, Home, Timer, Trophy } from 'lucide-react';
import { translate } from '../../utils/language';
import { getAvatarInitials } from '../../utils/avatars';

const mobileNavigation = [
  { id: 'dashboard', title: 'Umumiy', icon: Home },
  { id: 'focus', title: 'Diqqat vaqti', icon: Timer },
  { id: 'todo', title: 'Vazifalar', icon: CheckSquare },
  { id: 'habits', title: 'Odatlar', icon: CalendarCheck },
  { id: 'leaderboard', title: 'Reyting', icon: Trophy },
];

const navigation = [
  { id: 'dashboard', title: 'Umumiy', icon: 'ph-squares-four' },
  { id: 'todo', title: 'Vazifalar', icon: 'ph-check-square-offset' },
  { id: 'habits', title: 'Odatlar', icon: 'ph-calendar-check' },
  { id: 'routine', title: 'Kun tartibi', icon: 'ph-calendar-blank' },
  { id: 'focus', title: 'Diqqat vaqti', icon: 'ph-timer' },
  { id: 'leaderboard', title: 'Reyting', icon: 'ph-trophy' },
  { id: 'profile', title: 'Profil', icon: 'ph-user-circle' },
  { id: 'contact', title: 'Aloqa', icon: 'ph-chat-circle-dots' },
];

const pageTitles = {
  dashboard: 'Umumiy ko‘rinish',
  todo: 'Vazifalar',
  habits: 'Odatlar',
  routine: 'Kun tartibi',
  focus: 'Diqqat vaqti',
  leaderboard: 'Reyting',
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

function DashboardLayout({ user, page, darkMode, themeSaving, onNavigate, onToggleTheme, onLogout, language = 'uz', onChangeLanguage, children }) {
  const t = (text) => translate(text, language);
  const [menuOpen, setMenuOpen] = useState(false);
  const pageDescription = pageDescriptions[page];

  const navigate = (id) => {
    onNavigate(id);
    setMenuOpen(false);
  };

  return (
    <div className="app-shell">
      {menuOpen && <button className="sidebar-backdrop" aria-label={t('Menyuni yopish')} onClick={() => setMenuOpen(false)} />}
      <aside className={`sidebar ${menuOpen ? 'sidebar-open' : ''}`}>
        <button className="brand sidebar-brand" onClick={() => navigate('dashboard')}>
          <img className="brand-mark" src={`${process.env.PUBLIC_URL}/assets/ctrl-app-logo.png`} alt="" /><span>CTRL App</span>
        </button>
        <div className="sidebar-label">{t('ISH MAYDONI')}</div>
        <nav className="side-nav" aria-label={t('Asosiy menyu')}>
          {navigation.map((item) => (
            <button key={item.id} className={`nav-link ${page === item.id ? 'nav-link-active' : ''}`} onClick={() => navigate(item.id)}>
              <i className={`ph ${item.icon}`} aria-hidden="true" /><span>{t(item.title)}</span>
              {page === item.id && <i className="ph ph-caret-right nav-current" aria-hidden="true" />}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <button className={`nav-link ${page === 'settings' ? 'nav-link-active' : ''}`} onClick={() => navigate('settings')}>
            <i className="ph ph-gear-six" aria-hidden="true" /><span>{t('Sozlamalar')}</span>
            {page === 'settings' && <i className="ph ph-caret-right nav-current" aria-hidden="true" />}
          </button>
          <button className="nav-link logout-link" onClick={onLogout}><i className="ph ph-sign-out" /><span>{t('Chiqish')}</span></button>
          <span className="sidebar-version">{t('CTRL App · Shaxsiy unumdorlik')}</span>
        </div>
      </aside>
      <main className={`main-area ${page === 'leaderboard' ? 'main-area-leaderboard' : ''}`}>
        <header className="topbar">
          <button className="icon-button mobile-menu-button" aria-label={t('Menyuni ochish')} onClick={() => setMenuOpen(true)}><i className="ph ph-list" /></button>
          <div className="topbar-title">
            <div className="topbar-heading-row">
              <h1>{t(pageTitles[page] || pageTitles.dashboard)}</h1>
                  {pageDescription && <div className="topbar-page-meta"><span className="eyebrow">{t(pageDescription.subtitle)}</span><p>{t(pageDescription.description)}</p></div>}
            </div>
          </div>
          <div className="topbar-actions">
            <button className="icon-button" aria-label={t(darkMode ? 'Yorug‘ rejim' : 'Tungi rejim')} onClick={onToggleTheme} disabled={themeSaving}><i className={`ph ${darkMode ? 'ph-sun' : 'ph-moon'}`} /></button>
            <details className="language-menu">
              <summary aria-label={t('Tilni almashtirish')} title={t('Tilni almashtirish')}>
                <i className="ph ph-globe-hemisphere-west" aria-hidden="true" />
                <span>{t(language === 'uz' ? 'O‘zbekcha' : 'Inglizcha')}</span>
                <i className="ph ph-caret-down language-picker-caret" aria-hidden="true" />
              </summary>
              <div className="language-menu-options" role="group" aria-label={t('Til')}>
                {[
                  { id: 'uz', label: 'O‘zbekcha' },
                  { id: 'en', label: 'Inglizcha' },
                ].map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    className={language === option.id ? 'language-menu-option-active' : ''}
                    aria-pressed={language === option.id}
                    disabled={themeSaving}
                    onClick={(event) => {
                      onChangeLanguage(option.id);
                      event.currentTarget.closest('details').open = false;
                    }}
                  >
                    <span>{t(option.label)}</span>
                    {language === option.id && <i className="ph ph-check" aria-hidden="true" />}
                  </button>
                ))}
              </div>
            </details>
            <button className="profile-chip" onClick={() => navigate('profile')} aria-label={t('Profilni ochish')}>
              {user.avatar
                ? <img className="profile-chip-avatar" src={`${process.env.PUBLIC_URL}${user.avatar}`} alt="" />
                : <span className="profile-chip-initials">{getAvatarInitials(user)}</span>}
              <span className="profile-chip-name">{user.firstName}</span>
              <i className="ph ph-caret-down" />
            </button>
          </div>
        </header>
        <div className="content-area content-area-with-bottom-nav">{children}</div>
      </main>
      <nav className="mobile-bottom-nav" aria-label={t('Mobil navigatsiya')}>
        {mobileNavigation.map(({ id, title, icon: Icon }) => (
          <button
            key={id}
            type="button"
            className={`mobile-bottom-nav-item ${page === id ? 'mobile-bottom-nav-item-active' : ''}`}
            aria-current={page === id ? 'page' : undefined}
            onClick={() => navigate(id)}
          >
            <Icon size={20} strokeWidth={page === id ? 2.4 : 2} aria-hidden="true" />
            <span>{t(title)}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}

export default DashboardLayout;
