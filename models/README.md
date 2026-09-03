# models/ — 3D model dosyaları

Bu klasör ürünlerin **GLB** (Android + masaüstü) ve **USDZ** (iOS AR Quick Look)
dosyalarını tutar. Gerçek modeller geldiğinde dosyaları buraya koyup `menu.js`
içindeki `glb` / `usdz` alanlarını ilgili yollarla değiştirmek yeterli.

## Teslim durumu

| Ürün | GLB | USDZ | Teslim ölçüsü | Düzeltilmiş ölçü |
|---|---|---|---|---|
| Barbunya | ✅ 4.65 MB | ⏳ bekleniyor | — | — |
| Fırın Makarna | ✅ 4.55 MB | ⏳ bekleniyor | — | — |
| Fırında Kalçalı But | ✅ 4.96 MB | ⏳ bekleniyor | — | — |
| Tarhana Çorbası | ✅ 4.33 MB | ⏳ bekleniyor | — | — |
| Köz Patlıcan Ezmesi | ✅ 3.70 MB | ⏳ bekleniyor | — | — |
| Tavuk, Makarna ve Patates | ✅ 4.32 MB | ⏳ bekleniyor | — | — |

## Görünüm: neden unlit?

Üç model de fotogrametri taraması ve **ışığı baseColor dokusunun içine pişmiş**
durumda. Normal bir PBR materyaliyle işaretlendiğinde Android Scene Viewer
odanın ışığını tahmin edip bir kez daha üstüne bindiriyordu; sonuç AR'da soluk,
yıkanmış ("silik") bir görüntüydü — masaüstü `<model-viewer>` görünümü canlıyken.

`node tools/gorunum-duzelt.js` ile materyallere **KHR_materials_unlit** eklendi.
Unlit materyalde görüntüleyici aydınlatma hesabı yapmaz, dokuyu olduğu gibi
gösterir — fotoğraftaki canlı renkler AR'da da aynen çıkar. Değişiklik sadece
JSON parçasında; mesh ve doku verisine dokunulmaz, dosya boyutu değişmez.

Geri almak için: `node tools/gorunum-duzelt.js --pbr`

**Yan etki:** unlit model odanın ışığına tepki vermez — karanlık bir odada da
aynı parlaklıkta görünür. Işığa tepki veren bir görünüm isteniyorsa modelin
şu iki eksiği giderilerek yeniden export edilmesi gerekir:

1. **Vertex normali yok.** Primitive'lerde yalnızca `POSITION` ve `TEXCOORD_0`
   var; `NORMAL` yok. Normal olmadan yüzey düz gölgelenir ve dosyadaki normal
   map de doğru uygulanamaz.
2. **Doku ışıklı.** Gerçek PBR için gölgesiz/ışıksız (yalnızca albedo) doku
   gerekir; mevcut dokuda tarama ortamının ışığı ve gölgeleri duruyor.

USDZ gelene kadar bu üç üründe iPhone'da AR oturumu açılmaz; model sayfa içinde
3D olarak yine döner. Diğer ürünlerde demo CDN modeli kullanılmaz.

## Dosya adı ↔ ürün karşılık tablosu

| Ürün | `glb` | `usdz` |
|---|---|---|
| Barbunya | `models/barbunya.glb` | — |
| Fırın Makarna | `models/firin-makarna.glb` | — |
| Fırında Kalçalı But | `models/firinda-kalcali-but.glb` | — |
| Tarhana Çorbası | `models/corba.glb` | — |
| Köz Patlıcan Ezmesi | `models/koz-patlican-ezme.glb` | — |
| Tavuk, Makarna ve Patates | `models/tavuk-makarna-patates.glb` | — |

İçecekler ve su için 3D model **yok** — bunlar kompakt satır düzeniyle listelenir
(`glb: null`). Her kaleme 3D koymak gereksiz, sayfayı da ağırlaştırır.

## Export ayarları

Bu üç kural masa üstü AR yerleşiminin doğru görünmesi için zorunludur:

1. **Ölçek metre cinsinden.** GLB birim = 1 metre. 25 cm çapındaki bir burger
   tabağı sahnede **0.25 birim** olmalı — 25 değil, 1 değil. Sayfada
   `ar-scale="fixed"` kullanıldığı için kullanıcı ölçeği düzeltemez;
   yanlış export edilen model AR'da devasa ya da minicik çıkar.
2. **Origin tabağın altında.** Modelin (0,0,0) noktası tabağın oturduğu düzlemde
   ve tabak merkezinde olmalı. Origin yemeğin ortasındaysa AR yerleşiminde tabak
   masaya yarı gömülü görünür.
3. **Y-up eksen düzeni.** Blender'dan export ederken `+Y up` seçili olsun
   (glTF exporter'ın varsayılanı budur; Z-up bırakılırsa yemek yan yatar).

Ek hedefler:

- **Draco sıkıştırma açık** (`Compression` → Draco, mesh sıkıştırma seviyesi 6).
- **Dosya boyutu 2–5 MB.** 8 MB üstü modeller mobil veride kabul edilemez.
- **Doku çözünürlüğü en fazla 2048×2048**, tercihen 1024. Doku sayısını azaltmak
  için baseColor + ORM (occlusion/roughness/metalness) atlası kullanın.
- **Üçgen sayısı ~50–150 bin.** Yemek modellerinde siluet önemlidir, ayrıntı
  normal map'e taşınabilir.
- **Y ekseninde ortalanmış, öne bakan kompozisyon** — kart içinde tabak
  varsayılan kamerada tam görünsün.

## USDZ üretimi

USDZ dosyası iOS'ta AR Quick Look için gerekir; `ios-src` verilmezse iPhone'da
"Masamda Gör" AR oturumu açılmaz (model yine 3D olarak döner).

- macOS: `xcrun usdz_converter` ya da Reality Converter (ücretsiz, App Store).
- Platform bağımsız: [Apple Reality Converter](https://developer.apple.com/augmented-reality/tools/)
  veya `usd_from_gltf` (Google) komut satırı aracı.
- USDZ dosyasında da aynı metre ölçeği ve origin kuralı geçerlidir.

## Sunucu notu

`file://` üzerinden açıldığında tarayıcı CORS kısıtları yüzünden yerel GLB
dosyalarını yükleyemeyebilir. Model testleri için kök dizinde basit bir statik
sunucu çalıştırın (bkz. kökteki `README.md`). AR testi zaten HTTPS ya da
`localhost` gerektirir.
