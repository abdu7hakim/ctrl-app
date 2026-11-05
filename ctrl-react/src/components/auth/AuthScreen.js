import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { 
  createUserWithEmailAndPassword, 
  sendPasswordResetEmail,
  signInWithEmailAndPassword, 
  updateProfile 
} from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db, googleProvider, signInWithPopup } from '../../firebase';
import { defaultThemeId } from '../../utils/themes';
import { translate } from '../../utils/language';

function AuthScreen({ onAuthenticated, language = 'uz', onChangeLanguage }) {
  const t = (text) => translate(text, language);
  const [mode, setMode] = useState('signup');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);
  const [email, setEmail] = useState('');
  const [resetOpen, setResetOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetBusy, setResetBusy] = useState(false);
  const [resetError, setResetError] = useState('');
  const [resetNotice, setResetNotice] = useState('');
  const isSignup = mode === 'signup';
  const panelTransition = { duration: 0.4, ease: 'easeInOut' };

  const openResetModal = () => {
    setResetEmail(email);
    setResetError('');
    setResetNotice('');
    setResetOpen(true);
  };

  const sendResetLink = async (event) => {
    event.preventDefault();
    setResetError('');
    setResetBusy(true);

    try {
      await sendPasswordResetEmail(auth, resetEmail.trim());
      setResetOpen(false);
      setResetNotice('Parolni tiklash havolasi emailingizga yuborildi. Iltimos, pochtangizni tekshiring.');
    } catch (resetSendError) {
      let errorMessage = 'Parolni tiklash havolasini yuborib bo‘lmadi. Qayta urinib ko‘ring.';
      if (resetSendError.code === 'auth/user-not-found') {
        errorMessage = 'Bunday email topilmadi.';
      } else if (resetSendError.code === 'auth/invalid-email') {
        errorMessage = 'Email manzili noto‘g‘ri.';
      } else if (resetSendError.code === 'auth/too-many-requests') {
        errorMessage = 'Juda ko‘p urinish bo‘ldi. Birozdan so‘ng qayta urinib ko‘ring.';
      } else if (resetSendError.code === 'auth/network-request-failed') {
        errorMessage = 'Internet aloqasi yo‘q. Qayta urinib ko‘ring.';
      }
      setResetError(errorMessage);
    } finally {
      setResetBusy(false);
    }
  };

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
          routine: {},
          routineBadges: [],
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
      let errorMessage = 'Tizimga kirishda xatolik yuz berdi. Qayta urinib ko‘ring.';
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

  const signInWithGoogle = async () => {
    setError('');
    setGoogleBusy(true);

    try {
      const { user } = await signInWithPopup(auth, googleProvider);
      const [firstName = '', ...lastNameParts] = (user.displayName || '').trim().split(/\s+/);
      onAuthenticated?.({
        uid: user.uid,
        email: user.email || '',
        firstName: firstName || user.email?.split('@')[0] || '',
        lastName: lastNameParts.join(' '),
      });
    } catch {
      setError('Google bilan kirish bekor qilindi');
    } finally {
      setGoogleBusy(false);
    }
  };

  return (
    <main className={`auth-page${isSignup ? '' : ' auth-page-login'}`}>
      <motion.section layout transition={panelTransition} className="auth-art">
        <div className="brand"><img className="brand-mark" src={`${process.env.PUBLIC_URL}/assets/ctrl-app-logo.png`} alt="" /> CTRL App</div>
        <div className="auth-hero">
          <h1>{t('Hayotingizni')}<br />{t('boshqarishni')}<br /><span>{t('bugun boshlang.')}</span></h1>
        </div>
      </motion.section>
      <motion.section layout transition={panelTransition} className="auth-panel">
        <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={mode}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2, ease: 'easeInOut' }}
          className="auth-card"
        >
          <button className="auth-language-toggle" type="button" onClick={() => onChangeLanguage(language === 'uz' ? 'en' : 'uz')} aria-label={t('Tilni almashtirish')}>
            <i className="ph ph-globe-hemisphere-west" aria-hidden="true" /> {language === 'uz' ? 'EN' : 'UZ'}
          </button>
          <div className="auth-mobile-brand"><img className="brand-mark" src={`${process.env.PUBLIC_URL}/assets/ctrl-app-logo.png`} alt="" /> CTRL App</div>
          <div className="auth-heading">
            <h2>{t(mode === 'signup' ? 'Hisob yarating' : 'Hisobingizga kiring')}</h2>
            <p>{t('Davom etish uchun ma’lumotlaringizni kiriting.')}</p>
          </div>
          <form className="form-stack" onSubmit={submit}>
            {mode === 'signup' && (
              <div className="form-row">
                <label>{t('Ism')}<input name="firstName" autoComplete="given-name" placeholder={t('Ismingiz')} required /></label>
                <label>{t('Familiya')}<input name="lastName" autoComplete="family-name" placeholder={t('Familiyangiz')} required /></label>
              </div>
            )}
            <label>{t('E-mail manzil')}<input name="email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder={language === 'en' ? 'you@example.com' : 'siz@example.com'} required /></label>
            <label className="auth-password-label">{t('Parol')}<input name="password" type="password" autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} minLength="6" placeholder={t('Kamida 6 ta belgi')} required />{mode === 'login' && <button className="auth-forgot-link" type="button" onClick={openResetModal}>{t('Parolni unutdingizmi?')}</button>}</label>
            {mode === 'signup' && <label className="check-label"><input type="checkbox" required /> {t('Foydalanish shartlariga roziman')}</label>}
            {error && <p className="form-error" role="alert">{t(error)}</p>}
            {resetNotice && <p className="auth-reset-notice" role="status">{t(resetNotice)}</p>}
            <button className="button button-primary button-wide" disabled={busy}>
              {t(busy ? 'Kuting...' : mode === 'signup' ? 'Hisob yaratish' : 'Kirish')}
              <i className="ph ph-arrow-right" aria-hidden="true" />
            </button>
          </form>
          <div className="auth-divider"><span>{t('yoki')}</span></div>
          <button
            className="auth-google-button"
            type="button"
            onClick={signInWithGoogle}
            disabled={busy || googleBusy}
          >
            <svg viewBox="0 0 48 48" aria-hidden="true">
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5Z" />
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.72 7.18l7.62 5.91c4.44-4.1 7.14-10.15 7.14-17.56Z" />
              <path fill="#FBBC05" d="M10.53 28.59A14.4 14.4 0 0 1 9.75 24c0-1.59.27-3.13.75-4.59l-7.98-6.19A23.9 23.9 0 0 0 0 24c0 3.88.93 7.55 2.56 10.78l7.97-6.19Z" />
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.9-5.89l-7.62-5.91c-2.12 1.42-4.84 2.27-8.28 2.27-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48Z" />
            </svg>
            {t(googleBusy ? 'Google orqali kirilmoqda...' : 'Google orqali davom etish')}
          </button>
          <p className="auth-switch">
            {t(mode === 'signup' ? 'Hisobingiz bormi?' : 'Hali hisobingiz yo‘qmi?')}
            {' '}<button type="button" className="text-button" onClick={() => { setError(''); setMode(mode === 'signup' ? 'login' : 'signup'); }}>
              {t(mode === 'signup' ? 'Kirish' : 'Ro‘yxatdan o‘tish')}
            </button>
          </p>
        </motion.div>
        </AnimatePresence>
      </motion.section>
      <AnimatePresence>
        {resetOpen && (
          <motion.div
            className="auth-modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onKeyDown={(event) => {
              if (event.key === 'Escape' && !resetBusy) setResetOpen(false);
            }}
            onMouseDown={(event) => {
              if (event.target === event.currentTarget && !resetBusy) setResetOpen(false);
            }}
          >
            <motion.section
              className="auth-reset-modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="auth-reset-title"
              initial={{ opacity: 0, y: 12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.98 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
            >
              <button className="auth-reset-close" type="button" aria-label={t('Yopish')} onClick={() => setResetOpen(false)} disabled={resetBusy}>
                <i className="ph ph-x" aria-hidden="true" />
              </button>
              <span className="auth-reset-icon"><i className="ph ph-lock-key-open" aria-hidden="true" /></span>
              <h2 id="auth-reset-title">{t('Parolni tiklash')}</h2>
              <p>{t('Hisobingizga bog‘langan email manzilini kiriting. Tiklash havolasini yuboramiz.')}</p>
              <form className="form-stack" onSubmit={sendResetLink}>
                <label>{t('E-mail manzil')}<input type="email" autoComplete="email" autoFocus value={resetEmail} onChange={(event) => setResetEmail(event.target.value)} placeholder={language === 'en' ? 'you@example.com' : 'siz@example.com'} required disabled={resetBusy} /></label>
                {resetError && <p className="form-error" role="alert">{t(resetError)}</p>}
                <button className="button button-primary button-wide" type="submit" disabled={resetBusy}>
                  <i className="ph ph-paper-plane-tilt" aria-hidden="true" /> {t(resetBusy ? 'Yuborilmoqda...' : 'Tiklash havolasini yuborish')}
                </button>
              </form>
            </motion.section>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}

export default AuthScreen;