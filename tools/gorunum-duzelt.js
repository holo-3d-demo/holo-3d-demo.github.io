#!/usr/bin/env node
/* =============================================================================
   tools/gorunum-duzelt.js — GLB materyalini "unlit" yapar / geri alır
   -----------------------------------------------------------------------------
   SORUN
   Elimizdeki yemek modelleri fotogrametri taraması. Bu tür taramalarda ışık ve
   gölge zaten baseColor dokusunun İÇİNE pişmiş durumda. Model normal bir PBR
   materyaliyle işaretlendiğinde, AR görüntüleyici (Android Scene Viewer) odanın
   ışığını tahmin edip bir kez daha üstüne bindirir. Sonuç: renkler yıkanır,
   yemek soluk ve "silik" görünür.

   ÇÖZÜM
   Materyale KHR_materials_unlit eklemek. Unlit materyalde görüntüleyici hiçbir
   aydınlatma hesabı yapmaz, baseColor dokusunu olduğu gibi gösterir — yani
   fotoğraftaki canlı renkler AR'da da aynen çıkar. Hem Scene Viewer hem
   <model-viewer> bu uzantıyı destekler.

   YAN ETKİ
   Unlit model odanın ışığına tepki vermez: karanlık bir odada da aynı
   parlaklıkta görünür. Işığa tepki veren bir görünüm istenirse modelin
   ışıksız (yalnızca albedo) dokuyla ve vertex normalleriyle yeniden export
   edilmesi gerekir — mevcut dosyalarda NORMAL attribute'u da yok.

   KULLANIM
     node tools/gorunum-duzelt.js              # unlit uygula (varsayılan)
     node tools/gorunum-duzelt.js --kontrol    # yazmadan durumu göster
     node tools/gorunum-duzelt.js --pbr        # geri al (unlit'i kaldır)
     node tools/gorunum-duzelt.js barbunya      # tek modele uygula

   Değişiklik yalnızca JSON parçasındadır; mesh ve doku verisine dokunulmaz,
   dosya boyutu değişmez. Orijinaller models/_orijinal/ altında.
   ========================================================================== */

'use strict';

const fs = require('fs');
const path = require('path');

/* Varsayılan olarak işlenecek modeller (yerel, gerçek ürün modelleri) */
const MODELLER = ['barbunya', 'firin-makarna', 'firinda-kalcali-but'];

const UNLIT = 'KHR_materials_unlit';
const JSON_CHUNK = 0x4E4F534A;
const BIN_CHUNK  = 0x004E4942;

/* ===========================================================================
   GLB oku / yaz  (yalnızca JSON parçası değişir, BIN aynen kopyalanır)
   ======================================================================== */
function glbOku(dosya) {
  const buf = fs.readFileSync(dosya);
  if (buf.readUInt32LE(0) !== 0x46546C67) throw new Error(dosya + ': GLB imzası yok');

  let off = 12, gltf = null, bin = null;
  while (off + 8 <= buf.length) {
    const uzunluk = buf.readUInt32LE(off);
    const tur = buf.readUInt32LE(off + 4);
    const veri = buf.slice(off + 8, off + 8 + uzunluk);
    if (tur === JSON_CHUNK) gltf = JSON.parse(veri.toString('utf8'));
    if (tur === BIN_CHUNK)  bin = veri;
    off += 8 + uzunluk;
  }
  if (!gltf) throw new Error(dosya + ': JSON chunk bulunamadı');
  return { gltf, bin };
}

function glbYaz(dosya, gltf, bin) {
  let jsonBuf = Buffer.from(JSON.stringify(gltf), 'utf8');
  const jsonPad = (4 - (jsonBuf.length % 4)) % 4;
  if (jsonPad) jsonBuf = Buffer.concat([jsonBuf, Buffer.alloc(jsonPad, 0x20)]);

  const parcalar = [];
  let govde = 8 + jsonBuf.length;

  let binBuf = null;
  if (bin) {
    const binPad = (4 - (bin.length % 4)) % 4;
    binBuf = binPad ? Buffer.concat([bin, Buffer.alloc(binPad, 0)]) : bin;
    govde += 8 + binBuf.length;
  }

  const baslik = Buffer.alloc(12);
  baslik.writeUInt32LE(0x46546C67, 0);
  baslik.writeUInt32LE(2, 4);
  baslik.writeUInt32LE(12 + govde, 8);
  parcalar.push(baslik);

  const jsonBaslik = Buffer.alloc(8);
  jsonBaslik.writeUInt32LE(jsonBuf.length, 0);
  jsonBaslik.writeUInt32LE(JSON_CHUNK, 4);
  parcalar.push(jsonBaslik, jsonBuf);

  if (binBuf) {
    const binBaslik = Buffer.alloc(8);
    binBaslik.writeUInt32LE(binBuf.length, 0);
    binBaslik.writeUInt32LE(BIN_CHUNK, 4);
    parcalar.push(binBaslik, binBuf);
  }

  fs.writeFileSync(dosya, Buffer.concat(parcalar));
}

/* ===========================================================================
   Dönüşüm
   ======================================================================== */
function unlitMi(gltf) {
  return (gltf.materials || []).some((m) => m.extensions && m.extensions[UNLIT]);
}

function unlitUygula(gltf) {
  gltf.extensionsUsed = gltf.extensionsUsed || [];
  if (!gltf.extensionsUsed.includes(UNLIT)) gltf.extensionsUsed.push(UNLIT);

  (gltf.materials || []).forEach((m) => {
    m.extensions = m.extensions || {};
    m.extensions[UNLIT] = {};
    /* Unlit'te yalnızca baseColor kullanılır; diğer alanlar yok sayılır ama
       --pbr ile geri dönebilmek için silinmiyor. */
  });
}

function unlitKaldir(gltf) {
  (gltf.materials || []).forEach((m) => {
    if (m.extensions) {
      delete m.extensions[UNLIT];
      if (!Object.keys(m.extensions).length) delete m.extensions;
    }
  });
  if (gltf.extensionsUsed) {
    gltf.extensionsUsed = gltf.extensionsUsed.filter((e) => e !== UNLIT);
    if (!gltf.extensionsUsed.length) delete gltf.extensionsUsed;
  }
}

/* ===========================================================================
   Giriş
   ======================================================================== */
function main() {
  const argv = process.argv.slice(2);
  const sadeceKontrol = argv.includes('--kontrol');
  const geriAl = argv.includes('--pbr');
  const secilen = argv.filter((a) => !a.startsWith('--'));
  const liste = secilen.length ? secilen : MODELLER;

  liste.forEach((slug) => {
    const dosya = path.join('models', slug + '.glb');
    if (!fs.existsSync(dosya)) { console.error('! bulunamadı: ' + dosya); return; }

    const { gltf, bin } = glbOku(dosya);
    const oncekiDurum = unlitMi(gltf) ? 'unlit' : 'pbr';
    const hedefDurum = geriAl ? 'pbr' : 'unlit';

    console.log('=== ' + slug + '.glb');
    console.log('  materyal sayısı: ' + (gltf.materials || []).length);
    console.log('  şu an: ' + oncekiDurum + '  →  hedef: ' + hedefDurum);

    if (sadeceKontrol) { console.log('  (--kontrol: dosya yazılmadı)'); return; }
    if (oncekiDurum === hedefDurum) { console.log('  zaten ' + hedefDurum + ', dokunulmadı.'); return; }

    geriAl ? unlitKaldir(gltf) : unlitUygula(gltf);
    glbYaz(dosya, gltf, bin);
    console.log('  yazıldı.');
  });

  if (!sadeceKontrol) {
    console.log('\nNot: değişiklikten sonra data/menu.js içindeki ?v=N sürüm');
    console.log('numarasını artırın — telefonlar GLB dosyasını agresif cacheler.');
  }
}

main();
