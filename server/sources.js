// قائمة المصادر العربية المسموح بها للبحث.
// يُطبَّق هذا القيد على مستوى واجهة Claude (allowed_domains)، فلا يستطيع النموذج
// البحث خارج هذه المواقع مهما كان السؤال. الحد الأقصى 64 نطاقًا.
export const ARABIC_SOURCES = [
  // موسوعات ومعاجم ومكتبات
  { domain: 'ar.wikipedia.org', name: 'ويكيبيديا العربية', group: 'موسوعات ومعاجم' },
  { domain: 'ar.wikisource.org', name: 'ويكي مصدر', group: 'موسوعات ومعاجم' },
  { domain: 'ar.wiktionary.org', name: 'ويكاموس', group: 'موسوعات ومعاجم' },
  { domain: 'mawdoo3.com', name: 'موضوع', group: 'موسوعات ومعاجم' },
  { domain: 'almaany.com', name: 'المعاني', group: 'موسوعات ومعاجم' },
  { domain: 'shamela.ws', name: 'المكتبة الشاملة', group: 'موسوعات ومعاجم' },
  { domain: 'hindawi.org', name: 'مؤسسة هنداوي', group: 'موسوعات ومعاجم' },
  { domain: 'arabicmagazine.net', name: 'مجلة العربي', group: 'موسوعات ومعاجم' },

  // مصادر سورية
  { domain: 'sana.sy', name: 'وكالة سانا', group: 'مصادر سورية' },
  { domain: 'enabbaladi.net', name: 'عنب بلدي', group: 'مصادر سورية' },
  { domain: 'syria.tv', name: 'تلفزيون سوريا', group: 'مصادر سورية' },
  { domain: 'aljumhuriya.net', name: 'الجمهورية', group: 'مصادر سورية' },
  { domain: 'alwatan.sy', name: 'الوطن السورية', group: 'مصادر سورية' },

  // أخبار عربية ودولية بالعربية
  { domain: 'aljazeera.net', name: 'الجزيرة نت', group: 'أخبار' },
  { domain: 'alarabiya.net', name: 'العربية', group: 'أخبار' },
  { domain: 'skynewsarabia.com', name: 'سكاي نيوز عربية', group: 'أخبار' },
  { domain: 'bbc.com/arabic', name: 'بي بي سي عربي', group: 'أخبار' },
  { domain: 'france24.com/ar', name: 'فرانس 24 عربي', group: 'أخبار' },
  { domain: 'dw.com/ar', name: 'دويتشه فيله عربي', group: 'أخبار' },
  { domain: 'cnnarabic.com', name: 'سي إن إن بالعربية', group: 'أخبار' },
  { domain: 'arabic.euronews.com', name: 'يورونيوز عربي', group: 'أخبار' },
  { domain: 'independentarabia.com', name: 'إندبندنت عربية', group: 'أخبار' },
  { domain: 'aawsat.com', name: 'الشرق الأوسط', group: 'أخبار' },
  { domain: 'asharq.com', name: 'الشرق', group: 'أخبار' },
  { domain: 'alquds.co.uk', name: 'القدس العربي', group: 'أخبار' },
  { domain: 'alarab.co.uk', name: 'العرب', group: 'أخبار' },
  { domain: 'almodon.com', name: 'المدن', group: 'أخبار' },
  { domain: 'annahar.com', name: 'النهار', group: 'أخبار' },
  { domain: 'raseef22.net', name: 'رصيف 22', group: 'أخبار' },
  { domain: 'arab48.com', name: 'عرب 48', group: 'أخبار' },
  { domain: 'alhurra.com', name: 'الحرة', group: 'أخبار' },
  { domain: 'youm7.com', name: 'اليوم السابع', group: 'أخبار' },
  { domain: 'ahram.org.eg', name: 'الأهرام', group: 'أخبار' },
  { domain: 'almasryalyoum.com', name: 'المصري اليوم', group: 'أخبار' },
  { domain: 'alkhaleej.ae', name: 'الخليج', group: 'أخبار' },
  { domain: 'albayan.ae', name: 'البيان', group: 'أخبار' },
  { domain: 'alghad.com', name: 'الغد', group: 'أخبار' },
  { domain: 'hespress.com', name: 'هسبريس', group: 'أخبار' },
  { domain: 'alriyadh.com', name: 'الرياض', group: 'أخبار' },

  // اقتصاد
  { domain: 'argaam.com', name: 'أرقام', group: 'اقتصاد' },
  { domain: 'mubasher.info', name: 'مباشر', group: 'اقتصاد' },

  // منظمات دولية (النسخ العربية)
  { domain: 'un.org/ar', name: 'الأمم المتحدة', group: 'منظمات دولية' },
  { domain: 'who.int/ar', name: 'منظمة الصحة العالمية', group: 'منظمات دولية' },
  { domain: 'unicef.org/arabic', name: 'اليونيسف', group: 'منظمات دولية' },
]

export const ALLOWED_DOMAINS = ARABIC_SOURCES.map((s) => s.domain)
