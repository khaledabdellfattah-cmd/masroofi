export const DEFAULT_SALARY = 24000;
export const DEFAULT_PAYDAY = 5;

/*
 * معاني الخيارات:
 *  fixed     تحويل ثابت يوم القبض (أهلك، التبرع) — مش بيدخل في شريط "فلوس الصرف"، ومستحيل نسحب منه
 *  daily     بيدخل في حساب "تقدر تصرف النهارده"
 *  weekly    بيتقسم على الأسابيع (معيشتي)
 *  rollover  اللي متصرفش يترحّل للدورة الجاية (الهدايا)
 *  canCover  ممكن أسحب منه لو بند تاني عدّى حده (الخروجات واللبس بس)
 *  emergency صندوق طوارئ — السحب منه محتاج تأكيد وسبب
 */
export const DEFAULT_CATEGORIES = [
  { name: 'أهلك', icon: '🏠', color: '#8b5cf6', budget: 7000, kind: 'expense', fixed: true },
  { name: 'معيشتي', icon: '🍽️', color: '#0ea5e9', budget: 5500, kind: 'expense', daily: true, weekly: true, hint: 'أكل وشرب ومواصلات ونت ورصيد واشتراكات ومصاريف المدينة' },
  { name: 'تبرع', icon: '🤲', color: '#14b8a6', budget: 1000, kind: 'expense', fixed: true },
  { name: 'خروجات وعزومات', icon: '☕', color: '#f97316', budget: 1500, kind: 'expense', daily: true, canCover: true },
  { name: 'هدايا', icon: '🎁', color: '#ec4899', budget: 500, kind: 'expense', rollover: true, hint: 'إخواتي وأعياد الميلاد والنجاح' },
  { name: 'لبس وعطور وعناية', icon: '👕', color: '#6366f1', budget: 3000, kind: 'expense', canCover: true },
  { name: 'صندوق ألمانيا والأوراق', icon: '✈️', color: '#eab308', budget: 2000, kind: 'fund' },
  { name: 'صندوق الأجهزة', icon: '💻', color: '#64748b', budget: 1000, kind: 'fund' },
  { name: 'صندوق الأمان', icon: '🛟', color: '#22c55e', budget: 2500, kind: 'fund', emergency: true, target: 12500, bigTarget: 37500 },
];

export const DEFAULT_PRESETS = [
  { label: 'مواصلات', icon: '🚌', amount: 20, category: 'معيشتي' },
  { label: 'أكل', icon: '🍔', amount: 100, category: 'معيشتي' },
  { label: 'رصيد', icon: '📱', amount: 50, category: 'معيشتي' },
];

export const ICONS = ['🏠', '🍽️', '🍔', '☕', '🚌', '🚕', '📱', '🌐', '🎁', '👕', '🧴', '💊', '📚', '🎓', '✈️', '💻', '🛟', '🤲', '🎉', '🎮', '🏋️', '✂️', '🧾', '🛒', '💡', '🐱', '🚗', '⛽', '💰', '📦'];
export const COLORS = ['#0ea5e9', '#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f97316', '#eab308', '#22c55e', '#14b8a6', '#64748b'];
