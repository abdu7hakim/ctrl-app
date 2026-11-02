export const avatarOptions = Array.from({ length: 12 }, (_, index) => {
  const number = index + 1;
  return {
    id: String(number),
    name: String(number),
    path: `/avatar/${number}.jpg`,
  };
});

const avatarStorageKey = 'userAvatar';

export const getStoredAvatar = () => {
  let storedAvatar;
  try {
    storedAvatar = window.localStorage.getItem(avatarStorageKey);
  } catch (error) {
    console.error('Tanlangan avatarni brauzer xotirasidan o‘qishda xatolik:', error);
    return null;
  }

  if (avatarOptions.some(({ path }) => path === storedAvatar)) return storedAvatar;

  if (storedAvatar) {
    try {
      window.localStorage.removeItem(avatarStorageKey);
    } catch (error) {
      console.error('Eski avatar tanlovini brauzer xotirasidan o‘chirishda xatolik:', error);
    }
  }
  return null;
};

export const saveStoredAvatar = (avatarPath) => {
  if (!avatarOptions.some(({ path }) => path === avatarPath)) {
    throw new Error('Tanlangan avatar mavjud emas.');
  }

  window.localStorage.setItem(avatarStorageKey, avatarPath);
};

export const clearStoredAvatar = () => window.localStorage.removeItem(avatarStorageKey);

export const getAvatarInitials = (user) => {
  const initials = `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`.toUpperCase();
  return initials || user.email?.[0]?.toUpperCase() || 'U';
};
