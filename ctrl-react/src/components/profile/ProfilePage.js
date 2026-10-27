import { useEffect, useState } from 'react';
import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword,
  updateProfile,
} from 'firebase/auth';
import { doc, updateDoc } from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { auth, db, storage } from '../../firebase';

const maxProfileImageSize = 5 * 1024 * 1024;
const allowedProfileImageTypes = ['image/jpeg', 'image/png', 'image/webp'];

function ProfilePage({ user, onSave }) {
  const [firstName, setFirstName] = useState(user.firstName);
  const [lastName, setLastName] = useState(user.lastName);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
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
      setError(saveError.message || 'Profilni saqlab bo‘lmadi. Qayta urinib ko‘ring.');
    } finally {
      setSaving(false);
    }
  };

  const uploadProfileImage = async (event) => {
    const image = event.target.files?.[0];
    event.target.value = '';
    if (!image) return;

    if (!allowedProfileImageTypes.includes(image.type)) {
      setError('Rasm JPG, PNG yoki WebP formatida bo‘lishi kerak.');
      return;
    }
    if (image.size > maxProfileImageSize) {
      setError('Rasm hajmi 5 MB dan oshmasligi kerak.');
      return;
    }

    setError('');
    setSaved(false);
    setUploadingImage(true);
    const firebaseUser = auth.currentUser;

    try {
      if (!firebaseUser || firebaseUser.uid !== user.uid) {
        throw new Error('Rasm yuklash uchun hisobingizga qayta kiring.');
      }

      const imageRef = ref(storage, `users/${user.uid}/profile/avatar`);
      await uploadBytes(imageRef, image, { contentType: image.type });
      const photoURL = await getDownloadURL(imageRef);
      await updateProfile(firebaseUser, { photoURL });
      await updateDoc(doc(db, 'users', user.uid), { photoURL });
      onSave({ ...user, photoURL });
      setSaved(true);
    } catch (uploadError) {
      console.error('Profil rasmini yuklashda xatolik:', uploadError);
      setError(uploadError.message || 'Rasmni yuklab bo‘lmadi. Qayta urinib ko‘ring.');
    } finally {
      setUploadingImage(false);
    }
  };

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
    return securitySaveError.message || fallback;
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
    <div className="page-content">
      <section className="surface-card profile-card">
        <div className="profile-summary">
          <div className="profile-avatar-control">
            {user.photoURL
              ? <img className="avatar avatar-large profile-avatar-image" src={user.photoURL} alt={`${user.firstName} profil rasmi`} />
              : <span className="avatar avatar-large">{`${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`.toUpperCase()}</span>}
            <label className={`profile-avatar-upload ${uploadingImage ? 'profile-avatar-uploading' : ''}`}>
              <i className={`ph ${uploadingImage ? 'ph-spinner' : 'ph-camera'}`} aria-hidden="true" />
              <span>{uploadingImage ? 'Yuklanmoqda...' : user.photoURL ? 'Rasmni almashtirish' : 'Rasm yuklash'}</span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                aria-label="Profil rasmini yuklash"
                onChange={uploadProfileImage}
                disabled={uploadingImage || saving}
              />
            </label>
          </div>
          <div><h3>{user.firstName} {user.lastName}</h3><p>{user.email}</p></div>
          <span className="account-badge"><i className="ph ph-check-circle" /> Faol hisob</span>
        </div>
        <form className="profile-form" onSubmit={submit}>
          <div className="form-row"><label>Ism<input value={firstName} onChange={(event) => { setFirstName(event.target.value); setSaved(false); }} required maxLength="60" /></label><label>Familiya<input value={lastName} onChange={(event) => { setLastName(event.target.value); setSaved(false); }} required maxLength="60" /></label></div>
          <label>E-mail manzil<input value={user.email} type="email" readOnly disabled /></label>
          <p className="profile-image-note">JPG, PNG yoki WebP · 5 MB gacha</p>
          {error && <p className="form-error" role="alert">{error}</p>}
          <div className="profile-form-footer">{saved && <span className="success-message" role="status">Saqlandi</span>}<button className="button button-primary" disabled={saving}>{saving ? 'Saqlanmoqda...' : 'O‘zgarishlarni saqlash'}</button></div>
        </form>
      </section>
      <section className="profile-security">
        <section className="surface-card profile-security-card">
          <div className="section-heading"><div><span className="eyebrow">HISOB XAVFSIZLIGI</span><h3>Parolni o‘zgartirish</h3></div></div>
          <p className="security-description">Hisobingizni himoya qilish uchun joriy parolingizni tasdiqlang.</p>
          <form className="profile-security-form" onSubmit={changePassword}>
            <label>Joriy parol<input type="password" autoComplete="current-password" value={currentPassword} onChange={(event) => { setCurrentPassword(event.target.value); setPasswordError(''); }} required disabled={passwordSaving} /></label>
            <label>Yangi parol<input type="password" autoComplete="new-password" value={newPassword} onChange={(event) => { setNewPassword(event.target.value); setPasswordError(''); }} required minLength="6" disabled={passwordSaving} /></label>
            <label>Yangi parolni tasdiqlang<input type="password" autoComplete="new-password" value={confirmPassword} onChange={(event) => { setConfirmPassword(event.target.value); setPasswordError(''); }} required minLength="6" disabled={passwordSaving} /></label>
            {passwordError && <p className="form-error" role="alert">{passwordError}</p>}
            {passwordNotice && <p className="success-message" role="status">{passwordNotice}</p>}
            <button className="button button-primary" disabled={passwordSaving}>{passwordSaving ? 'Saqlanmoqda...' : 'Yangi parolni saqlash'}</button>
          </form>
        </section>
      </section>
      <section className="surface-card data-notice"><span className="stat-icon violet"><i className="ph ph-database" /></span><div><h3>Ma’lumotlaringiz xavfsiz</h3><p>Profil ma’lumotlaringiz Firebase hisobingiz va shaxsiy Firestore hujjatingiz bilan bog‘langan.</p></div></section>
    </div>
  );
}

export default ProfilePage;
