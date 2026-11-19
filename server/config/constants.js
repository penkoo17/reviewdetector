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

module.exports = {
  RISK_THRESHOLDS,
  ANALYSIS_LAYERS,
  RED_FLAG_TYPES,
  PRODUCT_CATEGORY_RULES,
  GENERIC_PHRASES,
  EXPERIENCE_CONTEXT_KEYWORDS,
  COERCION_PATTERNS,
  ADVERSATIVE_MARKERS,
  POSITIVE_WORDS,
  NEGATIVE_WORDS,
  EXAGGERATED_PATTERNS,
  THEME_CATEGORIES,
};
