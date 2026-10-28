import { useState } from 'react';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  updateProfile 
} from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../../firebase';
import { defaultThemeId } from '../../utils/themes';
import { translate } from '../../utils/language';

function AuthScreen({ onAuthenticated, language = 'uz', onChangeLanguage }) {
  const t = (text) => translate(text, language);
  const [mode, setMode] = useState('signup');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    setBusy(true);
    
    const form = new FormData(event.currentTarget);
    const email = form.get('email');
    const password = form.get('password');

    try {
      if (mode === 'signup') {
        const firstName = form.get('firstName');
        const lastName = form.get('lastName');

        // 1. Firebase'da yangi foydalanuvchi yaratish
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        
        // 2. Foydalanuvchi ismini va familiyasini saqlash
        await updateProfile(userCredential.user, {
          displayName: `${firstName} ${lastName}`
        });
        await setDoc(doc(db, 'users', userCredential.user.uid), {
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          email: userCredential.user.email,
          todos: [],
          habits: [],
          focusSessions: 0,
          focusMinutes: 0,
          darkMode: false,
          colorTheme: defaultThemeId,
          focusDurationMinutes: 25,
          breakDurationMinutes: 5,
          focusAlarmSound: 'bell',
          focusBackgroundMusic: false,
          focusBackgroundTrack: 'ambient',
          language,
        }, { merge: true });

        onAuthenticated?.({
          uid: userCredential.user.uid,
          email: userCredential.user.email,
          firstName: firstName.trim(),
          lastName: lastName.trim(),
        });

      } else {
        // Tizimga kirish
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (submitError) {
      // Firebase xatoliklarini o'zbekchaga yaqinlashtirish (ixtiyoriy)
      let errorMessage = submitError.message;
      if (submitError.code === 'auth/email-already-in-use') {
        errorMessage = "Bu email allaqachon ro'yxatdan o'tgan.";
      } else if (submitError.code === 'auth/invalid-credential' || submitError.code === 'auth/wrong-password') {
        errorMessage = "Email yoki parol xato.";
      } else if (submitError.code === 'auth/weak-password') {
        errorMessage = "Parol juda oddiy. Kamida 6 ta belgi kiriting.";
      } else if (submitError.code === 'auth/invalid-email') {
        errorMessage = 'Email manzili noto‘g‘ri.';
      } else if (submitError.code === 'auth/user-not-found') {
        errorMessage = 'Bu email bilan ro‘yxatdan o‘tgan hisob topilmadi.';
      } else if (submitError.code === 'auth/too-many-requests') {
        errorMessage = 'Juda ko‘p urinish bo‘ldi. Birozdan so‘ng qayta urinib ko‘ring.';
      } else if (submitError.code === 'auth/network-request-failed') {
        errorMessage = 'Internet aloqasi yo‘q. Qayta urinib ko‘ring.';
      }
      
      setError(errorMessage);
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="auth-page">
      <section className="auth-art">
        <div className="brand"><img className="brand-mark" src={`${process.env.PUBLIC_URL}/assets/ctrl-app-logo.png`} alt="" /> CTRL App</div>
        <div className="auth-hero">
          <span className="eyebrow">{t('SHAXSIY MAKONINGIZ')}</span>
          <h1>{t('Hayotingizni')}<br />{t('boshqarishni')}<br /><span>{t('bugun boshlang.')}</span></h1>
          <p>{t('Vazifalar, odatlar va diqqat — barchasi bir joyda.')}</p>
        </div>
        <div className="auth-art-footer">{t('Fikringizni jamlang. Maqsad sari yuring.')}</div>
      </section>
      <section className="auth-panel">
        <div className="auth-card">
          <button className="auth-language-toggle" type="button" onClick={() => onChangeLanguage(language === 'uz' ? 'en' : 'uz')} aria-label={t('Tilni almashtirish')}>
            <i className="ph ph-globe-hemisphere-west" aria-hidden="true" /> {language === 'uz' ? 'EN' : 'UZ'}
          </button>
          <div className="auth-mobile-brand"><img className="brand-mark" src={`${process.env.PUBLIC_URL}/assets/ctrl-app-logo.png`} alt="" /> CTRL App</div>
          <div className="auth-heading">
            <span className="eyebrow">{t(mode === 'signup' ? 'BOSHLASH' : 'QAYTGANINGIZDAN XURSANDMIZ')}</span>
            <h2>{t(mode === 'signup' ? 'Hisob yarating' : 'Hisobingizga kiring')}</h2>
            <p>{t(mode === 'signup' ? 'Bugundan unumli kunlar sari.' : 'Davom etish uchun ma’lumotlaringizni kiriting.')}</p>
          </div>
          <form className="form-stack" onSubmit={submit}>
            {mode === 'signup' && (
              <div className="form-row">
                <label>{t('Ism')}<input name="firstName" autoComplete="given-name" placeholder={t('Ismingiz')} required /></label>
                <label>{t('Familiya')}<input name="lastName" autoComplete="family-name" placeholder={t('Familiyangiz')} required /></label>
              </div>
            )}
            <label>{t('E-mail manzil')}            <input name="email" type="email" autoComplete="email" placeholder={language === 'en' ? 'you@example.com' : 'siz@example.com'} required /></label>
            <label>{t('Parol')}<input name="password" type="password" autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} minLength="6" placeholder={t('Kamida 6 ta belgi')} required /></label>
            {mode === 'signup' && <label className="check-label"><input type="checkbox" required /> {t('Foydalanish shartlariga roziman')}</label>}
            {error && <p className="form-error" role="alert">{t(error)}</p>}
            <button className="button button-primary button-wide" disabled={busy}>
              {t(busy ? 'Kuting...' : mode === 'signup' ? 'Hisob yaratish' : 'Kirish')}
              <i className="ph ph-arrow-right" aria-hidden="true" />
            </button>
          </form>
          <p className="auth-switch">
            {t(mode === 'signup' ? 'Hisobingiz bormi?' : 'Hali hisobingiz yo‘qmi?')}
            {' '}<button type="button" className="text-button" onClick={() => { setError(''); setMode(mode === 'signup' ? 'login' : 'signup'); }}>
              {t(mode === 'signup' ? 'Kirish' : 'Ro‘yxatdan o‘tish')}
            </button>
          </p>
        </div>
      </section>
    </main>
  );
}

export default AuthScreen;