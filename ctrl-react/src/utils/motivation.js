export const motivationalQuotes = [
  'Kichik qadamlar ham katta o‘zgarishlarga olib boradi.',
  'Bugungi mehnatingiz ertangi natijangizga aylanadi.',
  'Boshlash uchun mukammal vaqt — hozir.',
  'Har bir bajarilgan vazifa maqsadingizga yaqinlashtiradi.',
  'Izchillik iste’doddan ham kuchliroq bo‘lishi mumkin.',
  'Sekin bo‘lsa ham, oldinga qarab harakat qiling.',
  'O‘zingizga bergan va’dangizni bajaring — shu ham yutuq.',
  'Katta maqsadlar kichik odatlardan boshlanadi.',
  'Bugun qilgan ishingiz bilan faxrlaning.',
  'Harakat bor joyda imkoniyat ham bor.',
  'Bir vaqtning o‘zida bitta ishga diqqat qarating.',
  'Mukammallikni emas, davomiylikni tanlang.',
  'Har kuni ozgina o‘sish — yil davomida katta farq.',
  'Qiyin vazifani boshlash uning yarmini uddalashdir.',
  'O‘z sur’atingizda yuring, faqat to‘xtab qolmang.',
  'Bugungi tanlovlaringiz kelajagingizni shakllantiradi.',
  'Yangi odat bir martalik urinishdan boshlanadi.',
  'Har bir kichik g‘alaba e’tirofga loyiq.',
  'Reja yo‘nalish beradi, harakat esa natija.',
  'Dam olish ham samarali kunning bir qismi.',
  'O‘zingiz bilan kechagidan yaxshiroq bo‘lish uchun bellashing.',
  'Bir qadam tashlang — keyingisi osonroq bo‘ladi.',
  'Diqqatni muhim narsaga qarating, qolganini keyin qilasiz.',
  'Bugun imkoningiz boricha harakat qiling — shu yetarli.',
  'Maqsadingizga sodiq qoling, natija vaqt bilan keladi.',
];

export function getDailyMotivation(date = new Date()) {
  const dateKey = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
  let hash = 2166136261;

  for (let index = 0; index < dateKey.length; index += 1) {
    hash = Math.imul(hash ^ dateKey.charCodeAt(index), 16777619);
  }

  return motivationalQuotes[(hash >>> 0) % motivationalQuotes.length];
}
