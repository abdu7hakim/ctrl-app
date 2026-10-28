import { colorThemes } from '../../utils/themes';
import { translate } from '../../utils/language';

function SettingsPage({ darkMode, themeSaving, colorTheme, language = 'uz', onChangeLanguage, onToggleTheme, onSelectColorTheme }) {
  const t = (text) => translate(text, language);
  return (
    <div className="page-content">
      <section className="surface-card settings-card">
        <div className="settings-copy">
          <span className="stat-icon blue"><i className="ph ph-globe-hemisphere-west" /></span>
          <div><h2>{t('Ilova tili')}</h2><p>{t('Ilovaning barcha sahifalarida ko‘rinadigan tilni tanlang. Tanlovingiz hisobingizda saqlanadi.')}</p></div>
        </div>
        <label className="settings-language-select">
          <span>{t('Til')}</span>
          <select value={language} onChange={(event) => onChangeLanguage(event.target.value)} disabled={themeSaving} aria-label={t('Ilova tili')}>
            <option value="uz">{t('O‘zbekcha')}</option>
            <option value="en">{t('Inglizcha')}</option>
          </select>
        </label>
      </section>
      <section className="surface-card settings-card">
        <div className="settings-copy">
          <span className="stat-icon violet"><i className={`ph ${darkMode ? 'ph-moon' : 'ph-sun'}`} /></span>
          <div><h2>{t('Tungi rejim')}</h2><p>{t(darkMode ? 'Ilova tungi rejimda ishlayapti.' : 'Ko‘zga qulay qorong‘i ko‘rinishni yoqing.')}</p></div>
        </div>
        <button
          className={`setting-toggle ${darkMode ? 'setting-toggle-active' : ''}`}
          type="button"
          role="switch"
          aria-checked={darkMode}
          aria-label={t('Tungi rejim')}
          onClick={onToggleTheme}
          disabled={themeSaving}
        >
          <span />
        </button>
      </section>
      <section className="surface-card theme-picker-card" aria-labelledby="color-theme-heading">
        <div className="section-heading">
          <div><span className="eyebrow">{t('RANGLAR')}</span><h3 id="color-theme-heading">{t('Rang mavzusi')}</h3></div>
          <span className="theme-selected-name">{t(colorThemes.find((theme) => theme.id === colorTheme)?.name)}</span>
        </div>
        <p className="theme-picker-description">{t('Sayt ranglarini o‘zingizga moslang. Tanlovingiz hisobingizda saqlanadi.')}</p>
        <div className="theme-options" role="group" aria-label={t('Rang mavzusini tanlang')}>
          {colorThemes.map((theme) => (
            <button
              key={theme.id}
              className={`theme-option ${colorTheme === theme.id ? 'theme-option-active' : ''}`}
              type="button"
              aria-label={`${t(theme.name)} ${t('rang mavzusi')}`}
              aria-pressed={colorTheme === theme.id}
              onClick={() => onSelectColorTheme(theme.id)}
              disabled={themeSaving}
            >
              <span className="theme-swatch" style={{ backgroundColor: theme.light.primary }}>
                {colorTheme === theme.id && <i className="ph ph-check" aria-hidden="true" />}
              </span>
              <span>{t(theme.name)}</span>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}

export default SettingsPage;
