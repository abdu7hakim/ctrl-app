import { useState } from 'react';
import { auth, db } from '../../firebase';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';

function ContactPage({ user, onSend }) {
  const [sent, setSent] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const submit = async (event) => {
    event.preventDefault();
    setError('');
    setSent(false);
    setSaving(true);
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const firebaseUser = auth.currentUser;

    try {
      if (!user?.uid || !firebaseUser || firebaseUser.uid !== user.uid) {
        throw new Error('Xabar yuborish uchun hisobingizga kiring.');
      }

      await addDoc(collection(db, 'messages'), {
        name: String(form.get('name')).trim(),
        email: String(form.get('email')).trim(),
        message: String(form.get('message')).trim(),
        userId: firebaseUser.uid,
        createdAt: serverTimestamp(),
      });
      formElement.reset();
      setSent(true);
      onSend();
    } catch (sendError) {
      console.error('Aloqa xabarini yuborishda xatolik:', sendError);
      setError(sendError.message || 'Xabarni yuborib bo‘lmadi. Qayta urinib ko‘ring.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page-content">
      <div className="page-intro"><div><span className="eyebrow">BIZ BILAN BOG‘LANING</span><h2>Aloqa</h2><p>Savol yoki takliflaringiz bormi? Bizga yozing.</p></div></div>
      <div className="contact-layout">
        <section className="surface-card contact-info"><span className="promo-icon"><i className="ph ph-chat-teardrop-text" /></span><span className="eyebrow">CTRL JAMOASI</span><h3>Har bir fikringiz muhim.</h3><p>CTRL ilovasini yanada foydali qilish ustida ishlayapmiz. Takliflaringizni biz bilan baham ko‘ring.</p><a href="mailto:abdu7hakim@gmail.com"><i className="ph ph-envelope-simple" /> abdu7hakim@gmail.com</a></section>
        <section className="surface-card contact-form-card"><h3>Xabar yuborish</h3><form className="form-stack" onSubmit={submit}><label>Ismingiz<input name="name" defaultValue={`${user?.firstName || ''} ${user?.lastName || ''}`.trim()} required maxLength="80" placeholder="Ismingiz" disabled={saving} /></label><label>E-mail manzilingiz<input name="email" type="email" defaultValue={user?.email || ''} required maxLength="254" placeholder="siz@example.com" disabled={saving} /></label><label>Xabaringiz<textarea name="message" rows="5" required minLength="5" maxLength="2000" placeholder="Sizga qanday yordam bera olamiz?" disabled={saving} /></label>{error && <p className="form-error" role="alert">{error}</p>}<button className="button button-primary button-wide" disabled={saving}><i className="ph ph-paper-plane-tilt" /> {saving ? 'Yuborilmoqda...' : 'Xabarni yuborish'}</button>{sent && <p className="success-message" role="status">Xabaringiz qabul qilindi. Rahmat!</p>}</form></section>
      </div>
    </div>
  );
}

export default ContactPage;
