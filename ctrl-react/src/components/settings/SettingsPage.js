import { colorThemes } from '../../utils/themes';

function SettingsPage({ darkMode, themeSaving, colorTheme, onToggleTheme, onSelectColorTheme }) {
  return (
    <div className="page-content">
      <section className="surface-card settings-card">
        <div className="settings-copy">
          <span className="stat-icon violet"><i className={`ph ${darkMode ? 'ph-moon' : 'ph-sun'}`} /></span>
          <div><h2>Tungi rejim</h2><p>{darkMode ? 'Ilova tungi rejimda ishlayapti.' : 'Ko‘zga qulay qorong‘i ko‘rinishni yoqing.'}</p></div>
        </div>
        <button
          className={`setting-toggle ${darkMode ? 'setting-toggle-active' : ''}`}
          type="button"
          role="switch"
          aria-checked={darkMode}
          aria-label="Tungi rejim"
          onClick={onToggleTheme}
          disabled={themeSaving}
        >
          <span />
        </button>
      </section>
      <section className="surface-card theme-picker-card" aria-labelledby="color-theme-heading">
        <div className="section-heading">
          <div><span className="eyebrow">RANGLAR</span><h3 id="color-theme-heading">Rang mavzusi</h3></div>
          <span className="theme-selected-name">{colorThemes.find((theme) => theme.id === colorTheme)?.name}</span>
        </div>
        <p className="theme-picker-description">Sayt ranglarini o‘zingizga moslang. Tanlovingiz hisobingizda saqlanadi.</p>
        <div className="theme-options" role="group" aria-label="Rang mavzusini tanlang">
          {colorThemes.map((theme) => (
            <button
              key={theme.id}
              className={`theme-option ${colorTheme === theme.id ? 'theme-option-active' : ''}`}
              type="button"
              aria-label={`${theme.name} rang mavzusi`}
              aria-pressed={colorTheme === theme.id}
              onClick={() => onSelectColorTheme(theme.id)}
              disabled={themeSaving}
            >
              <span className="theme-swatch" style={{ backgroundColor: theme.light.primary }}>
                {colorTheme === theme.id && <i className="ph ph-check" aria-hidden="true" />}
              </span>
              <span>{theme.name}</span>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}

export default SettingsPage;
