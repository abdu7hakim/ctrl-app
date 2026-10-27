import { useEffect, useState } from 'react';
import { updateProfile } from 'firebase/auth';
import { doc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../../firebase';

function ProfilePage({ user, onSave }) {
  const [firstName, setFirstName] = useState(user.firstName);
  const [lastName, setLastName] = useState(user.lastName);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

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

  return (
    <div className="page-content">
      <div className="page-intro"><div><span className="eyebrow">SHAXSIY MA’LUMOTLAR</span><h2>Profil</h2><p>Hisobingizdagi ism va ma’lumotlarni yangilang.</p></div></div>
      <section className="surface-card profile-card">
        <div className="profile-summary"><span className="avatar avatar-large">{`${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`.toUpperCase()}</span><div><h3>{user.firstName} {user.lastName}</h3><p>{user.email}</p></div><span className="account-badge"><i className="ph ph-check-circle" /> Faol hisob</span></div>
        <form className="profile-form" onSubmit={submit}>
          <div className="form-row"><label>Ism<input value={firstName} onChange={(event) => { setFirstName(event.target.value); setSaved(false); }} required maxLength="60" /></label><label>Familiya<input value={lastName} onChange={(event) => { setLastName(event.target.value); setSaved(false); }} required maxLength="60" /></label></div>
          <label>E-mail manzil<input value={user.email} type="email" readOnly disabled /></label>
          <p className="profile-note"><i className="ph ph-info" /> E-mail manzilingizni o‘zgartirish uchun hisobni tasdiqlash talab qilinadi.</p>
          {error && <p className="form-error" role="alert">{error}</p>}
          <div className="profile-form-footer">{saved && <span className="success-message" role="status">Saqlandi</span>}<button className="button button-primary" disabled={saving}>{saving ? 'Saqlanmoqda...' : 'O‘zgarishlarni saqlash'}</button></div>
        </form>
      </section>
      <section className="surface-card data-notice"><span className="stat-icon violet"><i className="ph ph-database" /></span><div><h3>Ma’lumotlaringiz xavfsiz</h3><p>Profil ma’lumotlaringiz Firebase hisobingiz va shaxsiy Firestore hujjatingiz bilan bog‘langan.</p></div></section>
    </div>
  );
}

export default ProfilePage;
