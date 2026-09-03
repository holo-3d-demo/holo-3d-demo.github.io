/* =============================================================================
   js/app.js — [MARKA ADI] 3D/AR menü
   -----------------------------------------------------------------------------
   Sorumluluklar:
     · data/menu.js içindeki MENU dizisinden kartları ve yazılı menüyü üretmek
     · kategori sekmeleriyle filtreleme (URL hash senkronu)
     · fotoğraf ⇄ 3D geçişi ve AR oturumunu başlatma
     · ürün detay modalı (focus trap, ESC, dış tıklama)
     · AR desteği tespiti — desteklenmeyen cihazda QR notuna düşmek

   YÜKLEME STRATEJİSİ
   Kartlar varsayılan olarak FOTOĞRAF gösterir; <model-viewer> DOM'a hiç
   eklenmez. 3D ancak kullanıcı "3D Gör" ya da "Masamda Gör"e bastığında
   üretilir — yani sayfa açılışında tek bir GLB bile indirilmez.

   Global kirlilik yok: her şey tek IIFE içinde.
   ========================================================================== */
(function () {
  'use strict';

  /* ===========================================================================
     Yardımcılar
     ======================================================================== */
  const $  = (secici, kok = document) => kok.querySelector(secici);
  const $$ = (secici, kok = document) => Array.from(kok.querySelectorAll(secici));

  /** HTML'e gömülen metinleri kaçır — veri dosyası bizim olsa da alışkanlık iyi. */
  function kacir(metin) {
    return String(metin == null ? '' : metin)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  /** 595 → "595 ₺" */
  const fiyatYaz = (tutar) => tutar.toLocaleString('tr-TR') + ' ₺';

  const hareketAzalt = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ===========================================================================
     Marka bilgilerini sayfaya bas (tek yerden: SITE)
     ======================================================================== */
  function markaBilgileriniDoldur() {
    $$('[data-marka]').forEach((el) => { el.innerHTML = kacir(SITE.marka) + '<span>.</span>'; });
    $$('[data-marka-duz]').forEach((el) => { el.textContent = SITE.marka; });
    $$('[data-tel]').forEach((el) => { el.href = 'tel:' + SITE.telefon; });
    $$('[data-tel-gosterim]').forEach((el) => { el.textContent = SITE.telefonGosterim; });
    $$('[data-harita]').forEach((el) => { el.href = SITE.harita; });
    $$('[data-adres]').forEach((el) => { el.textContent = SITE.adres; });
    $$('[data-konum]').forEach((el) => { el.textContent = SITE.konum; });
    $$('[data-calisma]').forEach((el) => { el.textContent = SITE.calismaSaati; });
    $('#yil').textContent = new Date().getFullYear();

    document.title = SITE.marka + ' — 3D Menü | Yemeği masanızda görün';
  }

  /* ===========================================================================
     FİYAT
     ---------------------------------------------------------------------------
     Ürünün kendi fiyatı büyük; kutu içecekle birlikte menü fiyatı altında
     küçük satır olarak ("+ kutu içecekle 645 ₺").
     ======================================================================== */
  function fiyatHtml(urun) {
    if (urun.fiyat == null) {
      return '<div class="kart__fiyat"><span class="fiyat-bekleniyor">Fiyat bilgisi yakında</span></div>';
    }
    const menuFiyat = urun.icecekliFiyat
      ? `<span class="fiyat-menu">+ kutu içecekle ${fiyatYaz(urun.icecekliFiyat)}</span>` : '';
    return `<div class="kart__fiyat">
              <span class="fiyat">${fiyatYaz(urun.fiyat)}</span>${menuFiyat}
            </div>`;
  }

  /* ===========================================================================
     SAHNE — fotoğraf (varsayılan) ⇄ 3D model
     ---------------------------------------------------------------------------
     ar-scale="fixed"  → yemek gerçek boyutunda çıkar, kullanıcı ölçeği bozamaz.
     ar-placement="floor" → model yatay yüzeye oturur.
       NOT: masa üstü yerleşimin doğru görünmesi model dosyasına bağlıdır:
       (1) origin tabağın ALTINDA, (2) metre ölçeği (25 cm tabak = 0.25 birim),
       (3) Y-up eksen düzeni. Ayrıntı: models/README.md
     ======================================================================== */
  function fotoHtml(urun) {
    if (!urun.foto) {
      return `
        <div class="foto-yok">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true">
            <rect x="3" y="4" width="18" height="16" rx="2"/>
            <circle cx="8.5" cy="9.5" r="1.5"/>
            <path d="m21 16-4.5-4.5L9 19"/>
            <path d="m3 3 18 18"/>
          </svg>
          <span>Bu ürün için fotoğraf yok</span>
          ${urun.glb ? '<small>3D modeli mevcut — “3D Gör”e basın</small>' : ''}
        </div>`;
    }
    return `<img class="kart__foto" src="${kacir(urun.foto)}"
                 alt="${kacir(urun.ad)} ürününün fotoğrafı" loading="lazy" decoding="async">`;
  }

  function modelHtml(urun) {
    const usdz = urun.usdz ? ` ios-src="${kacir(urun.usdz)}"` : '';
    return `
      <model-viewer
        src="${kacir(urun.glb)}"${usdz}
        alt="${kacir(urun.ad)} ürününün üç boyutlu modeli — sürükleyerek çevirebilirsiniz"
        ar
        ar-modes="webxr scene-viewer quick-look"
        ar-scale="fixed"
        ar-placement="floor"
        camera-controls
        touch-action="pan-y"
        shadow-intensity="1"
        exposure="0.9"
        environment-image="neutral"
        reveal="auto"></model-viewer>
      <span class="sahne__ipucu">360° · sürükleyin</span>
      <div class="model-durumu" role="status" aria-live="polite">
        <span class="model-durumu__nokta" aria-hidden="true"></span>
        <span>3D model yükleniyor…</span>
      </div>`;
  }

  /** Sahne kabuğu: içinde fotoğraf ya da (butona basılınca) model durur. */
  function sahneHtml(urun) {
    return `<div class="kart__sahne" data-sahne="${kacir(urun.id)}">${fotoHtml(urun)}</div>`;
  }

  /** Bir butonun hangi sahneyi hedeflediğini bulur (kart içi ya da modal). */
  function sahneBul(btn) {
    const kart = btn.closest('.kart');
    return kart ? kart.querySelector('[data-sahne]')
                : $('#modal-sahne [data-sahne]');
  }

  /** arBaslat=true ise model yüklenir yüklenmez AR oturumu açılır. */
  function modeliAc(sahne, urun, arBaslat) {
    if (!urun.glb) return;

    if (!sahne.querySelector('model-viewer')) {
      sahne.removeAttribute('data-yuklendi');
      sahne.removeAttribute('data-model-hata');
      sahne.innerHTML = modelHtml(urun);
      modelDurumunuBagla(sahne);
      geriDonButonunuEkle(sahne, urun);
    }

    if (!arBaslat) return;
    const mv = sahne.querySelector('model-viewer');
    const baslat = () => { if (mv.canActivateAR) mv.activateAR(); };
    mv.loaded ? baslat() : mv.addEventListener('load', baslat, { once: true });
  }

  function geriDonButonunuEkle(sahne, urun) {
    if (sahne.querySelector('.sahne__geri')) return;
    const btn = document.createElement('button');
    btn.className = 'sahne__geri';
    btn.type = 'button';
    btn.setAttribute('aria-label', urun.foto ? 'Fotoğrafa dön' : '3D görünümü kapat');
    btn.textContent = urun.foto ? 'Fotoğraf' : 'Kapat';
    btn.addEventListener('click', () => { sahne.innerHTML = fotoHtml(urun); });
    sahne.appendChild(btn);
  }

  /** Model yüklenirken yalnızca hafif bir metin göster; ek görsel indirme. */
  function modelDurumunuBagla(sahne) {
    const mv = sahne.querySelector('model-viewer');
    if (!mv) return;

    const kapat = () => sahne.setAttribute('data-yuklendi', 'true');
    const hata = () => {
      sahne.setAttribute('data-model-hata', 'true');
      const metin = sahne.querySelector('.model-durumu span:last-child');
      if (metin) metin.textContent = '3D model şu anda açılamıyor';
    };

    if (mv.loaded) kapat();
    mv.addEventListener('load', kapat, { once: true });
    mv.addEventListener('error', hata, { once: true });
  }

  /* ===========================================================================
     KARTLAR
     ======================================================================== */
  function kartHtml(urun) {
    const rozet = urun.rozet ? `<span class="rozet">${kacir(urun.rozet)}</span>` : '';
    const aksiyonlar = urun.glb ? `
      <button class="btn btn--ikincil" type="button" data-uc-boyut="${kacir(urun.id)}"
              aria-label="${kacir(urun.ad)} ürününün 3D modelini aç">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
          <path d="M12 2 3 7v10l9 5 9-5V7z"/><path d="m3 7 9 5 9-5M12 12v10"/>
        </svg>
        3D Gör
      </button>
      <button class="btn btn--birincil" type="button" data-ar-ac="${kacir(urun.id)}"
              aria-label="${kacir(urun.ad)} ürününü masanızda görün">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
          <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
          <circle cx="12" cy="13" r="4"/>
        </svg>
        Masamda Gör
      </button>` : '<p class="uc-boyut-yok">Bu ürün için şu anda 3D model yok.</p>';
    return `
      <article class="kart beliren" data-urun-kart="${kacir(urun.id)}">
        ${sahneHtml(urun)}
        <div class="kart__govde">
          <div class="kart__ust-sira">${rozet}</div>
          <h3 class="kart__ad">${kacir(urun.ad)}</h3>
          <p class="kart__aciklama">${kacir(urun.aciklama)}</p>
          ${fiyatHtml(urun)}
          <div class="kart__butonlar">
            ${aksiyonlar}
          </div>
        </div>
      </article>`;
  }

  /** 3D modeli olmayan kalem (içecek vb.) → kompakt satır */
  function satirHtml(urun) {
    return `
      <div class="satir beliren">
        <img class="satir__ikon" src="${kacir(urun.poster)}" alt="" aria-hidden="true">
        <div class="satir__metin">
          <div class="satir__ad">${kacir(urun.ad)}</div>
          <div class="satir__aciklama">${kacir(urun.aciklama)}</div>
        </div>
        <div class="satir__fiyat">${fiyatYaz(urun.fiyat)}</div>
      </div>`;
  }

  /* ===========================================================================
     SEKMELER VE MENÜ IZGARASI
     ======================================================================== */
  const SEKMELER = [{ id: 'tumu', ad: 'Tümü' }].concat(KATEGORILER);

  function sekmeleriRenderla() {
    $('#sekmeler').innerHTML = SEKMELER.map((kat) => `
      <button class="sekme" type="button" role="tab" id="sekme-${kat.id}"
              data-kategori="${kat.id}" aria-selected="false">${kacir(kat.ad)}</button>`).join('');
  }

  function menuyuRenderla(kategoriId) {
    const urunler = kategoriId === 'tumu'
      ? MENU
      : MENU.filter((u) => u.kategori === kategoriId);

    const kartUrunleri = urunler.filter((u) => u.kategori !== 'icecekler');
    const kompaktUrunler = urunler.filter((u) => u.kategori === 'icecekler');

    let html = '';
    if (kartUrunleri.length) html += `<div class="izgara">${kartUrunleri.map(kartHtml).join('')}</div>`;
    if (kompaktUrunler.length) html += `<div class="satirlar">${kompaktUrunler.map(satirHtml).join('')}</div>`;
    if (!html) html = '<p class="bos-durum">Bu kategoride şimdilik ürün yok.</p>';

    const izgara = $('#menu-izgara');
    izgara.innerHTML = html;
    izgara.setAttribute('aria-labelledby', 'sekme-' + kategoriId);

    $$('.sekme').forEach((s) => {
      s.setAttribute('aria-selected', String(s.dataset.kategori === kategoriId));
    });

    belirmeyiBagla(izgara);
    arButonlariniUygula(izgara);
  }

  /* ===========================================================================
     YAZILI MENÜ — menünün tamamı, kategori kategori düz metin
     ======================================================================== */
  function yaziliMenuyuRenderla() {
    $('#yazili-izgara').innerHTML = KATEGORILER.map((kat) => {
      const urunler = MENU.filter((u) => u.kategori === kat.id);
      if (!urunler.length) return '';

      const satirlar = urunler.map((urun) => {
        const menuFiyat = urun.fiyat != null && urun.icecekliFiyat
          ? `<span class="fiyat-menu">+ kutu içecekle ${fiyatYaz(urun.icecekliFiyat)}</span>` : '';
        return `
          <li class="yazili__satir">
            <span class="yazili__ad">${kacir(urun.ad)}</span>
            <span class="yazili__nokta" aria-hidden="true"></span>
            <span class="yazili__fiyatlar">
              <span class="yazili__fiyat">${urun.fiyat == null ? '—' : fiyatYaz(urun.fiyat)}</span>
              ${menuFiyat}
            </span>
          </li>`;
      }).join('');

      return `
        <section class="yazili__grup beliren">
          <h3 class="yazili__baslik">${kacir(kat.ad)}</h3>
          <ul>${satirlar}</ul>
        </section>`;
    }).join('');
  }

  /* ===========================================================================
     AR DESTEĞİ
     ---------------------------------------------------------------------------
     Kartlar açılışta model-viewer içermediği için desteği bileşenden okuyamayız;
     cihazı doğrudan yokluyoruz. Sonuç bir kez hesaplanıp önbelleğe alınır.
     ======================================================================== */
  const iOSCihaz = /iPhone|iPad|iPod/.test(navigator.userAgent) ||
                   (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

  let arDestekSozu = null;

  function arDestekleniyorMu() {
    if (arDestekSozu) return arDestekSozu;

    arDestekSozu = (async () => {
      /* 1) WebXR — Android Chrome ve XR tarayıcıları */
      if (navigator.xr && navigator.xr.isSessionSupported) {
        try {
          if (await navigator.xr.isSessionSupported('immersive-ar')) return true;
        } catch (hata) { /* yoksay, diğer yollara bak */ }
      }
      /* 2) iOS AR Quick Look — <a rel="ar"> desteğiyle anlaşılır */
      if (iOSCihaz) {
        const baglanti = document.createElement('a');
        return !!(baglanti.relList && baglanti.relList.supports && baglanti.relList.supports('ar'));
      }
      /* 3) Android Scene Viewer — intent ile açılır, WebXR olmasa da çalışır */
      if (/Android/.test(navigator.userAgent)) return true;

      return false;
    })();

    return arDestekSozu;
  }

  function arButonlariniUygula(kok) {
    arDestekleniyorMu().then((destek) => {
      $$('[data-ar-ac]', kok).forEach((btn) => {
        const urun = MENU.find((u) => u.id === btn.dataset.arAc);
        if (!destek) { btn.replaceWith(arNotuOlustur('masaustu')); return; }
        /* iOS'ta AR Quick Look yalnızca ios-src (USDZ) ile açılır */
        if (iOSCihaz && urun && !urun.usdz) btn.replaceWith(arNotuOlustur('ios'));
      });
    });
  }

  function arNotuOlustur(tur) {
    const not = document.createElement('div');
    not.className = 'ar-yok';
    not.innerHTML = tur === 'ios'
      ? `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
           <circle cx="12" cy="12" r="9"/><path d="M12 9v4M12 17h.01"/>
         </svg>
         <span>Bu ürünün iOS modeli (USDZ) hazırlanıyor</span>`
      : `<img src="img/qr-yer-tutucu.svg" alt="Sayfayı telefonda açmak için QR kod (yer tutucu)">
         <span>AR için telefonunuzla açın</span>`;
    return not;
  }

  /* ===========================================================================
     MODAL
     ======================================================================== */
  const modal      = $('#modal');
  const modalKutu  = $('#modal-kutu');
  const modalSahne = $('#modal-sahne');
  const modalGovde = $('#modal-govde');
  const modalKapat = $('#modal-kapat');
  let sonOdak = null;

  function modalAc(urunId) {
    const urun = MENU.find((u) => u.id === urunId);
    if (!urun) return;

    sonOdak = document.activeElement;

    modalSahne.innerHTML = sahneHtml(urun);

    const malzemeler = urun.icindekiler
      ? `<p class="modal__baslik-kucuk">İçindekiler</p>
         <ul class="malzemeler">${urun.icindekiler.map((m) => `<li>${kacir(m)}</li>`).join('')}</ul>` : '';
    const alerjen = urun.alerjen
      ? `<p class="alerjen-not"><strong>Alerjen notu:</strong> ${kacir(urun.alerjen)}</p>` : '';
    const rozet = urun.rozet ? `<span class="rozet">${kacir(urun.rozet)}</span>` : '';

    modalGovde.innerHTML = `
      <div class="kart__ust-sira">${rozet}</div>
      <h2 id="modal-baslik">${kacir(urun.ad)}</h2>
      <p class="modal__aciklama">${kacir(urun.detay || urun.aciklama)}</p>
      ${malzemeler}
      ${alerjen}
      <div class="modal__alt">
        ${fiyatHtml(urun)}
        ${urun.glb ? `
          <div class="modal__butonlar">
            <button class="btn btn--ikincil" type="button" data-uc-boyut="${kacir(urun.id)}"
                    aria-label="${kacir(urun.ad)} ürününün 3D modelini aç">3D Gör</button>
            <button class="btn btn--birincil" type="button" data-ar-ac="${kacir(urun.id)}"
                    aria-label="${kacir(urun.ad)} ürününü masanızda görün">Masamda Gör</button>
          </div>` : ''}
      </div>`;

    modal.hidden = false;
    document.body.classList.add('kilitli');
    modalKapat.focus();

    arButonlariniUygula(modalGovde);
  }

  function modalKapatislemi() {
    modal.hidden = true;
    document.body.classList.remove('kilitli');
    /* model-viewer'ı temizle — arka planda render etmeye devam etmesin */
    modalSahne.innerHTML = '';
    modalGovde.innerHTML = '';
    if (sonOdak) sonOdak.focus();
  }

  /** Sekme dolaşımını modal içinde tutar. */
  function odagiHapset(olay) {
    const odaklanabilir = $$(
      'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"]), input, select, textarea',
      modalKutu
    ).filter((el) => el.offsetParent !== null || el === document.activeElement);
    if (!odaklanabilir.length) return;

    const ilk = odaklanabilir[0];
    const son = odaklanabilir[odaklanabilir.length - 1];

    if (olay.shiftKey && document.activeElement === ilk) {
      olay.preventDefault(); son.focus();
    } else if (!olay.shiftKey && document.activeElement === son) {
      olay.preventDefault(); ilk.focus();
    }
  }

  /* ===========================================================================
     BELİRME ANİMASYONU
     ======================================================================== */
  let gozlemci = null;

  function belirmeyiBagla(kok = document) {
    const hedefler = $$('.beliren:not(.gorunur)', kok);

    if (hareketAzalt || !('IntersectionObserver' in window)) {
      hedefler.forEach((el) => el.classList.add('gorunur'));
      return;
    }

    if (!gozlemci) {
      gozlemci = new IntersectionObserver((girisler) => {
        girisler.forEach((giris) => {
          if (!giris.isIntersecting) return;
          giris.target.classList.add('gorunur');
          gozlemci.unobserve(giris.target);
        });
      }, { rootMargin: '0px 0px -6% 0px', threshold: 0.05 });
    }

    hedefler.forEach((el) => gozlemci.observe(el));
  }

  /* ===========================================================================
     OLAY BAĞLARI
     ======================================================================== */
  function olaylariBagla() {
    /* Kategori sekmeleri — sayfa yenilenmez, hash güncellenir */
    $('#sekmeler').addEventListener('click', (olay) => {
      const sekme = olay.target.closest('.sekme');
      if (!sekme) return;
      menuyuRenderla(sekme.dataset.kategori);
      history.replaceState(null, '', '#kategori=' + sekme.dataset.kategori);
    });

    /* Sekmelerde ok tuşuyla gezinme (WAI-ARIA tablist davranışı) */
    $('#sekmeler').addEventListener('keydown', (olay) => {
      if (olay.key !== 'ArrowRight' && olay.key !== 'ArrowLeft') return;
      const sekmeler = $$('.sekme');
      const simdiki = sekmeler.indexOf(document.activeElement);
      if (simdiki < 0) return;
      const yon = olay.key === 'ArrowRight' ? 1 : -1;
      sekmeler[(simdiki + yon + sekmeler.length) % sekmeler.length].focus();
      olay.preventDefault();
    });

    document.addEventListener('click', (olay) => {
      /* "3D Gör" → sahnedeki fotoğrafın yerine modeli getirir */
      const ucBoyutBtn = olay.target.closest('[data-uc-boyut]');
      if (ucBoyutBtn) {
        const urun = MENU.find((u) => u.id === ucBoyutBtn.dataset.ucBoyut);
        const sahne = sahneBul(ucBoyutBtn);
        if (urun && sahne) modeliAc(sahne, urun, false);
        return;
      }

      /* "Masamda Gör" → modeli yükler ve hazır olur olmaz AR oturumunu açar */
      const arBtn = olay.target.closest('[data-ar-ac]');
      if (arBtn) {
        const urun = MENU.find((u) => u.id === arBtn.dataset.arAc);
        const sahne = sahneBul(arBtn);
        if (urun && sahne) modeliAc(sahne, urun, true);
        return;
      }

      /* Kart gövdesi ve ürün fotoğrafı → detay modalı.
         3D sahnesi hariç: orada kullanıcı modeli çeviriyor olabilir. */
      const acilir = olay.target.closest('.kart__govde, .kart .kart__foto');
      if (acilir && !olay.target.closest('button')) {
        const kart = acilir.closest('[data-urun-kart]');
        if (kart) modalAc(kart.dataset.urunKart);
      }
    });

    /* Modal kapatma: buton, dış tıklama, ESC */
    modalKapat.addEventListener('click', modalKapatislemi);
    modal.addEventListener('click', (olay) => { if (olay.target === modal) modalKapatislemi(); });
    document.addEventListener('keydown', (olay) => {
      if (modal.hidden) return;
      if (olay.key === 'Escape') modalKapatislemi();
      if (olay.key === 'Tab') odagiHapset(olay);
    });
  }

  /* ===========================================================================
     BAŞLANGIÇ
     ======================================================================== */
  function baslangicKategorisi() {
    const eslesme = location.hash.match(/kategori=([\w-]+)/);
    const istenen = eslesme && eslesme[1];
    return SEKMELER.some((k) => k.id === istenen) ? istenen : 'tumu';
  }

  function baslat() {
    markaBilgileriniDoldur();
    sekmeleriRenderla();
    menuyuRenderla(baslangicKategorisi());
    yaziliMenuyuRenderla();
    olaylariBagla();
    belirmeyiBagla();
  }

  document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', baslat)
    : baslat();
})();
