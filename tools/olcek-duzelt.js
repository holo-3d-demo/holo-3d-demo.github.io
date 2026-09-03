#!/usr/bin/env node
/* =============================================================================
   tools/olcek-duzelt.js — GLB ölçek + origin düzeltici
   -----------------------------------------------------------------------------
   NE İŞE YARAR
   Sayfada <model-viewer ar-scale="fixed"> kullanıyoruz: yemek AR'da modelin
   kendi metre ölçeğiyle çıkar, kullanıcı büyütüp küçültemez. Dolayısıyla model
   yanlış ölçekte export edilmişse AR'da ya masayı kaplar ya da minicik kalır.

   Bu araç GLB'nin mesh verisine DOKUNMAZ. Sahnenin köküne bir sarmalayıcı düğüm
   ekler ve o düğüme scale + translation yazar; böylece model:
     · istenen gerçek dünya genişliğine ölçeklenir (en boy oranı korunur),
     · tabanı Y=0 düzlemine oturur (AR'da havada durmaz / masaya gömülmez),
     · yatayda X=0, Z=0 merkezine gelir (dokunulan noktada belirir).

   KULLANIM
     node tools/olcek-duzelt.js                  # HEDEFLER tablosunu uygular
     node tools/olcek-duzelt.js --kontrol        # hiçbir şey yazmaz, sadece ölçer
     node tools/olcek-duzelt.js smash-burger 0.28   # tek modeli 28 cm'e ayarla

   Orijinaller models/_orijinal/ altında duruyor. Yeniden ölçeklemek gerekirse
   önce oradan geri kopyalayın — yama üst üste uygulanırsa ölçek birikir.
   (Araç zaten yamalanmış dosyayı tanır ve kendi sarmalayıcısını günceller.)
   ========================================================================== */

'use strict';

const fs = require('fs');
const path = require('path');

/* --- Hedef gerçek dünya genişlikleri (metre) -------------------------------
   Yemeğin en geniş yatay ölçüsü. Tabak/kâse çapını yazın.
   Gerçek servis ölçüleriniz farklıysa değiştirilecek tek yer burası.        */
const HEDEFLER = {
  'smash-burger':      0.25,  // 25 cm servis tabağı
  'tavuk-kanat-8':     0.30,  // 30 cm oval kâse
  'kofte-ekmek-arasi': 0.25   // 25 cm servis tabağı
};

const SARMALAYICI_AD = 'ar-olcek-duzeltme'; // tekrar tekrar uygulanmasını önler

/* ===========================================================================
   GLB okuma / yazma
   ======================================================================== */
const JSON_CHUNK = 0x4E4F534A;
const BIN_CHUNK  = 0x004E4942;

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
  if (jsonPad) jsonBuf = Buffer.concat([jsonBuf, Buffer.alloc(jsonPad, 0x20)]); // boşlukla doldur

  const parcalar = [];
  let govdeUzunluk = 8 + jsonBuf.length;

  let binBuf = null;
  if (bin) {
    const binPad = (4 - (bin.length % 4)) % 4;
    binBuf = binPad ? Buffer.concat([bin, Buffer.alloc(binPad, 0)]) : bin;
    govdeUzunluk += 8 + binBuf.length;
  }

  const baslik = Buffer.alloc(12);
  baslik.writeUInt32LE(0x46546C67, 0);      // 'glTF'
  baslik.writeUInt32LE(2, 4);               // sürüm
  baslik.writeUInt32LE(12 + govdeUzunluk, 8);
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
   Sınırlayıcı kutu — düğüm hiyerarşisindeki TRS zincirini uygulayarak
   ======================================================================== */
function birimMatris() { return [1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1]; }

function carp(a, b) { // sütun-öncelikli 4x4, glTF düzeni
  const c = new Array(16).fill(0);
  for (let s = 0; s < 4; s++)
    for (let r = 0; r < 4; r++)
      for (let k = 0; k < 4; k++)
        c[s * 4 + r] += a[k * 4 + r] * b[s * 4 + k];
  return c;
}

function dugumMatrisi(n) {
  if (n.matrix) return n.matrix.slice();
  const [tx, ty, tz] = n.translation || [0, 0, 0];
  const [qx, qy, qz, qw] = n.rotation || [0, 0, 0, 1];
  const [sx, sy, sz] = n.scale || [1, 1, 1];

  const x2 = qx + qx, y2 = qy + qy, z2 = qz + qz;
  const xx = qx * x2, xy = qx * y2, xz = qx * z2;
  const yy = qy * y2, yz = qy * z2, zz = qz * z2;
  const wx = qw * x2, wy = qw * y2, wz = qw * z2;

  return [
    (1 - (yy + zz)) * sx, (xy + wz) * sx, (xz - wy) * sx, 0,
    (xy - wz) * sy, (1 - (xx + zz)) * sy, (yz + wx) * sy, 0,
    (xz + wy) * sz, (yz - wx) * sz, (1 - (xx + yy)) * sz, 0,
    tx, ty, tz, 1
  ];
}

function noktaDonustur(m, p) {
  return [
    m[0] * p[0] + m[4] * p[1] + m[8]  * p[2] + m[12],
    m[1] * p[0] + m[5] * p[1] + m[9]  * p[2] + m[13],
    m[2] * p[0] + m[6] * p[1] + m[10] * p[2] + m[14]
  ];
}

function sinirKutusu(gltf) {
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];

  const gez = (idx, ustMatris) => {
    const n = gltf.nodes[idx];
    const m = carp(ustMatris, dugumMatrisi(n));

    if (n.mesh !== undefined) {
      for (const p of gltf.meshes[n.mesh].primitives) {
        const acc = gltf.accessors[p.attributes.POSITION];
        if (!acc || !acc.min || !acc.max) continue;
        /* Yerel kutunun 8 köşesini dönüştür — dönmüş düğümlerde de doğru olsun */
        for (let k = 0; k < 8; k++) {
          const kose = [
            (k & 1) ? acc.max[0] : acc.min[0],
            (k & 2) ? acc.max[1] : acc.min[1],
            (k & 4) ? acc.max[2] : acc.min[2]
          ];
          const d = noktaDonustur(m, kose);
          for (let i = 0; i < 3; i++) {
            if (d[i] < min[i]) min[i] = d[i];
            if (d[i] > max[i]) max[i] = d[i];
          }
        }
      }
    }
    (n.children || []).forEach((c) => gez(c, m));
  };

  const sahne = gltf.scenes[gltf.scene || 0];
  (sahne.nodes || []).forEach((i) => gez(i, birimMatris()));
  return { min, max };
}

/* ===========================================================================
   Yama
   ======================================================================== */
function sarmalayiciBul(gltf) {
  const sahne = gltf.scenes[gltf.scene || 0];
  if ((sahne.nodes || []).length !== 1) return -1;
  const idx = sahne.nodes[0];
  return gltf.nodes[idx] && gltf.nodes[idx].name === SARMALAYICI_AD ? idx : -1;
}

function duzelt(dosya, hedefGenislik, sadeceKontrol) {
  const { gltf, bin } = glbOku(dosya);
  const ad = path.basename(dosya);

  /* Daha önce yamalandıysa sarmalayıcıyı sıfırla, ölçüyü baştan al —
     yoksa her çalıştırmada ölçek birikir. */
  let sarmalayici = sarmalayiciBul(gltf);
  if (sarmalayici >= 0) {
    gltf.nodes[sarmalayici].scale = [1, 1, 1];
    gltf.nodes[sarmalayici].translation = [0, 0, 0];
  }

  const { min, max } = sinirKutusu(gltf);
  const boyut = [max[0] - min[0], max[1] - min[1], max[2] - min[2]];
  const enGenisYatay = Math.max(boyut[0], boyut[2]);
  const olcek = hedefGenislik / enGenisYatay;

  /* glTF'te TRS sırası T * R * S — önce ölçekle, sonra ötele */
  const ty = -min[1] * olcek;
  const tx = -((min[0] + max[0]) / 2) * olcek;
  const tz = -((min[2] + max[2]) / 2) * olcek;

  const yeniBoyut = boyut.map((v) => v * olcek);

  console.log('=== ' + ad);
  console.log('  önce : ' + (boyut[0] * 100).toFixed(1) + ' x ' + (boyut[1] * 100).toFixed(1) +
              ' x ' + (boyut[2] * 100).toFixed(1) + ' cm | taban Y ' + (min[1] * 100).toFixed(1) + ' cm');
  console.log('  sonra: ' + (yeniBoyut[0] * 100).toFixed(1) + ' x ' + (yeniBoyut[1] * 100).toFixed(1) +
              ' x ' + (yeniBoyut[2] * 100).toFixed(1) + ' cm | taban Y 0.0 cm');
  console.log('  ölçek çarpanı: ×' + olcek.toFixed(4));

  if (sadeceKontrol) { console.log('  (--kontrol: dosya yazılmadı)'); return; }

  if (sarmalayici >= 0) {
    gltf.nodes[sarmalayici].scale = [olcek, olcek, olcek];
    gltf.nodes[sarmalayici].translation = [tx, ty, tz];
  } else {
    const sahne = gltf.scenes[gltf.scene || 0];
    gltf.nodes.push({
      name: SARMALAYICI_AD,
      children: (sahne.nodes || []).slice(),
      scale: [olcek, olcek, olcek],
      translation: [tx, ty, tz]
    });
    sahne.nodes = [gltf.nodes.length - 1];
  }

  glbYaz(dosya, gltf, bin);
  console.log('  yazıldı.');
}

/* ===========================================================================
   Giriş
   ======================================================================== */
function main() {
  const argv = process.argv.slice(2);
  const sadeceKontrol = argv.includes('--kontrol');
  const konum = argv.filter((a) => !a.startsWith('--'));

  let isler;
  if (konum.length >= 2) {
    isler = [[konum[0], parseFloat(konum[1])]];
  } else if (konum.length === 1) {
    isler = [[konum[0], HEDEFLER[konum[0]]]];
  } else {
    isler = Object.entries(HEDEFLER);
  }

  for (const [slug, hedef] of isler) {
    if (!hedef || !isFinite(hedef)) {
      console.error('! ' + slug + ' için hedef genişlik yok — HEDEFLER tablosuna ekleyin.');
      continue;
    }
    const dosya = path.join('models', slug + '.glb');
    if (!fs.existsSync(dosya)) { console.error('! bulunamadı: ' + dosya); continue; }
    duzelt(dosya, hedef, sadeceKontrol);
  }
}

main();
