import { useRef, useState } from 'react';
import { auth, db } from '../../firebase';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { translate } from '../../utils/language';

function ContactPage({ user, onSend, language = 'uz' }) {
  const t = (text) => translate(text, language);
  const [sent, setSent] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const messageInputRef = useRef(null);
  const messagePrompts = [
    { icon: 'ph-question', label: 'Savolim bor', message: 'Salom! CTRL App haqida savolim bor: ' },
    { icon: 'ph-lightbulb', label: 'G‘oyam bor', message: 'Salom! CTRL App uchun bir g‘oyam bor: ' },
    { icon: 'ph-chat-centered-dots', label: 'Yordam kerak', message: 'Salom! CTRL App’dan foydalanishda yordam kerak: ' },
  ];

  const startMessage = (prompt) => {
    setMessage(t(prompt.message));
    messageInputRef.current?.focus();
  };

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
      setMessage('');
      setSent(true);
      onSend();
    } catch (sendError) {
      console.error('Aloqa xabarini yuborishda xatolik:', sendError);
      setError('Xabarni yuborib bo‘lmadi. Qayta urinib ko‘ring.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page-content">
      <div className="contact-layout">
        <section className="surface-card contact-info">
          <div className="contact-invitation-heading">
            <span className="contact-invitation-icon"><i className="ph ph-chat-circle-dots" /></span>
            <span className="eyebrow">{t('FIKRINGIZ BIZ UCHUN MUHIM')}</span>
          </div>
          <h3>{t('Bir xabar bilan boshlaymizmi?')}</h3>
          <p>{t('Savol, yangi g‘oya yoki duch kelgan muammo — yozing. Sizning fikringiz CTRL App’ni yanada yaxshilashga yordam beradi.')}</p>
          <span className="contact-prompt-label">{t('Nimadan boshlaymiz?')}</span>
          <div className="contact-prompt-list">
            {messagePrompts.map((prompt) => (
              <button className="contact-prompt" key={prompt.label} type="button" onClick={() => startMessage(prompt)}>
                <i className={`ph ${prompt.icon}`} /> {t(prompt.label)}
              </button>
            ))}
          </div>
          <a className="contact-email" href="mailto:abdu7hakim@gmail.com"><i className="ph ph-envelope-simple" /> abdu7hakim@gmail.com</a>
        </section>
        <section className="surface-card contact-form-card"><h3>{t('Xabar yuborish')}</h3><form className="form-stack" onSubmit={submit}><label>{t('Ismingiz')}<input name="name" defaultValue={`${user?.firstName || ''} ${user?.lastName || ''}`.trim()} required maxLength="80" placeholder={t('Ismingiz')} disabled={saving} /></label><label>{t('E-mail manzilingiz')}<input name="email" type="email" defaultValue={user?.email || ''} required maxLength="254" placeholder={language === 'en' ? 'you@example.com' : 'siz@example.com'} disabled={saving} /></label><label>{t('Xabaringiz')}<textarea ref={messageInputRef} name="message" rows="5" required minLength="5" maxLength="2000" value={message} onChange={(event) => setMessage(event.target.value)} placeholder={t('Sizga qanday yordam bera olamiz?')} disabled={saving} /></label>{error && <p className="form-error" role="alert">{t(error)}</p>}<button className="button button-primary button-wide" disabled={saving}><i className="ph ph-paper-plane-tilt" /> {t(saving ? 'Yuborilmoqda...' : 'Xabarni yuborish')}</button>{sent && <p className="success-message" role="status">{t('Xabaringiz qabul qilindi. Rahmat!')}</p>}</form></section>
      </div>
    </div>
  );
}

export default ContactPage;
