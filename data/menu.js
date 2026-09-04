/* =============================================================================
   data/menu.js — TEK DOĞRULUK KAYNAĞI
   -----------------------------------------------------------------------------
   Sayfadaki her ürün kartı, her kategori sekmesi, yazılı menü ve her 3D
   görüntüleyici bu dosyadan üretilir. index.html içine elle ürün yazılmaz.

   Yeni ürün eklemek için: MENU dizisine bir obje ekle, fotoğrafı img/ içine,
   modeli models/ içine koy. Bitti. (Ayrıntı: kökteki README.md)
   ========================================================================== */

/* --- Marka / iletişim bilgileri (tek yerden değişir) --------------------- */
const SITE = {
  marka: '[MARKA ADI]',
  konum: 'Kadıköy · İstanbul',
  telefon: '+905550000000',
  telefonGosterim: '0555 000 00 00',
  adres: 'Caferağa Mah. Örnek Sk. No:1, Kadıköy / İstanbul',
  harita: 'https://maps.google.com/?q=Kadikoy+Istanbul',
  calismaSaati: 'Her gün 11.00 – 24.00'
};

/* --- Kategoriler: hem sekme hem yazılı menü sırası buradan gelir --------- */
const KATEGORILER = [
  { id: 'corbalar',     ad: 'Çorbalar' },
  { id: 'ana-yemekler', ad: 'Ana Yemekler' },
  { id: 'mezeler',      ad: 'Mezeler' },
  { id: 'ekmek-arasi', ad: 'Ekmek Arası' },
  { id: 'burger',      ad: 'Burger' },
  { id: 'hot-dog',     ad: 'Hot Dog' },
  { id: 'tavuk',       ad: 'Tavuk' },
  { id: 'tatlilar',    ad: 'Tatlılar' },
  { id: 'milkshake',   ad: 'Milkshake' },
  { id: 'icecekler',   ad: 'İçecekler' }
];

/* --- Ürünler -----------------------------------------------------------------
   id             benzersiz slug (modal anahtarı)
   ad             ürün adı
   aciklama       kartta ve yazılı menüde görünen tek satır
   detay          modalda görünen uzun açıklama (yoksa aciklama kullanılır)
   icindekiler    modal — malzeme listesi (yoksa null)
   alerjen        modal — alerjen notu (yoksa null)
   fiyat          ürünün tek başına fiyatı (sayı, ₺); bilinmiyorsa null
   icecekliFiyat  kutu içecekle birlikte menü fiyatı (yoksa null)
   kategori       KATEGORILER[].id
   rozet          'Yeni' | 'Şefin Önerisi' | 'Popüler' | null
   foto           kartta VARSAYILAN gösterilen fotoğraf; null ise
                  "bu ürün için fotoğraf yok" yer tutucusu çıkar
   glb / usdz     3D model yolları; glb null ise kartta 3D yok notu görünür
   poster         yalnızca kompakt satırlardaki ikon için kullanılır
-------------------------------------------------------------------------------- */
const MENU = [
  {
    id: 'tarhana-corbasi',
    ad: 'Tarhana Çorbası',
    aciklama: 'Geleneksel usulde hazırlanan sıcak tarhana çorbası.',
    detay: 'Domates ve baharatlarla hazırlanan geleneksel tarhana çorbası, sıcak servis edilir.',
    icindekiler: null,
    alerjen: null,
    fiyat: 195, icecekliFiyat: null,
    kategori: 'corbalar', rozet: 'Yeni',
    foto: 'img/corba.png',
    glb: 'models/corba.glb?v=1', usdz: null,
    poster: null
  },
  {
    id: 'koz-patlican-ezmesi',
    ad: 'Köz Patlıcan Ezmesi',
    aciklama: 'Közlenmiş patlıcan ve köz biberle hazırlanan meze.',
    detay: 'Közlenmiş patlıcan ve biberlerin harmanlanmasıyla hazırlanan ev usulü soğuk meze.',
    icindekiler: null,
    alerjen: null,
    fiyat: 245, icecekliFiyat: null,
    kategori: 'mezeler', rozet: 'Yeni',
    foto: 'img/koz-patlican-ezme.png',
    glb: 'models/koz-patlican-ezme.glb?v=1', usdz: 'models/koz-patlican-ezme.glb.usdz',
    poster: null
  },
  {
    id: 'tavuk-makarna-patates',
    ad: 'Tavuk, Makarna ve Patates',
    aciklama: 'Tavuk, makarna ve patatesle hazırlanan doyurucu tabak.',
    detay: 'Tavuk, makarna ve patatesin birlikte servis edildiği doyurucu ana yemek tabağı.',
    icindekiler: null,
    alerjen: null,
    fiyat: 495, icecekliFiyat: null,
    kategori: 'ana-yemekler', rozet: 'Yeni',
    foto: 'img/tavuk-makarna-patates.png',
    glb: 'models/tavuk-makarna-patates.glb?v=1', usdz: 'models/tavuk-makarna-patates.glb.usdz',
    poster: null
  },
  {
    id: 'barbunya',
    ad: 'Barbunya',
    aciklama: 'Ev usulü barbunya yemeği.',
    detay: 'Ev usulü hazırlanan barbunya yemeği.',
    icindekiler: null,
    alerjen: null,
    fiyat: 295, icecekliFiyat: null,
    kategori: 'ana-yemekler', rozet: 'Yeni',
    foto: 'img/barbunya.png',
    glb: 'models/barbunya.glb?v=2', usdz: 'models/barbunya.glb.usdz',
    poster: null
  },
  {
    id: 'firin-makarna',
    ad: 'Fırın Makarna',
    aciklama: 'Fırında kızarmış makarna.',
    detay: 'Üzeri fırında kızartılarak servis edilen makarna.',
    icindekiler: null,
    alerjen: null,
    fiyat: 325, icecekliFiyat: null,
    kategori: 'ana-yemekler', rozet: 'Yeni',
    foto: 'img/firin-makarna.png',
    glb: 'models/firin-makarna.glb?v=2', usdz: 'models/firin-makarna.glb.usdz',
    poster: null
  },
  {
    id: 'firinda-kalcali-but',
    ad: 'Fırında Kalçalı But',
    aciklama: 'Fırında pişirilmiş kalçalı tavuk but.',
    detay: 'Fırında kızartılarak hazırlanan kalçalı tavuk but.',
    icindekiler: null,
    alerjen: null,
    fiyat: 495, icecekliFiyat: null,
    kategori: 'ana-yemekler', rozet: 'Yeni',
    foto: 'img/firinda-kalcali-but.png',
    glb: 'models/firinda-kalcali-but.glb?v=2', usdz: 'models/firinda-kalcali-but.glb.usdz',
    poster: null
  },
  {
    id: 'kofte-ekmek-arasi',
    ad: 'Köfte Ekmek Arası',
    aciklama: 'Odun ateşinde köfte, közlenmiş domates, taze yeşillik.',
    detay: 'El yapımı dana köfte odun ateşinde pişirilir, sıcak somun ekmek arasında közlenmiş domates, sivri biber ve maydanozla servis edilir.',
    icindekiler: ['Dana köfte', 'Somun ekmek', 'Közlenmiş domates', 'Sivri biber', 'Maydanoz', 'Soğan'],
    alerjen: 'Gluten içerir.',
    fiyat: 495, icecekliFiyat: 545,
    kategori: 'ekmek-arasi', rozet: null,
    foto: 'img/kofte-ekmek-arasi.webp',
    glb: null, usdz: null, poster: null
  },
  {
    id: 'ekmek-arasi-kemiksiz-kanat',
    ad: 'Ekmek Arası Kemiksiz Tavuk Kanat',
    aciklama: 'Çıtır kemiksiz kanat, marul, turşu, buffalo sos.',
    detay: 'Kemiksiz kanat parçaları çıtır kaplamayla kızartılır, uzun ekmek arasında marul, turşu ve buffalo sosla birleşir.',
    icindekiler: ['Kemiksiz tavuk kanat', 'Uzun ekmek', 'Marul', 'Turşu', 'Buffalo sos'],
    alerjen: 'Gluten ve süt ürünleri içerir.',
    fiyat: 495, icecekliFiyat: 545,
    kategori: 'ekmek-arasi', rozet: null,
    foto: null,
    glb: null, usdz: null, poster: null
  },
  {
    id: 'smash-burger',
    ad: 'Smash Burger',
    aciklama: 'Çift köfte, cheddar, karamelize soğan, ev yapımı sos.',
    detay: 'Taze dana kıyma sıcak plakada ezilerek pişirilir; kenarları çıtır, ortası sulu kalır. Üzerine iki dilim cheddar, karamelize soğan ve ev yapımı smash sos.',
    icindekiler: ['Dana kıyma (2×80 g)', 'Cheddar peyniri', 'Karamelize soğan', 'Turşu', 'Smash sos', 'Brioche ekmek'],
    alerjen: 'Gluten, süt ürünleri, yumurta ve hardal içerir.',
    fiyat: 595, icecekliFiyat: 645,
    kategori: 'burger', rozet: 'Şefin Önerisi',
    foto: 'img/smash-burger.webp',
    glb: null, usdz: null, poster: null
  },
  {
    id: 'kemiksiz-kanat-burger',
    ad: 'Kemiksiz Kanat Burger',
    aciklama: 'Çıtır tavuk, coleslaw, bal-hardal, brioche ekmek.',
    detay: 'Çift kaplama çıtır tavuk göğsü, ev yapımı coleslaw ve bal-hardal sosla brioche ekmek arasında.',
    icindekiler: ['Tavuk göğsü', 'Brioche ekmek', 'Coleslaw', 'Bal-hardal sos', 'Turşu'],
    alerjen: 'Gluten, süt ürünleri, yumurta ve hardal içerir.',
    fiyat: 495, icecekliFiyat: 525,
    kategori: 'burger', rozet: 'Yeni',
    foto: null,
    glb: null, usdz: null, poster: null
  },
  {
    id: 'hot-dog',
    ad: 'Hot Dog',
    aciklama: 'Izgara sosis, çıtır soğan, hardal ve cheddar sosu.',
    detay: 'Izgarada çıtırlaştırılan dana sosis, sıcak hot dog ekmeğinde çıtır soğan, hardal ve akışkan cheddar sosuyla servis edilir.',
    icindekiler: ['Dana sosis', 'Hot dog ekmeği', 'Çıtır soğan', 'Hardal', 'Cheddar sos'],
    alerjen: 'Gluten, süt ürünleri ve hardal içerir.',
    fiyat: 395, icecekliFiyat: 425,
    kategori: 'hot-dog', rozet: 'Yeni',
    foto: null,
    glb: null, usdz: null, poster: null
  },
  {
    id: 'tavuk-kanat-8',
    ad: 'Tavuk Kanat 8’li',
    aciklama: 'Marine edilmiş 8 parça çıtır kanat, iki sos seçimi.',
    detay: '24 saat baharatlı sütte marine edilen kanatlar çift kaplama ile kızartılır. Yanında ranch ve bal-hardal soslarından iki seçim, ev yapımı coleslaw.',
    icindekiler: ['Tavuk kanat (8 parça)', 'Baharatlı marine', 'Mısır unu kaplama', 'Ranch sos', 'Coleslaw'],
    alerjen: 'Gluten, süt ürünleri ve yumurta içerir.',
    fiyat: 595, icecekliFiyat: 645,
    kategori: 'tavuk', rozet: 'Popüler',
    foto: 'img/tavuk-kanat-8.webp',
    glb: null, usdz: null, poster: null
  },
  {
    id: 'tiramisu',
    ad: 'Tiramisu',
    aciklama: 'Mascarpone, espresso, kakao — günlük yapım.',
    detay: 'Her sabah hazırlanan klasik tiramisu; espresso ile ıslatılmış kedidili bisküvi katmanları ve mascarpone kreması.',
    icindekiler: ['Mascarpone', 'Espresso', 'Kedidili bisküvi', 'Kakao', 'Yumurta'],
    alerjen: 'Gluten, süt ürünleri ve yumurta içerir.',
    fiyat: 225, icecekliFiyat: null,
    kategori: 'tatlilar', rozet: null,
    foto: null,
    glb: null, usdz: null, poster: null
  },
  {
    id: 'tulumba',
    ad: 'Tulumba',
    aciklama: 'Sıcak servis, hafif şerbetli, yanında kaymak.',
    detay: 'Siparişle kızartılan tulumba tatlısı, hafif şerbetle sıcak servis edilir; yanında bir top kaymak.',
    icindekiler: ['İrmik hamuru', 'Şeker şerbeti', 'Kaymak'],
    alerjen: 'Gluten, süt ürünleri ve yumurta içerir.',
    fiyat: 195, icecekliFiyat: null,
    kategori: 'tatlilar', rozet: null,
    foto: null,
    glb: null, usdz: null, poster: null
  },
  {
    id: 'milkshake-cilek',
    ad: 'Çilek Milkshake',
    aciklama: 'Gerçek çilek, dondurma, süt — şurup yok.',
    detay: 'Taze çilek ve vanilyalı dondurma ile hazırlanır, üzerine krema.',
    icindekiler: ['Çilek', 'Vanilyalı dondurma', 'Süt', 'Krema'],
    alerjen: 'Süt ürünleri içerir.',
    fiyat: 225, icecekliFiyat: null,
    kategori: 'milkshake', rozet: null,
    foto: null,
    glb: null, usdz: null, poster: null
  },
  {
    id: 'milkshake-cikolata',
    ad: 'Çikolata Milkshake',
    aciklama: 'Bitter çikolata sosu, dondurma, kakao tozu.',
    detay: 'Bitter çikolata sosu ve dondurma ile hazırlanan yoğun milkshake.',
    icindekiler: ['Bitter çikolata sosu', 'Vanilyalı dondurma', 'Süt', 'Kakao'],
    alerjen: 'Süt ürünleri içerir, soya içerebilir.',
    fiyat: 225, icecekliFiyat: null,
    kategori: 'milkshake', rozet: null,
    foto: null,
    glb: null, usdz: null, poster: null
  },
  {
    id: 'milkshake-muz',
    ad: 'Muz Milkshake',
    aciklama: 'Olgun muz, süt, bir tutam tarçın.',
    detay: 'Olgun muz ve dondurma ile hazırlanır, üzerine tarçın.',
    icindekiler: ['Muz', 'Vanilyalı dondurma', 'Süt', 'Tarçın'],
    alerjen: 'Süt ürünleri içerir.',
    fiyat: 225, icecekliFiyat: null,
    kategori: 'milkshake', rozet: null,
    foto: null,
    glb: null, usdz: null, poster: null
  },

  /* --- 3D modeli olmayan kalemler: yalnızca kompakt satır + yazılı menü --- */
  {
    id: 'kola', ad: 'Kola', aciklama: '330 ml kutu',
    detay: null, icindekiler: null, alerjen: null,
    fiyat: 95, icecekliFiyat: null,
    kategori: 'icecekler', rozet: null,
    foto: null, glb: null, usdz: null, poster: 'img/ikon-icecek.svg'
  },
  {
    id: 'ayran', ad: 'Ayran', aciklama: '300 ml, ev usulü',
    detay: null, icindekiler: null, alerjen: null,
    fiyat: 95, icecekliFiyat: null,
    kategori: 'icecekler', rozet: null,
    foto: null, glb: null, usdz: null, poster: 'img/ikon-icecek.svg'
  },
  {
    id: 'gazoz', ad: 'Gazoz', aciklama: '250 ml şişe',
    detay: null, icindekiler: null, alerjen: null,
    fiyat: 95, icecekliFiyat: null,
    kategori: 'icecekler', rozet: null,
    foto: null, glb: null, usdz: null, poster: 'img/ikon-icecek.svg'
  },
  {
    id: 'su', ad: 'Su', aciklama: '500 ml',
    detay: null, icindekiler: null, alerjen: null,
    fiyat: 65, icecekliFiyat: null,
    kategori: 'icecekler', rozet: null,
    foto: null, glb: null, usdz: null, poster: 'img/ikon-icecek.svg'
  }
];
