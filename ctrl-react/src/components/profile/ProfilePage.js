import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, X } from 'lucide-react';
import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword,
  updateProfile,
} from 'firebase/auth';
import { doc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../../firebase';
import { avatarOptions, getAvatarInitials, saveStoredAvatar } from '../../utils/avatars';
import { translate } from '../../utils/language';

function ProfilePage({ user, onSave, language = 'uz' }) {
  const t = (text) => translate(text, language);
  const [firstName, setFirstName] = useState(user.firstName);
  const [lastName, setLastName] = useState(user.lastName);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [avatarPickerOpen, setAvatarPickerOpen] = useState(false);
  const [selectedAvatar, setSelectedAvatar] = useState(user.avatar);
  const [error, setError] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordNotice, setPasswordNotice] = useState('');
  const [passwordError, setPasswordError] = useState('');

  useEffect(() => {
    setFirstName(user.firstName);
    setLastName(user.lastName);
    setSelectedAvatar(user.avatar);
  }, [user]);

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    setSaved(false);
    setSaving(true);
    const firebaseUser = auth.currentUser;

    try {
      if (!firebaseUser || firebaseUser.uid !== user.uid) {
        throw new Error('Profilni yangilash uchun hisobingizga qayta kiring.');
      }

      const updatedFirstName = firstName.trim();
      const updatedLastName = lastName.trim();
      const displayName = `${updatedFirstName} ${updatedLastName}`.trim();
      await updateProfile(firebaseUser, { displayName });
      await updateDoc(doc(db, 'users', user.uid), {
        firstName: updatedFirstName,
        lastName: updatedLastName,
        email: user.email,
      });

      onSave({ ...user, firstName: updatedFirstName, lastName: updatedLastName });
      setSaved(true);
    } catch (saveError) {
      console.error('Profilni saqlashda xatolik:', saveError);
      setError('Profilni saqlab bo‘lmadi. Qayta urinib ko‘ring.');
    } finally {
      setSaving(false);
    }
  };

  const selectAvatar = (avatarPath) => {
    setError('');
    setSaved(false);
    try {
      saveStoredAvatar(avatarPath);
      setSelectedAvatar(avatarPath);
      onSave({ ...user, avatar: avatarPath });
      setSaved(true);
      setAvatarPickerOpen(false);
    } catch (avatarError) {
      console.error('Tanlangan avatarni saqlashda xatolik:', avatarError);
      setError('Avatarni saqlab bo‘lmadi. Qayta urinib ko‘ring.');
    }
  };

  useEffect(() => {
    if (!avatarPickerOpen) return undefined;
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') setAvatarPickerOpen(false);
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [avatarPickerOpen]);

  const getSecurityErrorMessage = (securitySaveError, fallback) => {
    if (['auth/wrong-password', 'auth/invalid-credential'].includes(securitySaveError.code)) {
      return 'Joriy parol noto‘g‘ri.';
    }
    if (securitySaveError.code === 'auth/weak-password') {
      return 'Yangi parol kamida 6 ta belgidan iborat bo‘lishi kerak.';
    }
    if (securitySaveError.code === 'auth/requires-recent-login') {
      return 'Xavfsizlik uchun hisobingizdan chiqib, qayta kiring va yana urinib ko‘ring.';
    }
    return fallback;
  };

  const changePassword = async (event) => {
    event.preventDefault();
    setPasswordError('');
    setPasswordNotice('');
    if (newPassword !== confirmPassword) {
      setPasswordError('Yangi parol va tasdiqlash paroli bir xil emas.');
      return;
    }

    setPasswordSaving(true);
    const firebaseUser = auth.currentUser;

    try {
      if (!firebaseUser || firebaseUser.uid !== user.uid || !firebaseUser.email) {
        throw new Error('Parolni o‘zgartirish uchun email-parol hisobingizga qayta kiring.');
      }

      const credential = EmailAuthProvider.credential(firebaseUser.email, currentPassword);
      await reauthenticateWithCredential(firebaseUser, credential);
      await updatePassword(firebaseUser, newPassword);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPasswordNotice('Parolingiz muvaffaqiyatli yangilandi.');
    } catch (passwordError) {
      console.error('Parolni o‘zgartirishda xatolik:', passwordError);
      setPasswordError(getSecurityErrorMessage(passwordError, 'Parolni o‘zgartirib bo‘lmadi. Qayta urinib ko‘ring.'));
    } finally {
      setPasswordSaving(false);
    }
  };

  return (
    <div className="page-content profile-page">
      <section className="surface-card profile-card">
        <div className="profile-summary">
          <div className="profile-avatar-control">
            {selectedAvatar
              ? <img className="profile-avatar-image" src={`${process.env.PUBLIC_URL}${selectedAvatar}`} alt={`${user.firstName} ${t('profil avatari')}`} />
              : <span className="profile-avatar-fallback profile-avatar-fallback-large" aria-label={`${user.firstName} ${t('profil avatari')}`}>{getAvatarInitials(user)}</span>}
            <button type="button" className="profile-avatar-change" onClick={() => setAvatarPickerOpen(true)}>
              {t('Avatarni o‘zgartirish')}
            </button>
          </div>
          <div><h3>{user.firstName} {user.lastName}</h3><p>{user.email}</p></div>
          <span className="account-badge"><i className="ph ph-check-circle" /> {t('Faol hisob')}</span>
        </div>
        <form className="profile-form" onSubmit={submit}>
          <div className="form-row"><label>{t('Ism')}<input value={firstName} onChange={(event) => { setFirstName(event.target.value); setSaved(false); }} required maxLength="60" /></label><label>{t('Familiya')}<input value={lastName} onChange={(event) => { setLastName(event.target.value); setSaved(false); }} required maxLength="60" /></label></div>
          <label>{t('E-mail manzil')}<input value={user.email} type="email" readOnly disabled /></label>
          {error && <p className="form-error" role="alert">{t(error)}</p>}
          <div className="profile-form-footer">{saved && <span className="success-message" role="status">{t('Saqlandi')}</span>}<button className="button button-primary" disabled={saving}>{t(saving ? 'Saqlanmoqda...' : 'O‘zgarishlarni saqlash')}</button></div>
        </form>
      </section>
      <AnimatePresence>
        {avatarPickerOpen && (
          <motion.div
            className="avatar-picker-backdrop"
            role="presentation"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) setAvatarPickerOpen(false);
            }}
          >
            <motion.section
              className="avatar-picker-panel"
              role="dialog"
              aria-modal="true"
              aria-labelledby="avatar-picker-title"
              initial={{ opacity: 0, y: 28, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 18, scale: 0.98 }}
              transition={{ duration: 0.24, ease: 'easeOut' }}
            >
              <div className="avatar-picker-heading">
                <div>
                  <h2 id="avatar-picker-title">{t('Avatarni tanlang')}</h2>
                </div>
                <button type="button" className="icon-button" aria-label={t('Yopish')} onClick={() => setAvatarPickerOpen(false)}>
                  <X size={18} aria-hidden="true" />
                </button>
              </div>
              <div className="avatar-picker-grid">
                {avatarOptions.map((avatar) => {
                  const isSelected = selectedAvatar === avatar.path;
                  return (
                    <button
                      className={`avatar-picker-option ${isSelected ? 'avatar-picker-option-selected' : ''}`}
                      type="button"
                      key={avatar.id}
                      aria-label={`${t('Avatar')} ${avatar.name}`}
                      aria-pressed={isSelected}
                      onClick={() => selectAvatar(avatar.path)}
                    >
                      <img src={`${process.env.PUBLIC_URL}${avatar.path}`} alt="" />
                      {isSelected && <span className="avatar-picker-check"><Check size={15} aria-hidden="true" /></span>}
                    </button>
                  );
                })}
              </div>
            </motion.section>
          </motion.div>
        )}
      </AnimatePresence>
      <section className="profile-security">
        <section className="surface-card profile-security-card">
          <div className="section-heading"><div><h3>{t('Parolni o‘zgartirish')}</h3></div></div>
          <p className="security-description">{t('Hisobingizni himoya qilish uchun joriy parolingizni tasdiqlang.')}</p>
          <form className="profile-security-form" onSubmit={changePassword}>
            <label>{t('Joriy parol')}<input type="password" autoComplete="current-password" value={currentPassword} onChange={(event) => { setCurrentPassword(event.target.value); setPasswordError(''); }} required disabled={passwordSaving} /></label>
            <label>{t('Yangi parol')}<input type="password" autoComplete="new-password" value={newPassword} onChange={(event) => { setNewPassword(event.target.value); setPasswordError(''); }} required minLength="6" disabled={passwordSaving} /></label>
            <label>{t('Yangi parolni tasdiqlang')}<input type="password" autoComplete="new-password" value={confirmPassword} onChange={(event) => { setConfirmPassword(event.target.value); setPasswordError(''); }} required minLength="6" disabled={passwordSaving} /></label>
            {passwordError && <p className="form-error" role="alert">{t(passwordError)}</p>}
            {passwordNotice && <p className="success-message" role="status">{t(passwordNotice)}</p>}
            <button className="button button-primary" disabled={passwordSaving}>{t(passwordSaving ? 'Saqlanmoqda...' : 'Yangi parolni saqlash')}</button>
          </form>
        </section>
      </section>
      <section className="surface-card data-notice"><span className="stat-icon violet"><i className="ph ph-database" /></span><div><h3>{t('Ma’lumotlaringiz xavfsiz')}</h3><p>{t('Profil ma’lumotlaringiz Firebase hisobingiz va shaxsiy Firestore hujjatingiz bilan bog‘langan.')}</p></div></section>
    </div>
  );
}

export default ProfilePage;
