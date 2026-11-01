import { useState } from 'react';
import { colorThemes } from '../../utils/themes';
import { translate } from '../../utils/language';

function SettingsPage({ darkMode, themeSaving, colorTheme, language = 'uz', onChangeLanguage, onToggleTheme, onSelectColorTheme, onResetData }) {
  const t = (text) => translate(text, language);
  const [confirmReset, setConfirmReset] = useState(false);
  const [resetSaving, setResetSaving] = useState(false);
  const [resetError, setResetError] = useState('');
  const [resetComplete, setResetComplete] = useState(false);

  const resetData = async () => {
    setResetError('');
    setResetSaving(true);
    try {
      await onResetData();
      setConfirmReset(false);
      setResetComplete(true);
    } catch (error) {
      console.error('Foydalanuvchi ma’lumotlarini tiklashda xatolik:', error);
      setResetError('Ma’lumotlarni o‘chirib bo‘lmadi. Qayta urinib ko‘ring.');
    } finally {
      setResetSaving(false);
    }
  };

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
      <section className="surface-card settings-reset-card" aria-labelledby="settings-reset-heading">
        <div className="settings-reset-copy">
          <span className="stat-icon red"><i className="ph ph-trash" aria-hidden="true" /></span>
          <div>
            <h2 id="settings-reset-heading">{t('Barcha ma’lumotlarni o‘chirish')}</h2>
            <p>{t('Vazifalar, odatlar, kun tartibi, fokus statistikasi va ilova sozlamalari o‘chiriladi. Ism, familiya, email va parolingiz saqlanib qoladi.')}</p>
          </div>
        </div>
        {!confirmReset
          ? <button className="button settings-reset-button" type="button" onClick={() => { setResetComplete(false); setConfirmReset(true); }} disabled={resetSaving || themeSaving}>
            {t('Ma’lumotlarni o‘chirish')}
          </button>
          : <div className="settings-reset-confirmation" role="alert">
            <p>{t('Bu amalni bekor qilib bo‘lmaydi. Ishonchingiz komilmi?')}</p>
            <div>
              <button className="button settings-reset-button" type="button" onClick={resetData} disabled={resetSaving || themeSaving}>
                {resetSaving ? t('O‘chirilmoqda...') : t('Ha, hamma ma’lumotni o‘chirish')}
              </button>
              <button className="button settings-reset-cancel" type="button" onClick={() => setConfirmReset(false)} disabled={resetSaving || themeSaving}>
                {t('Bekor qilish')}
              </button>
            </div>
          </div>}
        {resetError && <p className="settings-reset-error" role="alert">{t(resetError)}</p>}
        {resetComplete && <p className="settings-reset-success" role="status">{t('Ma’lumotlaringiz o‘chirildi. Ism, familiya, email va parolingiz saqlab qolindi.')}</p>}
      </section>
    </div>
  );
}

export default SettingsPage;
