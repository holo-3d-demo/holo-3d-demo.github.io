# [MARKA ADI] — 3D / AR Menü

Tek sayfalık, statik bir restoran menüsü. Sayfa üç parçadan oluşur:

1. **Giriş** — özelliği bir paragrafta anlatan açıklama
2. **Menü** — kategori sekmeleri + ürün kartları (fotoğraf, 3D, AR)
3. **Yazılı menü** — menünün tamamı düz metin liste hâlinde

Backend, veritabanı, sipariş sistemi ya da CMS yok — saf HTML + CSS + vanilla JS.
Build step yok, npm yok, framework yok.

---

## Nasıl çalıştırılır

**En hızlı yol:** `index.html` dosyasına çift tıklayın.

**AR testi ve yerel model dosyaları için** basit bir statik sunucu gerekir
(AR oturumu HTTPS veya `localhost` ister, `file://` yetmez). Proje kökünde:

```bash
python -m http.server 8000     # Python 3
npx serve .                    # Node
```

Sonra `http://localhost:8000`.

**Telefonda AR denemek için** bilgisayarla telefon aynı Wi-Fi'de olmalı ve
sayfaya bilgisayarın yerel IP'siyle (`http://192.168.x.x:8000`) girilmeli.
Bazı Android sürümleri AR için HTTPS şart koşar; o durumda `ngrok http 8000`
gibi bir tünel en pratik yöntemdir.

### Ne nerede çalışır

| Ortam | 3D görüntüleyici | "Masamda Gör" |
|---|---|---|
| Android Chrome | ✅ | ✅ Scene Viewer / WebXR |
| iOS Safari | ✅ | ✅ AR Quick Look — ürünün `.usdz` dosyası gerekir |
| Masaüstü tarayıcı | ✅ | ❌ — yerine "AR için telefonunuzla açın" + QR alanı |

---

## Kart nasıl davranır

Her ürün kartı **varsayılan olarak fotoğraf** gösterir — sayfa açılışında tek bir
GLB bile indirilmez. Kartın altında iki buton var:

| Buton | Ne yapar |
|---|---|
| **3D Gör** | Fotoğrafın yerine `<model-viewer>` gelir, model yüklenir; kullanıcı çevirip yakınlaştırabilir. Sağ üstteki **Fotoğraf** butonuyla geri dönülür. |
| **Masamda Gör** | Aynı modeli yükler, yüklenir yüklenmez AR oturumunu açar — yemek gerçek boyutunda masaya yerleşir. |

Fotoğrafa veya kart gövdesine dokunmak detay modalını açar (uzun açıklama,
içindekiler, alerjen notu); modalda da aynı iki buton bulunur.

Fotoğrafı olmayan ürünler *"Bu ürün için fotoğraf yok"* yer tutucusu gösterir.
3D modeli olmayan yemekler kart düzeninde kalır ve kısa bir durum notu gösterir;
içecekler kompakt satır olarak listelenir. Model yüklenirken ek poster indirilmez,
yalnızca metin tabanlı yükleme durumu görünür.

---

## Fiyatlar

Her üründe iki fiyat gösterilebilir:

- **`fiyat`** — ürünün tek başına fiyatı, büyük ve pirinç sarısı
- **`icecekliFiyat`** — kutu içecekle birlikte menü fiyatı; altında küçük satır
  olarak *"+ kutu içecekle 545 ₺"* biçiminde çıkar

`icecekliFiyat: null` bırakılan üründe yalnızca tek fiyat görünür. `fiyat: null`
ise kartta “Fiyat bilgisi yakında”, yazılı menüde `—` gösterilir.

---

## Yeni ürün nasıl eklenir

1. **`data/menu.js`** içindeki `MENU` dizisine bir obje ekleyin:

   ```js
   {
     id: 'lahmacun',                       // benzersiz slug
     ad: 'Lahmacun',
     aciklama: 'İnce hamur, el kıyması, bol maydanoz.',
     detay: 'Modalda görünen uzun açıklama.',
     icindekiler: ['El kıyması', 'Domates', 'Maydanoz'],
     alerjen: 'Gluten içerir.',
     fiyat: 185,
     icecekliFiyat: 215,                   // kutu içecekle menü fiyatı; yoksa null
     kategori: 'ekmek-arasi',              // KATEGORILER içindeki bir id
     rozet: 'Yeni',                        // 'Yeni' | 'Şefin Önerisi' | 'Popüler' | null
     foto: 'img/lahmacun.webp',            // kartta varsayılan görünen fotoğraf; yoksa null
     glb:  'models/lahmacun.glb',          // 3D yoksa null
     usdz: 'models/lahmacun.usdz',         // iOS AR için gerekli; yoksa null
     poster: null                           // yalnız kompakt satır ikonu için
   }
   ```

2. **`models/`** klasörüne `.glb` (ve varsa `.usdz`) dosyalarını koyun.
   Export kuralları — metre ölçeği, origin tabağın altında, Draco, 2–5 MB:
   [`models/README.md`](models/README.md).

3. **`img/`** klasörüne ürün fotoğrafını koyun. **Kare çekim tercih edin** —
   kart sahnesi 1:1 orandadır, dikey fotoğraflar ortadan kırpılır.

Kaydedin, sayfayı yenileyin. HTML'e hiçbir şey eklemeniz gerekmez: kartlar,
kategori sekmeleri, yazılı menü ve modal içeriği hep bu diziden üretilir.

**Yeni kategori** eklemek için `KATEGORILER` dizisine
`{ id: 'salatalar', ad: 'Salatalar' }` ekleyin — hem sekme hem yazılı menü
başlığı kendiliğinden çıkar.

---

## Responsive davranış

CSS **mobil öncelikli** yazılmıştır: temel kurallar telefon içindir,
`@media (min-width: ...)` blokları büyük ekran için ekleme yapar.

| Genişlik | Düzen |
|---|---|
| < 560px | Üst çubukta telefon butonu yalnızca ikon; kartlar tek sütun |
| < 700px | Kapsayıcı kenar boşluğu 16px; modal alttan açılan drawer |
| ≥ 760px | Yazılı menü iki sütun |
| ≥ 800px | Modal ortada, iki sütunlu (sahne + metin) |
| Geniş | Kart ızgarası `auto-fill` ile 2–4 sütuna kendiliğinden çıkar |

Kart ızgarası `minmax(min(100%, 250px), 1fr)` kullanır; `min()` sayesinde
250px'ten dar ekranlarda bile yatay taşma olmaz. Kategori sekmeleri dar ekranda
yatay kayar. Butonlar en az 44px yüksekliğindedir (dokunma hedefi).

Doğrulandı: 390px'te `documentElement.scrollWidth` = viewport genişliği,
yatay taşma yok.

---

## Renkler nereden değişir

Tüm palet [`css/style.css`](css/style.css) en üstündeki `:root` bloğunda.
Başka hiçbir yerde sabit renk kodu yok.

```css
--pine-950: #08150F;   /* sayfa zemini, en koyu */
--pine-900: #0D2018;   /* kart zemini */
--pine-800: #133024;   /* yükseltilmiş yüzey, üst çubuk */
--pine-700: #1B4735;   /* kenarlık, ayraç */
--pine-600: #26694A;   /* birincil marka yeşili, butonlar */
--pine-500: #34875F;   /* hover */
--moss:     #6FA882;   /* ikincil vurgu, ikonlar, menü fiyatı */
--sage:     #B9D2C0;   /* ikincil metin */
--cream:    #F3F1E7;   /* birincil metin */
--brass:    #C9A24A;   /* fiyat ve rozet */
```

`index.html` içindeki `<meta name="theme-color">` (#08150F) paleti
değiştirdiğinizde elle güncellenmelidir.

---

## Marka adı nasıl değiştirilir

Tek yer: [`data/menu.js`](data/menu.js) içindeki `SITE` objesi (marka, telefon,
adres, harita bağlantısı, çalışma saati). Üst çubuk, footer ve sayfa başlığı
buradan doldurulur.

`index.html` içindeki `<title>`, `<meta description>` ve Open Graph
etiketlerindeki `[MARKA ADI]` metinleri JS'ten önce okunduğu için elle
değiştirilmelidir.

---

## Dosya yapısı

```
index.html          giriş + menü + yazılı menü iskeleti
css/style.css       palet + tüm stiller, 14 numaralandırılmış bölüm
js/app.js           render, filtre, foto⇄3D geçişi, modal, AR tespiti
data/menu.js        SITE + KATEGORILER + MENU  ← tek doğruluk kaynağı
models/             .glb + .usdz dosyaları (README: export ayarları)
models/_orijinal/   ölçek düzeltmesinden önceki ham GLB yedekleri
img/                ürün fotoğrafları (.webp) + yer tutucu görseller (.svg)
tools/              geliştirme araçları (siteye dahil değil):
                      olcek-duzelt.js   — GLB ölçek/origin düzeltici
                      gorunum-duzelt.js — materyali unlit yapar/geri alır
```

---

## Teknik notlar

- **3D/AR motoru:** Google `<model-viewer>` 4.0.0, CDN'den module olarak yüklenir.
- **`ar-scale="fixed"`** — yemek gerçek boyutunda çıkar, kullanıcı ölçeği bozamaz.
  Bu yüzden modellerin metre ölçeğinde export edilmesi kritiktir.
- **Tembel 3D** — açılışta `<model-viewer>` DOM'a hiç eklenmez; model ancak
  butona basılınca üretilir.
- **AR tespiti** — cihaz doğrudan yoklanır (`navigator.xr.isSessionSupported`,
  iOS'ta `<a rel="ar">` desteği, Android'de Scene Viewer). Destek yoksa
  "Masamda Gör" QR notuna dönüşür; iOS'ta USDZ yoksa ayrı bir not gösterilir.
- **Erişilebilirlik** — `lang="tr"`, görsellerde `alt`, butonlarda `aria-label`,
  modalda focus trap + ESC, sekmelerde ok tuşu gezinmesi,
  `prefers-reduced-motion` desteği.
- **Tipografi** — Bricolage Grotesque (başlık) + Inter (gövde), Google Fonts'tan
  `latin-ext` subset'i ile (Türkçe karakterler için şart).
- **Unlit materyal** — ürün modelleri fotogrametri taraması olduğu ve ışığı
  dokuya pişmiş geldiği için `KHR_materials_unlit` ile işaretlendi; yoksa AR'da
  odanın ışığı üstüne binip renkleri yıkıyor. Ayrıntı: `models/README.md`.

## 3D modeller

Gerçek modeller yalnızca Barbunya, Fırın Makarna ve Fırında Kalçalı But
ürünlerinde bağlıdır. Diğer yemekler uzaktaki demo modellere bağlanmaz; kartta
“Bu ürün için şu anda 3D model yok” notu gösterilir. Durum tablosu:
[`models/README.md`](models/README.md).
