export const profileImageStorageKey = (uid) => `ctrl-profile-image-${uid}`;

export const getStoredProfileImage = (uid) => {
  try {
    return window.localStorage.getItem(profileImageStorageKey(uid)) || '';
  } catch (error) {
    console.error('Profil rasmini local storage’dan o‘qishda xatolik:', error);
    return '';
  }
};

export const createProfileImageDataUrl = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onerror = () => reject(new Error('Rasm faylini o‘qib bo‘lmadi.'));
  reader.onload = () => {
    const image = new Image();
    image.onerror = () => reject(new Error('Rasm faylini ochib bo‘lmadi.'));
    image.onload = () => {
      const maxDimension = 512;
      const scale = Math.min(1, maxDimension / Math.max(image.naturalWidth, image.naturalHeight));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
      const context = canvas.getContext('2d');
      if (!context) {
        reject(new Error('Rasmni qayta ishlash imkoni bo‘lmadi.'));
        return;
      }

      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/jpeg', 0.82));
    };
    image.src = reader.result;
  };
  reader.readAsDataURL(file);
});
