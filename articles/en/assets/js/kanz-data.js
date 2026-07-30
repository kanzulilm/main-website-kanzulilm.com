/* ================================================================
   KANZ UL ILM — kanz-data.js
   صرف OFFLINE / مقامی پیش نظارہ کے لیے fallback ڈیٹا۔
   ⚠️ اصل ڈیٹا ہمیشہ data/content.json سے آتا ہے۔
      یہ فائل تب استعمال ہوتی ہے جب fetch ناکام ہو (file:// یا آف لائن)۔
   ================================================================ */
window.__KANZ_DATA__ = {
  "site": {
    "name": "کنز العلم",
    "tagline": "بین الاقوامی علمی و تحقیقی مرکز",
    "lang": "ur",
    "dir": "rtl",
    "version": "3.0",
    "archiveThresholdMB": 20,
    "citationStyle": "chicago-17",
    "defaultReadingSpeed": 150
  },

  "citation_database": [
    {
      "id": "ref-001",
      "type": "book",
      "author": ["Bukhari, Muhammad ibn Ismail"],
      "title": "Sahih al-Bukhari",
      "publisher": "Dar Tawq al-Najah",
      "place": "Beirut",
      "year": 2001,
      "edition": "1st",
      "language": "ar"
    },
    {
      "id": "ref-002",
      "type": "book",
      "author": ["Ibn Khaldun, Abd al-Rahman"],
      "title": "Muqaddimah",
      "translator": "Rosenthal, Franz",
      "publisher": "Princeton University Press",
      "place": "Princeton",
      "year": 1967,
      "language": "ar-en"
    },
    {
      "id": "ref-003",
      "type": "journal",
      "author": ["Ahmad, Khurshid"],
      "title": "Islamic Economics: Nature and Need",
      "journal": "Journal of Research in Islamic Economics",
      "volume": "1",
      "issue": "1",
      "year": 1984,
      "pages": "51-56",
      "doi": ""
    },
    {
      "id": "ref-004",
      "type": "website",
      "author": ["Kanz ul Ilm International"],
      "title": "Articles Portal",
      "url": "https://kanzulilm.com/articles/en/",
      "accessed": "2026-07-07",
      "year": 2026
    }
  ],
  "categories": [
    {
      "id": "quran-hadith",
      "title": "قرآن و حدیث",
      "icon": "📖",
      "audience": ["students","scholars","general"],
      "subcategories": [
        { "id": "quran-tafseer",  "title": "تفسیر قرآن",           "articleCount": 225 },
        { "id": "hadith-ahkam",   "title": "احادیث کے احکام",       "articleCount": 118 },
        { "id": "uloom-quran",    "title": "علوم القرآن",           "articleCount": 64  },
        { "id": "usool-hadith",   "title": "اصول حدیث",            "articleCount": 48  }
      ]
    },
    {
      "id": "aqaid-fiqh",
      "title": "عقائد و فقہ",
      "icon": "🕌",
      "audience": ["scholars","adults"],
      "subcategories": [
        { "id": "aqaid-general",  "title": "عقائد کے احکام",        "articleCount": 143 },
        { "id": "fiqh-ibadat",   "title": "فقہ العبادات",          "articleCount": 210 },
        { "id": "fiqh-muamlat",  "title": "فقہ المعاملات",         "articleCount": 97  },
        { "id": "usool-fiqh",    "title": "اصول فقہ",             "articleCount": 55  }
      ]
    },
    {
      "id": "business",
      "title": "تجارت و معیشت",
      "icon": "💼",
      "audience": ["professionals","adults","students"],
      "subcategories": [
        { "id": "islamic-finance","title": "اسلامی معاشیات",        "articleCount": 88  },
        { "id": "banking-halal", "title": "حلال بینکاری",           "articleCount": 54  },
        { "id": "trade-ethics",  "title": "تجارتی اخلاقیات",       "articleCount": 73  },
        { "id": "zakat-economy", "title": "زکوٰۃ اور معاشی نظام",   "articleCount": 41  }
      ]
    },
    {
      "id": "science",
      "title": "سائنس و ٹیکنالوجی",
      "icon": "🔬",
      "audience": ["students","professionals"],
      "subcategories": [
        { "id": "quran-science",  "title": "قرآن اور جدید سائنس",   "articleCount": 67  },
        { "id": "bioethics",      "title": "طبی اخلاقیات",          "articleCount": 43  },
        { "id": "tech-islam",     "title": "ٹیکنالوجی اور اسلام",   "articleCount": 38  },
        { "id": "environment",    "title": "ماحولیاتی اسلامی نظریہ","articleCount": 29  }
      ]
    },
    {
      "id": "social-studies",
      "title": "سماجی علوم",
      "icon": "🌍",
      "audience": ["students","adults","professionals"],
      "subcategories": [
        { "id": "family-law",    "title": "خاندانی قانون",          "articleCount": 119 },
        { "id": "sociology",     "title": "اسلامی عمرانیات",        "articleCount": 82  },
        { "id": "history-islam", "title": "تاریخ اسلام",            "articleCount": 156 },
        { "id": "civics",        "title": "شہری علوم",             "articleCount": 44  }
      ]
    },
    {
      "id": "general-knowledge",
      "title": "عمومی معلومات",
      "icon": "📚",
      "audience": ["kids","students","general"],
      "subcategories": [
        { "id": "gk-islamic",    "title": "اسلامی عمومی معلومات",   "articleCount": 93  },
        { "id": "gk-world",      "title": "دنیا کی معلومات",        "articleCount": 61  },
        { "id": "gk-science",    "title": "سائنسی معلومات",         "articleCount": 47  },
        { "id": "gk-kids",       "title": "بچوں کے لیے",           "articleCount": 115 }
      ]
    },
    {
      "id": "mamuulat",
      "title": "معمولات اہلِ سنت",
      "icon": "🌙",
      "audience": ["adults","scholars"],
      "subcategories": [
        { "id": "tasawwuf",      "title": "تصوف و سلوک",           "articleCount": 75  },
        { "id": "isal-sawab",    "title": "ایصالِ ثواب",           "articleCount": 37  },
        { "id": "milad",         "title": "میلاد و شعائر",         "articleCount": 29  },
        { "id": "mutafarriqat",  "title": "متفرقات",              "articleCount": 34  }
      ]
    },
    {
      "id": "namaz-ibadaat",
      "title": "نماز و عبادات",
      "icon": "🙏",
      "audience": ["adults","students","kids"],
      "subcategories": [
        { "id": "namaz-farz",    "title": "فرض نماز کے مسائل",     "articleCount": 412 },
        { "id": "namaz-sunnat",  "title": "سنتیں اور نوافل",        "articleCount": 287 },
        { "id": "roza-ahkam",    "title": "روزے کے احکام",         "articleCount": 198 },
        { "id": "zakat-ahkam",   "title": "زکوٰۃ کے احکام",        "articleCount": 201 },
        { "id": "hajj-ahkam",    "title": "حج و عمرہ",             "articleCount": 223 }
      ]
    }
  ],
  "articles": [
    {
      "id": "art-001",
      "status": "published",
      "subcategoryId": "namaz-farz",
      "title": "دو سجدوں کے درمیان کتنی دیر بیٹھنا ضروری ہے؟",
      "summary": "نماز میں دو سجدوں کے درمیان بیٹھنے کی مقدار اور اس کے متعلق فقہی احکام کا بیان",
      "author": "مفتی محمد قاسم",
      "date": "2024-01-15",
      "updatedAt": "2026-07-07T10:00:00Z",
      "tags": ["نماز", "سجدہ", "فقہ"],
      "hasPdf": true,
      "seo": {
        "metaDescription": "نماز میں دو سجدوں کے درمیان بیٹھنے کی مقدار اور فقہی احکام",
        "canonicalUrl": "https://kanzulilm.com/articles/en/art-001",
        "ogTitle": "دو سجدوں کے درمیان کتنی دیر بیٹھنا ضروری ہے؟",
        "ogDescription": "فقہ حنفی کے مطابق جلسہ بین السجدتین کا مکمل بیان",
        "ogImage": "https://kanzulilm.com/articles/en/assets/icons/icon-512.png"
      },
      "citations": ["ref-001"],
      "footnotes": [
        { "id": 1, "refId": "ref-001", "note": "صحیح البخاری، کتاب الصلاۃ، باب الجلوس بین السجدتین" }
      ],
      "body": "نماز میں دو سجدوں کے درمیان بیٹھنا واجب ہے۔ فقہاء کرام نے اس کی کم از کم مقدار ایک تسبیح کی مقدار بیان فرمائی ہے۔\n\nیعنی اتنی دیر بیٹھنا ضروری ہے جتنی دیر میں «سُبْحَانَ اللَّهِ» ایک بار کہا جا سکے۔ اگر اس سے کم بیٹھا تو واجب ترک ہونے کی وجہ سے سجدۂ سہو لازم ہو گا۔\n\nاگر سجدۂ سہو بھی نہ کیا تو نماز مکروہ تحریمی ہو گی اور اعادہ واجب ہو گا۔\n\nتمام مذاہب کے اعتبار سے دیکھا جائے تو امام شافعی رحمہ اللہ کے نزدیک بھی جلسہ بین السجدتین فرض ہے، البتہ مقدار میں کچھ اختلاف ہے۔"
    },
    {
      "id": "art-002",
      "subcategoryId": "islamic-finance",
      "title": "اسلامی بینکاری کے بنیادی اصول",
      "summary": "جدید دور میں اسلامی معاشیات کے اصول اور سود سے پاک نظام کا تعارف",
      "author": "ڈاکٹر محمد عمر",
      "date": "2024-01-12",
      "tags": ["اسلامی معاشیات", "بینکاری", "سود"],
      "hasPdf": true,
      "body": "اسلامی بینکاری ایک ایسا مالیاتی نظام ہے جو شریعت اسلامیہ کے اصولوں پر مبنی ہے۔\n\nاس کے بنیادی اصول یہ ہیں: سود (ربا) کی مکمل ممانعت، نفع و نقصان میں شراکت، غرر (غیر یقینی) سودوں سے اجتناب، اور حلال کاروبار میں سرمایہ کاری۔\n\nمضاربہ اور مشارکہ اسلامی بینکاری کے دو اہم ترین طریقے ہیں جن میں بینک اور گاہک دونوں نفع و نقصان میں شریک ہوتے ہیں۔\n\nآج دنیا بھر میں 500 سے زائد اسلامی مالیاتی ادارے کام کر رہے ہیں جن کا مجموعی سرمایہ تین ٹریلین ڈالر سے تجاوز کر چکا ہے۔"
    },
    {
      "id": "art-003",
      "subcategoryId": "quran-science",
      "title": "قرآن کریم اور جدید فلکیاتی دریافتیں",
      "summary": "قرآنی آیات کا جدید فلکیات کی دریافتوں سے موازنہ اور علمی تجزیہ",
      "author": "پروفیسر احمد رضا",
      "date": "2024-01-10",
      "tags": ["قرآن", "سائنس", "فلکیات"],
      "hasPdf": false,
      "body": "قرآن کریم نے آج سے چودہ سو سال قبل کئی ایسے حقائق بیان کیے جنہیں جدید سائنس نے حال ہی میں دریافت کیا ہے۔\n\nارشاد باری تعالیٰ ہے: «وَالسَّمَاءَ بَنَيْنَاهَا بِأَيْدٍ وَإِنَّا لَمُوسِعُونَ» — ہم نے آسمان کو قوت سے بنایا اور ہم اسے وسیع کرتے جا رہے ہیں۔\n\nیہ آیت کریمہ کائنات کی توسیع (Expanding Universe) کی طرف اشارہ کرتی ہے جسے سائنسدانوں نے 1929 میں Edwin Hubble کے ذریعے دریافت کیا۔\n\nاسی طرح سورۃ الانبیاء میں ہے: «أَوَلَمْ يَرَ الَّذِينَ كَفَرُوا أَنَّ السَّمَاوَاتِ وَالْأَرْضَ كَانَتَا رَتْقًا فَفَتَقْنَاهُمَا» — یہ Big Bang Theory کی طرف قرآنی اشارہ ہے۔"
    },
    {
      "id": "art-004",
      "subcategoryId": "gk-kids",
      "title": "پانچ ارکانِ اسلام — بچوں کے لیے آسان وضاحت",
      "summary": "اسلام کے پانچ بنیادی ارکان کو بچوں کی سطح پر سادہ زبان میں بیان کیا گیا ہے",
      "author": "مولانا عبد الرحیم",
      "date": "2024-01-08",
      "tags": ["بچے", "بنیادی اسلام", "تعلیم"],
      "hasPdf": true,
      "body": "اسلام کے پانچ ستون ہیں جن پر ہر مسلمان کا عمل ضروری ہے:\n\nپہلا: کلمہ شہادت — «لَا إِلَٰهَ إِلَّا اللَّهُ مُحَمَّدٌ رَسُولُ اللَّهِ»\n\nدوسرا: نماز — دن میں پانچ وقت اللہ کے سامنے حاضر ہونا\n\nتیسرا: روزہ — رمضان کے مہینے میں سحر سے افطار تک کھانے پینے سے رکنا\n\nچوتھا: زکوٰۃ — اپنے مال کا ڈھائی فیصد غریبوں میں دینا\n\nپانچواں: حج — زندگی میں ایک بار مکہ مکرمہ جانا (جب طاقت ہو)"
    },
    {
      "id": "art-005",
      "subcategoryId": "history-islam",
      "title": "خلافتِ راشدہ — اسلامی حکمرانی کا سنہری دور",
      "summary": "چار خلفائے راشدین کے دور حکومت کا تاریخی اور تجزیاتی جائزہ",
      "author": "ڈاکٹر فاروق احمد",
      "date": "2024-01-05",
      "tags": ["تاریخ", "خلافت", "اسلامی حکومت"],
      "hasPdf": true,
      "body": "خلافتِ راشدہ (632–661 عیسوی) اسلامی تاریخ کا وہ درخشاں دور ہے جسے نبی کریم ﷺ نے خود «خلافۃ النبوۃ» قرار دیا۔\n\nحضرت ابوبکر صدیق ؓ (632–634): اسلامی ریاست کو مضبوط کیا، مرتدین کے خلاف جنگیں لڑیں اور قرآن کریم کو ایک مصحف میں جمع کروایا۔\n\nحضرت عمر فاروق ؓ (634–644): انتظامی نظام کو مربوط کیا، عدل و انصاف کی مثال قائم کی، بیت المال کا نظام بنایا اور وسیع فتوحات کیں۔\n\nحضرت عثمان غنی ؓ (644–656): قرآن کریم کی معیاری نقلیں تیار کروائیں اور بحری فوج قائم کی۔\n\nحضرت علی مرتضیٰ ؓ (656–661): عدل کی بے مثال روایت قائم کی اور خوارج کے فتنے کو روکا۔"
    },
    {
      "id": "art-006",
      "subcategoryId": "trade-ethics",
      "title": "تجارت میں دھوکہ دہی — اسلامی نقطہ نظر",
      "summary": "کاروبار میں ایمانداری کی اہمیت اور دھوکے کی شرعی ممانعت",
      "author": "مفتی ولی اللہ",
      "date": "2024-01-03",
      "tags": ["تجارت", "اخلاقیات", "حرام"],
      "hasPdf": false,
      "body": "اسلام نے تجارتی معاملات میں مکمل دیانتداری کا حکم دیا ہے۔\n\nنبی کریم ﷺ نے فرمایا: «التَّاجِرُ الصَّدُوقُ الْأَمِينُ مَعَ النَّبِيِّينَ وَالصِّدِّيقِينَ وَالشُّهَدَاءِ» سچا اور امانتدار تاجر قیامت کے دن انبیاء، صدیقین اور شہداء کے ساتھ ہوگا۔\n\nدھوکہ دہی کی ممنوع اقسام: مال میں عیب چھپانا، ناپ تول میں کمی، جھوٹی قسم کھانا، ذخیرہ اندوزی، اور مصنوعی قلت پیدا کرنا۔\n\nآج کے دور میں ڈیجیٹل دھوکہ دہی، جھوٹے اشتہارات اور آن لائن فراڈ بھی اسی زمرے میں آتے ہیں۔"
    },
    {
      "id": "art-007",
      "subcategoryId": "family-law",
      "title": "اسلامی قانونِ وراثت — بنیادی اصول",
      "summary": "اسلامی نظامِ میراث کے اصول، حصص اور تقسیم کا طریقہ کار",
      "author": "ڈاکٹر محمد اقبال",
      "date": "2024-01-01",
      "tags": ["وراثت", "خاندانی قانون", "فقہ"],
      "hasPdf": true,
      "body": "اسلامی قانونِ وراثت ایک مکمل اور عادلانہ نظام ہے جو قرآن کریم نے سورۃ النساء میں تفصیل سے بیان کیا ہے۔\n\nبنیادی اصول: کسی وارث کو میراث سے مکمل محروم نہیں کیا جا سکتا (قاتل کے سوا)، قرضے اور وصیت پہلے ادا کی جائے، پھر ورثاء میں تقسیم ہو۔\n\nعصبات (مرد رشتہ دار): بیٹا، پوتا، باپ، دادا، بھائی — یہ باقی ماندہ مال پاتے ہیں۔\n\nاصحاب الفروض: جن کے مقررہ حصے ہیں: بیٹی کو نصف، بیوہ کو آٹھواں/چوتھائی، ماں کو چھٹا حصہ۔\n\nجدید چیلنجز: ڈیجیٹل اثاثے، انشورنس پالیسی، اور کمپنی شیئرز کی تقسیم کے مسائل۔"
    }
  ]
}
;
