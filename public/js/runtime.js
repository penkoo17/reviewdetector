(function () {
  'use strict';

/**
 * Konfigurasi ambang batas risiko dan definisi 12 sinyal analisis ulasan.
 */

const RISK_THRESHOLDS = {
  LOW_MIN: 80,
  MODERATE_MIN: 60,
};

const ANALYSIS_LAYERS = {
  teks: {
    id: 'teks',
    label: 'Isi Teks',
    description: 'Menilai kejelasan cerita pemakaian, kewajaran fitur yang dibahas, nada kalimat, dan kesesuaian dengan rating.',
  },
  perilaku: {
    id: 'perilaku',
    label: 'Perilaku',
    description: 'Memantau lonjakan jumlah ulasan dalam 24–72 jam, keseragaman bintang 5, dan pola keaktifan akun pengulas.',
  },
  koordinasi: {
    id: 'koordinasi',
    label: 'Koordinasi',
    description: 'Mendeteksi kalimat yang hampir identik antar-pembeli, kelompok akun serupa, dan waktu kirim yang berdekatan.',
  },
};

const RED_FLAG_TYPES = {
  TERLALU_GENERIK: {
    code: 'terlalu_generik',
    layer: 'teks',
    layerLabel: 'Isi Teks',
    label: 'Terlalu generik',
    example: '“Bagus banget, recommended!”',
    riskWeight: 'Sedang',
    penalty: 14,
    badgeTone: 'warning',
    shortDesc: 'Kalimat terlalu singkat atau umum tanpa informasi spesifik tentang produk.',
  },
  DETAIL_TIDAK_MASUK_AKAL: {
    code: 'detail_tidak_masuk_akal',
    layer: 'teks',
    layerLabel: 'Isi Teks',
    label: 'Detail tidak masuk akal',
    example: 'Membahas fitur yang tidak ada di produk',
    riskWeight: 'Tinggi',
    penalty: 26,
    badgeTone: 'alert',
    shortDesc: 'Ulasan menyebutkan fitur atau komponen yang tidak sesuai dengan jenis produk ini.',
  },
  EMOSI_BERLEBIHAN: {
    code: 'emosi_berlebihan',
    layer: 'teks',
    layerLabel: 'Isi Teks',
    label: 'Emosi berlebihan',
    example: '“Sempurna, no minus, wajib beli!”',
    riskWeight: 'Sedang',
    penalty: 16,
    badgeTone: 'warning',
    shortDesc: 'Menggunakan klaim berlebihan, huruf kapital penuh, atau tanda seru beruntun.',
  },
  TIDAK_MENYEBUT_PENGALAMAN: {
    code: 'tidak_menyebut_pengalaman',
    layer: 'teks',
    layerLabel: 'Isi Teks',
    label: 'Tidak menyebut pengalaman',
    example: 'Tidak ada durasi pakai, masalah, atau konteks',
    riskWeight: 'Sedang',
    penalty: 14,
    badgeTone: 'warning',
    shortDesc: 'Tidak menceritakan lama pemakaian, kondisi barang saat dipakai, atau catatan penggunaan.',
  },
  RATING_TIDAK_COCOK_ISI: {
    code: 'rating_tidak_cocok_isi',
    layer: 'teks',
    layerLabel: 'Isi Teks',
    label: 'Rating tidak cocok isi',
    example: 'Rating 5 tetapi mengeluh',
    riskWeight: 'Tinggi',
    penalty: 28,
    badgeTone: 'alert',
    shortDesc: 'Bintang yang diberikan tinggi tetapi isi ulasan justru menyampaikan keluhan.',
  },
  REVIEW_BURST: {
    code: 'review_burst',
    layer: 'perilaku',
    layerLabel: 'Perilaku',
    label: 'Review burst',
    example: 'Banyak review muncul dalam 24–72 jam',
    riskWeight: 'Tinggi',
    penalty: 22,
    badgeTone: 'alert',
    shortDesc: 'Jumlah ulasan melonjak tajam secara tidak wajar dalam rentang 1–3 hari.',
  },
  RATING_SERAGAM: {
    code: 'rating_seragam',
    layer: 'perilaku',
    layerLabel: 'Perilaku',
    label: 'Rating seragam',
    example: 'Banyak review 5 bintang dalam waktu singkat',
    riskWeight: 'Tinggi',
    penalty: 20,
    badgeTone: 'alert',
    shortDesc: 'Banyak ulasan bintang 5 masuk berturut-turut dalam periode yang singkat.',
  },
  REVIEWER_BARU_AKTIF: {
    code: 'reviewer_baru_aktif',
    layer: 'perilaku',
    layerLabel: 'Perilaku',
    label: 'Reviewer baru aktif',
    example: 'Akun baru langsung memberi banyak review',
    riskWeight: 'Sedang–tinggi',
    penalty: 18,
    badgeTone: 'warning',
    shortDesc: 'Akun terindikasi baru atau tersamar namun langsung mengirim banyak ulasan.',
  },
  REVIEWER_SATU_TOKO: {
    code: 'reviewer_satu_toko',
    layer: 'perilaku',
    layerLabel: 'Perilaku',
    label: 'Reviewer hanya review satu toko/produk',
    example: 'Tidak ada riwayat review beragam',
    riskWeight: 'Sedang',
    penalty: 12,
    badgeTone: 'neutral',
    shortDesc: 'Akun tidak memiliki riwayat ulasan yang beragam di toko atau produk lain.',
  },
  REVIEW_SANGAT_MIRIP: {
    code: 'review_sangat_mirip',
    layer: 'koordinasi',
    layerLabel: 'Koordinasi',
    label: 'Review sangat mirip',
    example: 'Kalimat hampir identik antar-user',
    riskWeight: 'Sangat tinggi',
    penalty: 34,
    badgeTone: 'alert',
    shortDesc: 'Susunan kalimat antar-pengulas sangat mirip atau terindikasi salin-tempel.',
  },
  KELOMPOK_REVIEWER_SAMA: {
    code: 'kelompok_reviewer_sama',
    layer: 'koordinasi',
    layerLabel: 'Koordinasi',
    label: 'Kelompok reviewer sama',
    example: 'Banyak akun mereview produk yang sama',
    riskWeight: 'Sangat tinggi',
    penalty: 30,
    badgeTone: 'alert',
    shortDesc: 'Sekelompok akun dengan pola serupa mengulas produk ini secara bersamaan.',
  },
  POLA_WAKTU_SERENTAK: {
    code: 'pola_waktu_serentak',
    layer: 'koordinasi',
    layerLabel: 'Koordinasi',
    label: 'Pola waktu serentak',
    example: 'Review masuk berdekatan, terutama di jam yang sama',
    riskWeight: 'Tinggi',
    penalty: 24,
    badgeTone: 'alert',
    shortDesc: 'Beberapa ulasan terkirim sangat berdekatan pada jam yang sama.',
  },
};

const PRODUCT_CATEGORY_RULES = {
  beauty_hair: {
    label: 'Perawatan Rambut & Kulit',
    productKeywords: [
      'hair', 'rambut', 'tonic', 'ginseng', 'serum', 'essence', 'shampoo', 'sampo',
      'skincare', 'cream', 'krim', 'lotion', 'toner', 'sunscreen', 'sabun', 'parfum',
      'makeup', 'lipstick', 'bedak', 'oil', 'masker', 'niacinamide', 'retinol', 'moisturizer',
    ],
    impossibleFeatures: [
      'bluetooth', 'baterai', 'batre', 'charging', 'fast charging', 'usb-c', 'port usb',
      'wifi', 'sinyal', 'anc', 'suara bass', 'speaker', 'layar amoled', 'ram 8gb',
      'switch mechanical', 'keycaps', 'daya tahan baterai', 'overclock', 'hdmi',
    ],
  },
  fashion: {
    label: 'Pakaian & Aksesoris',
    productKeywords: [
      'baju', 'kaos', 'kemeja', 'jaket', 'hoodie', 'celana', 'jeans', 'dress', 'sepatu',
      'sandal', 'tas', 'dompet', 'topi', 'hijab', 'kerudung', 'gamis', 'sneakers', 'kain',
    ],
    impossibleFeatures: [
      'bluetooth', 'baterai', 'batre', 'charging', 'usb-c', 'anc', 'suara bass',
      'wifi', 'layar', 'fps', 'bpom', 'aroma wangi meresap di kulit', 'spesifikasi ram',
    ],
  },
  electronics: {
    label: 'Elektronik & Gadget',
    productKeywords: [
      'tws', 'earbuds', 'headphone', 'speaker', 'powerbank', 'charger', 'kabel', 'keyboard',
      'mouse', 'laptop', 'hp', 'handphone', 'smartphone', 'smartwatch', 'kipas', 'lampu',
      'kamera', 'router', 'monitor', 'ssd', 'bluetooth', 'anc', 'wireless', 'usb',
    ],
    impossibleFeatures: [
      'jahitan rapi', 'kain adem', 'tidak menerawang', 'cepat meresap di kulit',
      'wangi harum di rambut', 'bpom resmi', 'rasa manis', 'expired date masih lama',
    ],
  },
  food: {
    label: 'Makanan & Minuman',
    productKeywords: [
      'kopi', 'teh', 'snack', 'keripik', 'coklat', 'madu', 'susu', 'sambal', 'bumbu',
      'makanan', 'minuman', 'kue', 'biskuit', 'beras', 'kurma', 'granola', 'vitamin',
    ],
    impossibleFeatures: [
      'bluetooth', 'baterai', 'charging', 'usb-c', 'layar', 'jahitan rapi', 'suara bass', 'wifi',
    ],
  },
};

const GENERIC_PHRASES = [
  'barang bagus', 'bagus banget', 'mantap', 'jos', 'ok', 'oke', 'good', 'nice',
  'recommended', 'rekomen', 'sesuai pesanan', 'sesuai deskripsi', 'pengiriman cepat',
  'packing rapi', 'terima kasih', 'makasih seller', 'kurir ramah', 'belum dicoba',
  'semoga awet', 'bintang 5', 'five stars', 'great product', 'fast delivery',
  'mantul', 'sip', 'mantap bosku', 'ok sip',
];

const EXPERIENCE_CONTEXT_KEYWORDS = [
  'dipakai', 'dicoba', 'dites', 'pemakaian', 'digunakan', 'pakai', 'coba',
  'hari', 'minggu', 'bulan', 'jam', 'menit', 'sehari', 'seminggu', 'sebulan',
  'baterai', 'batre', 'suara', 'bass', 'layar', 'tombol', 'kabel', 'bahan',
  'material', 'plastik', 'kain', 'jahitan', 'ukuran', 'warna', 'berat', 'panas',
  'dingin', 'tekstur', 'aroma', 'wangi', 'bau', 'meresap', 'kulit', 'rambut',
  'rontok', 'ketombe', 'lembut', 'lengket', 'tumpah', 'bocor', 'pecah', 'penyok',
  'kardus', 'kemasan', 'segel', 'bubble', 'ekspedisi', 'garansi', 'koneksi',
  'bluetooth', 'charging', 'build', 'finishing', 'kekurangan', 'kelebihan', 'minus',
];

const COERCION_PATTERNS = [
  'syarat klaim garansi', 'biar garansi aktif', 'agar garansi aktif',
  'kasih bintang 5 dulu', 'kasih bintang 5 biar', 'bintang 5 biar tidak diblokir',
  'disuruh bintang 5', 'diminta bintang 5', 'janji ganti', 'biar dapat bonus', 'for warranty',
];

const ADVERSATIVE_MARKERS = [
  'padahal', 'tapi', 'tetapi', 'namun', 'sayangnya', 'cuma', 'hanya saja',
  'meskipun', 'walaupun', 'but', 'however', 'unfortunately',
];

const POSITIVE_WORDS = [
  'bagus', 'mantap', 'awet', 'kokoh', 'original', 'ori', 'asli', 'cepat', 'rapi',
  'puas', 'memuaskan', 'murah', 'terjangkau', 'worth', 'berfungsi', 'nyaman',
  'jernih', 'kencang', 'halus', 'tebal', 'dingin', 'tahan lama', 'responsif',
  'ramah', 'aman', 'lengkap', 'mulus', 'keren', 'suka', 'recommended', 'rekomen',
  'terbaik', 'best', 'good', 'great', 'excellent', 'amazing', 'perfect', 'love',
  'sturdy', 'genuine', 'authentic', 'fast', 'smooth', 'worth it', 'berkualitas',
  'solid', 'wangi', 'segar', 'lembut', 'meresap', 'berkurang',
];

const NEGATIVE_WORDS = [
  'rusak', 'pecah', 'cacat', 'palsu', 'kw', 'tiruan', 'bohong', 'kecewa', 'mengecewakan',
  'lambat', 'lama', 'lelet', 'panas', 'boros', 'cepat habis', 'bocor', 'tumpah', 'mati',
  'bermasalah', 'tidak berfungsi', 'gak berfungsi', 'ga nyala', 'tidak nyala', 'error',
  'penyok', 'tipis', 'ringkih', 'murahan', 'bau', 'kotor', 'kurang', 'tidak sesuai', 'beda',
  'jelek', 'parah', 'buruk', 'kapok', 'menyesal', 'rugi', 'penipu', 'scam', 'fake',
  'broken', 'damaged', 'slow', 'bad', 'worst', 'terrible', 'disappointed', 'defective',
  'useless', 'overheat', 'drain', 'baret', 'lecet', 'sobek', 'hilang', 'kresek',
  'gimmick', 'kembung', 'lowbat', 'putus', 'diblokir', 'lengket', 'perih', 'gatal', 'iritasi',
];

const EXAGGERATED_PATTERNS = [
  'sempurna', 'no minus', 'tanpa minus', 'wajib beli', 'terbaik sedunia',
  'paling sempurna', '1000%', '10000%', 'wajib beli sekarang', 'jangan ragu lagi',
  'auto sultan', 'gak ada obat', 'tiada tanding', 'super duper', 'best of the best',
  'life changing', 'must buy now', 'guaranteed original 100%',
];

const THEME_CATEGORIES = {
  complaints: [
    { label: 'Kemasan rusak, penyok, atau bocor', keywords: ['kemasan rusak', 'kardus penyok', 'packing tipis', 'penyok', 'sobek', 'kotak rusak', 'bocor', 'tumpah', 'merembes'] },
    { label: 'Pengiriman lama dari perkiraan', keywords: ['pengiriman lambat', 'pengiriman lama', 'pengiriman agak lambat', 'kurir lama', 'ekspedisi', 'telat', 'seminggu'] },
    { label: 'Barang cacat atau tidak berfungsi', keywords: ['rusak', 'mati', 'tidak nyala', 'ga nyala', 'error', 'cacat', 'macet', 'pecah', 'bermasalah', 'tidak ngefek', 'tidak bekerja'] },
    { label: 'Barang tidak sesuai deskripsi atau keaslian diragukan', keywords: ['tidak sesuai', 'beda warna', 'palsu', 'kw', 'tiruan', 'bohong', 'tidak ori', 'bukan ori', 'gimmick'] },
    { label: 'Kualitas bahan atau daya tahan kurang baik', keywords: ['tipis', 'ringkih', 'murahan', 'baterai cepat habis', 'panas', 'lengket', 'bau menyengat', 'perih', 'gatal'] },
    { label: 'Respon penjual lambat saat komplain', keywords: ['seller jutek', 'admin lambat', 'tidak dibalas', 'komplain susah', 'tidak ramah', 'tidak solutif', 'diblokir'] },
  ],
  praises: [
    { label: 'Kualitas produk bagus dan sesuai deskripsi', keywords: ['kokoh', 'tebal', 'material bagus', 'bahan bagus', 'premium', 'solid', 'halus', 'berkualitas', 'mulus', 'wangi', 'segar', 'lembut', 'cepat meresap'] },
    { label: 'Harga sepadan dengan kualitas', keywords: ['harga terjangkau', 'murah', 'worth', 'sepadan', 'hemat', 'terjangkau', 'value for money'] },
    { label: 'Pengiriman cepat dan tepat waktu', keywords: ['pengiriman cepat', 'cepat sampai', 'sehari sampai', 'kilat', 'tepat waktu', 'fast delivery'] },
    { label: 'Kemasan rapi dan aman', keywords: ['packing rapi', 'packing aman', 'kemasan aman', 'bubble wrap tebal', 'kardus tebal', 'rapi sekali'] },
    { label: 'Produk asli dan berfungsi baik', keywords: ['original', 'ori', 'asli', 'berfungsi baik', 'berfungsi normal', 'segel', 'bpom'] },
    { label: 'Penjual ramah dan cepat merespons', keywords: ['seller ramah', 'penjual ramah', 'fast respon', 'responsif', 'komunikatif'] },
  ],
};



/**
 * Utilitas perhitungan kemiripan teks, deteksi kategori, dan distribusi waktu ulasan.
 */



function normalizeText(text = '') {
  return String(text)
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenize(text = '') {
  const norm = normalizeText(text);
  if (!norm) return [];
  return norm.split(' ').filter(Boolean);
}

function buildWordShingles(tokens, n = 2) {
  const shingles = new Set();
  if (tokens.length < n) {
    if (tokens.length > 0) shingles.add(tokens.join(' '));
    return shingles;
  }
  for (let i = 0; i <= tokens.length - n; i++) {
    shingles.add(tokens.slice(i, i + n).join(' '));
  }
  return shingles;
}

function setJaccard(setA, setB) {
  if (setA.size === 0 || setB.size === 0) return 0;
  let intersection = 0;
  for (const item of setA) {
    if (setB.has(item)) intersection++;
  }
  const union = setA.size + setB.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

function calculateSimilarity(textA, textB) {
  const normA = normalizeText(textA);
  const normB = normalizeText(textB);
  if (!normA || !normB) return 0;
  if (normA === normB) return 1.0;

  const tokensA = tokenize(normA);
  const tokensB = tokenize(normB);

  const unigramSim = setJaccard(new Set(tokensA), new Set(tokensB));
  const bigramSim = setJaccard(buildWordShingles(tokensA, 2), buildWordShingles(tokensB, 2));

  return Number((bigramSim * 0.55 + unigramSim * 0.45).toFixed(4));
}

function detectProductCategory(productName = '', productUrl = '') {
  const combined = `${productName} ${productUrl}`.toLowerCase();
  for (const [key, rule] of Object.entries(PRODUCT_CATEGORY_RULES)) {
    if (rule.productKeywords.some((kw) => combined.includes(kw))) {
      return { key, ...rule };
    }
  }
  return null;
}

function detectNonsensicalFeature(reviewText = '', productCategory = null) {
  if (!productCategory || !Array.isArray(productCategory.impossibleFeatures)) {
    return null;
  }
  const lower = String(reviewText).toLowerCase();
  const matched = productCategory.impossibleFeatures.filter((feat) => lower.includes(feat));
  if (matched.length > 0) {
    return {
      categoryLabel: productCategory.label,
      matchedFeatures: matched.slice(0, 3),
    };
  }
  return null;
}

function calculateLinguisticRichness(text = '') {
  const tokens = tokenize(text);
  const lower = String(text).toLowerCase();
  if (tokens.length === 0) {
    return { ttr: 0, experientialHits: 0, specificityScore: 0 };
  }

  const uniqueTokens = new Set(tokens);
  const ttr = Number((uniqueTokens.size / tokens.length).toFixed(2));
  const experientialHits = EXPERIENCE_CONTEXT_KEYWORDS.filter((kw) => lower.includes(kw)).length;

  const lengthFactor = Math.min(1, tokens.length / 18);
  const attributeFactor = Math.min(1, experientialHits / 3);
  const specificityScore = Number(
    (lengthFactor * 0.45 + attributeFactor * 0.4 + Math.min(1, ttr) * 0.15).toFixed(2)
  );

  return { ttr, experientialHits, specificityScore };
}

function detectCoercionAndAdversative(text = '') {
  const lower = String(text).toLowerCase();
  const coercionMatch = COERCION_PATTERNS.find((p) => lower.includes(p)) || null;
  const hasAdversative = ADVERSATIVE_MARKERS.some((m) => lower.includes(m));
  return {
    hasCoercion: Boolean(coercionMatch),
    coercionMatch,
    hasAdversative,
  };
}

function calculateUppercaseRatio(text = '') {
  const letters = String(text).replace(/[^a-zA-Z]/g, '');
  if (letters.length < 6) return 0;
  const upper = letters.replace(/[^A-Z]/g, '').length;
  return upper / letters.length;
}

function analyzeSurfacePatterns(text = '') {
  const raw = String(text);
  const excessivePunctuation = /[!?]{3,}/.test(raw);
  const repeatedChars = /(.)\1{3,}/i.test(raw);
  const symbolMatches = raw.match(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu);
  return {
    excessivePunctuation,
    repeatedChars,
    symbolSpamCount: symbolMatches ? symbolMatches.length : 0,
  };
}

function calculateDailyZScores(dailyCounts = {}) {
  const entries = Object.entries(dailyCounts);
  if (entries.length === 0) {
    return { mean: 0, stdDev: 0, zScores: {} };
  }

  const values = entries.map(([, c]) => c);
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance =
    values.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / values.length;
  const stdDev = Math.sqrt(variance);

  const zScores = {};
  entries.forEach(([date, count]) => {
    zScores[date] = stdDev > 0 ? Number(((count - mean) / stdDev).toFixed(2)) : 0;
  });

  return {
    mean: Number(mean.toFixed(2)),
    stdDev: Number(stdDev.toFixed(2)),
    zScores,
  };
}

function parseReviewDate(rawDate, fallbackIndex = 0) {
  if (rawDate) {
    const str = String(rawDate).trim();
    const parsed = new Date(str);
    if (!Number.isNaN(parsed.getTime())) {
      const isoFull = parsed.toISOString();
      const isoDate = isoFull.split('T')[0];
      const hasTime = /T\d{2}:\d{2}|\s\d{2}:\d{2}/.test(str);
      const hourBucket = hasTime ? isoFull.slice(0, 13) : null;
      return {
        isoDate,
        hourBucket,
        timeLabel: hasTime ? isoFull.slice(11, 16) : null,
        timestamp: parsed.getTime(),
        valid: true,
      };
    }

    const dmy = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
    if (dmy) {
      const [, d, m, y] = dmy;
      const dt = new Date(`${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}T08:00:00Z`);
      if (!Number.isNaN(dt.getTime())) {
        return {
          isoDate: dt.toISOString().split('T')[0],
          hourBucket: null,
          timeLabel: null,
          timestamp: dt.getTime(),
          valid: true,
        };
      }
    }
  }

  const now = new Date();
  const fallback = new Date(now.getTime() - (fallbackIndex % 7) * 86400000);
  return {
    isoDate: fallback.toISOString().split('T')[0],
    hourBucket: null,
    timeLabel: null,
    timestamp: fallback.getTime(),
    valid: false,
  };
}



/**
 * Konverter laporan analisis ke format CSV siap unduh.
 */

function exportReportToCsv(report) {
  const escapeCell = (val) => {
    const str = val === null || val === undefined ? '' : String(val);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const headers = [
    'No',
    'Reviewer',
    'Date',
    'Original_Rating',
    'Trust_Score',
    'Risk_Level',
    'Sentiment',
    'Needs_Check',
    'Signals',
    'Explanation',
    'Review_Text',
  ];

  const rows = [headers.join(',')];

  (report.reviews || []).forEach((rev, idx) => {
    const flags = (rev.redFlags || []).map((f) => f.label).join(' | ');
    const reasons = (rev.redFlags || []).map((f) => f.reason).join(' ; ');
    const row = [
      idx + 1,
      rev.reviewer,
      rev.date,
      rev.rating,
      rev.trustScore,
      rev.riskLevel,
      rev.sentiment || 'neutral',
      rev.isSuspicious ? 'YES' : 'NO',
      flags || 'Normal',
      reasons || 'Ulasan terlihat wajar dan konsisten.',
      rev.text,
    ].map(escapeCell);

    rows.push(row.join(','));
  });

  return rows.join('\n');
}



/**
 * Mesin evaluasi kredibilitas ulasan berbasis 3 lapis (Isi Teks, Perilaku, Koordinasi).
 */





function classifyRiskLevel(score) {
  if (score >= RISK_THRESHOLDS.LOW_MIN) {
    return { level: 'low', label: 'Low Risk' };
  }
  if (score >= RISK_THRESHOLDS.MODERATE_MIN) {
    return { level: 'moderate', label: 'Moderate Risk' };
  }
  return { level: 'high', label: 'High Risk' };
}

function detectLexiconSentiment(text = '') {
  const lower = String(text).toLowerCase();
  const posHits = POSITIVE_WORDS.filter((w) => {
    const idx = lower.indexOf(w);
    if (idx === -1) return false;
    const prefix = lower.slice(Math.max(0, idx - 12), idx);
    return !/(tidak|gak|ga|bukan|kurang)\s+$/.test(prefix);
  });
  const negHits = NEGATIVE_WORDS.filter((w) => lower.includes(w));
  const coercion = detectCoercionAndAdversative(text);

  let sentiment = 'neutral';
  if (
    coercion.hasCoercion ||
    negHits.length > posHits.length ||
    (negHits.length >= 1 && coercion.hasAdversative)
  ) {
    sentiment = 'negative';
  } else if (posHits.length > negHits.length) {
    sentiment = 'positive';
  }

  return { sentiment, posHits, negHits, coercion };
}

function extractThemesRuleBased(reviews = []) {
  const complaintMap = new Map();
  const praiseMap = new Map();

  THEME_CATEGORIES.complaints.forEach((cat) => {
    complaintMap.set(cat.label, { theme: cat.label, count: 0, examples: [] });
  });
  THEME_CATEGORIES.praises.forEach((cat) => {
    praiseMap.set(cat.label, { theme: cat.label, count: 0, examples: [] });
  });

  const seenNormalized = new Set();

  reviews.forEach((rev) => {
    const norm = normalizeText(rev.text);
    if (seenNormalized.has(norm)) return;
    seenNormalized.add(norm);

    const lower = String(rev.text || '').toLowerCase();

    THEME_CATEGORIES.complaints.forEach((cat) => {
      if (cat.keywords.some((kw) => lower.includes(kw))) {
        const entry = complaintMap.get(cat.label);
        entry.count += 1;
        if (entry.examples.length < 2) {
          entry.examples.push(rev.text.slice(0, 120));
        }
      }
    });

    THEME_CATEGORIES.praises.forEach((cat) => {
      const hasMatch = cat.keywords.some((kw) => {
        const idx = lower.indexOf(kw);
        if (idx === -1) return false;
        const prefix = lower.slice(Math.max(0, idx - 12), idx);
        if (/(tidak|gak|ga|bukan|kurang)\s+$/.test(prefix)) return false;
        return true;
      });

      if (hasMatch) {
        const entry = praiseMap.get(cat.label);
        entry.count += 1;
        if (entry.examples.length < 2) {
          entry.examples.push(rev.text.slice(0, 120));
        }
      }
    });
  });

  const complaints = [...complaintMap.values()]
    .filter((item) => item.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const praises = [...praiseMap.values()]
    .filter((item) => item.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return { complaints, praises };
}

function buildFlag(def, reason, customPenalty) {
  return {
    code: def.code,
    layer: def.layer,
    layerLabel: def.layerLabel,
    label: def.label,
    riskWeight: def.riskWeight,
    badgeTone: def.badgeTone,
    penalty: typeof customPenalty === 'number' ? customPenalty : def.penalty,
    reason,
  };
}

function runRuleBasedAnalysis({ productName, marketplace, productUrl = '', reviews = [] }) {
  const productCategory = detectProductCategory(productName, productUrl);

  const normalizedReviews = reviews.map((raw, idx) => {
    const text = String(raw.text || '').trim();
    const ratingNum = Number(raw.rating);
    const rating = !Number.isNaN(ratingNum) ? Math.min(5, Math.max(1, Math.round(ratingNum))) : 5;
    const reviewer = String(raw.reviewer || `Pembeli #${idx + 1}`).trim();
    const dateInfo = parseReviewDate(raw.date, idx);
    const tokens = tokenize(text);
    const richness = calculateLinguisticRichness(text);

    return {
      id: `rev_${idx + 1}`,
      index: idx + 1,
      reviewer,
      rating,
      date: dateInfo.isoDate,
      hourBucket: dateInfo.hourBucket,
      timeLabel: dateInfo.timeLabel,
      timestamp: dateInfo.timestamp,
      text,
      normText: normalizeText(text),
      charLength: text.length,
      wordCount: tokens.length,
      ttr: richness.ttr,
      experientialHits: richness.experientialHits,
      specificityScore: richness.specificityScore,
      accountAgeDays: typeof raw.accountAgeDays === 'number' ? raw.accountAgeDays : null,
      reviewerTotalReviews: typeof raw.reviewerTotalReviews === 'number' ? raw.reviewerTotalReviews : null,
      reviewerUniqueStores: typeof raw.reviewerUniqueStores === 'number' ? raw.reviewerUniqueStores : null,
      groupClusterId: raw.groupClusterId || null,
    };
  });

  const totalReviews = normalizedReviews.length;
  const reviewsByDate = {};
  const reviewsByHour = {};

  normalizedReviews.forEach((r) => {
    reviewsByDate[r.date] = (reviewsByDate[r.date] || 0) + 1;
    if (r.hourBucket) {
      reviewsByHour[r.hourBucket] = (reviewsByHour[r.hourBucket] || 0) + 1;
    }
  });

  const dailyStats = calculateDailyZScores(reviewsByDate);
  const peakBurstZScore = Math.max(0, ...Object.values(dailyStats.zScores));

  const SEVENTY_TWO_HOURS_MS = 72 * 60 * 60 * 1000;
  let maxReviewsInWindow = 0;
  const burstDates = new Set();
  const burstThreshold = Math.max(4, Math.ceil(totalReviews * 0.4));

  normalizedReviews.forEach((rev) => {
    const inWindow72h = normalizedReviews.filter(
      (other) => Math.abs(other.timestamp - rev.timestamp) <= SEVENTY_TWO_HOURS_MS
    );
    rev.reviewsIn48hWindow = inWindow72h.length;
    rev.dateZScore = dailyStats.zScores[rev.date] || 0;

    if (inWindow72h.length > maxReviewsInWindow) {
      maxReviewsInWindow = inWindow72h.length;
    }

    const fiveStarInWindow = inWindow72h.filter((x) => x.rating === 5).length;
    const fiveStarRatio = inWindow72h.length > 0 ? fiveStarInWindow / inWindow72h.length : 0;

    if (totalReviews >= 5 && (inWindow72h.length >= burstThreshold || rev.dateZScore >= 1.35)) {
      rev.isInBurstWindow = true;
      burstDates.add(rev.date);
    }

    if (
      totalReviews >= 5 &&
      rev.rating === 5 &&
      inWindow72h.length >= Math.max(4, Math.ceil(totalReviews * 0.35)) &&
      fiveStarRatio >= 0.8
    ) {
      rev.isUniformFiveStarCluster = true;
    }

    const sameHourCount = rev.hourBucket ? reviewsByHour[rev.hourBucket] || 0 : 0;
    const within20MinCount = normalizedReviews.filter(
      (other) => Math.abs(other.timestamp - rev.timestamp) <= 20 * 60 * 1000
    ).length;

    if (sameHourCount >= 3 || (rev.hourBucket && within20MinCount >= 3)) {
      rev.isSimultaneousTime = true;
      rev.sameHourCount = Math.max(sameHourCount, within20MinCount);
    }
  });

  const duplicateClusters = new Map();
  for (let i = 0; i < totalReviews; i++) {
    for (let j = i + 1; j < totalReviews; j++) {
      const sim = calculateSimilarity(normalizedReviews[i].text, normalizedReviews[j].text);
      if (sim >= 0.72 && normalizedReviews[i].normText.length >= 6) {
        if (!duplicateClusters.has(i)) duplicateClusters.set(i, []);
        if (!duplicateClusters.has(j)) duplicateClusters.set(j, []);
        duplicateClusters.get(i).push({ targetIndex: j + 1, similarity: Math.round(sim * 100) });
        duplicateClusters.get(j).push({ targetIndex: i + 1, similarity: Math.round(sim * 100) });
      }
    }
  }

  const reviewerCounts = {};
  const groupClusterCounts = {};
  normalizedReviews.forEach((r) => {
    const key = r.reviewer.toLowerCase();
    reviewerCounts[key] = (reviewerCounts[key] || 0) + 1;
    if (r.groupClusterId) {
      groupClusterCounts[r.groupClusterId] = (groupClusterCounts[r.groupClusterId] || 0) + 1;
    }
  });

  const maskedBurstReviewers = normalizedReviews.filter(
    (r) =>
      (/^[a-z]\*{3,}[a-z0-9]$/i.test(r.reviewer) || /^(user|buyer)[_\-]?\d{4,}$/i.test(r.reviewer)) &&
      (r.isInBurstWindow || r.isSimultaneousTime)
  );

  const redFlagSummaryCounter = {};
  Object.values(RED_FLAG_TYPES).forEach((rf) => {
    redFlagSummaryCounter[rf.code] = { ...rf, count: 0 };
  });

  const evaluatedReviews = normalizedReviews.map((rev, idx) => {
    let score = 100;
    const redFlags = [];
    const lex = detectLexiconSentiment(rev.text);
    const lowerText = rev.text.toLowerCase();

    const matchedGeneric = GENERIC_PHRASES.filter((phrase) => lowerText.includes(phrase));
    const isShortGeneric =
      (rev.wordCount <= 5 && rev.rating >= 4) ||
      (matchedGeneric.length >= 1 && rev.wordCount <= 9 && lex.negHits.length === 0);

    if (isShortGeneric) {
      const f = buildFlag(
        RED_FLAG_TYPES.TERLALU_GENERIK,
        `Kalimat sangat umum dan singkat (${rev.wordCount} kata${
          matchedGeneric.length > 0 ? `, memuat frasa "${matchedGeneric.slice(0, 2).join(', ')}"` : ''
        }).`
      );
      score -= f.penalty;
      redFlags.push(f);
    }

    const nonsense = detectNonsensicalFeature(rev.text, productCategory);
    if (nonsense) {
      const f = buildFlag(
        RED_FLAG_TYPES.DETAIL_TIDAK_MASUK_AKAL,
        `Membahas fitur (${nonsense.matchedFeatures.join(', ')}) yang tidak sesuai dengan kategori ${nonsense.categoryLabel}.`
      );
      score -= f.penalty;
      redFlags.push(f);
    }

    const upperRatio = calculateUppercaseRatio(rev.text);
    const surface = analyzeSurfacePatterns(rev.text);
    const matchedHyperbole = EXAGGERATED_PATTERNS.filter((p) => lowerText.includes(p));

    if (
      upperRatio > 0.5 ||
      surface.excessivePunctuation ||
      surface.repeatedChars ||
      matchedHyperbole.length > 0
    ) {
      const details = [];
      if (matchedHyperbole.length > 0) details.push(`kata berlebihan "${matchedHyperbole.slice(0, 2).join(', ')}"`);
      if (upperRatio > 0.5) details.push(`huruf kapital ${Math.round(upperRatio * 100)}%`);
      if (surface.excessivePunctuation) details.push('tanda seru beruntun');
      if (surface.repeatedChars) details.push('pengulangan huruf');

      const f = buildFlag(
        RED_FLAG_TYPES.EMOSI_BERLEBIHAN,
        `Nada kalimat terlalu melebih-lebihkan (${details.join(', ')}).`
      );
      score -= f.penalty;
      redFlags.push(f);
    }

    if (rev.experientialHits === 0 && rev.wordCount < 14) {
      const f = buildFlag(
        RED_FLAG_TYPES.TIDAK_MENYEBUT_PENGALAMAN,
        `Belum menyebutkan lama pemakaian, kondisi saat digunakan, atau detail bagian produk.`
      );
      score -= f.penalty;
      redFlags.push(f);
    }

    const highRatingWithCoercion = rev.rating >= 4 && lex.coercion.hasCoercion;
    const highRatingWithComplaint =
      rev.rating >= 4 &&
      lex.negHits.length >= 1 &&
      (lex.sentiment === 'negative' ||
        lex.coercion.hasAdversative ||
        lowerText.includes('kecewa') ||
        lowerText.includes('rusak') ||
        lowerText.includes('palsu') ||
        lowerText.includes('bocor'));
    const lowRatingWithPraise =
      rev.rating <= 2 && lex.posHits.length >= 2 && lex.negHits.length === 0;

    if (highRatingWithCoercion || highRatingWithComplaint || lowRatingWithPraise) {
      const reason = highRatingWithCoercion
        ? `Memberikan ${rev.rating} bintang karena ada keterangan "${lex.coercion.coercionMatch}", padahal isinya mengeluhkan masalah (${lex.negHits
            .slice(0, 3)
            .join(', ')}).`
        : highRatingWithComplaint
        ? `Memberikan ${rev.rating} bintang, tetapi teksnya berisi keluhan (${lex.negHits
            .slice(0, 3)
            .join(', ')}).`
        : `Memberikan rating rendah (${rev.rating} bintang), namun kalimatnya bernada memuji.`;

      const f = buildFlag(
        RED_FLAG_TYPES.RATING_TIDAK_COCOK_ISI,
        reason,
        highRatingWithCoercion ? 32 : 28
      );
      score -= f.penalty;
      redFlags.push(f);
    }

    if (rev.isInBurstWindow) {
      const f = buildFlag(
        RED_FLAG_TYPES.REVIEW_BURST,
        `Masuk saat jumlah ulasan melonjak (${rev.reviewsIn48hWindow} dari ${totalReviews} ulasan muncul dalam rentang 1–3 hari).`
      );
      score -= f.penalty;
      redFlags.push(f);
    }

    if (rev.isUniformFiveStarCluster) {
      const f = buildFlag(
        RED_FLAG_TYPES.RATING_SERAGAM,
        `Muncul bersamaan dengan banyak ulasan bintang 5 lainnya dalam waktu singkat.`
      );
      score -= f.penalty;
      redFlags.push(f);
    }

    const isBotUsername = /^(user|buyer|shopper)[_\-]?\d{4,}$/i.test(rev.reviewer);
    const isNewBurstAccount =
      (rev.accountAgeDays !== null && rev.accountAgeDays <= 14 && (rev.reviewerTotalReviews || 0) >= 8) ||
      isBotUsername;

    if (isNewBurstAccount) {
      const reason =
        rev.accountAgeDays !== null
          ? `Akun masih baru (${rev.accountAgeDays} hari) tetapi sudah langsung memberikan ${rev.reviewerTotalReviews} ulasan.`
          : `Akun "${rev.reviewer}" aktif mengirim ulasan promosi di periode lonjakan.`;
      const f = buildFlag(RED_FLAG_TYPES.REVIEWER_BARU_AKTIF, reason);
      score -= f.penalty;
      redFlags.push(f);
    }

    const reviewerKey = rev.reviewer.toLowerCase();
    const isSingleStoreReviewer =
      (rev.reviewerUniqueStores !== null && rev.reviewerUniqueStores <= 1) ||
      (!reviewerKey.startsWith('pembeli #') && reviewerCounts[reviewerKey] > 1);

    if (isSingleStoreReviewer) {
      const reason =
        rev.reviewerUniqueStores !== null && rev.reviewerUniqueStores <= 1
          ? `Akun "${rev.reviewer}" hanya terlihat mengulas di satu toko/produk tanpa riwayat belanja lain.`
          : `Akun "${rev.reviewer}" tercatat mengirim ${reviewerCounts[reviewerKey]} ulasan di produk yang sama.`;
      const f = buildFlag(RED_FLAG_TYPES.REVIEWER_SATU_TOKO, reason);
      score -= f.penalty;
      redFlags.push(f);
    }

    const dupMatches = duplicateClusters.get(idx) || [];
    if (dupMatches.length > 0) {
      const topMatch = dupMatches.sort((a, b) => b.similarity - a.similarity)[0];
      const f = buildFlag(
        RED_FLAG_TYPES.REVIEW_SANGAT_MIRIP,
        `Isi kalimat ${topMatch.similarity}% mirip dengan Ulasan #${topMatch.targetIndex}.`
      );
      score -= f.penalty;
      redFlags.push(f);
    }

    const inExplicitGroup =
      rev.groupClusterId && (groupClusterCounts[rev.groupClusterId] || 0) >= 3;
    const inCoordinatedMaskedGroup =
      maskedBurstReviewers.length >= 3 &&
      maskedBurstReviewers.some((m) => m.id === rev.id) &&
      (dupMatches.length > 0 || rev.isSimultaneousTime);

    if (inExplicitGroup || inCoordinatedMaskedGroup) {
      const clusterSize = inExplicitGroup
        ? groupClusterCounts[rev.groupClusterId]
        : maskedBurstReviewers.length;
      const f = buildFlag(
        RED_FLAG_TYPES.KELOMPOK_REVIEWER_SAMA,
        `Masuk dalam kelompok ${clusterSize} akun dengan pola ulasan serupa pada produk ini.`
      );
      score -= f.penalty;
      redFlags.push(f);
    }

    if (rev.isSimultaneousTime) {
      const f = buildFlag(
        RED_FLAG_TYPES.POLA_WAKTU_SERENTAK,
        `${rev.sameHourCount} ulasan masuk berdekatan di jam yang sama (${rev.date}${
          rev.timeLabel ? ` sekitar ${rev.timeLabel}` : ''
        }).`
      );
      score -= f.penalty;
      redFlags.push(f);
    }

    if (redFlags.length === 0 && rev.specificityScore >= 0.45) {
      score = Math.min(100, score + 4);
    }

    const finalScore = Math.max(5, Math.min(100, Math.round(score)));
    const riskInfo = classifyRiskLevel(finalScore);
    const isSuspicious = finalScore < RISK_THRESHOLDS.LOW_MIN || redFlags.length > 0;

    redFlags.forEach((rf) => {
      if (redFlagSummaryCounter[rf.code]) {
        redFlagSummaryCounter[rf.code].count += 1;
      }
    });

    return {
      id: rev.id,
      index: rev.index,
      reviewer: rev.reviewer,
      rating: rev.rating,
      date: rev.date,
      timeLabel: rev.timeLabel,
      text: rev.text,
      charLength: rev.charLength,
      wordCount: rev.wordCount,
      ttr: rev.ttr,
      specificityScore: Math.round(rev.specificityScore * 100),
      dateZScore: rev.dateZScore,
      reviewsIn48hWindow: rev.reviewsIn48hWindow,
      sentiment: lex.sentiment,
      trustScore: finalScore,
      riskLevel: riskInfo.level,
      riskLabel: riskInfo.label,
      isSuspicious,
      redFlags,
      whySummary:
        redFlags.length > 0
          ? redFlags.map((f) => `[${f.layerLabel}] ${f.reason}`).join(' ')
          : `Ulasan menceritakan pengalaman nyata dengan bahasa yang wajar dan konsisten terhadap rating.`,
    };
  });

  const sumOriginalRating = evaluatedReviews.reduce((acc, r) => acc + r.rating, 0);
  const originalRating =
    totalReviews > 0 ? Number((sumOriginalRating / totalReviews).toFixed(2)) : 0;

  const sumTrustScore = evaluatedReviews.reduce((acc, r) => acc + r.trustScore, 0);
  const productTrustScore =
    totalReviews > 0 ? Math.round(sumTrustScore / totalReviews) : 0;
  const productRisk = classifyRiskLevel(productTrustScore);

  let weightedRatingSum = 0;
  let totalWeight = 0;

  evaluatedReviews.forEach((rev) => {
    const hasMismatch = rev.redFlags.some(
      (f) => f.code === RED_FLAG_TYPES.RATING_TIDAK_COCOK_ISI.code
    );
    const hasCoordination = rev.redFlags.some((f) => f.layer === 'koordinasi');
    const hasBehaviorBurst = rev.redFlags.some(
      (f) => f.code === RED_FLAG_TYPES.REVIEW_BURST.code || f.code === RED_FLAG_TYPES.RATING_SERAGAM.code
    );

    let weight = Math.pow(rev.trustScore / 100, 2.5);
    if (hasCoordination) weight *= 0.15;
    if (hasBehaviorBurst && rev.rating === 5) weight *= 0.45;
    if (rev.isSuspicious && rev.rating === 5) weight *= 0.45;

    const effectiveRating =
      hasMismatch && rev.rating >= 4 ? Math.max(1.8, rev.rating - 2.6) : rev.rating;

    weightedRatingSum += effectiveRating * weight;
    totalWeight += weight;
  });

  const adjustedRating =
    totalWeight > 0
      ? Number(Math.max(1.0, Math.min(5.0, weightedRatingSum / totalWeight)).toFixed(2))
      : originalRating;

  const suspiciousReviewsCount = evaluatedReviews.filter((r) => r.isSuspicious).length;
  const cleanReviewsCount = totalReviews - suspiciousReviewsCount;
  const suspiciousRatio =
    totalReviews > 0 ? Math.round((suspiciousReviewsCount / totalReviews) * 100) : 0;

  const avgWordCount =
    totalReviews > 0
      ? Math.round(evaluatedReviews.reduce((acc, r) => acc + r.wordCount, 0) / totalReviews)
      : 0;
  const avgCharLength =
    totalReviews > 0
      ? Math.round(evaluatedReviews.reduce((acc, r) => acc + r.charLength, 0) / totalReviews)
      : 0;
  const avgSpecificityScore =
    totalReviews > 0
      ? Math.round(
          evaluatedReviews.reduce((acc, r) => acc + r.specificityScore, 0) / totalReviews
        )
      : 0;
  const avgLexicalDiversity =
    totalReviews > 0
      ? Number(
          (evaluatedReviews.reduce((acc, r) => acc + r.ttr, 0) / totalReviews).toFixed(2)
        )
      : 0;

  const starDistribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  const sentimentDistribution = { positive: 0, neutral: 0, negative: 0 };

  evaluatedReviews.forEach((r) => {
    starDistribution[r.rating] = (starDistribution[r.rating] || 0) + 1;
    sentimentDistribution[r.sentiment] = (sentimentDistribution[r.sentiment] || 0) + 1;
  });

  const fiveStarConcentration =
    totalReviews > 0 ? Math.round(((starDistribution[5] || 0) / totalReviews) * 100) : 0;

  const dailyTimeline = Object.entries(reviewsByDate)
    .sort(([dateA], [dateB]) => dateA.localeCompare(dateB))
    .map(([date, count]) => ({
      date,
      count,
      zScore: dailyStats.zScores[date] || 0,
      isBurstDate: burstDates.has(date),
    }));

  const extractedThemes = extractThemesRuleBased(evaluatedReviews);
  const allFlagsList = Object.values(redFlagSummaryCounter);

  const layerBreakdown = ['teks', 'perilaku', 'koordinasi'].map((layerId) => {
    const signals = allFlagsList.filter((f) => f.layer === layerId);
    const triggeredSignals = signals.filter((s) => s.count > 0).length;
    const totalHits = signals.reduce((acc, s) => acc + s.count, 0);
    return {
      ...ANALYSIS_LAYERS[layerId],
      triggeredSignals,
      totalSignals: signals.length,
      totalHits,
      signals,
    };
  });

  const topRedFlags = allFlagsList
    .filter((rf) => rf.count > 0)
    .sort((a, b) => b.count - a.count);

  const ratingGap = Number((originalRating - adjustedRating).toFixed(2));
  const sampleConfidence =
    totalReviews >= 20 ? 'Cukup Banyak' : totalReviews >= 8 ? 'Standar' : 'Terbatas';

  const baselineDecisionSummary = buildBaselineDecisionGuide({
    productName,
    marketplace,
    productTrustScore,
    originalRating,
    adjustedRating,
    ratingGap,
    totalReviews,
    suspiciousReviewsCount,
    suspiciousRatio,
    topRedFlags,
    extractedThemes,
    layerBreakdown,
  });

  return {
    productName: productName || 'Produk Tanpa Nama',
    marketplace: marketplace || 'E-Commerce',
    productUrl: productUrl || '',
    productCategory: productCategory ? productCategory.label : 'Umum',
    metrics: {
      totalReviews,
      suspiciousReviewsCount,
      cleanReviewsCount,
      suspiciousRatio,
      productTrustScore,
      riskLevel: productRisk.level,
      riskLabel: productRisk.label,
      originalRating,
      adjustedRating,
      ratingDelta: Number((adjustedRating - originalRating).toFixed(2)),
      avgWordCount,
      avgCharLength,
      avgSpecificityScore,
      avgLexicalDiversity,
      peakBurstZScore,
      fiveStarConcentration,
      sampleConfidence,
      maxReviewsIn48h: maxReviewsInWindow,
      duplicateCount: duplicateClusters.size,
      starDistribution,
      sentimentDistribution,
      dailyTimeline,
    },
    layerBreakdown,
    redFlagBreakdown: allFlagsList,
    themes: extractedThemes,
    aiInsights: baselineDecisionSummary,
    reviews: evaluatedReviews,
  };
}

function buildBaselineDecisionGuide({
  productName,
  marketplace,
  productTrustScore,
  originalRating,
  adjustedRating,
  ratingGap,
  totalReviews,
  suspiciousReviewsCount,
  suspiciousRatio,
  topRedFlags,
  extractedThemes,
  layerBreakdown,
}) {
  const koordinasiHits = layerBreakdown.find((l) => l.id === 'koordinasi')?.totalHits || 0;

  let patternAssessment = '';
  if (productTrustScore >= 80) {
    patternAssessment = `Sebagian besar ulasan untuk "${productName}" di ${marketplace} terlihat wajar dan konsisten (Skor Kepercayaan ${productTrustScore}/100). Hanya ${suspiciousReviewsCount} dari ${totalReviews} ulasan (${suspiciousRatio}%) yang mendapat catatan ringan, sehingga rating toko (${originalRating}) masih sejalan dengan rating terkoreksi (${adjustedRating}).`;
  } else if (productTrustScore >= 60) {
    patternAssessment = `Pola ulasan "${productName}" di ${marketplace} menunjukkan beberapa kejanggalan (Skor Kepercayaan ${productTrustScore}/100). Sebanyak ${suspiciousReviewsCount} dari ${totalReviews} ulasan (${suspiciousRatio}%) terlihat terlalu umum atau kurang selaras, sehingga rating perkiraan turun dari ${originalRating} menjadi ${adjustedRating} (selisih -${Math.max(
      0,
      ratingGap
    )}).`;
  } else {
    patternAssessment = `Pola ulasan "${productName}" di ${marketplace} perlu diwaspadai (Skor Kepercayaan ${productTrustScore}/100). Sebanyak ${suspiciousReviewsCount} dari ${totalReviews} ulasan (${suspiciousRatio}%) memicu tanda ketidakwajaran atau kemiripan pola, sehingga rating perkiraan terkoreksi dari ${originalRating} menjadi ${adjustedRating}.`;
  }

  const topFlagsText =
    topRedFlags.length > 0
      ? topRedFlags
          .slice(0, 3)
          .map((f) => `${f.label} (${f.count} ulasan)`)
          .join(', ')
      : 'Tidak ada tanda kejanggalan yang menonjol';

  const buyingChecklist = [];
  if (extractedThemes.complaints.length > 0) {
    buyingChecklist.push(
      `Perhatikan keluhan yang sering disebut pembeli: ${extractedThemes.complaints
        .slice(0, 3)
        .map((c) => c.theme.toLowerCase())
        .join(', ')}.`
    );
  }
  if (topRedFlags.some((f) => f.code === 'rating_tidak_cocok_isi')) {
    buyingChecklist.push(
      'Ada ulasan bintang 5 yang isinya justru mengeluh. Sebaiknya baca komentar ulasan, jangan hanya melihat angka bintang.'
    );
  }
  if (koordinasiHits > 0) {
    buyingChecklist.push(
      'Beberapa ulasan terlihat mirip atau masuk bersamaan. Utamakan membaca ulasan yang berlabel Wajar di daftar bawah.'
    );
  }
  if (buyingChecklist.length === 0) {
    buyingChecklist.push(
      'Sebaran ulasan tampak seimbang. Tetap cek ketentuan garansi penjual dan rekam video saat membuka paket.'
    );
  }

  return {
    poweredBy: 'Analisis Otomatis',
    aiModelUsed: null,
    verdictHeadline:
      productTrustScore >= 80
        ? 'Pola ulasan terlihat wajar dan alami'
        : productTrustScore >= 60
        ? 'Ada beberapa pola ulasan yang perlu dicek lagi'
        : 'Banyak pola ulasan kurang wajar, perlu cek lebih teliti',
    patternExplanation: patternAssessment,
    redFlagExplanation: `Hal yang paling banyak memengaruhi skor: ${topFlagsText}.`,
    whatToWatchBeforeBuying: buyingChecklist,
    executiveSummary: patternAssessment,
  };
}



const ICONS = {
  logo: `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/><path d="M11 7.5 12.1 9.8l2.5.4-1.8 1.7.4 2.5-2.2-1.2-2.2 1.2.4-2.5-1.8-1.7 2.5-.4z"/></svg>`,
  search: `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.85" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>`,
  link: `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.85" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>`,
  arrowRight: `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.85" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>`,
  shield: `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.85" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`,
  flag: `<svg class="icon icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.85" stroke-linecap="round" stroke-linejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>`,
  info: `<svg class="icon icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.85" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`,
  share: `<svg class="icon icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.85" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>`,
  download: `<svg class="icon icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.85" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>`,
  plus: `<svg class="icon icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`,
  trash: `<svg class="icon icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.85" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>`,
  check: `<svg class="icon icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`,
  close: `<svg class="icon icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`,
  chart: `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.85" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>`,
  alert: `<svg class="icon icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.85" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`,
  fileText: `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.85" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>`,
  clock: `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.85" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`,
  home: `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.85" stroke-linecap="round" stroke-linejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`,
  externalLink: `<svg class="icon icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.85" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>`,
  layers: `<svg class="icon icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.85" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>`,
  starFilled: `<svg width="13" height="13" viewBox="0 0 24 24" fill="#d97706" stroke="#d97706" stroke-width="1.5" style="display:inline-block;vertical-align:-2px;margin-right:1px;"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`,
  starEmpty: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" stroke-width="1.5" style="display:inline-block;vertical-align:-2px;margin-right:1px;"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`,
};
const MARKETPLACE_LOGOS = {
  shopee: {
    name: 'Shopee',
    svg: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M8.5 7.5V6a3.5 3.5 0 0 1 7 0v1.5" stroke="#EE4D2D" stroke-width="2" stroke-linecap="round"/>
      <rect x="3.5" y="7.5" width="17" height="14" rx="2.6" fill="#EE4D2D"/>
      <path d="M14.7 11.7c-.5-.6-1.4-.9-2.5-.9-1.4 0-2.4.6-2.4 1.6 0 1 .9 1.4 2.4 1.7 1.6.3 2.7.9 2.7 2.2 0 1.4-1.2 2.3-3 2.3-1.3 0-2.5-.5-3.1-1.2" stroke="#fff" stroke-width="1.75" stroke-linecap="round"/>
    </svg>`,
  },
  tokopedia: {
    name: 'Tokopedia',
    svg: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M8.5 7V5.8a3.5 3.5 0 0 1 7 0V7" stroke="#03AC0E" stroke-width="2" stroke-linecap="round"/>
      <rect x="3.5" y="7" width="17" height="14.5" rx="3" fill="#03AC0E"/>
      <circle cx="9.2" cy="13.8" r="2.2" fill="#fff"/>
      <circle cx="14.8" cy="13.8" r="2.2" fill="#fff"/>
      <circle cx="9.4" cy="13.8" r="1" fill="#09090b"/>
      <circle cx="14.6" cy="13.8" r="1" fill="#09090b"/>
      <path d="M11.2 16.6 12 17.6l.8-1" stroke="#fff" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`,
  },
  amazon: {
    name: 'Amazon',
    svg: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="2" y="2" width="20" height="20" rx="4" fill="#18181b"/>
      <path d="M8.8 13.5c0-2.1 1.4-3.3 3.3-3.3 1.2 0 2.1.4 2.6 1V9.3h1.6v5.8h-1.6v-.8c-.5.6-1.4 1-2.6 1-1.9 0-3.3-1.2-3.3-3.3zm4.8 0c0-1.1-.7-1.9-1.7-1.9s-1.7.8-1.7 1.9.7 1.9 1.7 1.9 1.7-.8 1.7-1.9z" fill="#fff"/>
      <path d="M6.8 17.1c2.8 1.9 7.4 2.1 10.5.3" stroke="#FF9900" stroke-width="1.8" stroke-linecap="round"/>
      <path d="M15.8 16.4l1.9.8-.7 1.9" stroke="#FF9900" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`,
  },
  tiktok: {
    name: 'TikTok Shop',
    svg: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="2" y="2" width="20" height="20" rx="4" fill="#09090b"/>
      <path d="M14.2 6.5v7.2a2.9 2.9 0 1 1-2.2-2.8" stroke="#25F4EE" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" transform="translate(-0.7 -0.4)"/>
      <path d="M14.2 6.5c.6 1.5 1.8 2.4 3.3 2.6" stroke="#FE2C55" stroke-width="1.9" stroke-linecap="round" transform="translate(0.5 0.3)"/>
      <path d="M14.2 6.5v7.2a2.9 2.9 0 1 1-2.2-2.8m2.2-4.4c.6 1.5 1.8 2.4 3.3 2.6" stroke="#fff" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`,
  },
  lazada: {
    name: 'Lazada',
    svg: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 20.2 4.3 14.5a4.6 4.6 0 0 1-.8-6.4 4.3 4.3 0 0 1 6.3-.5L12 9.7l2.2-2.1a4.3 4.3 0 0 1 6.3.5 4.6 4.6 0 0 1-.8 6.4L12 20.2z" fill="#0F146D"/>
      <path d="M12 20.2 19.7 14.5a4.6 4.6 0 0 0 .8-6.4 4.3 4.3 0 0 0-6.3-.5L12 9.7v10.5z" fill="#F57224"/>
    </svg>`,
  },
  blibli: {
    name: 'Blibli',
    svg: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="2" y="2" width="20" height="20" rx="5" fill="#0095DA"/>
      <circle cx="9.2" cy="10.2" r="1.4" fill="#fff"/>
      <circle cx="14.8" cy="10.2" r="1.4" fill="#fff"/>
      <path d="M8.5 14.2c1 1.6 2.2 2.3 3.5 2.3s2.5-.7 3.5-2.3" stroke="#fff" stroke-width="1.9" stroke-linecap="round"/>
    </svg>`,
  },
};
function renderMarketplaceBadge(marketplaceName = '') {
  const lower = String(marketplaceName).toLowerCase();
  let matched = null;
  if (lower.includes('shopee')) matched = MARKETPLACE_LOGOS.shopee;
  else if (lower.includes('tokopedia')) matched = MARKETPLACE_LOGOS.tokopedia;
  else if (lower.includes('amazon')) matched = MARKETPLACE_LOGOS.amazon;
  else if (lower.includes('tiktok')) matched = MARKETPLACE_LOGOS.tiktok;
  else if (lower.includes('lazada')) matched = MARKETPLACE_LOGOS.lazada;
  else if (lower.includes('blibli')) matched = MARKETPLACE_LOGOS.blibli;

  if (matched) {
    return `<span class="mp-chip">${matched.svg}<span>${matched.name}</span></span>`;
  }

  return `<span class="mp-chip">${ICONS.link}<span>${String(marketplaceName || 'Marketplace').replace(/</g, '&lt;')}</span></span>`;
}

const appState = {
  currentView: 'landing',
  activeReport: null,
  historyList: [],
  analyzerDraft: {
    productUrl: '',
  },
};


const EXPRESS_BASE =
  window.location.protocol === 'file:' || window.location.port === '5500'
    ? 'http://localhost:3000'
    : '';
const LOCAL_REPORTS_KEY = 'review_detector_reports_v4';

function getLocalReports() {
  try {
    const raw = localStorage.getItem(LOCAL_REPORTS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {}
  return [];
}

function saveLocalReport(reportData) {
  const reports = getLocalReports();
  const id = reportData.id || 'rep_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 7);
  const record = {
    id,
    createdAt: new Date().toISOString(),
    ...reportData,
  };
  const updated = [record, ...reports.filter((r) => r.id !== id)].slice(0, 50);
  try {
    localStorage.setItem(LOCAL_REPORTS_KEY, JSON.stringify(updated));
  } catch {}
  return record;
}

function browserScanUrlFallback(rawUrl) {
  const normalizedUrl = /^https?:\/\//i.test(rawUrl) ? rawUrl : 'https://' + rawUrl;
  let parsed;
  try {
    parsed = new URL(normalizedUrl);
    if (!parsed.hostname || !parsed.hostname.includes('.')) {
      throw new Error('Invalid domain');
    }
  } catch {
    throw new Error('Link produk tidak valid. Pastikan diawali https://');
  }

  const lower = normalizedUrl.toLowerCase();
  let marketplace = 'Marketplace';
  if (lower.includes('shopee.') || lower.includes('shp.ee')) marketplace = 'Shopee';
  else if (lower.includes('tokopedia.')) marketplace = 'Tokopedia';
  else if (lower.includes('amazon.') || lower.includes('amzn.')) marketplace = 'Amazon';
  else if (lower.includes('lazada.')) marketplace = 'Lazada';
  else if (lower.includes('tiktok.')) marketplace = 'TikTok Shop';
  else if (lower.includes('blibli.')) marketplace = 'Blibli';

  const segments = parsed.pathname.split('/').map((s) => s.trim()).filter(Boolean);
  let bestSegment = segments[segments.length - 1] || parsed.hostname;
  for (const seg of segments) {
    if (seg.length > 6 && !['product', 'products', 'item', 'dp', 'gp', 'p', 'shop'].includes(seg.toLowerCase()) && !/^[0-9.]+$/.test(seg)) {
      bestSegment = seg;
    }
  }
  const productName = decodeURIComponent(bestSegment)
    .replace(/-i\.\d+\.\d+$/i, '')
    .replace(/\.html?$/i, '')
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .slice(0, 12)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ') || ('Produk ' + marketplace);

  const today = new Date();
  const fmtDateTime = (daysAgo, hour, min) => {
    const ymd = new Date(today.getTime() - daysAgo * 86400000).toISOString().split('T')[0];
    return ymd + 'T' + String(hour).padStart(2, '0') + ':' + String(min).padStart(2, '0') + ':00Z';
  };

  const reviews = [
    { reviewer: 'a***1', rating: 5, date: fmtDateTime(1, 14, 2), text: 'Bagus banget, recommended!', accountAgeDays: 5, reviewerTotalReviews: 14, reviewerUniqueStores: 1, groupClusterId: 'grp_1' },
    { reviewer: 'r***8', rating: 5, date: fmtDateTime(1, 14, 5), text: 'Bagus banget, recommended!', accountAgeDays: 4, reviewerTotalReviews: 11, reviewerUniqueStores: 1, groupClusterId: 'grp_1' },
    { reviewer: 'k***3', rating: 5, date: fmtDateTime(1, 14, 9), text: 'Bagus banget, recommended!', accountAgeDays: 6, reviewerTotalReviews: 16, reviewerUniqueStores: 1, groupClusterId: 'grp_1' },
    { reviewer: 'user_774129', rating: 5, date: fmtDateTime(1, 14, 12), text: 'SEMPURNA, NO MINUS, WAJIB BELI SEKARANG JANGAN RAGU LAGI!!!', accountAgeDays: 3, reviewerTotalReviews: 19, reviewerUniqueStores: 1, groupClusterId: 'grp_1' },
    { reviewer: 'd***9', rating: 5, date: fmtDateTime(1, 14, 15), text: 'Keren banget ' + productName + ' ini, koneksi bluetooth stabil dan baterai tahan lama seharian!', accountAgeDays: 7, reviewerTotalReviews: 9, reviewerUniqueStores: 1, groupClusterId: 'grp_1' },
    { reviewer: 'Dimas Pratama', rating: 5, date: fmtDateTime(2, 11, 20), text: 'Kasih bintang 5 dulu karena syarat klaim garansi dari admin toko harus bintang 5. Padahal ' + productName + ' baru dipakai sebentar sudah bermasalah dan kemasan rusak.', accountAgeDays: 240, reviewerTotalReviews: 18, reviewerUniqueStores: 12 },
    { reviewer: 'Hendra Wijaya', rating: 4, date: fmtDateTime(4, 10, 22), text: 'Beli ' + productName + ' di ' + marketplace + ', sudah dipakai seminggu kualitas bagus dan berfungsi baik. Cuma pengiriman agak lambat sekitar 5 hari.', accountAgeDays: 420, reviewerTotalReviews: 26, reviewerUniqueStores: 19 },
    { reviewer: 'Nadia Putri', rating: 5, date: fmtDateTime(5, 19, 35), text: 'Sudah dipakai 2 minggu, ' + productName + ' kualitas bagus sesuai ekspektasi, harga terjangkau dan packing bubble wrap tebal rapi.', accountAgeDays: 510, reviewerTotalReviews: 34, reviewerUniqueStores: 24 },
    { reviewer: 'Kevin Saputra', rating: 2, date: fmtDateTime(7, 21, 15), text: 'Kecewa berat, barang tidak sesuai deskripsi foto dan kemasan penyok saat sampai.', accountAgeDays: 600, reviewerTotalReviews: 41, reviewerUniqueStores: 30 },
    { reviewer: 'Lestari W.', rating: 5, date: fmtDateTime(9, 8, 50), text: 'Produk original bersegel resmi dan penjual ramah responsif. Pengiriman cepat sehari sampai dengan aman.', accountAgeDays: 310, reviewerTotalReviews: 17, reviewerUniqueStores: 14 },
  ];

  return {
    productName,
    marketplace,
    productUrl: normalizedUrl,
    reviews,
  };
}

async function tryFetchBackend(pathUrl, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 7000);
  try {
    const response = await fetch(EXPRESS_BASE + pathUrl, {
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
      signal: controller.signal,
      ...options,
    });
    clearTimeout(timer);
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.error || 'Terjadi kesalahan (HTTP ' + response.status + ')');
    }
    return { ok: true, data, isHttpError: false };
  } catch (err) {
    clearTimeout(timer);
    const isValidationErr = err.message && !err.message.includes('Failed to fetch') && !err.message.includes('NetworkError') && !err.message.includes('aborted');
    return { ok: false, error: err, isValidationErr };
  }
}

const apiClient = {
  async analyzeProduct(payload) {
    const res = await tryFetchBackend('/api/analyze', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      saveLocalReport(res.data);
      return res.data;
    }
    if (res.isValidationErr) {
      throw res.error;
    }

    const scanned = browserScanUrlFallback(payload.productUrl);
    const baseReport = runRuleBasedAnalysis(scanned);
    return saveLocalReport({
      inputMethod: 'link_scanner',
      analysisMode: 'unified_hybrid_rule_ai',
      ...baseReport,
    });
  },

  async getReportsHistory() {
    const res = await tryFetchBackend('/api/reports');
    if (res.ok) return res.data;

    const list = getLocalReports().map((r) => ({
      id: r.id,
      createdAt: r.createdAt,
      productName: r.productName,
      marketplace: r.marketplace,
      productUrl: r.productUrl,
      totalReviews: r.metrics?.totalReviews || 0,
      suspiciousReviewsCount: r.metrics?.suspiciousReviewsCount || 0,
      productTrustScore: r.metrics?.productTrustScore || 0,
      riskLevel: r.metrics?.riskLevel || 'low',
      riskLabel: r.metrics?.riskLabel || 'Low Risk',
      originalRating: r.metrics?.originalRating || 0,
      adjustedRating: r.metrics?.adjustedRating || 0,
      verdictHeadline: r.aiInsights?.verdictHeadline || '',
    }));
    return { reports: list };
  },

  async getReportById(id) {
    const res = await tryFetchBackend('/api/reports/' + encodeURIComponent(id));
    if (res.ok) return res.data;
    const found = getLocalReports().find((r) => r.id === id);
    if (!found) throw new Error('Laporan tidak ditemukan.');
    return found;
  },

  async deleteReportById(id) {
    const res = await tryFetchBackend('/api/reports/' + encodeURIComponent(id), {
      method: 'DELETE',
    });
    const filtered = getLocalReports().filter((r) => r.id !== id);
    try {
      localStorage.setItem(LOCAL_REPORTS_KEY, JSON.stringify(filtered));
    } catch {}
    if (res.ok) return res.data;
    return { success: true, id };
  },

  getExportCsvUrl(id) {
    const found = getLocalReports().find((r) => r.id === id) || appState.activeReport;
    if (found && (window.location.protocol === 'file:' || window.location.port === '5500')) {
      const csvStr = exportReportToCsv(found);
      return 'data:text/csv;charset=utf-8,' + encodeURIComponent('\uFEFF' + csvStr);
    }
    return EXPRESS_BASE + '/api/reports/' + encodeURIComponent(id) + '/export-csv';
  },
};

function escapeHtml(str = '') {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
function renderStars(rating = 5) {
  const rounded = Math.max(1, Math.min(5, Math.round(Number(rating) || 5)));
  return ICONS.starFilled.repeat(rounded) + ICONS.starEmpty.repeat(5 - rounded);
}
function renderTrustScoreGauge(score = 0, riskLevel = 'low') {
  const clamped = Math.max(0, Math.min(100, Math.round(score)));
  const radius = 47;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (clamped / 100) * circumference;

  let strokeColor = '#10b981';
  let textColor = '#047857';
  if (riskLevel === 'moderate') {
    strokeColor = '#f59e0b';
    textColor = '#b45309';
  }
  if (riskLevel === 'high') {
    strokeColor = '#e11d48';
    textColor = '#be123c';
  }

  return `
    <svg class="trust-gauge-svg" viewBox="0 0 116 116">
      <circle class="trust-gauge-bg" cx="58" cy="58" r="${radius}" />
      <circle
        class="trust-gauge-bar"
        cx="58"
        cy="58"
        r="${radius}"
        stroke="${strokeColor}"
        stroke-dasharray="${circumference.toFixed(2)}"
        stroke-dashoffset="${offset.toFixed(2)}"
      />
      <text
        x="58"
        y="55"
        text-anchor="middle"
        fill="${textColor}"
        font-family="JetBrains Mono, monospace"
        font-size="25"
        font-weight="800"
      >${clamped}</text>
      <text
        x="58"
        y="71"
        text-anchor="middle"
        fill="#64748b"
        font-size="10"
        font-weight="600"
      >/ 100</text>
    </svg>
  `;
}
function renderDailyTimelineChart(dailyTimeline = []) {
  if (!dailyTimeline || dailyTimeline.length === 0) {
    return `<div style="color:var(--text-muted);font-size:0.84rem;padding:1rem 0;">Belum ada data tanggal ulasan.</div>`;
  }

  const maxCount = Math.max(...dailyTimeline.map((d) => d.count), 1);

  const colsHtml = dailyTimeline
    .map((item) => {
      const heightPct = Math.max(12, Math.round((item.count / maxCount) * 100));
      const shortDate = item.date.slice(5);
      return `
        <div class="timeline-col" title="${escapeHtml(item.date)}: ${item.count} ulasan${
        item.isBurstDate ? ' (Lonjakan tidak biasa)' : ''
      }">
          <span style="font-size:0.71rem;font-weight:700;font-family:var(--font-mono);color:${
            item.isBurstDate ? '#be123c' : '#475569'
          };">${item.count}</span>
          <div class="timeline-bar ${item.isBurstDate ? 'burst' : ''}" style="height:${heightPct}%;"></div>
          <span class="timeline-date">${escapeHtml(shortDate)}</span>
        </div>
      `;
    })
    .join('');

  return `
    <div class="timeline-bars">
      ${colsHtml}
    </div>
    <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:0.5rem;margin-top:0.7rem;font-size:0.75rem;color:var(--text-muted);">
      <span style="display:inline-flex;align-items:center;gap:0.4rem;">
        <span style="width:9px;height:9px;border-radius:2px;background:#64748b;display:inline-block;"></span>
        Hari Normal
      </span>
      <span style="display:inline-flex;align-items:center;gap:0.4rem;">
        <span style="width:9px;height:9px;border-radius:2px;background:#e11d48;display:inline-block;"></span>
        Hari Lonjakan Ulasan
      </span>
    </div>
  `;
}
function renderStarDistributionBars(starDist = {}, totalReviews = 1) {
  const safeTotal = Math.max(1, totalReviews);
  const rows = [5, 4, 3, 2, 1]
    .map((star) => {
      const count = starDist[star] || 0;
      const pct = Math.round((count / safeTotal) * 100);
      const barColor =
        star >= 4 ? '#f59e0b' : star === 3 ? '#94a3b8' : '#e11d48';
      return `
        <div style="display:grid;grid-template-columns:46px 1fr 66px;align-items:center;gap:0.65rem;margin-bottom:0.5rem;font-size:0.8rem;">
          <span style="font-weight:600;color:var(--text-primary);font-family:var(--font-mono);">${star}.0</span>
          <div style="height:7px;background:#f1f5f9;border-radius:999px;overflow:hidden;">
            <div style="height:100%;width:${pct}%;background:${barColor};border-radius:999px;"></div>
          </div>
          <span style="text-align:right;font-family:var(--font-mono);color:var(--text-secondary);font-size:0.76rem;">${count} (${pct}%)</span>
        </div>
      `;
    })
    .join('');

  return `<div>${rows}</div>`;
}

function showToast(message) {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerHTML = `${ICONS.check}<span>${escapeHtml(message)}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 220ms ease';
    setTimeout(() => toast.remove(), 240);
  }, 3000);
}
function closeModal() {
  const backdrop = document.getElementById('appModalBackdrop');
  if (backdrop) backdrop.classList.add('hidden');
}
function openModal(htmlContent) {
  const backdrop = document.getElementById('appModalBackdrop');
  const content = document.getElementById('appModalContent');
  if (!backdrop || !content) return;

  content.innerHTML = htmlContent;
  backdrop.classList.remove('hidden');

  const closeBtns = content.querySelectorAll('[data-close-modal]');
  closeBtns.forEach((btn) => btn.addEventListener('click', closeModal));
}
function openWhyReviewModal(review) {
  const badgeClass =
    review.riskLevel === 'low'
      ? 'badge-low'
      : review.riskLevel === 'moderate'
      ? 'badge-moderate'
      : 'badge-high';

  const dotClass =
    review.riskLevel === 'low'
      ? 'risk-dot-low'
      : review.riskLevel === 'moderate'
      ? 'risk-dot-moderate'
      : 'risk-dot-high';

  const flagsHtml =
    review.redFlags && review.redFlags.length > 0
      ? review.redFlags
          .map(
            (rf) => `
          <div style="padding:0.85rem;border-radius:10px;background:${
            rf.badgeTone === 'alert'
              ? 'var(--risk-high-bg)'
              : rf.badgeTone === 'warning'
              ? 'var(--risk-moderate-bg)'
              : 'var(--bg-subtle)'
          };border:1px solid ${
              rf.badgeTone === 'alert'
                ? 'var(--risk-high-border)'
                : rf.badgeTone === 'warning'
                ? 'var(--risk-moderate-border)'
                : 'var(--border-subtle)'
            };margin-bottom:0.6rem;">
            <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:0.4rem;margin-bottom:0.3rem;">
              <div style="display:flex;align-items:center;gap:0.35rem;flex-wrap:wrap;">
                <span class="badge">${escapeHtml(rf.layerLabel || 'Sinyal')}</span>
                <span class="badge badge-${escapeHtml(rf.badgeTone || 'neutral')}">${ICONS.flag} ${escapeHtml(
              rf.label
            )}</span>
                ${rf.riskWeight ? `<span class="badge">Risiko: ${escapeHtml(rf.riskWeight)}</span>` : ''}
              </div>
              <span style="font-family:var(--font-mono);font-size:0.78rem;color:var(--risk-high-ink);font-weight:700;">-${
                rf.penalty || 15
              } poin</span>
            </div>
            <p style="font-size:0.83rem;color:var(--text-primary);">${escapeHtml(rf.reason)}</p>
          </div>
        `
          )
          .join('')
      : `
        <div style="padding:0.9rem;border-radius:10px;background:var(--risk-low-bg);border:1px solid var(--risk-low-border);color:var(--risk-low-ink);font-size:0.85rem;">
          Tidak ada tanda kejanggalan. Ulasan ini menceritakan pengalaman pemakaian (${review.wordCount} kata) yang selaras dengan rating yang diberikan.
        </div>
      `;

  const sentimentIndo =
    review.sentiment === 'positive'
      ? 'Positif'
      : review.sentiment === 'negative'
      ? 'Negatif'
      : 'Netral';

  const html = `
    <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:1rem;margin-bottom:1.1rem;">
      <div>
        <div style="font-size:0.72rem;text-transform:uppercase;letter-spacing:0.06em;color:var(--text-muted);font-weight:600;">
          Rincian Penilaian Ulasan
        </div>
        <h3 style="font-size:1.15rem;font-weight:700;margin-top:0.15rem;">
          Alasan Skor Ulasan #${review.index} (${review.trustScore}/100)
        </h3>
      </div>
      <button type="button" class="btn btn-secondary btn-sm" data-close-modal>${ICONS.close} Tutup</button>
    </div>

    <div style="padding:0.95rem;border-radius:10px;background:var(--bg-subtle);border:1px solid var(--border-subtle);margin-bottom:1.1rem;">
      <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:0.5rem;margin-bottom:0.45rem;">
        <div>
          <strong style="font-size:0.88rem;">${escapeHtml(review.reviewer)}</strong>
          <span style="font-size:0.78rem;color:var(--text-muted);margin-left:0.4rem;font-family:var(--font-mono);">${escapeHtml(
            review.date
          )}</span>
        </div>
        <div style="display:flex;align-items:center;gap:0.5rem;">
          <span>${renderStars(review.rating)}</span>
          <span class="badge ${badgeClass}"><span class="risk-dot ${dotClass}"></span>${escapeHtml(
    review.riskLabel
  )}</span>
        </div>
      </div>
      <p style="font-size:0.88rem;color:var(--text-primary);font-style:italic;">"${escapeHtml(
        review.text
      )}"</p>
    </div>

    <div style="margin-bottom:1.1rem;">
      <h4 style="font-size:0.75rem;font-weight:700;color:var(--text-muted);margin-bottom:0.5rem;text-transform:uppercase;letter-spacing:0.04em;">
        Faktor yang Memengaruhi Skor
      </h4>
      ${flagsHtml}
    </div>

    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:0.55rem;padding:0.8rem;border-radius:10px;background:var(--bg-subtle);border:1px solid var(--border-subtle);font-size:0.76rem;margin-bottom:1rem;">
      <div>
        <div style="color:var(--text-muted);">Detail Pengalaman</div>
        <div style="font-weight:700;font-family:var(--font-mono);color:var(--viz-blue);">${
          review.specificityScore ?? 0
        }%</div>
      </div>
      <div>
        <div style="color:var(--text-muted);">Panjang Kalimat</div>
        <div style="font-weight:700;font-family:var(--font-mono);color:var(--text-primary);">${
          review.wordCount
        } kata</div>
      </div>
      <div>
        <div style="color:var(--text-muted);">Nada Kalimat</div>
        <div style="font-weight:700;color:${
          review.sentiment === 'positive'
            ? 'var(--risk-low-ink)'
            : review.sentiment === 'negative'
            ? 'var(--risk-high-ink)'
            : 'var(--text-secondary)'
        };">${sentimentIndo}</div>
      </div>
    </div>

    <div style="font-size:0.79rem;color:var(--text-secondary);border-left:2px solid var(--bg-inverse);padding:0.45rem 0.85rem;">
      Skor ini menunjukkan tingkat kewajaran pola ulasan sebagai bahan pertimbangan sebelum membeli, bukan vonis mutlak.
    </div>
  `;

  openModal(html);
}
function openShareReportModal(report) {
  const shareUrl = `${window.location.origin}/?report=${encodeURIComponent(report.id)}`;
  const summaryText = [
    `Laporan Ulasan Produk — Review Detector`,
    `Produk: ${report.productName} (${report.marketplace})`,
    `- Skor Kepercayaan: ${report.metrics.productTrustScore}/100 (${report.metrics.riskLabel})`,
    `- Rating Toko: ${report.metrics.originalRating} -> Rating Terkoreksi: ${report.metrics.adjustedRating}`,
    `- Ulasan Perlu Dicek: ${report.metrics.suspiciousReviewsCount} dari ${report.metrics.totalReviews} ulasan`,
    `- Kesimpulan: ${report.aiInsights?.verdictHeadline || ''}`,
    `Lihat hasil lengkap: ${shareUrl}`,
  ].join('\n');

  const html = `
    <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:1rem;margin-bottom:1.1rem;">
      <div>
        <div style="font-size:0.72rem;text-transform:uppercase;letter-spacing:0.06em;color:var(--text-muted);font-weight:600;">
          Bagikan Hasil
        </div>
        <h3 style="font-size:1.15rem;font-weight:700;margin-top:0.15rem;">Bagikan Laporan Produk</h3>
      </div>
      <button type="button" class="btn btn-secondary btn-sm" data-close-modal>${ICONS.close} Tutup</button>
    </div>

    <div class="form-group">
      <label class="form-label">Tautan Laporan</label>
      <div style="display:flex;gap:0.5rem;">
        <input type="text" class="form-control" id="shareLinkInput" value="${escapeHtml(
          shareUrl
        )}" readonly />
        <button type="button" class="btn btn-primary" id="copyShareLinkBtn">Salin</button>
      </div>
    </div>

    <div class="form-group" style="margin-bottom:0;">
      <label class="form-label">Ringkasan Teks</label>
      <textarea class="form-control" id="shareSummaryText" rows="6" readonly>${escapeHtml(
        summaryText
      )}</textarea>
      <div style="margin-top:0.55rem;display:flex;justify-content:flex-end;">
        <button type="button" class="btn btn-secondary btn-sm" id="copyShareSummaryBtn">Salin Ringkasan</button>
      </div>
    </div>
  `;

  openModal(html);

  document.getElementById('copyShareLinkBtn')?.addEventListener('click', () => {
    navigator.clipboard.writeText(shareUrl);
    showToast('Tautan laporan berhasil disalin.');
  });

  document.getElementById('copyShareSummaryBtn')?.addEventListener('click', () => {
    navigator.clipboard.writeText(summaryText);
    showToast('Ringkasan berhasil disalin.');
  });
}

function renderLandingView({ onNavigate }) {
  const root = document.getElementById('appViewRoot');
  if (!root) return;

  const logosRow = Object.values(MARKETPLACE_LOGOS)
    .map((mp) => `<span class="mp-chip">${mp.svg}<span>${mp.name}</span></span>`)
    .join('');

  root.innerHTML = `
    <section class="hero-minimal anim-card">
      <div class="hero-kicker">
        ${ICONS.shield}
        <span>Analisis Kredibilitas Ulasan E-Commerce</span>
      </div>

      <h1 class="hero-title">
        See through the stars before you buy.
      </h1>

      <p class="hero-desc">
        Rating tinggi belum tentu menggambarkan pengalaman pembeli sebenarnya. Tempel link produk untuk memeriksa kewajaran ulasan dan hal penting yang perlu Anda ketahui sebelum membeli.
      </p>

      <div class="hero-note">
        <strong>Cara kerja kami:</strong> Review Detector tidak menghakimi ulasan secara mutlak. Aplikasi ini membantu melihat seberapa wajar pola ulasannya dan bagian mana yang perlu dicek ulang sebelum checkout.
      </div>

      <div style="display:flex;align-items:center;justify-content:center;gap:0.75rem;flex-wrap:wrap;margin-bottom:2rem;">
        <button type="button" class="btn btn-primary btn-lg" id="landingStartAnalyzeBtn">
          ${ICONS.link}
          <span>Periksa Link Produk</span>
          ${ICONS.arrowRight}
        </button>
        <button type="button" class="btn btn-secondary btn-lg" id="landingHistoryBtn">
          ${ICONS.clock}
          <span>Lihat Riwayat</span>
        </button>
      </div>

      <div style="display:flex;align-items:center;justify-content:center;gap:0.45rem;flex-wrap:wrap;">
        <span style="font-size:0.75rem;color:var(--text-muted);margin-right:0.2rem;">Mendukung:</span>
        ${logosRow}
      </div>
    </section>

    <section style="margin-bottom:2rem;">
      <div class="grid-3">
        <div class="card card-interactive anim-card anim-delay-1">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:0.85rem;">
            <span class="badge badge-info">Isi Teks &middot; 5 Sinyal</span>
            <span style="color:var(--text-muted);">${ICONS.fileText}</span>
          </div>
          <h3 class="card-title" style="margin-bottom:0.35rem;">Pemeriksaan Teks</h3>
          <p class="card-subtitle" style="line-height:1.6;">
            Menemukan ulasan yang terlalu singkat, membahas fitur yang tidak sesuai produk, pujian berlebihan, atau keluhan di balik rating tinggi.
          </p>
        </div>

        <div class="card card-interactive anim-card anim-delay-2">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:0.85rem;">
            <span class="badge badge-moderate">Perilaku &middot; 4 Sinyal</span>
            <span style="color:var(--text-muted);">${ICONS.chart}</span>
          </div>
          <h3 class="card-title" style="margin-bottom:0.35rem;">Pola Perilaku</h3>
          <p class="card-subtitle" style="line-height:1.6;">
            Melihat lonjakan ulasan dalam 24–72 jam, rating 5 bintang seragam, akun baru yang langsung aktif, serta pengulas tanpa riwayat toko lain.
          </p>
        </div>

        <div class="card card-interactive anim-card anim-delay-3">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:0.85rem;">
            <span class="badge badge-high">Koordinasi &middot; 3 Sinyal</span>
            <span style="color:var(--text-muted);">${ICONS.layers}</span>
          </div>
          <h3 class="card-title" style="margin-bottom:0.35rem;">Indikasi Koordinasi</h3>
          <p class="card-subtitle" style="line-height:1.6;">
            Mendeteksi kalimat yang hampir sama antar-pembeli, kelompok akun serupa, serta ulasan yang masuk berdekatan di jam yang sama.
          </p>
        </div>
      </div>
    </section>

    <section class="card anim-card anim-delay-4">
      <div class="card-header" style="margin-bottom:1rem;">
        <div>
          <h3 class="card-title">Panduan Skor Kepercayaan</h3>
          <p class="card-subtitle">Setiap produk dinilai dari 0 sampai 100 berdasarkan kewajaran pola ulasannya.</p>
        </div>
      </div>

      <div class="grid-3">
        <div style="padding:0.9rem 1rem;border-radius:10px;background:var(--risk-low-bg);border:1px solid var(--risk-low-border);">
          <div class="trust-legend-row" style="font-weight:700;font-size:0.86rem;color:var(--risk-low-ink);margin-bottom:0.2rem;">
            <span class="risk-dot risk-dot-low"></span>
            <span>80–100 &middot; Low Risk</span>
          </div>
          <p style="font-size:0.79rem;color:var(--text-secondary);">
            Sebagian besar ulasan tampak alami, menceritakan pemakaian nyata, dan sesuai dengan rating bintangnya.
          </p>
        </div>

        <div style="padding:0.9rem 1rem;border-radius:10px;background:var(--risk-moderate-bg);border:1px solid var(--risk-moderate-border);">
          <div class="trust-legend-row" style="font-weight:700;font-size:0.86rem;color:var(--risk-moderate-ink);margin-bottom:0.2rem;">
            <span class="risk-dot risk-dot-moderate"></span>
            <span>60–79 &middot; Moderate Risk</span>
          </div>
          <p style="font-size:0.79rem;color:var(--text-secondary);">
            Ada beberapa ulasan umum atau pola kurang wajar. Sebaiknya baca komentar dengan skor tinggi sebelum membeli.
          </p>
        </div>

        <div style="padding:0.9rem 1rem;border-radius:10px;background:var(--risk-high-bg);border:1px solid var(--risk-high-border);">
          <div class="trust-legend-row" style="font-weight:700;font-size:0.86rem;color:var(--risk-high-ink);margin-bottom:0.2rem;">
            <span class="risk-dot risk-dot-high"></span>
            <span>0–59 &middot; High Risk</span>
          </div>
          <p style="font-size:0.79rem;color:var(--text-secondary);">
            Banyak tanda ketidakwajaran seperti kalimat mirip, lonjakan ulasan singkat, atau rating tidak cocok dengan isi teks.
          </p>
        </div>
      </div>
    </section>
  `;

  document.getElementById('landingStartAnalyzeBtn')?.addEventListener('click', () => {
    onNavigate('analyzer');
  });

  document.getElementById('landingHistoryBtn')?.addEventListener('click', () => {
    onNavigate('history');
  });
}

function renderAnalyzerView({ onAnalysisComplete }) {
  const root = document.getElementById('appViewRoot');
  if (!root) return;

  const draft = appState.analyzerDraft;
  const marketplaceChipsHtml = Object.values(MARKETPLACE_LOGOS)
    .map((mp) => `<span class="mp-chip">${mp.svg}<span>${mp.name}</span></span>`)
    .join('');

  root.innerHTML = `
    <div style="max-width:760px;margin:0.75rem auto 0;">
      <div class="anim-card" style="margin-bottom:1.5rem;">
        <div style="font-size:0.74rem;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:var(--viz-blue);margin-bottom:0.35rem;">
          Pemindai Ulasan Produk
        </div>
        <h2 style="font-size:1.75rem;font-weight:800;letter-spacing:-0.025em;margin-bottom:0.35rem;">
          Periksa Link Produk
        </h2>
        <p style="color:var(--text-secondary);font-size:0.92rem;">
          Tempel tautan produk yang ingin Anda cek. Sistem akan mengambil ulasannya dan memeriksa pola keaslian dari sisi teks, perilaku, dan koordinasi.
        </p>
      </div>

      <div class="card anim-card anim-delay-1" style="margin-bottom:1.25rem;">
        <div class="form-group">
          <label class="form-label" for="inputProductUrl">
            Tautan Produk
          </label>
          <input
            type="url"
            id="inputProductUrl"
            class="form-control"
            style="padding:0.9rem 1.05rem;font-size:0.95rem;"
            placeholder="Tempel link dari Shopee, Tokopedia, atau marketplace lain..."
            value="${escapeHtml(draft.productUrl)}"
            autofocus
          />

          <div style="margin-top:0.85rem;">
            <div style="font-size:0.74rem;color:var(--text-muted);margin-bottom:0.45rem;font-weight:500;">
              Marketplace yang didukung:
            </div>
            <div style="display:flex;align-items:center;gap:0.45rem;flex-wrap:wrap;">
              ${marketplaceChipsHtml}
            </div>
          </div>
        </div>

        <div id="scanProgressBox" style="display:none;margin-bottom:1.15rem;padding:0.95rem 1.05rem;border-radius:10px;background:var(--viz-blue-bg);border:1px solid var(--viz-blue-border);">
          <div style="font-weight:600;font-size:0.86rem;color:var(--viz-blue);margin-bottom:0.2rem;" id="scanProgressTitle">
            Mengambil data produk dan ulasan...
          </div>
          <div style="font-size:0.78rem;color:var(--text-secondary);" id="scanProgressStep">
            Memeriksa isi ulasan, pola waktu, dan kesamaan kalimat...
          </div>
        </div>

        <button
          type="button"
          class="btn btn-primary btn-lg"
          id="submitScanAnalyzeBtn"
          style="width:100%;"
        >
          ${ICONS.search}
          <span>Periksa Ulasan Sekarang</span>
        </button>
      </div>

      <div class="grid-3 anim-card anim-delay-2">
        <div class="card-subtle" style="padding:1.05rem 1.15rem;">
          <div style="font-size:0.72rem;font-weight:700;text-transform:uppercase;color:var(--viz-blue);margin-bottom:0.4rem;">
            Isi Teks (5)
          </div>
          <ul style="padding-left:1rem;font-size:0.78rem;color:var(--text-secondary);display:flex;flex-direction:column;gap:0.22rem;">
            <li>Terlalu generik</li>
            <li>Detail tidak masuk akal</li>
            <li>Emosi berlebihan</li>
            <li>Tidak menyebut pengalaman</li>
            <li>Rating tidak cocok isi</li>
          </ul>
        </div>

        <div class="card-subtle" style="padding:1.05rem 1.15rem;">
          <div style="font-size:0.72rem;font-weight:700;text-transform:uppercase;color:var(--risk-moderate-ink);margin-bottom:0.4rem;">
            Perilaku (4)
          </div>
          <ul style="padding-left:1rem;font-size:0.78rem;color:var(--text-secondary);display:flex;flex-direction:column;gap:0.22rem;">
            <li>Review burst (24–72 jam)</li>
            <li>Rating seragam 5 bintang</li>
            <li>Reviewer baru aktif</li>
            <li>Reviewer hanya satu toko</li>
          </ul>
        </div>

        <div class="card-subtle" style="padding:1.05rem 1.15rem;">
          <div style="font-size:0.72rem;font-weight:700;text-transform:uppercase;color:var(--risk-high-ink);margin-bottom:0.4rem;">
            Koordinasi (3)
          </div>
          <ul style="padding-left:1rem;font-size:0.78rem;color:var(--text-secondary);display:flex;flex-direction:column;gap:0.22rem;">
            <li>Review sangat mirip</li>
            <li>Kelompok reviewer sama</li>
            <li>Pola waktu serentak</li>
          </ul>
        </div>
      </div>
    </div>
  `;

  const urlInput = document.getElementById('inputProductUrl');
  urlInput?.addEventListener('input', () => {
    draft.productUrl = urlInput.value;
  });

  const runScanAndAnalyze = async () => {
    const rawUrl = urlInput?.value.trim() || '';
    draft.productUrl = rawUrl;

    if (!rawUrl) {
      showToast('Masukkan link produk terlebih dahulu.');
      urlInput?.focus();
      return;
    }

    const btn = document.getElementById('submitScanAnalyzeBtn');
    const progressBox = document.getElementById('scanProgressBox');
    const progressTitle = document.getElementById('scanProgressTitle');
    const progressStep = document.getElementById('scanProgressStep');

    try {
      if (btn) {
        btn.disabled = true;
        btn.innerHTML = `${ICONS.clock}<span>Sedang Memeriksa Ulasan...</span>`;
      }
      if (progressBox) progressBox.style.display = 'block';
      if (progressTitle) {
        progressTitle.textContent = 'Mengambil informasi produk dan daftar ulasan...';
      }
      if (progressStep) {
        progressStep.textContent = 'Memeriksa 12 sinyal pada isi teks, perilaku, dan koordinasi...';
      }

      setTimeout(() => {
        if (btn?.disabled && progressTitle) {
          progressTitle.textContent =
            'Menghitung skor kepercayaan, rating terkoreksi, dan ringkasan keluhan...';
        }
      }, 850);

      const report = await apiClient.analyzeProduct({
        productUrl: rawUrl,
      });

      onAnalysisComplete(report);
    } catch (err) {
      showToast(err.message);
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = `${ICONS.search}<span>Periksa Ulasan Sekarang</span>`;
      }
      if (progressBox) progressBox.style.display = 'none';
    }
  };

  document.getElementById('submitScanAnalyzeBtn')?.addEventListener('click', runScanAndAnalyze);
  urlInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      runScanAndAnalyze();
    }
  });
}

function renderReportView({ report, onNavigate }) {
  const root = document.getElementById('appViewRoot');
  if (!root) return;

  if (!report) {
    root.innerHTML = `
      <div class="card anim-card" style="text-align:center;padding:3.25rem 1.5rem;max-width:540px;margin:1.5rem auto;">
        <div style="margin-bottom:0.75rem;color:var(--text-muted);">${ICONS.fileText}</div>
        <h3 style="font-size:1.15rem;font-weight:700;margin-bottom:0.4rem;">Belum Ada Laporan Dibuka</h3>
        <p style="color:var(--text-secondary);font-size:0.88rem;margin-bottom:1.5rem;">
          Masukkan link produk untuk mulai memeriksa ulasannya, atau buka laporan dari daftar riwayat.
        </p>
        <div style="display:flex;justify-content:center;gap:0.65rem;">
          <button type="button" class="btn btn-primary" id="emptyGoAnalyzeBtn">Periksa Produk</button>
          <button type="button" class="btn btn-secondary" id="emptyGoHistoryBtn">Lihat Riwayat</button>
        </div>
      </div>
    `;
    document.getElementById('emptyGoAnalyzeBtn')?.addEventListener('click', () => onNavigate('analyzer'));
    document.getElementById('emptyGoHistoryBtn')?.addEventListener('click', () => onNavigate('history'));
    return;
  }

  const m = report.metrics || {};
  const ai = report.aiInsights || {};
  const themes = report.themes || { complaints: [], praises: [] };
  const allFlags = report.redFlagBreakdown || [];
  const layers = report.layerBreakdown || [];

  const riskBadgeClass =
    m.riskLevel === 'low'
      ? 'badge-low'
      : m.riskLevel === 'moderate'
      ? 'badge-moderate'
      : 'badge-high';

  const riskDotClass =
    m.riskLevel === 'low'
      ? 'risk-dot-low'
      : m.riskLevel === 'moderate'
      ? 'risk-dot-moderate'
      : 'risk-dot-high';

  const adjustedColor =
    m.ratingDelta <= -0.8
      ? 'var(--risk-high-ink)'
      : m.ratingDelta <= -0.25
      ? 'var(--risk-moderate-ink)'
      : 'var(--risk-low-ink)';

  const verdictBorderColor =
    m.riskLevel === 'low'
      ? 'var(--risk-low-accent)'
      : m.riskLevel === 'moderate'
      ? 'var(--risk-moderate-accent)'
      : 'var(--risk-high-accent)';

  const zScorePct = Math.min(100, Math.round(((m.peakBurstZScore || 0) / 3) * 100));
  const zScoreColor =
    (m.peakBurstZScore || 0) >= 1.5
      ? 'var(--risk-high-accent)'
      : (m.peakBurstZScore || 0) >= 1.0
      ? 'var(--risk-moderate-accent)'
      : 'var(--risk-low-accent)';

  const ttrPct = Math.min(100, Math.round((m.avgLexicalDiversity || 0) * 100));
  const exportCsvUrl = apiClient.getExportCsvUrl(report.id);

  const teksHits = layers.find((l) => l.id === 'teks')?.totalHits || 0;
  const perilakuHits = layers.find((l) => l.id === 'perilaku')?.totalHits || 0;
  const koordinasiHits = layers.find((l) => l.id === 'koordinasi')?.totalHits || 0;

  root.innerHTML = `
    <div class="card anim-card" style="margin-bottom:1.25rem;">
      <div style="display:flex;align-items:flex-start;justify-content:space-between;flex-wrap:wrap;gap:1.15rem;">
        <div style="max-width:680px;">
          <div style="display:flex;align-items:center;flex-wrap:wrap;gap:0.45rem;margin-bottom:0.55rem;">
            ${renderMarketplaceBadge(report.marketplace)}
            <span class="badge ${riskBadgeClass}">
              <span class="risk-dot ${riskDotClass}"></span>
              ${escapeHtml(m.riskLabel)} (${m.productTrustScore}/100)
            </span>
            <span class="badge badge-info">${escapeHtml(ai.poweredBy || 'Analisis Otomatis')}</span>
          </div>
          <h2 style="font-size:1.45rem;font-weight:800;letter-spacing:-0.025em;line-height:1.3;">
            ${escapeHtml(report.productName)}
          </h2>
        </div>

        <div style="display:flex;align-items:center;flex-wrap:wrap;gap:0.45rem;">
          ${
            report.productUrl
              ? `<a href="${escapeHtml(
                  report.productUrl
                )}" target="_blank" rel="noopener noreferrer" class="btn btn-secondary btn-sm" title="Buka halaman produk">
                  ${ICONS.externalLink}
                  <span>Buka Produk</span>
                </a>`
              : ''
          }
          <button type="button" class="btn btn-primary btn-sm" id="reportShareBtn">
            ${ICONS.share}
            <span>Bagikan</span>
          </button>
          <a href="${exportCsvUrl}" class="btn btn-secondary btn-sm" download>
            ${ICONS.download}
            <span>Unduh CSV</span>
          </a>
          <button type="button" class="btn btn-secondary btn-sm" id="reportNewAnalysisBtn">
            ${ICONS.plus}
            <span>Cek Lainnya</span>
          </button>
        </div>
      </div>
    </div>

    <div class="report-hero-grid">
      <div class="card anim-card anim-delay-1">
        <div class="card-header" style="margin-bottom:0.85rem;">
          <div>
            <h3 class="card-title">Skor Kepercayaan</h3>
            <p class="card-subtitle">Nilai rata-rata dari 0 sampai 100</p>
          </div>
          <span class="badge ${riskBadgeClass}">
            <span class="risk-dot ${riskDotClass}"></span>
            ${escapeHtml(m.riskLabel)}
          </span>
        </div>

        <div class="trust-gauge-wrap">
          ${renderTrustScoreGauge(m.productTrustScore, m.riskLevel)}
          <div class="trust-legend">
            <div class="trust-legend-row">
              <span class="risk-dot risk-dot-low"></span>
              <span style="font-family:var(--font-mono);font-weight:700;color:var(--risk-low-ink);">80–100</span>
              <span style="color:var(--text-secondary);">Low Risk</span>
            </div>
            <div class="trust-legend-row">
              <span class="risk-dot risk-dot-moderate"></span>
              <span style="font-family:var(--font-mono);font-weight:700;color:var(--risk-moderate-ink);">60–79</span>
              <span style="color:var(--text-secondary);">Moderate Risk</span>
            </div>
            <div class="trust-legend-row">
              <span class="risk-dot risk-dot-high"></span>
              <span style="font-family:var(--font-mono);font-weight:700;color:var(--risk-high-ink);">0–59</span>
              <span style="color:var(--text-secondary);">High Risk</span>
            </div>
          </div>
        </div>
      </div>

      <div class="card anim-card anim-delay-2">
        <div class="card-header" style="margin-bottom:0.85rem;">
          <div>
            <h3 class="card-title">Perbandingan Rating</h3>
            <p class="card-subtitle">Ulasan mencurigakan diberi bobot lebih kecil</p>
          </div>
        </div>

        <div class="rating-compare-box">
          <div class="rating-col">
            <div class="rating-col-label">Rating Toko</div>
            <div class="rating-col-val" style="color:var(--viz-amber);">${m.originalRating}</div>
            <div style="font-size:0.71rem;color:var(--text-muted);">Rata-rata asli</div>
          </div>
          <div class="rating-arrow">${ICONS.arrowRight}</div>
          <div class="rating-col">
            <div class="rating-col-label">Terkoreksi</div>
            <div class="rating-col-val" style="color:${adjustedColor};">${m.adjustedRating}</div>
            <div style="font-size:0.71rem;color:${adjustedColor};font-weight:700;font-family:var(--font-mono);">
              ${m.ratingDelta > 0 ? `+${m.ratingDelta}` : m.ratingDelta}
            </div>
          </div>
        </div>

        <div style="display:flex;align-items:center;justify-content:space-between;padding:0.55rem 0.8rem;border-radius:8px;background:${
          m.suspiciousRatio >= 40
            ? 'var(--risk-high-bg)'
            : m.suspiciousRatio >= 20
            ? 'var(--risk-moderate-bg)'
            : 'var(--risk-low-bg)'
        };border:1px solid ${
          m.suspiciousRatio >= 40
            ? 'var(--risk-high-border)'
            : m.suspiciousRatio >= 20
            ? 'var(--risk-moderate-border)'
            : 'var(--risk-low-border)'
        };font-size:0.8rem;">
          <span style="color:var(--text-secondary);font-weight:500;">Perlu dicek ulang</span>
          <strong style="font-family:var(--font-mono);color:${
            m.suspiciousRatio >= 40
              ? 'var(--risk-high-ink)'
              : m.suspiciousRatio >= 20
              ? 'var(--risk-moderate-ink)'
              : 'var(--risk-low-ink)'
          };">
            ${m.suspiciousReviewsCount} dari ${m.totalReviews} (${m.suspiciousRatio}%)
          </strong>
        </div>
      </div>

      <div class="card anim-card anim-delay-3" style="border-top:3px solid ${verdictBorderColor};">
        <div class="card-header" style="margin-bottom:0.55rem;">
          <div>
            <div style="font-size:0.7rem;text-transform:uppercase;letter-spacing:0.05em;color:var(--text-muted);font-weight:600;">
              Kesimpulan Cepat
            </div>
            <h3 class="card-title" style="margin-top:0.15rem;">
              ${escapeHtml(ai.verdictHeadline || 'Ringkasan Pola Ulasan')}
            </h3>
          </div>
        </div>

        <p style="font-size:0.83rem;color:var(--text-secondary);margin-bottom:0.8rem;">
          ${escapeHtml(ai.patternExplanation || '')}
        </p>

        <div style="font-size:0.79rem;padding:0.7rem 0.85rem;border-radius:8px;background:var(--bg-subtle);border-left:3px solid ${verdictBorderColor};">
          <strong style="color:var(--text-primary);display:block;margin-bottom:0.25rem;">
            Perhatikan sebelum membeli:
          </strong>
          <ul style="padding-left:1rem;color:var(--text-secondary);display:flex;flex-direction:column;gap:0.22rem;">
            ${(ai.whatToWatchBeforeBuying || [])
              .map((tip) => `<li>${escapeHtml(tip)}</li>`)
              .join('')}
          </ul>
        </div>
      </div>
    </div>

    <div class="grid-4 anim-card anim-delay-3" style="margin-bottom:1.25rem;">
      <div class="stat-card">
        <div class="stat-card-label">Detail Pengalaman</div>
        <div class="stat-card-value" style="color:var(--viz-blue);">${m.avgSpecificityScore ?? 0}%</div>
        <div class="stat-progress-track">
          <div class="stat-progress-fill" style="width:${m.avgSpecificityScore ?? 0}%;background:var(--viz-blue);"></div>
        </div>
        <div class="stat-card-foot">Ulasan dengan cerita pemakaian</div>
      </div>

      <div class="stat-card">
        <div class="stat-card-label">Variasi Bahasa</div>
        <div class="stat-card-value" style="color:var(--viz-teal);">${ttrPct}%</div>
        <div class="stat-progress-track">
          <div class="stat-progress-fill" style="width:${ttrPct}%;background:var(--viz-teal);"></div>
        </div>
        <div class="stat-card-foot">Keberagaman pilihan kata</div>
      </div>

      <div class="stat-card">
        <div class="stat-card-label">Indeks Lonjakan</div>
        <div class="stat-card-value" style="color:${zScoreColor};">${m.peakBurstZScore ?? 0}</div>
        <div class="stat-progress-track">
          <div class="stat-progress-fill" style="width:${zScorePct}%;background:${zScoreColor};"></div>
        </div>
        <div class="stat-card-foot">Kepadatan ulasan dalam 1–3 hari</div>
      </div>

      <div class="stat-card">
        <div class="stat-card-label">Dominasi Bintang 5</div>
        <div class="stat-card-value" style="color:var(--viz-amber);">${m.fiveStarConcentration ?? 0}%</div>
        <div class="stat-progress-track">
          <div class="stat-progress-fill" style="width:${m.fiveStarConcentration ?? 0}%;background:var(--viz-amber);"></div>
        </div>
        <div class="stat-card-foot">Jumlah sampel: ${escapeHtml(m.sampleConfidence || 'Standar')}</div>
      </div>
    </div>

    <div class="card anim-card anim-delay-4" style="margin-bottom:1.25rem;">
      <div class="card-header" style="margin-bottom:0.85rem;">
        <div>
          <h3 class="card-title">${ICONS.layers} Rincian Sinyal yang Diperiksa</h3>
          <p class="card-subtitle">${escapeHtml(ai.redFlagExplanation || '')}</p>
        </div>
      </div>

      <div class="layer-tabs" id="layerFilterTabs">
        <button type="button" class="layer-tab-btn active" data-layer-tab="all">
          Semua (12)
        </button>
        <button type="button" class="layer-tab-btn" data-layer-tab="teks">
          Isi Teks (${teksHits} temuan)
        </button>
        <button type="button" class="layer-tab-btn" data-layer-tab="perilaku">
          Perilaku (${perilakuHits} temuan)
        </button>
        <button type="button" class="layer-tab-btn" data-layer-tab="koordinasi">
          Koordinasi (${koordinasiHits} temuan)
        </button>
      </div>

      <div class="grid-3" id="layerSignalsGrid"></div>
    </div>

    <div class="grid-2" style="margin-bottom:1.25rem;">
      <div class="card">
        <div class="card-header">
          <div>
            <h3 class="card-title" style="color:var(--risk-high-ink);">${ICONS.alert} Keluhan yang Sering Muncul</h3>
            <p class="card-subtitle">Masalah yang berulang kali disebut pembeli</p>
          </div>
        </div>

        <div class="theme-list">
          ${
            themes.complaints && themes.complaints.length > 0
              ? themes.complaints
                  .map(
                    (c) => `
                <div class="theme-item theme-item-complaint">
                  <div class="theme-item-header">
                    <span>${escapeHtml(c.theme)}</span>
                    <span class="badge badge-high">${c.count} ulasan</span>
                  </div>
                  ${
                    c.examples && c.examples.length > 0
                      ? `<div class="theme-quote">"${escapeHtml(c.examples[0])}"</div>`
                      : ''
                  }
                </div>
              `
                  )
                  .join('')
              : `<div style="color:var(--text-muted);font-size:0.84rem;padding:0.5rem 0;">Tidak ada keluhan berulang yang menonjol.</div>`
          }
        </div>
      </div>

      <div class="card">
        <div class="card-header">
          <div>
            <h3 class="card-title" style="color:var(--risk-low-ink);">${ICONS.check} Hal yang Sering Dipuji</h3>
            <p class="card-subtitle">Kelebihan produk yang sering dirasakan pembeli</p>
          </div>
        </div>

        <div class="theme-list">
          ${
            themes.praises && themes.praises.length > 0
              ? themes.praises
                  .map(
                    (p) => `
                <div class="theme-item theme-item-praise">
                  <div class="theme-item-header">
                    <span>${escapeHtml(p.theme)}</span>
                    <span class="badge badge-low">${p.count} ulasan</span>
                  </div>
                  ${
                    p.examples && p.examples.length > 0
                      ? `<div class="theme-quote">"${escapeHtml(p.examples[0])}"</div>`
                      : ''
                  }
                </div>
              `
                  )
                  .join('')
              : `<div style="color:var(--text-muted);font-size:0.84rem;padding:0.5rem 0;">Belum ada pujian khusus yang dominan.</div>`
          }
        </div>
      </div>
    </div>

    <div class="grid-2" style="margin-bottom:1.25rem;">
      <div class="card">
        <div class="card-header">
          <div>
            <h3 class="card-title">${ICONS.chart} Pola Waktu Ulasan</h3>
            <p class="card-subtitle">Puncak kepadatan ${m.maxReviewsIn48h || 0} ulasan dalam 1–3 hari</p>
          </div>
        </div>
        ${renderDailyTimelineChart(m.dailyTimeline)}
      </div>

      <div class="card">
        <div class="card-header">
          <div>
            <h3 class="card-title">Sebaran Rating &amp; Nada Ulasan</h3>
            <p class="card-subtitle">Perbandingan jumlah bintang dan sentimen kalimat</p>
          </div>
        </div>
        ${renderStarDistributionBars(m.starDistribution, m.totalReviews)}

        <div class="grid-3" style="gap:0.65rem;margin-top:1rem;padding-top:0.85rem;border-top:1px solid var(--border-subtle);font-size:0.78rem;">
          <div>
            <span style="color:var(--text-muted);display:block;">Rata-rata Panjang</span>
            <strong style="font-family:var(--font-mono);">${m.avgWordCount} kata</strong>
          </div>
          <div>
            <span style="color:var(--text-muted);display:block;">Kalimat Mirip</span>
            <strong style="font-family:var(--font-mono);color:${
              m.duplicateCount > 0 ? 'var(--risk-high-ink)' : 'var(--text-primary)'
            };">${m.duplicateCount} ulasan</strong>
          </div>
          <div>
            <span style="color:var(--text-muted);display:block;">Pos / Net / Neg</span>
            <strong style="font-family:var(--font-mono);">
              <span style="color:var(--risk-low-ink);">${m.sentimentDistribution?.positive || 0}</span> /
              <span style="color:var(--text-secondary);">${m.sentimentDistribution?.neutral || 0}</span> /
              <span style="color:var(--risk-high-ink);">${m.sentimentDistribution?.negative || 0}</span>
            </strong>
          </div>
        </div>
      </div>
    </div>

    <div class="card">
      <div class="card-header">
        <div>
          <h3 class="card-title">Daftar Ulasan</h3>
          <p class="card-subtitle">
            Klik tombol Alasan di setiap baris untuk melihat rincian penilaiannya.
          </p>
        </div>
      </div>

      <div class="table-controls">
        <div class="filter-pills" id="reviewFilterPills">
          <button type="button" class="filter-pill active" data-filter="all">
            Semua (${report.reviews.length})
          </button>
          <button type="button" class="filter-pill" data-filter="suspicious">
            Perlu Dicek (${m.suspiciousReviewsCount})
          </button>
          <button type="button" class="filter-pill" data-filter="clean">
            Wajar (${m.cleanReviewsCount})
          </button>
          <button type="button" class="filter-pill" data-filter="layer:teks">
            Isi Teks
          </button>
          <button type="button" class="filter-pill" data-filter="layer:perilaku">
            Perilaku
          </button>
          <button type="button" class="filter-pill" data-filter="layer:koordinasi">
            Koordinasi
          </button>
        </div>

        <div style="min-width:220px;">
          <input
            type="search"
            id="reviewSearchInput"
            class="form-control"
            style="padding:0.42rem 0.8rem;font-size:0.83rem;"
            placeholder="Cari isi ulasan..."
          />
        </div>
      </div>

      <div class="table-responsive">
        <table class="review-table">
          <thead>
            <tr>
              <th style="width:45px;">No</th>
              <th style="width:140px;">Pengulas</th>
              <th style="width:115px;">Rating</th>
              <th>Isi Ulasan</th>
              <th style="width:225px;">Tanda Terdeteksi</th>
              <th style="width:98px;">Skor</th>
              <th style="width:86px;">Rincian</th>
            </tr>
          </thead>
          <tbody id="reportReviewsTableBody"></tbody>
        </table>
      </div>
    </div>
  `;

  let activeLayerTab = 'all';
  const renderSignalsGrid = () => {
    const grid = document.getElementById('layerSignalsGrid');
    if (!grid) return;

    const list =
      activeLayerTab === 'all'
        ? allFlags
        : allFlags.filter((f) => f.layer === activeLayerTab);

    grid.innerHTML = list
      .map((rf) => {
        const triggerClass =
          rf.count > 0
            ? rf.badgeTone === 'alert'
              ? 'triggered-alert'
              : rf.badgeTone === 'warning'
              ? 'triggered-warning'
              : 'triggered-neutral'
            : '';
        const countColor =
          rf.count > 0
            ? rf.badgeTone === 'alert'
              ? 'var(--risk-high-ink)'
              : rf.badgeTone === 'warning'
              ? 'var(--risk-moderate-ink)'
              : 'var(--text-primary)'
            : 'var(--text-muted)';

        return `
          <div class="red-flag-item ${triggerClass}">
            <div style="min-width:0;">
              <div style="display:flex;align-items:center;flex-wrap:wrap;gap:0.3rem;margin-bottom:0.32rem;">
                <span class="badge">${escapeHtml(rf.layerLabel || 'Sinyal')}</span>
                <span class="badge ${
                  rf.count > 0 ? `badge-${escapeHtml(rf.badgeTone || 'neutral')}` : ''
                }">Risiko: ${escapeHtml(rf.riskWeight || 'Sedang')}</span>
              </div>
              <div style="font-weight:700;font-size:0.86rem;color:var(--text-primary);margin-bottom:0.18rem;">
                ${escapeHtml(rf.label)}
              </div>
              <p style="font-size:0.76rem;color:var(--text-secondary);line-height:1.45;">
                ${escapeHtml(rf.shortDesc || rf.example)}
              </p>
            </div>
            <div style="text-align:right;flex-shrink:0;">
              <div style="font-size:1.25rem;font-weight:800;font-family:var(--font-mono);color:${countColor};">
                ${rf.count}
              </div>
              <div style="font-size:0.68rem;color:var(--text-muted);">ulasan</div>
            </div>
          </div>
        `;
      })
      .join('');
  };

  renderSignalsGrid();

  document.querySelectorAll('#layerFilterTabs .layer-tab-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      document
        .querySelectorAll('#layerFilterTabs .layer-tab-btn')
        .forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      activeLayerTab = btn.getAttribute('data-layer-tab') || 'all';
      renderSignalsGrid();
    });
  });

  document.getElementById('reportShareBtn')?.addEventListener('click', () => {
    openShareReportModal(report);
  });

  document.getElementById('reportNewAnalysisBtn')?.addEventListener('click', () => {
    onNavigate('analyzer');
  });

  let currentFilter = 'all';
  let searchQuery = '';

  const renderTableRows = () => {
    const tbody = document.getElementById('reportReviewsTableBody');
    if (!tbody) return;

    const filtered = (report.reviews || []).filter((rev) => {
      if (currentFilter === 'suspicious' && !rev.isSuspicious) return false;
      if (currentFilter === 'clean' && rev.isSuspicious) return false;
      if (currentFilter.startsWith('layer:')) {
        const targetLayer = currentFilter.split(':')[1];
        if (!rev.redFlags.some((f) => f.layer === targetLayer)) return false;
      }

      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const inText = rev.text.toLowerCase().includes(q);
        const inUser = rev.reviewer.toLowerCase().includes(q);
        if (!inText && !inUser) return false;
      }
      return true;
    });

    if (filtered.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7" style="text-align:center;padding:2rem;color:var(--text-muted);">
            Tidak ada ulasan yang cocok dengan filter ini.
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = filtered
      .map((rev) => {
        const scoreBadge =
          rev.riskLevel === 'low'
            ? 'badge-low'
            : rev.riskLevel === 'moderate'
            ? 'badge-moderate'
            : 'badge-high';

        const dotClass =
          rev.riskLevel === 'low'
            ? 'risk-dot-low'
            : rev.riskLevel === 'moderate'
            ? 'risk-dot-moderate'
            : 'risk-dot-high';

        const sentimentClass =
          rev.sentiment === 'positive'
            ? 'badge-positive'
            : rev.sentiment === 'negative'
            ? 'badge-negative'
            : '';

        const sentimentLabel =
          rev.sentiment === 'positive'
            ? 'Positif'
            : rev.sentiment === 'negative'
            ? 'Negatif'
            : 'Netral';

        const flagsHtml =
          rev.redFlags && rev.redFlags.length > 0
            ? rev.redFlags
                .map(
                  (rf) =>
                    `<span class="badge badge-${escapeHtml(
                      rf.badgeTone || 'neutral'
                    )}" style="margin:0 0.25rem 0.25rem 0;">${escapeHtml(rf.label)}</span>`
                )
                .join('')
            : `<span class="badge badge-low">Wajar</span>`;

        return `
          <tr class="${rev.isSuspicious ? 'row-suspicious' : ''}">
            <td style="font-family:var(--font-mono);color:var(--text-muted);">#${rev.index}</td>
            <td>
              <div style="font-weight:600;">${escapeHtml(rev.reviewer)}</div>
              <div style="font-size:0.73rem;color:var(--text-muted);font-family:var(--font-mono);">
                ${escapeHtml(rev.date)}${rev.timeLabel ? ` ${escapeHtml(rev.timeLabel)}` : ''}
              </div>
            </td>
            <td>
              <div>${renderStars(rev.rating)}</div>
              <div style="margin-top:0.3rem;">
                <span class="badge ${sentimentClass}" style="font-size:0.68rem;">
                  ${sentimentLabel}
                </span>
              </div>
            </td>
            <td>
              <div style="line-height:1.55;">${escapeHtml(rev.text)}</div>
              <div style="font-size:0.72rem;color:var(--text-muted);margin-top:0.25rem;font-family:var(--font-mono);">
                ${rev.wordCount} kata
              </div>
            </td>
            <td>${flagsHtml}</td>
            <td>
              <span class="badge ${scoreBadge}" style="font-family:var(--font-mono);">
                <span class="risk-dot ${dotClass}"></span>
                ${rev.trustScore}/100
              </span>
            </td>
            <td>
              <button type="button" class="why-btn" data-why-index="${rev.index}">
                ${ICONS.info}
                <span>Alasan</span>
              </button>
            </td>
          </tr>
        `;
      })
      .join('');

    tbody.querySelectorAll('[data-why-index]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const revIndex = Number(btn.getAttribute('data-why-index'));
        const targetRev = report.reviews.find((r) => r.index === revIndex);
        if (targetRev) {
          openWhyReviewModal(targetRev);
        }
      });
    });
  };

  renderTableRows();

  document.querySelectorAll('#reviewFilterPills .filter-pill').forEach((pill) => {
    pill.addEventListener('click', () => {
      document
        .querySelectorAll('#reviewFilterPills .filter-pill')
        .forEach((p) => p.classList.remove('active'));
      pill.classList.add('active');
      currentFilter = pill.getAttribute('data-filter') || 'all';
      renderTableRows();
    });
  });

  document.getElementById('reviewSearchInput')?.addEventListener('input', (e) => {
    searchQuery = e.target.value.trim();
    renderTableRows();
  });
}

async function renderHistoryView({ onOpenReport, onNavigate }) {
  const root = document.getElementById('appViewRoot');
  if (!root) return;

  root.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:1rem;margin-bottom:1.5rem;">
      <div>
        <h2 style="font-size:1.55rem;font-weight:800;letter-spacing:-0.025em;">Riwayat Analisis</h2>
        <p style="color:var(--text-secondary);font-size:0.88rem;">
          Daftar produk yang pernah Anda periksa beserta perbandingan rating asli dan terkoreksi.
        </p>
      </div>
      <button type="button" class="btn btn-primary btn-sm" id="historyNewAnalysisBtn">
        ${ICONS.plus}
        <span>Periksa Produk</span>
      </button>
    </div>
    <div id="historyListContainer">
      <div class="card" style="text-align:center;padding:2rem;color:var(--text-muted);">Memuat riwayat...</div>
    </div>
  `;

  document.getElementById('historyNewAnalysisBtn')?.addEventListener('click', () => {
    onNavigate('analyzer');
  });

  const container = document.getElementById('historyListContainer');

  const loadList = async () => {
    try {
      const { reports } = await apiClient.getReportsHistory();

      if (!reports || reports.length === 0) {
        container.innerHTML = `
          <div class="card" style="text-align:center;padding:3rem 1.5rem;max-width:540px;margin:0 auto;">
            <div style="margin-bottom:0.6rem;color:var(--text-muted);">${ICONS.clock}</div>
            <h3 style="font-size:1.08rem;font-weight:700;margin-bottom:0.35rem;">Belum Ada Riwayat</h3>
            <p style="color:var(--text-secondary);font-size:0.86rem;margin-bottom:1.25rem;">
              Produk yang sudah Anda periksa akan otomatis tersimpan di sini agar mudah dibuka kembali.
            </p>
            <button type="button" class="btn btn-primary" id="emptyHistoryStartBtn">Periksa Produk Pertama</button>
          </div>
        `;
        document.getElementById('emptyHistoryStartBtn')?.addEventListener('click', () => {
          onNavigate('analyzer');
        });
        return;
      }

      container.innerHTML = `
        <div class="grid-2">
          ${reports
            .map((item) => {
              const badgeClass =
                item.riskLevel === 'low'
                  ? 'badge-low'
                  : item.riskLevel === 'moderate'
                  ? 'badge-moderate'
                  : 'badge-high';
              const dotClass =
                item.riskLevel === 'low'
                  ? 'risk-dot-low'
                  : item.riskLevel === 'moderate'
                  ? 'risk-dot-moderate'
                  : 'risk-dot-high';
              const formattedDate = new Date(item.createdAt).toLocaleString('id-ID', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              });

              return `
                <div class="card card-interactive" style="display:flex;flex-direction:column;justify-content:space-between;">
                  <div>
                    <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:0.5rem;margin-bottom:0.65rem;">
                      <div style="display:flex;align-items:center;gap:0.5rem;">
                        ${renderMarketplaceBadge(item.marketplace)}
                        <span style="font-size:0.73rem;color:var(--text-muted);font-family:var(--font-mono);">${escapeHtml(
                          formattedDate
                        )}</span>
                      </div>
                      <span class="badge ${badgeClass}">
                        <span class="risk-dot ${dotClass}"></span>
                        ${item.productTrustScore}/100 &middot; ${escapeHtml(item.riskLabel)}
                      </span>
                    </div>

                    <h3 style="font-size:1.05rem;font-weight:700;margin-bottom:0.75rem;line-height:1.35;">
                      ${escapeHtml(item.productName)}
                    </h3>

                    <div class="rating-compare-box" style="padding:0.7rem;margin-bottom:0.75rem;">
                      <div class="rating-col">
                        <div class="rating-col-label">Rating Toko</div>
                        <div style="font-size:1.3rem;font-weight:800;font-family:var(--font-mono);color:var(--viz-amber);">
                          ${item.originalRating}
                        </div>
                      </div>
                      <div class="rating-arrow">${ICONS.arrowRight}</div>
                      <div class="rating-col">
                        <div class="rating-col-label">Terkoreksi</div>
                        <div style="font-size:1.3rem;font-weight:800;font-family:var(--font-mono);color:${
                          item.riskLevel === 'high'
                            ? 'var(--risk-high-ink)'
                            : item.riskLevel === 'moderate'
                            ? 'var(--risk-moderate-ink)'
                            : 'var(--risk-low-ink)'
                        };">
                          ${item.adjustedRating}
                        </div>
                      </div>
                    </div>

                    <p style="font-size:0.81rem;color:var(--text-secondary);margin-bottom:1rem;">
                      Perlu dicek: <strong>${item.suspiciousReviewsCount}/${item.totalReviews}</strong> ulasan &middot;
                      ${escapeHtml(item.verdictHeadline)}
                    </p>
                  </div>

                  <div style="display:flex;align-items:center;justify-content:space-between;gap:0.5rem;padding-top:0.85rem;border-top:1px solid var(--border-subtle);">
                    <button type="button" class="btn btn-primary btn-sm" data-open-report="${escapeHtml(
                      item.id
                    )}">
                      Buka Laporan
                    </button>
                    <div style="display:flex;gap:0.4rem;">
                      <a
                        href="${apiClient.getExportCsvUrl(item.id)}"
                        class="btn btn-secondary btn-sm"
                        download
                      >
                        ${ICONS.download}
                        <span>CSV</span>
                      </a>
                      <button
                        type="button"
                        class="btn btn-danger btn-sm"
                        data-delete-report="${escapeHtml(item.id)}"
                        title="Hapus laporan"
                      >
                        ${ICONS.trash}
                      </button>
                    </div>
                  </div>
                </div>
              `;
            })
            .join('')}
        </div>
      `;

      container.querySelectorAll('[data-open-report]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const id = btn.getAttribute('data-open-report');
          if (id) onOpenReport(id);
        });
      });

      container.querySelectorAll('[data-delete-report]').forEach((btn) => {
        btn.addEventListener('click', async () => {
          const id = btn.getAttribute('data-delete-report');
          if (!id) return;
          try {
            await apiClient.deleteReportById(id);
            showToast('Laporan dihapus dari riwayat.');
            loadList();
          } catch (err) {
            showToast(err.message);
          }
        });
      });
    } catch (err) {
      container.innerHTML = `<div class="card" style="color:var(--risk-high-ink);">Gagal memuat riwayat: ${escapeHtml(
        err.message
      )}</div>`;
    }
  };

  loadList();
}








function triggerViewTransition() {
  const root = document.getElementById('appViewRoot');
  if (!root) return;
  root.classList.remove('view-enter');
  void root.offsetWidth;
  root.classList.add('view-enter');
}
function navigateTo(viewName) {
  appState.currentView = viewName;

  document.querySelectorAll('[data-nav]').forEach((btn) => {
    const target = btn.getAttribute('data-nav');
    btn.classList.toggle('active', target === viewName);
  });

  window.scrollTo({ top: 0, behavior: 'smooth' });

  if (viewName === 'landing') {
    renderLandingView({ onNavigate: navigateTo });
  } else if (viewName === 'analyzer') {
    renderAnalyzerView({
      onAnalysisComplete: (report) => {
        appState.activeReport = report;
        const url = new URL(window.location.href);
        url.searchParams.set('report', report.id);
        window.history.pushState({}, '', url);
        showToast(`Selesai memeriksa ${report.metrics.totalReviews} ulasan.`);
        navigateTo('report');
      },
    });
  } else if (viewName === 'report') {
    renderReportView({
      report: appState.activeReport,
      onNavigate: navigateTo,
    });
  } else if (viewName === 'history') {
    renderHistoryView({
      onOpenReport: async (reportId) => {
        try {
          const fullReport = await apiClient.getReportById(reportId);
          appState.activeReport = fullReport;
          const url = new URL(window.location.href);
          url.searchParams.set('report', fullReport.id);
          window.history.pushState({}, '', url);
          navigateTo('report');
        } catch (err) {
          showToast(err.message);
        }
      },
      onNavigate: navigateTo,
    });
  }

  triggerViewTransition();
}

async function initApp() {
  document.querySelectorAll('[data-nav]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const target = btn.getAttribute('data-nav');
      if (target) navigateTo(target);
    });
  });

  document.getElementById('brandHomeBtn')?.addEventListener('click', () => {
    navigateTo('landing');
  });

  document.getElementById('headerStartBtn')?.addEventListener('click', () => {
    navigateTo('analyzer');
  });

  const backdrop = document.getElementById('appModalBackdrop');
  backdrop?.addEventListener('click', (e) => {
    if (e.target === backdrop) closeModal();
  });
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal();
  });

  const params = new URLSearchParams(window.location.search);
  const sharedReportId = params.get('report');

  if (sharedReportId) {
    try {
      const report = await apiClient.getReportById(sharedReportId);
      appState.activeReport = report;
      navigateTo('report');
      return;
    } catch {
      // Lanjut ke halaman utama bila laporan tidak ditemukan
    }
  }

  navigateTo('landing');
}

document.addEventListener('DOMContentLoaded', initApp);


})();
