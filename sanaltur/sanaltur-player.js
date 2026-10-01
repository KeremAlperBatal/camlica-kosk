/*
 * Sanal Tur Player
 * Hem editörde hem de export edilen turlarda kullanılan ortak çalışma zamanı.
 * Düz (classic) bir script olarak yazıldı: import/export kullanmaz, window.SanalTur tanımlar.
 * Bu sayede export edilen HTML'e olduğu gibi gömülebilir ve internetsiz çalışır.
 * Eski telefon tarayıcıları için bilerek ES5 sözdizimiyle yazıldı.
 */
/* global pannellum */
(function (window, document) {
    'use strict';

    var BASE_SIZE = 32;

    // Nokta ikonları: yuvarlak zemin üzerinde beyaz çizim. Zemin rengi temaya göre değişebilir.
    var STROKE = " fill='none' stroke='white' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'";
    var GLYPHS = {
        // Geçiş noktaları
        arrow: "<path d='M8 12l4-4 4 4M12 8v8'" + STROKE + "/>",
        floor: null, // zemin halkası (aşağıda özel çizilir)
        door: "<path d='M8 18V6h8v12M6 18h12'" + STROKE + "/><circle cx='13.6' cy='12.4' r='1' fill='white'/>",
        'stairs-up': "<path d='M6 17h3v-3h3v-3h3v-3h3'" + STROKE + "/><path d='M13 7l3-3 3 3'" + STROKE + "/>",
        'stairs-down': "<path d='M6 8h3v3h3v3h3v3h3'" + STROKE + "/><path d='M13 17l3 3 3-3'" + STROKE + "/>",
        // Bilgi noktaları
        info: "<path d='M12 16.5v-5'" + STROKE.replace("stroke-width='2'", "stroke-width='2.6'") + "/><circle cx='12' cy='7.6' r='1.5' fill='white'/>",
        camera: "<path d='M6 9h3l1.5-2h3L15 9h3v8H6z'" + STROKE + "/><circle cx='12' cy='13' r='2.4'" + STROKE + "/>",
        star: "<path d='M12 6l1.8 3.7 4 .6-2.9 2.8.7 4L12 15.2 8.4 17.1l.7-4-2.9-2.8 4-.6z'" + STROKE + "/>",
        tag: "<path d='M6 6h6l6 6-6 6-6-6z'" + STROKE + "/><circle cx='9.2' cy='9.2' r='1.1' fill='white'/>",
        question: "<path d='M9.5 9.5a2.5 2.5 0 1 1 3.6 2.2c-.7.4-1.1.9-1.1 1.8'" + STROKE + "/><circle cx='12' cy='16.8' r='1.2' fill='white'/>",
        warning: "<path d='M12 6l7 12H5z'" + STROKE + "/><path d='M12 10.5v3.5'" + STROKE + "/><circle cx='12' cy='16' r='.9' fill='white'/>"
    };
    var ICON_TYPES = {
        scene: ['arrow', 'floor', 'door', 'stairs-up', 'stairs-down'],
        info: ['info', 'camera', 'star', 'tag', 'question', 'warning']
    };
    var DARK_DISC = 'rgba(0,0,0,0.55)';
    var iconCache = {};

    function hexToRgba(hex, alpha) {
        var m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex || '');
        return m ? 'rgba(' + parseInt(m[1], 16) + ',' + parseInt(m[2], 16) + ',' + parseInt(m[3], 16) + ',' + alpha + ')' : DARK_DISC;
    }

    // CSS background-image değeri
    function iconUrl(key, disc) {
        disc = disc || DARK_DISC;
        var cacheKey = key + '|' + disc;
        if (iconCache[cacheKey]) return iconCache[cacheKey];
        var body = key === 'floor'
            ? "<circle cx='12' cy='12' r='9.5' fill='" + disc.replace(/[\d.]+\)$/, '0.25)') + "' stroke='white' stroke-width='2.4'/><circle cx='12' cy='12' r='2.6' fill='white'/>"
            : "<circle cx='12' cy='12' r='10.5' fill='" + disc + "' stroke='white' stroke-width='1.5'/>" + (GLYPHS[key] || GLYPHS.info);
        var svg = "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'>" + body + '</svg>';
        iconCache[cacheKey] = 'url("data:image/svg+xml,' + encodeURIComponent(svg) + '")';
        return iconCache[cacheKey];
    }

    // Noktanın ikonu: seçilen ikon (yoksa türünün varsayılanı), zemin rengi temadan
    function hotspotIcon(hs, tour) {
        var type = hs.type === 'scene' ? 'scene' : 'info';
        var key = ICON_TYPES[type].indexOf(hs.icon) >= 0 ? hs.icon : ICON_TYPES[type][0];
        // Tur verisinde tour.theme, editörde proje nesnesinde settings.theme bulunur
        var theme = (tour && (tour.theme || (tour.settings && tour.settings.theme))) || {};
        return iconUrl(key, theme.hotspotStyle === 'accent' && theme.accent ? hexToRgba(theme.accent, 0.85) : DARK_DISC);
    }


    // ------------------------------------------------------------------
    // Arayüz metinleri (turun dili). İçerik çevirileri tur verisindeki i18n.texts içindedir.
    // ------------------------------------------------------------------

    var LANGUAGE_NAMES = { tr: 'Türkçe', en: 'English', de: 'Deutsch', fr: 'Français', es: 'Español', ru: 'Русский' };

    var STRINGS = {
        tr: {
            start: '▶ Turu Başlat', loading: 'Yükleniyor…', close: 'Kapat', details: 'Detaylar için tıklayın',
            photo: '📷 Fotoğraf', video: '🎬 Video', link: '🔗 Bağlantı', openLink: '🔗 Bağlantıyı aç', goTo: 'Git: ',
            autoTour: 'Otomatik tur', stopAutoTour: 'Otomatik turu durdur', rooms: 'Oda listesi', fullscreen: 'Tam ekran',
            gyro: 'Telefonu çevirerek etrafa bakın', call: 'Ara', whatsapp: 'WhatsApp ile yazın', email: 'E-posta',
            website: 'Web sitesi', copyLink: 'Bu odanın bağlantısını kopyala', copied: 'Bağlantı kopyalandı',
            mapBigger: 'Haritayı büyüt', mapSmaller: 'Haritayı küçült', noPhotos: 'Bu turda hiç fotoğraf yok.',
            fileNotFound: 'Fotoğraf dosyası bulunamadı: ', language: 'Dil',
            mute: 'Sesi kapat', unmute: 'Sesi aç', narration: 'Anlatımı dinle',
            webFile: 'Bu paket bir web sitesine yüklenmek için hazırlandı; bilgisayarda çift tıklayarak açıldığında tarayıcı fotoğrafları engeller.\n\nTuru bilgisayarda açmak için editörden "Uygulama" export\'unu kullanın.'
        },
        en: {
            start: '▶ Start tour', loading: 'Loading…', close: 'Close', details: 'Click for details',
            photo: '📷 Photo', video: '🎬 Video', link: '🔗 Link', openLink: '🔗 Open link', goTo: 'Go to: ',
            autoTour: 'Auto tour', stopAutoTour: 'Stop auto tour', rooms: 'Rooms', fullscreen: 'Fullscreen',
            gyro: 'Look around by moving your phone', call: 'Call', whatsapp: 'Message on WhatsApp', email: 'Email',
            website: 'Website', copyLink: 'Copy link to this room', copied: 'Link copied',
            mapBigger: 'Enlarge map', mapSmaller: 'Shrink map', noPhotos: 'This tour has no photos.',
            fileNotFound: 'Photo file not found: ', language: 'Language',
            mute: 'Mute', unmute: 'Unmute', narration: 'Play narration',
            webFile: 'This package is meant to be uploaded to a website; browsers block its photos when it is opened by double-clicking.\n\nTo view the tour on a computer, use the "Uygulama" (App) export in the editor.'
        },
        de: {
            start: '▶ Rundgang starten', loading: 'Wird geladen…', close: 'Schließen', details: 'Für Details klicken',
            photo: '📷 Foto', video: '🎬 Video', link: '🔗 Link', openLink: '🔗 Link öffnen', goTo: 'Gehe zu: ',
            autoTour: 'Automatischer Rundgang', stopAutoTour: 'Automatischen Rundgang stoppen', rooms: 'Räume', fullscreen: 'Vollbild',
            gyro: 'Umsehen durch Bewegen des Handys', call: 'Anrufen', whatsapp: 'Per WhatsApp schreiben', email: 'E-Mail',
            website: 'Webseite', copyLink: 'Link zu diesem Raum kopieren', copied: 'Link kopiert',
            mapBigger: 'Karte vergrößern', mapSmaller: 'Karte verkleinern', noPhotos: 'Dieser Rundgang enthält keine Fotos.',
            fileNotFound: 'Fotodatei nicht gefunden: ', language: 'Sprache',
            mute: 'Ton aus', unmute: 'Ton an', narration: 'Erzählung abspielen',
            webFile: 'Dieses Paket ist für eine Webseite gedacht; beim Öffnen per Doppelklick blockiert der Browser die Fotos.\n\nUm den Rundgang am Computer anzusehen, verwenden Sie im Editor den Export „Uygulama“ (App).'
        },
        fr: {
            start: '▶ Commencer la visite', loading: 'Chargement…', close: 'Fermer', details: 'Cliquez pour les détails',
            photo: '📷 Photo', video: '🎬 Vidéo', link: '🔗 Lien', openLink: '🔗 Ouvrir le lien', goTo: 'Aller à : ',
            autoTour: 'Visite automatique', stopAutoTour: 'Arrêter la visite automatique', rooms: 'Pièces', fullscreen: 'Plein écran',
            gyro: 'Regardez autour en bougeant votre téléphone', call: 'Appeler', whatsapp: 'Écrire sur WhatsApp', email: 'E-mail',
            website: 'Site web', copyLink: 'Copier le lien de cette pièce', copied: 'Lien copié',
            mapBigger: 'Agrandir le plan', mapSmaller: 'Réduire le plan', noPhotos: 'Cette visite ne contient aucune photo.',
            fileNotFound: 'Fichier photo introuvable : ', language: 'Langue',
            mute: 'Couper le son', unmute: 'Activer le son', narration: 'Écouter la narration',
            webFile: 'Ce paquet est destiné à un site web ; le navigateur bloque les photos lorsqu’on l’ouvre par double-clic.\n\nPour voir la visite sur un ordinateur, utilisez l’export « Uygulama » (application) de l’éditeur.'
        },
        es: {
            start: '▶ Iniciar recorrido', loading: 'Cargando…', close: 'Cerrar', details: 'Haz clic para ver detalles',
            photo: '📷 Foto', video: '🎬 Vídeo', link: '🔗 Enlace', openLink: '🔗 Abrir enlace', goTo: 'Ir a: ',
            autoTour: 'Recorrido automático', stopAutoTour: 'Detener recorrido automático', rooms: 'Estancias', fullscreen: 'Pantalla completa',
            gyro: 'Mira alrededor moviendo el teléfono', call: 'Llamar', whatsapp: 'Escribir por WhatsApp', email: 'Correo',
            website: 'Sitio web', copyLink: 'Copiar enlace de esta estancia', copied: 'Enlace copiado',
            mapBigger: 'Ampliar plano', mapSmaller: 'Reducir plano', noPhotos: 'Este recorrido no tiene fotos.',
            fileNotFound: 'No se encontró el archivo de foto: ', language: 'Idioma',
            mute: 'Silenciar', unmute: 'Activar sonido', narration: 'Escuchar la narración',
            webFile: 'Este paquete está pensado para un sitio web; el navegador bloquea las fotos al abrirlo con doble clic.\n\nPara ver el recorrido en un ordenador, usa la exportación «Uygulama» (aplicación) del editor.'
        },
        ru: {
            start: '▶ Начать тур', loading: 'Загрузка…', close: 'Закрыть', details: 'Нажмите, чтобы узнать больше',
            photo: '📷 Фото', video: '🎬 Видео', link: '🔗 Ссылка', openLink: '🔗 Открыть ссылку', goTo: 'Перейти: ',
            autoTour: 'Автотур', stopAutoTour: 'Остановить автотур', rooms: 'Комнаты', fullscreen: 'Во весь экран',
            gyro: 'Осматривайтесь, поворачивая телефон', call: 'Позвонить', whatsapp: 'Написать в WhatsApp', email: 'Эл. почта',
            website: 'Сайт', copyLink: 'Скопировать ссылку на эту комнату', copied: 'Ссылка скопирована',
            mapBigger: 'Увеличить план', mapSmaller: 'Уменьшить план', noPhotos: 'В этом туре нет фотографий.',
            fileNotFound: 'Файл фотографии не найден: ', language: 'Язык',
            mute: 'Выключить звук', unmute: 'Включить звук', narration: 'Прослушать рассказ',
            webFile: 'Этот пакет предназначен для сайта; при открытии двойным щелчком браузер блокирует фотографии.\n\nЧтобы посмотреть тур на компьютере, используйте в редакторе экспорт «Uygulama» (приложение).'
        }
    };

    // Turun dillerinden hangisiyle açılacağı: istenen > adresteki ?dil=xx > tarayıcının dili > ana dil
    function pickLanguage(requested, languages, primary) {
        if (requested && languages.indexOf(requested) >= 0) return requested;
        var match = /[?&](?:dil|lang)=([a-z]{2})/i.exec(window.location.search || '');
        if (match && languages.indexOf(match[1].toLowerCase()) >= 0) return match[1].toLowerCase();
        var prefs = window.navigator.languages || [window.navigator.language || ''];
        for (var i = 0; i < prefs.length; i++) {
            var code = String(prefs[i] || '').slice(0, 2).toLowerCase();
            if (languages.indexOf(code) >= 0) return code;
        }
        return primary;
    }

    // İçerik çevirisi: anahtar (ör. 'scene:<id>') için o dildeki metin, yoksa ana dildeki metin
    function translator(tour, lang) {
        var texts = (tour.i18n && tour.i18n.texts && tour.i18n.texts[lang]) || {};
        return function (key, fallback) {
            var value = texts[key];
            return value && String(value).trim() ? value : fallback;
        };
    }

    // ------------------------------------------------------------------
    // Küçük yardımcılar
    // ------------------------------------------------------------------

    function el(tag, className, text) {
        var node = document.createElement(tag);
        if (className) node.className = className;
        if (text != null) node.textContent = text;
        return node;
    }

    function button(className, text, title, onClick) {
        var node = el('button', className, text);
        node.type = 'button';
        if (title) {
            node.title = title;
            node.setAttribute('aria-label', title);
        }
        node.addEventListener('click', onClick);
        return node;
    }

    function normalizeYaw(yaw) {
        return ((((yaw + 180) % 360) + 360) % 360) - 180;
    }

    // Sadece güvenli bağlantılara izin ver; şemasız yazılanlara https:// ekle.
    function safeLink(link) {
        var value = String(link || '').trim();
        if (!value) return '';
        if (/^(https?:|mailto:|tel:)/i.test(value)) return value;
        if (/^[a-z][a-z0-9+.-]*:/i.test(value)) return '';
        return 'https://' + value;
    }

    var TR_MAP = { 'ç': 'c', 'ğ': 'g', 'ı': 'i', 'İ': 'i', 'ö': 'o', 'ş': 's', 'ü': 'u', 'Ç': 'c', 'Ğ': 'g', 'Ö': 'o', 'Ş': 's', 'Ü': 'u' };

    function slugify(text) {
        return String(text || '')
            .replace(/[çğıİöşüÇĞÖŞÜ]/g, function (ch) { return TR_MAP[ch]; })
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '');
    }

    function sceneTitle(tour, sceneId) {
        var scene = tour.scenes[sceneId];
        return scene ? scene.title : '';
    }

    function orderedSceneIds(tour) {
        return (tour.order || Object.keys(tour.scenes)).filter(function (id) { return !!tour.scenes[id]; });
    }

    function findFloor(tour, floorId) {
        return (tour.floors || []).filter(function (floor) { return floor.id === floorId; })[0] || null;
    }

    // Hedefi olmayan geçiş noktalarını ele (silinmiş oda vb.)
    function validHotSpots(scene, tour) {
        return (scene && scene.hotSpots || []).filter(function (hs) {
            return hs.type !== 'scene' || !!tour.scenes[hs.sceneId];
        });
    }

    function returnHotSpot(tour, fromId, toId) {
        return validHotSpots(tour.scenes[toId], tour).filter(function (hs) {
            return hs.type === 'scene' && hs.sceneId === fromId;
        })[0] || null;
    }

    function prefersReducedMotion() {
        return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    }

    // ------------------------------------------------------------------
    // Nokta görünümü
    // ------------------------------------------------------------------

    function truncate(text, max) {
        text = String(text || '');
        return text.length > max ? text.slice(0, max - 1) + '…' : text;
    }

    function hotspotRenderer(div, args) {
        var size = BASE_SIZE * (args.size || 1);
        // Ortalamayı pannellum kendisi yapar (div'in genişliğinin yarısı kadar kaydırır); kenar boşluğu verilmez.
        div.style.width = size + 'px';
        div.style.height = size + 'px';
        div.style.backgroundImage = args.icon;

        if (args.onPointerDown) {
            // Editör: sürükleme ve tıklamayı editör kendisi yönetir
            div.addEventListener('pointerdown', function (e) { args.onPointerDown(e, div); });
        } else if (args.onActivate) {
            // Ekran okuyucu ve klavye: nokta bir buton gibi davranır, adı gidilen oda ya da bilgi başlığıdır
            div.setAttribute('role', 'button');
            div.setAttribute('tabindex', '0');
            div.setAttribute('aria-label', args.type === 'scene' ? args.text : (args.header || truncate(args.text, 80)));
            div.addEventListener('keydown', function (e) {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    args.onActivate();
                }
            });
            // Dokunmatik ekranlarda "click" her zaman gelmeyebilir; parmak kaymadıysa dokunuşu da say
            var touch = null;
            div.addEventListener('touchstart', function (e) {
                var t = e.changedTouches[0];
                touch = { x: t.clientX, y: t.clientY };
            }, { passive: true });
            div.addEventListener('touchend', function (e) {
                var t = e.changedTouches[0];
                if (touch && Math.abs(t.clientX - touch.x) + Math.abs(t.clientY - touch.y) < 12) {
                    e.preventDefault();
                    args.onActivate();
                }
                touch = null;
            });
            div.addEventListener('click', function (e) {
                e.stopPropagation();
                args.onActivate();
            });
        }

        var showTooltip = args.type === 'info' || args.showTooltip === true;
        if (!showTooltip || !(args.header || args.text)) return;

        var tooltip = el('div', 'sanaltur-tooltip' + ((args.size || 1) < 0.8 ? ' sanaltur-tooltip--small' : ''));
        if (args.header) tooltip.appendChild(el('div', 'sanaltur-tooltip__header', args.header));
        if (args.text) tooltip.appendChild(el('div', null, args.type === 'info' ? truncate(args.text, 160) : args.text));
        if (args.type === 'info') {
            var hints = [];
            var S = args.strings || STRINGS.tr;
            if (args.mediaType === 'video') hints.push(S.video);
            else if (args.mediaType) hints.push(S.photo);
            if (args.link) hints.push(S.link);
            hints.push(S.details);
            tooltip.appendChild(el('div', 'sanaltur-tooltip__hint', hints.join(' · ')));
        }
        div.appendChild(tooltip);
    }

    // Proje modelindeki bir noktayı pannellum hotspot ayarına çevirir.
    // opts: { onActivate(hs), onPointerDown(e, hs, div), selectedId, editable, translate(key, fallback), strings }
    function toPannellumHotSpot(hs, tour, opts) {
        opts = opts || {};
        var isScene = hs.type === 'scene';
        var tr = opts.translate || function (key, fallback) { return fallback; };
        var S = opts.strings || STRINGS.tr;
        var classes = ['sanaltur-hotspot', 'sanaltur-hotspot--' + (isScene ? 'scene' : 'info')];
        if (isScene && hs.showTooltip) classes.push('sanaltur-hotspot--label');
        if (opts.editable) classes.push('sanaltur-hotspot--editable');
        if (opts.selectedId && opts.selectedId === hs.id) classes.push('sanaltur-hotspot--selected');
        return {
            id: hs.id,
            pitch: hs.pitch,
            yaw: hs.yaw,
            type: 'info',
            cssClass: classes.join(' '),
            createTooltipFunc: hotspotRenderer,
            createTooltipArgs: {
                type: isScene ? 'scene' : 'info',
                header: isScene ? '' : tr('hs:' + hs.id + ':header', hs.header),
                text: isScene ? S.goTo + tr('scene:' + hs.sceneId, sceneTitle(tour, hs.sceneId)) : tr('hs:' + hs.id + ':text', hs.text),
                strings: S,
                link: isScene ? '' : hs.link,
                mediaType: isScene ? null : (hs.mediaId ? hs.mediaType : null),
                icon: hotspotIcon(hs, tour),
                size: hs.size || 1,
                showTooltip: !!hs.showTooltip,
                onActivate: opts.onActivate ? function () { opts.onActivate(hs); } : null,
                onPointerDown: opts.onPointerDown ? function (e, div) { opts.onPointerDown(e, hs, div); } : null
            }
        };
    }

    // ------------------------------------------------------------------
    // Otomatik bakış yönü
    // Her fotoğrafın kendi 0° yönü, çekim sırasında kameranın nereye dönük durduğuna göre rastgeledir.
    // A'da "B'ye git" ve B'de "A'ya dön" noktası varsa, gerçek dünyada bu iki yön birbirinin tam tersidir.
    // Kat planına yerleştirilmiş odalarda ise yön, plandaki konumlardan da çıkarılabilir.
    // ------------------------------------------------------------------

    // Kat planında A'dan B'ye yön (planın yukarısı 0°, saat yönünde artar). Yoksa null.
    function planBearing(tour, fromId, toId) {
        var a = tour.scenes[fromId];
        var b = tour.scenes[toId];
        if (!a || !b || !a.map || !b.map || a.floorId !== b.floorId) return null;
        var floor = findFloor(tour, a.floorId);
        if (!floor || !floor.plan) return null;
        var dx = (b.map.x - a.map.x) * (floor.plan.aspect || 1);
        var dy = b.map.y - a.map.y;
        if (Math.abs(dx) + Math.abs(dy) < 1e-6) return null;
        return Math.atan2(dx, -dy) * 180 / Math.PI;
    }

    // { offsets, groups, headings }
    //  offsets/groups: karşılıklı bağlantılardan fotoğraflar arası dönüş farkları
    //  headings: kat planına göre her fotoğrafın 0° yönünün plandaki karşılığı
    function computeOrientation(tour) {
        var ids = Object.keys(tour.scenes);
        var edges = {};
        ids.forEach(function (id) { edges[id] = []; });
        ids.forEach(function (fromId) {
            validHotSpots(tour.scenes[fromId], tour).forEach(function (hs) {
                if (hs.type !== 'scene' || hs.sceneId === fromId) return;
                var back = returnHotSpot(tour, fromId, hs.sceneId);
                // offset[B] - offset[A] = yaw(A->B) + 180 - yaw(B->A)
                if (back) edges[fromId].push({ to: hs.sceneId, delta: hs.yaw + 180 - back.yaw });
            });
        });
        var offsets = {};
        var groups = {};
        ids.forEach(function (rootId) {
            if (rootId in groups) return;
            offsets[rootId] = 0;
            groups[rootId] = rootId;
            var queue = [rootId];
            while (queue.length) {
                var id = queue.shift();
                edges[id].forEach(function (edge) {
                    if (edge.to in groups) return;
                    offsets[edge.to] = normalizeYaw(offsets[id] + edge.delta);
                    groups[edge.to] = rootId;
                    queue.push(edge.to);
                });
            }
        });

        // Plandaki yönler (headings). Kaynağı (headingSources):
        //  'manual': kat planı editöründe elle belirlendi (odadaki bir şeye bakıp planda yerine tıklayarak)
        //  'links':  odadan plana yerleşik başka odalara giden geçiş noktalarından (dairesel ortalama)
        //  'chain':  aynı kattaki bağlı odalardan, karşılıklı bağlantı farklarıyla
        var headings = {};
        var headingSources = {};
        var onPlan = function (id) {
            var scene = tour.scenes[id];
            var floor = scene.map && findFloor(tour, scene.floorId);
            return !!(floor && floor.plan);
        };
        ids.forEach(function (id) {
            var map = tour.scenes[id].map;
            if (onPlan(id) && typeof map.heading === 'number') {
                headings[id] = normalizeYaw(map.heading);
                headingSources[id] = 'manual';
            }
        });
        var sums = {};
        ids.forEach(function (fromId) {
            if (fromId in headings) return;
            validHotSpots(tour.scenes[fromId], tour).forEach(function (hs) {
                if (hs.type !== 'scene') return;
                var bearing = planBearing(tour, fromId, hs.sceneId);
                if (bearing == null) return;
                var h = (bearing - hs.yaw) * Math.PI / 180;
                var s = sums[fromId] || (sums[fromId] = { x: 0, y: 0 });
                s.x += Math.cos(h);
                s.y += Math.sin(h);
            });
        });
        Object.keys(sums).forEach(function (id) {
            headings[id] = normalizeYaw(Math.atan2(sums[id].y, sums[id].x) * 180 / Math.PI);
            headingSources[id] = 'links';
        });
        var constants = {};
        Object.keys(headings).forEach(function (id) {
            var key = groups[id] + '|' + tour.scenes[id].floorId;
            var c = (headings[id] - offsets[id]) * Math.PI / 180;
            var s = constants[key] || (constants[key] = { x: 0, y: 0 });
            s.x += Math.cos(c);
            s.y += Math.sin(c);
        });
        ids.forEach(function (id) {
            if (id in headings || !onPlan(id)) return;
            var s = constants[groups[id] + '|' + tour.scenes[id].floorId];
            if (s) {
                headings[id] = normalizeYaw(Math.atan2(s.y, s.x) * 180 / Math.PI + offsets[id]);
                headingSources[id] = 'chain';
            }
        });
        return { offsets: offsets, groups: groups, headings: headings, headingSources: headingSources };
    }

    // fromId odasındaki hs geçiş noktasına tıklanınca hedef odada hangi yöne bakılacağı.
    // mode: 'manual' (elle ayarlı), 'auto' (dönüş noktasından), 'plan' (kat planından),
    //       'chain' (diğer odalar üzerinden), 'start' (hesaplanamadı / otomatik kapalı)
    function arrivalView(tour, fromId, hs, orientation) {
        var target = tour.scenes[hs.sceneId];
        if (typeof hs.arrivalYaw === 'number') {
            return { yaw: hs.arrivalYaw, pitch: hs.arrivalPitch || 0, mode: 'manual' };
        }
        var startView = { yaw: target.yaw || 0, pitch: target.pitch || 0, mode: 'start' };
        if (tour.autoOrientation === false) return startView;
        var back = returnHotSpot(tour, fromId, hs.sceneId);
        if (back) return { yaw: normalizeYaw(back.yaw + 180), pitch: 0, mode: 'auto' };
        orientation = orientation || computeOrientation(tour);
        var hFrom = orientation.headings[fromId];
        var hTo = orientation.headings[hs.sceneId];
        if (hFrom != null && hTo != null && tour.scenes[fromId].floorId === target.floorId) {
            return { yaw: normalizeYaw(hs.yaw + hFrom - hTo), pitch: 0, mode: 'plan' };
        }
        if (orientation.groups[fromId] === orientation.groups[hs.sceneId]) {
            return { yaw: normalizeYaw(hs.yaw + orientation.offsets[fromId] - orientation.offsets[hs.sceneId]), pitch: 0, mode: 'chain' };
        }
        return startView;
    }

    // Oda şeridi / harita / otomatik tur gibi doğrudan bir odaya geçişlerde:
    // { walkYaw: yürürken dönülecek yön (yoksa null), view: varış yönü (yoksa null = başlangıç açısı) }
    function jumpPlan(tour, fromId, toId, orientation) {
        var link = validHotSpots(tour.scenes[fromId], tour).filter(function (hs) {
            return hs.type === 'scene' && hs.sceneId === toId;
        })[0];
        if (link) return { walkYaw: link.yaw, view: arrivalView(tour, fromId, link, orientation) };
        if (tour.autoOrientation !== false) {
            var bearing = planBearing(tour, fromId, toId);
            var hFrom = orientation.headings[fromId];
            var hTo = orientation.headings[toId];
            if (bearing != null && hTo != null) {
                return {
                    walkYaw: hFrom != null ? normalizeYaw(bearing - hFrom) : null,
                    view: { yaw: normalizeYaw(bearing - hTo), pitch: 0, mode: 'plan' }
                };
            }
        }
        return { walkYaw: null, view: null };
    }

    // Yürüme efekti: kamera verilen yöne döner ve hafifçe yaklaşır, sonra done() çağrılır.
    function walkTowards(viewer, yaw, done) {
        if (prefersReducedMotion()) return done();
        var turn = Math.abs(normalizeYaw(yaw - viewer.getYaw()));
        var duration = Math.min(900, 350 + turn * 3);
        viewer.lookAt(0, normalizeYaw(yaw), Math.max(50, viewer.getHfov() * 0.7), duration, done);
    }

    // Derinlikli yürüyüşten önce: kamera yürüme yönüne ve ufka döner (yaklaşmadan).
    function turnTowards(viewer, yaw, done) {
        var turn = Math.abs(normalizeYaw(yaw - viewer.getYaw()));
        if (turn < 3 && Math.abs(viewer.getPitch()) < 3) return done();
        viewer.lookAt(0, normalizeYaw(yaw), viewer.getHfov(), Math.min(700, 250 + turn * 3), done);
    }

    // ------------------------------------------------------------------
    // Derinlikli yürüyüş
    // İki oda arasında kamera gerçekten ileri yürür. Her fotoğraf basit bir oda modeline
    // (kameranın altında zemin, üstünde tavan, çevresinde silindir duvar) yansıtılır; kamera A'dan
    // B'nin çekim noktasına giderken A'nın görüntüsü B'ninkine karışır. Model dosyası gerekmez, her
    // cihazda anında çalışır. Yeni oda yüklenene kadar son kare ekranda kalır, siyah ekran görünmez.
    // Eksenler: x sağ, y yukarı, z ileri (yaw 0); yaw sağa doğru artar (pannellum ile aynı).
    // ------------------------------------------------------------------

    var WALK_CAMERA_HEIGHT = 1.6; // kamera yüksekliği bilinmiyorsa (m)
    var WALK_CEILING = 3.2; // zeminden tavana (m)
    var WALK_DEFAULT_DISTANCE = 3; // iki oda arası mesafe bilinmiyorsa (m)
    var WALK_MAX_DISTANCE = 15; // daha uzak odalara yürünmez, görüntü karışarak geçilir
    var WALK_UNLINKED_DISTANCE = 8; // oda şeridi / haritadan, geçiş noktası olmayan bir odaya
    var TILE_WAIT = 2500; // parçalı odada perde, görünen parçaları en çok bu kadar bekler (ms)

    // Fotoğrafın ufuk düzeltmesi. key: oda ya da "oda~görünüm". Parçalı (multires) panoramada düzeltme
    // parçalara ve yanındaki tek parça kopyaya işlenmiştir; öncesi / sonrası görünümleri tek parçadır.
    function imageHorizon(tour, key) {
        var parts = String(key).split('~');
        var scene = tour.scenes[parts[0]];
        if (!scene) return null;
        if (scene.multires && parts.length === 1) return null;
        return scene.horizon || null;
    }

    function cameraHeight(scene) {
        var h = scene && scene.cameraHeight;
        return typeof h === 'number' && h >= 0.3 && h <= 30 ? h : WALK_CAMERA_HEIGHT;
    }

    // A'daki bir yönün B'deki karşılığı: yaw_B = yaw_A + fark. Bilinmiyorsa null.
    function relativeYaw(tour, fromId, toId, orientation) {
        var link = validHotSpots(tour.scenes[fromId], tour).filter(function (hs) {
            return hs.type === 'scene' && hs.sceneId === toId;
        })[0];
        var back = returnHotSpot(tour, fromId, toId);
        if (link && back) return normalizeYaw(back.yaw + 180 - link.yaw);
        var hFrom = orientation.headings[fromId];
        var hTo = orientation.headings[toId];
        if (hFrom != null && hTo != null) return normalizeYaw(hFrom - hTo);
        if (orientation.groups[fromId] != null && orientation.groups[fromId] === orientation.groups[toId]) {
            return normalizeYaw(orientation.offsets[fromId] - orientation.offsets[toId]);
        }
        return null;
    }

    // İki çekim noktası arası mesafe (m): ölçekli kat planından; yoksa geçiş noktasının dikey açısından
    // (nokta, hedefin zemindeki yerine konur); o da yoksa varsayılan.
    function walkDistance(tour, fromId, toId, walkPitch) {
        var a = tour.scenes[fromId];
        var b = tour.scenes[toId];
        var floor = a.map && b.map ? findFloor(tour, a.floorId) : null;
        var plan = floor && floor.plan;
        if (plan && plan.metersWide > 0) {
            var aspect = plan.aspect || 1;
            var dx = (b.map.x - a.map.x) * aspect;
            var dy = b.map.y - a.map.y;
            return Math.sqrt(dx * dx + dy * dy) * plan.metersWide / aspect;
        }
        if (typeof walkPitch === 'number' && walkPitch < -3) {
            return Math.min(12, Math.max(1, cameraHeight(a) / Math.tan(-walkPitch * Math.PI / 180)));
        }
        return WALK_DEFAULT_DISTANCE;
    }

    // fromId'den toId'ye yürüyüşün geometrisi; yürünemiyorsa (farklı kat, yön bilinmiyor, çok uzak) null.
    // walkYaw / walkPitch: A'da yürünen yön (geçiş noktasından ya da plandan)
    function walkGeometry(tour, fromId, toId, walkYaw, walkPitch, orientation) {
        var a = tour.scenes[fromId];
        var b = tour.scenes[toId];
        if (!a || !b || walkYaw == null || tour.autoOrientation === false || a.floorId !== b.floorId) return null;
        // Editörde derinlik haritalarıyla görüntüden bulunmuş konum (otomatik hizalama, walkAlign.js) GPS ve
        // pusuladan daha doğrudur: { yaw: B'nin A'daki yönü, distance, delta }
        var aligned = a.walks && a.walks[toId];
        var delta = aligned ? aligned.delta : relativeYaw(tour, fromId, toId, orientation || computeOrientation(tour));
        if (delta == null) return null;
        var distance = aligned ? aligned.distance : walkDistance(tour, fromId, toId, walkPitch);
        if (!(distance <= WALK_MAX_DISTANCE)) return null;
        var yaw = (aligned ? aligned.yaw : walkYaw) * Math.PI / 180;
        var hA = cameraHeight(a);
        var hB = cameraHeight(b);
        // Noktaların yükseklik farkı (merdiven, teras) biliniyorsa o; yoksa iki kamera da yerden kendi yüksekliğinde
        var rise = typeof a.elevation === 'number' && typeof b.elevation === 'number' && Math.abs(b.elevation - a.elevation) <= 10
            ? b.elevation - a.elevation : hB - hA;
        var radius = Math.min(20, Math.max(4, distance * 1.5));
        return {
            delta: delta,
            distance: distance,
            aligned: !!aligned,
            // B'nin çekim noktası, A'nın ufku düzeltilmiş ekseninde (m)
            target: [Math.sin(yaw) * distance, rise, Math.cos(yaw) * distance],
            from: { height: hA, ceiling: Math.max(0.8, WALK_CEILING - hA), radius: radius, horizon: imageHorizon(tour, fromId) },
            to: { height: hB, ceiling: Math.max(0.8, WALK_CEILING - hB), radius: radius, horizon: imageHorizon(tour, toId) }
        };
    }

    // 3x3 matrisler satır satır (9 elemanlı dizi)
    function matMul(a, b) {
        var r = [];
        for (var i = 0; i < 3; i++) {
            for (var j = 0; j < 3; j++) r.push(a[i * 3] * b[j] + a[i * 3 + 1] * b[3 + j] + a[i * 3 + 2] * b[6 + j]);
        }
        return r;
    }

    function matVec(m, v) {
        return [m[0] * v[0] + m[1] * v[1] + m[2] * v[2], m[3] * v[0] + m[4] * v[1] + m[5] * v[2], m[6] * v[0] + m[7] * v[1] + m[8] * v[2]];
    }

    // Yönü yaw kadar sağa döndürür
    function yawMatrix(yaw) {
        var c = Math.cos(yaw * Math.PI / 180);
        var s = Math.sin(yaw * Math.PI / 180);
        return [c, 0, s, 0, 1, 0, -s, 0, c];
    }

    // Kameranın ekran ışınını (x sağ, y yukarı, z ileri) dünyaya çevirir
    function cameraMatrix(yaw, pitch) {
        var c = Math.cos(pitch * Math.PI / 180);
        var s = Math.sin(pitch * Math.PI / 180);
        return matMul(yawMatrix(yaw), [1, 0, 0, 0, c, s, 0, -s, c]);
    }

    // Ufku düzeltilmiş eksenden fotoğrafın kendi eksenine (pannellum'un horizonPitch/horizonRoll'u ile aynı dönüş)
    function horizonMatrix(horizon) {
        var l = ((horizon && horizon.pitch) || 0) * Math.PI / 180;
        var d = ((horizon && horizon.roll) || 0) * Math.PI / 180;
        return [
            Math.cos(d), -Math.sin(d), 0,
            Math.cos(l) * Math.sin(d), Math.cos(d) * Math.cos(l), -Math.sin(l),
            Math.sin(d) * Math.sin(l), Math.cos(d) * Math.sin(l), Math.cos(l)
        ];
    }

    // o noktasından d yönündeki ışının oda modeline değdiği nokta (odanın çekim noktasına göre).
    // room: { height: zemine, ceiling: tavana, radius: duvara uzaklık }. Çizicideki hesabın aynısı.
    function roomHit(o, d, room) {
        var t = 1000;
        if (d[1] < -1e-4) t = Math.min(t, (-room.height - o[1]) / d[1]);
        if (d[1] > 1e-4) t = Math.min(t, (room.ceiling - o[1]) / d[1]);
        var a = d[0] * d[0] + d[2] * d[2];
        if (a > 1e-6) {
            var b = o[0] * d[0] + o[2] * d[2];
            var c = o[0] * o[0] + o[2] * o[2] - room.radius * room.radius;
            t = Math.min(t, (-b + Math.sqrt(Math.max(b * b - a * c, 0))) / a);
        }
        t = Math.max(t, 0);
        return [o[0] + d[0] * t, o[1] + d[1] * t, o[2] + d[2] * t];
    }

    // Yürüyüşün bir anında ekrandaki d ışını için iki fotoğrafta bakılan yönler (fotoğrafların kendi
    // eksenlerinde). pos: kameranın A'ya göre yeri. Çizicinin JS karşılığı; testlerde kullanılır.
    function walkSampleDirections(geom, pos, d) {
        var rawA = horizonMatrix(geom.from.horizon);
        var rawB = matMul(horizonMatrix(geom.to.horizon), yawMatrix(geom.delta));
        var fromB = [pos[0] - geom.target[0], pos[1] - geom.target[1], pos[2] - geom.target[2]];
        return { a: matVec(rawA, roomHit(pos, d, geom.from)), b: matVec(rawB, roomHit(fromB, d, geom.to)) };
    }

    var WALK_VERTEX_SHADER = 'attribute vec2 aPos;varying vec2 vPos;void main(){vPos=aPos;gl_Position=vec4(aPos,0.0,1.0);}';
    // Oda modeliyle çizim: değişkenler ve yardımcılar (yürüyüş perdesi ve birleştirme aynısını kullanır)
    var WALK_ROOM_GLSL = [
        'precision highp float;',
        'uniform sampler2D uA;uniform sampler2D uB;',
        'uniform mat3 uCam;uniform mat3 uRawA;uniform mat3 uRawB;',
        'uniform vec3 uPos;uniform vec3 uTarget;uniform vec3 uRoomA;uniform vec3 uRoomB;',
        'uniform vec2 uScale;uniform float uMix;',
        'varying vec2 vPos;',
        // room: (zemine, tavana, duvara uzaklık); roomHit ile aynı hesap
        'vec3 roomHit(vec3 o,vec3 d,vec3 room){',
        '  float t=1000.0;',
        '  if(d.y<-0.0001)t=min(t,(-room.x-o.y)/d.y);',
        '  if(d.y>0.0001)t=min(t,(room.y-o.y)/d.y);',
        '  float a=dot(d.xz,d.xz);',
        '  if(a>0.000001){float b=dot(o.xz,d.xz);float c=dot(o.xz,o.xz)-room.z*room.z;t=min(t,(-b+sqrt(max(b*b-a*c,0.0)))/a);}',
        '  return o+d*max(t,0.0);',
        '}',
        'vec4 pano(sampler2D tex,mat3 raw,vec3 p){',
        '  vec3 r=normalize(raw*p);',
        '  return texture2D(tex,vec2(atan(r.x,r.z)/6.2831853+0.5,0.5-asin(clamp(r.y,-1.0,1.0))/3.1415927));',
        '}'
    ].join('\n');
    var WALK_FRAGMENT_SHADER = [
        WALK_ROOM_GLSL,
        'void main(){',
        '  vec3 d=normalize(uCam*vec3(vPos.x*uScale.x,vPos.y*uScale.y,1.0));',
        '  vec4 a=pano(uA,uRawA,roomHit(uPos,d,uRoomA));',
        '  if(uMix<=0.0){gl_FragColor=a;return;}',
        '  vec4 b=pano(uB,uRawB,roomHit(uPos-uTarget,d,uRoomB));',
        '  gl_FragColor=mix(a,b,uMix);',
        '}'
    ].join('\n');

    // --- Derinlik haritası (yapay zekâ; editörde hesaplanır, bkz. src/lib/depth.js) ---
    // PNG'nin kırmızı + yeşil kanalı 16 bitlik değer: ln(uzaklık / ortanca uzaklık), DEPTH_LOG_MIN'den
    // DEPTH_LOG_MIN + DEPTH_LOG_RANGE'e. Ölçek bilinmez; kamera yüksekliğiyle metreye çevrilir.
    var DEPTH_LOG_MIN = -6;
    var DEPTH_LOG_RANGE = 12;
    var DEPTH_COLS = 360; // derinlik ağı: 1 derecelik hücreler (361 x 181 köşe, 16 bitlik indekse sığar)
    var DEPTH_ROWS = 180;
    var depthIndices = null; // bütün ağlarda aynı

    // pixels: derinlik PNG'sinin RGBA pikselleri (w x h). raw: düz eksen -> haritanın ekseni.
    // height: kamera yüksekliği (m); aşağı bakan yönlerde (25-80 derece) görünen yerin çoğu zemindir,
    // zemin kamera yüksekliği kadar aşağıda kabul edilerek ölçek bulunur.
    // Dönen: { vertices: Float32Array (her köşe: yön x, y, z, uzaklık m, kenar ölçüsü), indices: Uint16Array }
    function buildDepthMesh(pixels, w, h, raw, height) {
        var cols = DEPTH_COLS;
        var rows = DEPTH_ROWS;
        var stride = cols + 1;
        var n = stride * (rows + 1);
        var logs = new Float32Array(n);
        var vertices = new Float32Array(n * 5);
        var drops = [];
        var at = function (x, y) {
            var p = (y * w + x) * 4;
            return (pixels[p] * 256 + pixels[p + 1]) / 65535 * DEPTH_LOG_RANGE + DEPTH_LOG_MIN;
        };
        for (var j = 0; j <= rows; j++) {
            var fy = Math.min(h - 1, Math.max(0, j / rows * h - 0.5));
            var y0 = Math.floor(fy);
            var y1 = Math.min(h - 1, y0 + 1);
            var ty = fy - y0;
            var lat = (0.5 - j / rows) * Math.PI;
            for (var i = 0; i <= cols; i++) {
                var fx = i / cols * w - 0.5;
                var x0 = Math.floor(fx);
                var tx = fx - x0;
                var xa = (x0 % w + w) % w;
                var xb = (xa + 1) % w;
                var k = j * stride + i;
                var l = (at(xa, y0) * (1 - tx) + at(xb, y0) * tx) * (1 - ty) + (at(xa, y1) * (1 - tx) + at(xb, y1) * tx) * ty;
                var lon = (i / cols - 0.5) * 2 * Math.PI;
                var dx = Math.cos(lat) * Math.sin(lon);
                var dy = Math.sin(lat);
                var dz = Math.cos(lat) * Math.cos(lon);
                logs[k] = l;
                vertices[k * 5] = dx;
                vertices[k * 5 + 1] = dy;
                vertices[k * 5 + 2] = dz;
                // Düz eksende yukarı bileşen (raw'ın tersi = devriği)
                var up = raw[1] * dx + raw[4] * dy + raw[7] * dz;
                if (up < -0.4226 && up > -0.9848) drops.push(Math.exp(l) * -up);
            }
        }
        drops.sort(function (a, b) { return a - b; });
        var scale = drops.length ? height / drops[drops.length >> 1] : height;
        // Zemin ve tavan: tahmini düzleme yakın noktalar tam düzleme oturtulur (yürürken en çok görünen
        // yüzeyler; iki fotoğrafta da aynı düzlem olduğundan desenleri üst üste biner)
        var ups = new Float32Array(n);
        var rises = [];
        for (k = 0; k < n; k++) {
            ups[k] = raw[1] * vertices[k * 5] + raw[4] * vertices[k * 5 + 1] + raw[7] * vertices[k * 5 + 2];
            if (ups[k] > 0.4226 && ups[k] < 0.9848) rises.push(Math.exp(logs[k]) * scale * ups[k]);
        }
        rises.sort(function (a, b) { return a - b; });
        var ceiling = rises.length ? rises[rises.length >> 1] : 0;
        for (k = 0; k < n; k++) {
            var plane = ups[k] < -0.05 ? height / -ups[k] : (ups[k] > 0.05 && ceiling > 0 ? ceiling / ups[k] : 0);
            if (!plane) continue;
            var ratio = Math.log(plane) - (logs[k] + Math.log(scale));
            if (Math.abs(ratio) < 0.2) logs[k] += ratio;
        }
        // Kenar ölçüsü: log uzaklığın ikinci farkı (düz yüzeylerde küçük, nesne kenarlarında büyük),
        // kenarın iki yanı da işaretlensin diye komşularla genişletilir
        var edge = new Float32Array(n);
        for (j = 0; j <= rows; j++) {
            for (i = 0; i <= cols; i++) {
                k = j * stride + i;
                var left = j * stride + (i > 0 ? i - 1 : cols - 1);
                var right = j * stride + (i < cols ? i + 1 : 1);
                var above = j > 0 ? k - stride : k;
                var below = j < rows ? k + stride : k;
                edge[k] = Math.max(Math.abs(logs[left] + logs[right] - 2 * logs[k]), Math.abs(logs[above] + logs[below] - 2 * logs[k]));
            }
        }
        for (j = 0; j <= rows; j++) {
            for (i = 0; i <= cols; i++) {
                k = j * stride + i;
                var e = edge[k];
                if (i > 0) e = Math.max(e, edge[k - 1]);
                if (i < cols) e = Math.max(e, edge[k + 1]);
                if (j > 0) e = Math.max(e, edge[k - stride]);
                if (j < rows) e = Math.max(e, edge[k + stride]);
                vertices[k * 5 + 3] = Math.min(200, Math.max(0.2, Math.exp(logs[k]) * scale));
                vertices[k * 5 + 4] = e;
            }
        }
        if (!depthIndices) {
            depthIndices = new Uint16Array(cols * rows * 6);
            var q = 0;
            for (j = 0; j < rows; j++) {
                for (i = 0; i < cols; i++) {
                    k = j * stride + i;
                    depthIndices[q++] = k;
                    depthIndices[q++] = k + stride;
                    depthIndices[q++] = k + 1;
                    depthIndices[q++] = k + 1;
                    depthIndices[q++] = k + stride;
                    depthIndices[q++] = k + stride + 1;
                }
            }
        }
        return { vertices: vertices, indices: depthIndices, scale: scale, ceiling: ceiling };
    }

    // Derinlik ağı: çekim noktasından yön x uzaklık; doku, noktanın çekim noktasından görünen yönünden alınır
    // (fotoğrafın kendisi). Kenardaki gerilmiş üçgenler, kamera çekim noktasından uzaklaştıkça saydamlaşır.
    var WALK_MESH_VERTEX_SHADER = [
        'attribute vec3 aDir;attribute vec2 aDE;',
        'uniform mat3 uGeo;uniform mat3 uTexM;uniform mat3 uView;',
        'uniform vec3 uOrigin;uniform vec3 uPos;uniform vec2 uScale;',
        'varying vec3 vTex;varying float vEdge;',
        'void main(){',
        '  vec3 local=uGeo*(aDir*aDE.x);',
        '  vTex=uTexM*local;',
        '  vEdge=aDE.y;',
        '  vec3 c=uView*(uOrigin+local-uPos);',
        // yakın düzlem 0,05 m, uzak 500 m
        '  gl_Position=vec4(c.x/uScale.x,c.y/uScale.y,c.z*1.0002-0.10002,c.z);',
        '}'
    ].join('\n');
    // Yürüyüşte B'ye karışma oranı (s: yolun yumuşatılmış ilerlemesi). Yolun ortasında karışılır; derinlik
    // ağıyla iki fotoğraf da gerçek şekliyle çizildiğinden karışma daha kısa sürer (çift görüntü daha az görünür)
    function walkMix(s, walking, depth) {
        if (!walking) return s * s * (3 - 2 * s);
        var m = depth ? (s - 0.38) / 0.24 : (s - 0.3) / 0.4;
        m = Math.min(1, Math.max(0, m));
        return m * m * (3 - 2 * m);
    }

    // Güven: fotoğraftaki küçük bir parça ekranda çok büyümüşse (nesne kenarında gerilmiş yüzey) saydam.
    // Büyüme, ekrandaki bir pikselin fotoğrafta kapladığı alanla ölçülür (türevler); gerçek yüzeyler
    // yaklaşınca en çok birkaç kat büyür, gerilmiş kenarlar onlarca kat. Türev yoksa kenar ölçüsü kullanılır.
    var WALK_MESH_FRAGMENT_SHADER = [
        '#extension GL_OES_standard_derivatives : enable',
        'precision highp float;',
        'uniform sampler2D uTex;uniform float uMove;uniform vec4 uScreen;',
        'varying vec3 vTex;varying float vEdge;',
        'void main(){',
        '  vec3 r=normalize(vTex);',
        '  vec3 c=texture2D(uTex,vec2(atan(r.x,r.z)/6.2831853+0.5,0.5-asin(clamp(r.y,-1.0,1.0))/3.1415927)).rgb;',
        '  vec2 t=(gl_FragCoord.xy/uScreen.xy*2.0-1.0)*uScreen.zw;',
        // pikselin görüş açısı (katı açı): ortada (2 tan(hfov/2) / genişlik)^2, kenarlara doğru küçülür
        '  float pixel=4.0*uScreen.z*uScreen.z/(uScreen.x*uScreen.x)/pow(1.0+dot(t,t),1.5);',
        // En kötü yöndeki büyüme: ekrandaki piksel komşularına fotoğrafta düşen yönlerin küçük tekil değeri
        // (tek yönde sünmüş yüzeyleri de yakalar; alan tek başına bunları orta derece büyüme sanar)
        '  vec3 gx=dFdx(r);vec3 gy=dFdy(r);',
        '  float g11=dot(gx,gx);float g12=dot(gx,gy);float g22=dot(gy,gy);',
        '  float tr=g11+g22;',
        '  float low=0.5*(tr-sqrt(max(tr*tr-4.0*(g11*g22-g12*g12),0.0)));',
        '  float shrink=sqrt(max(low,0.0)/pixel);',
        '  float conf=smoothstep(0.18,0.4,shrink)*(1.0-smoothstep(0.15,0.5,vEdge));',
        '  gl_FragColor=vec4(c,mix(1.0,conf,uMove));',
        '}'
    ].join('\n');
    // İki katmanın birleşimi: ikisi de güvenilirse yol boyunca karışır; birinin gerilmiş (saydam) yerini öbürü doldurur
    // İki çizim de güvenilmezse (kameranın dibindeki duvar, yapraklar, tüller) sündürülmüş görüntü yerine
    // pürüzsüz oda modeli görünür
    var WALK_COMPOSITE_SHADER = [
        WALK_ROOM_GLSL,
        'uniform sampler2D uLA;uniform sampler2D uLB;',
        'void main(){',
        '  vec2 t=vPos*0.5+0.5;',
        '  vec4 a=texture2D(uLA,t);vec4 b=texture2D(uLB,t);',
        '  float k=uMix*a.a*b.a+(1.0-a.a)*b.a+uMix*(1.0-a.a)*(1.0-b.a);',
        '  if(min(a.a,b.a)>0.97){gl_FragColor=vec4(mix(a.rgb,b.rgb,k),1.0);return;}',
        // Her oda, kendi güvenilmez yerinde kendi oda modeli görüntüsünü kullanır; sonra güvenilir olan öne alınarak karışır
        '  vec3 d=normalize(uCam*vec3(vPos.x*uScale.x,vPos.y*uScale.y,1.0));',
        '  vec3 ca=mix(pano(uA,uRawA,roomHit(uPos,d,uRoomA)).rgb,a.rgb,smoothstep(0.25,0.85,a.a));',
        '  vec3 cb=mix(pano(uB,uRawB,roomHit(uPos-uTarget,d,uRoomB)).rgb,b.rgb,smoothstep(0.25,0.85,b.a));',
        '  gl_FragColor=vec4(mix(ca,cb,k),1.0);',
        '}'
    ].join('\n');

    // Yürüyüş çizicisi: verilen WebGL bağlamına çizer (tur motorunun perdesi ve tanıtım videosu aynısını kullanır).
    // Derinlik haritası olan oda 3B ağ olarak, olmayan oda basit oda modeliyle çizilir. Kurulamazsa null.
    function createWalkRenderer(gl) {
        function shader(type, source) {
            var s = gl.createShader(type);
            gl.shaderSource(s, source);
            gl.compileShader(s);
            return gl.getShaderParameter(s, gl.COMPILE_STATUS) ? s : null;
        }
        var precision = gl.getShaderPrecisionFormat && gl.getShaderPrecisionFormat(gl.FRAGMENT_SHADER, gl.HIGH_FLOAT);
        var highp = !!(precision && precision.precision > 0);
        function program(vertex, fragment, uniforms) {
            var vs = shader(gl.VERTEX_SHADER, vertex);
            var fs = shader(gl.FRAGMENT_SHADER, highp ? fragment : fragment.replace('highp', 'mediump'));
            if (!vs || !fs) return null;
            var p = gl.createProgram();
            gl.attachShader(p, vs);
            gl.attachShader(p, fs);
            gl.linkProgram(p);
            if (!gl.getProgramParameter(p, gl.LINK_STATUS)) return null;
            var entry = { program: p, u: {} };
            uniforms.forEach(function (name) { entry.u[name] = gl.getUniformLocation(p, name); });
            return entry;
        }
        var room = program(WALK_VERTEX_SHADER, WALK_FRAGMENT_SHADER, ['uA', 'uB', 'uCam', 'uRawA', 'uRawB', 'uPos', 'uTarget', 'uRoomA', 'uRoomB', 'uScale', 'uMix']);
        if (!room) return null;
        room.aPos = gl.getAttribLocation(room.program, 'aPos');
        // Derinlik ağı ve birleştirme kurulamazsa (eski cihaz) derinlik haritaları kullanılmaz
        var derivatives = gl.getExtension('OES_standard_derivatives');
        var meshFragment = derivatives ? WALK_MESH_FRAGMENT_SHADER : WALK_MESH_FRAGMENT_SHADER
            .replace('#extension GL_OES_standard_derivatives : enable\n', '')
            .replace('sqrt(max(low,0.0)/pixel)', '1.0');
        var mesh = program(WALK_MESH_VERTEX_SHADER, meshFragment, ['uGeo', 'uTexM', 'uView', 'uOrigin', 'uPos', 'uScale', 'uTex', 'uMove', 'uScreen']);
        var composite = program(WALK_VERTEX_SHADER, WALK_COMPOSITE_SHADER, ['uLA', 'uLB', 'uA', 'uB', 'uCam', 'uRawA', 'uRawB', 'uPos', 'uTarget', 'uRoomA', 'uRoomB', 'uScale', 'uMix']);
        if (mesh) {
            mesh.aDir = gl.getAttribLocation(mesh.program, 'aDir');
            mesh.aDE = gl.getAttribLocation(mesh.program, 'aDE');
        }
        if (composite) composite.aPos = gl.getAttribLocation(composite.program, 'aPos');
        var quad = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, quad);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);
        var indexBuffer = null;
        var meshes = {}; // anahtar -> { vbo, used }
        var targets = null; // iki katmanın çizildiği ara görüntüler
        var depthOk = !!(mesh && composite);

        // Satır satır matrisi WebGL'in sütun düzenine çevirir
        function uniformMatrix(location, m) {
            gl.uniformMatrix3fv(location, false, [m[0], m[3], m[6], m[1], m[4], m[7], m[2], m[5], m[8]]);
        }
        function transpose(m) {
            return [m[0], m[3], m[6], m[1], m[4], m[7], m[2], m[5], m[8]];
        }
        function bindQuad(entry) {
            gl.useProgram(entry.program);
            gl.bindBuffer(gl.ARRAY_BUFFER, quad);
            gl.enableVertexAttribArray(entry.aPos);
            gl.vertexAttribPointer(entry.aPos, 2, gl.FLOAT, false, 0, 0);
        }
        function makeTarget(w, h) {
            var tex = gl.createTexture();
            gl.bindTexture(gl.TEXTURE_2D, tex);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            var depth = gl.createRenderbuffer();
            gl.bindRenderbuffer(gl.RENDERBUFFER, depth);
            gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, w, h);
            var fb = gl.createFramebuffer();
            gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
            gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
            gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, depth);
            var ok = gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE;
            gl.bindFramebuffer(gl.FRAMEBUFFER, null);
            return { tex: tex, depth: depth, fb: fb, ok: ok };
        }
        function dropTargets() {
            if (!targets) return;
            targets.layers.forEach(function (t) {
                gl.deleteTexture(t.tex);
                gl.deleteRenderbuffer(t.depth);
                gl.deleteFramebuffer(t.fb);
            });
            targets = null;
        }
        function ensureTargets(w, h) {
            if (targets && targets.w === w && targets.h === h) return true;
            dropTargets();
            targets = { w: w, h: h, layers: [makeTarget(w, h), makeTarget(w, h)] };
            if (!targets.layers[0].ok || !targets.layers[1].ok) depthOk = false;
            return depthOk;
        }

        // Basit oda modeliyle (derinliksiz) bir ya da iki fotoğraf
        // Oda modelinin değişkenleri (oda çizimi ve birleştirme). unit: fotoğrafların ilk doku birimi
        function roomUniforms(u, f, scale, aspect, unit) {
            gl.uniform1i(u.uA, unit);
            gl.uniform1i(u.uB, unit + 1);
            gl.uniform2f(u.uScale, scale, scale * aspect);
            uniformMatrix(u.uCam, cameraMatrix(f.yaw, f.pitch));
            uniformMatrix(u.uRawA, f.rawA);
            uniformMatrix(u.uRawB, f.rawB || f.rawA);
            gl.uniform3fv(u.uPos, f.pos);
            gl.uniform3fv(u.uTarget, f.target || [0, 0, 0]);
            gl.uniform3f(u.uRoomA, f.roomA.height, f.roomA.ceiling, f.roomA.radius);
            var rb = f.roomB || f.roomA;
            gl.uniform3f(u.uRoomB, rb.height, rb.ceiling, rb.radius);
            gl.uniform1f(u.uMix, f.mix);
            gl.activeTexture(gl.TEXTURE0 + unit);
            gl.bindTexture(gl.TEXTURE_2D, f.texA);
            gl.activeTexture(gl.TEXTURE0 + unit + 1);
            gl.bindTexture(gl.TEXTURE_2D, f.texB || f.texA);
        }

        function drawRoom(f, scale, aspect) {
            bindQuad(room);
            roomUniforms(room.u, f, scale, aspect, 0);
            gl.drawArrays(gl.TRIANGLES, 0, 6);
        }

        // Bir odanın katmanı: derinlik ağı ya da oda modeli. origin: çekim noktası (A'nın ekseninde)
        function drawLayer(layer, f, scale, aspect) {
            var move = Math.sqrt(Math.pow(f.pos[0] - layer.origin[0], 2) + Math.pow(f.pos[1] - layer.origin[1], 2) + Math.pow(f.pos[2] - layer.origin[2], 2));
            gl.clearColor(0, 0, 0, 0);
            gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
            if (!layer.mesh) {
                drawRoom({
                    yaw: f.yaw, pitch: f.pitch, pos: [f.pos[0] - layer.origin[0], f.pos[1] - layer.origin[1], f.pos[2] - layer.origin[2]],
                    mix: 0, texA: layer.tex, rawA: layer.raw, roomA: layer.room
                }, scale, aspect);
                return;
            }
            gl.useProgram(mesh.program);
            var u = mesh.u;
            uniformMatrix(u.uGeo, transpose(layer.geo));
            uniformMatrix(u.uTexM, layer.raw);
            uniformMatrix(u.uView, transpose(cameraMatrix(f.yaw, f.pitch)));
            gl.uniform3fv(u.uOrigin, layer.origin);
            gl.uniform3fv(u.uPos, f.pos);
            gl.uniform2f(u.uScale, scale, scale * aspect);
            gl.uniform1i(u.uTex, 0);
            gl.uniform1f(u.uMove, Math.min(1, move / 0.3));
            gl.uniform4f(u.uScreen, targets.w, targets.h, scale, scale * aspect);
            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, layer.tex);
            gl.bindBuffer(gl.ARRAY_BUFFER, layer.mesh.vbo);
            gl.enableVertexAttribArray(mesh.aDir);
            gl.vertexAttribPointer(mesh.aDir, 3, gl.FLOAT, false, 20, 0);
            gl.enableVertexAttribArray(mesh.aDE);
            gl.vertexAttribPointer(mesh.aDE, 2, gl.FLOAT, false, 20, 12);
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
            gl.enable(gl.DEPTH_TEST);
            gl.drawElements(gl.TRIANGLES, depthIndices.length, gl.UNSIGNED_SHORT, 0);
            gl.disable(gl.DEPTH_TEST);
            gl.disableVertexAttribArray(mesh.aDir);
            gl.disableVertexAttribArray(mesh.aDE);
        }

        // İki odanın katmanlarını ara görüntülere çizer (renk + güven)
        function drawLayers(f, w, h, scale, aspect) {
            var layers = [
                { mesh: f.meshA, tex: f.texA, raw: f.rawA, geo: f.geoA || f.rawA, room: f.roomA, origin: [0, 0, 0] },
                { mesh: f.meshB, tex: f.texB, raw: f.rawB, geo: f.geoB || f.rawB, room: f.roomB, origin: f.target }
            ];
            layers.forEach(function (layer, i) {
                gl.bindFramebuffer(gl.FRAMEBUFFER, targets.layers[i].fb);
                gl.viewport(0, 0, w, h);
                drawLayer(layer, f, scale, aspect);
            });
        }

        // Otomatik hizalama için (editör): iki katmanı çizip piksellerini döner { a, b } (RGBA, alt satırdan
        // başlayarak; saydamlık = güven). Derinlik çizimi yoksa null
        function readLayers(f, w, h) {
            if (!depthOk || !ensureTargets(w, h)) return null;
            drawLayers(f, w, h, Math.tan(f.hfov * Math.PI / 360), h / w);
            var result = targets.layers.map(function (t) {
                var px = new Uint8Array(w * h * 4);
                gl.bindFramebuffer(gl.FRAMEBUFFER, t.fb);
                gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, px);
                return px;
            });
            gl.bindFramebuffer(gl.FRAMEBUFFER, null);
            return { a: result[0], b: result[1] };
        }

        // f: { yaw, pitch, hfov, pos, target, mix, texA, texB, rawA, rawB, roomA, roomB,
        //      meshA?, meshB? (addMesh'ten), geoA?, geoB? (düz eksen -> derinlik haritasının ekseni; yoksa rawA / rawB) }
        // Varsayılan çizim yüzeyine (w x h) çizer
        function draw(f, w, h) {
            var scale = Math.tan(f.hfov * Math.PI / 360);
            var aspect = h / w;
            var useDepth = depthOk && (f.meshA || f.meshB) && ensureTargets(w, h);
            if (!useDepth) {
                gl.bindFramebuffer(gl.FRAMEBUFFER, null);
                gl.viewport(0, 0, w, h);
                drawRoom(f, scale, aspect);
                return;
            }
            drawLayers(f, w, h, scale, aspect);
            gl.bindFramebuffer(gl.FRAMEBUFFER, null);
            gl.viewport(0, 0, w, h);
            bindQuad(composite);
            gl.uniform1i(composite.u.uLA, 0);
            gl.uniform1i(composite.u.uLB, 1);
            roomUniforms(composite.u, f, scale, aspect, 2); // güvenilmez yerlerde oda modeli (fotoğraflar 2. ve 3. birimde)
            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, targets.layers[0].tex);
            gl.activeTexture(gl.TEXTURE1);
            gl.bindTexture(gl.TEXTURE_2D, targets.layers[1].tex);
            gl.drawArrays(gl.TRIANGLES, 0, 6);
            gl.activeTexture(gl.TEXTURE0);
        }

        // built: buildDepthMesh'in sonucu. En fazla 4 ağ bellekte kalır (keep: silinmeyecek anahtarlar)
        function addMesh(key, built, keep) {
            if (!depthOk) return null;
            dropMesh(key);
            var old = Object.keys(meshes).filter(function (k) { return (keep || []).indexOf(k) < 0; });
            old.sort(function (a, b) { return meshes[a].used - meshes[b].used; });
            while (old.length > 3) dropMesh(old.shift());
            if (!indexBuffer) {
                indexBuffer = gl.createBuffer();
                gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
                gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, built.indices, gl.STATIC_DRAW);
            }
            var vbo = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
            gl.bufferData(gl.ARRAY_BUFFER, built.vertices, gl.STATIC_DRAW);
            meshes[key] = { vbo: vbo, used: Date.now(), scale: built.scale, deleted: false };
            return meshes[key];
        }
        function getMesh(key) {
            var m = meshes[key];
            if (m) m.used = Date.now();
            return m || null;
        }
        function dropMesh(key) {
            var m = meshes[key];
            if (!m) return;
            gl.deleteBuffer(m.vbo);
            m.deleted = true;
            delete meshes[key];
        }

        return {
            draw: draw,
            addMesh: addMesh,
            getMesh: getMesh,
            dropMesh: dropMesh,
            supportsDepth: function () { return depthOk; },
            readLayers: readLayers,
            destroy: function () {
                Object.keys(meshes).forEach(dropMesh);
                dropTargets();
                if (indexBuffer) gl.deleteBuffer(indexBuffer);
                gl.deleteBuffer(quad);
            }
        };
    }

    // Pannellum'un üstünde duran yürüyüş perdesi. WebGL kurulamazsa null.
    function createWalkOverlay(parent, after) {
        var canvas = el('canvas', 'sanaltur-walk');
        var gl = null;
        try {
            gl = canvas.getContext('webgl', { alpha: false, antialias: false, depth: false }) || canvas.getContext('experimental-webgl');
        } catch (e) { // eslint-disable-line no-unused-vars
            gl = null; // WebGL yok: eski geçiş kullanılır
        }
        if (!gl) return null;
        var renderer = createWalkRenderer(gl);
        if (!renderer) return null;
        parent.insertBefore(canvas, after ? after.nextSibling : null);

        var maxWidth = Math.min(4096, gl.getParameter(gl.MAX_TEXTURE_SIZE));
        var textures = {}; // anahtar -> { promise, tex, used }
        var scratch = null;
        var lost = false;
        canvas.addEventListener('webglcontextlost', function (e) {
            e.preventDefault();
            lost = true;
        });

        function forget(key) {
            if (textures[key] && textures[key].tex) gl.deleteTexture(textures[key].tex);
            delete textures[key];
        }

        // Fotoğrafı (en çok 4096 px genişlikte) dokuya yükler. keep: bu sırada silinmeyecek anahtarlar
        function texture(key, url, keep) {
            var entry = textures[key];
            if (entry) {
                entry.used = Date.now();
                return entry.promise;
            }
            // Bellekte en fazla 3 fotoğraf kalır
            var old = Object.keys(textures).filter(function (k) { return (keep || []).indexOf(k) < 0; });
            old.sort(function (x, y) { return textures[x].used - textures[y].used; });
            while (old.length > 1) forget(old.shift());
            entry = textures[key] = { used: Date.now(), tex: null };
            entry.promise = new Promise(function (resolve, reject) {
                var img = new Image();
                img.onload = function () {
                    var ready = img.decode ? img.decode().catch(function () {}) : Promise.resolve();
                    ready.then(function () {
                        if (lost || textures[key] !== entry) return reject(new Error('iptal'));
                        var w = Math.min(maxWidth, img.naturalWidth);
                        scratch = scratch || document.createElement('canvas');
                        scratch.width = w;
                        scratch.height = Math.round(w / 2);
                        var ctx = scratch.getContext('2d');
                        ctx.imageSmoothingQuality = 'high';
                        ctx.drawImage(img, 0, 0, scratch.width, scratch.height);
                        var tex = gl.createTexture();
                        gl.bindTexture(gl.TEXTURE_2D, tex);
                        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, scratch);
                        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
                        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
                        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
                        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
                        scratch.width = scratch.height = 1; // belleği bırak
                        entry.tex = tex;
                        resolve(tex);
                    });
                };
                img.onerror = function () {
                    forget(key);
                    reject(new Error('fotoğraf açılamadı'));
                };
                img.src = url;
            });
            entry.promise.catch(function () {});
            return entry.promise;
        }

        // frame: createWalkRenderer'daki draw ile aynı
        function draw(frame) {
            if (lost) return;
            var dpr = Math.min(2, window.devicePixelRatio || 1);
            var w = Math.max(1, Math.round(canvas.clientWidth * dpr));
            var h = Math.max(1, Math.round(canvas.clientHeight * dpr));
            if (canvas.width !== w || canvas.height !== h) {
                canvas.width = w;
                canvas.height = h;
            }
            renderer.draw(frame, w, h);
        }

        var hideTimer = null;
        return {
            texture: texture,
            draw: draw,
            // Derinlik haritası (PNG adresi) -> derinlik ağı; yoksa ya da kurulamazsa null. raw: düz eksen -> harita
            depth: function (key, url, raw, height, keep) {
                var existing = renderer.getMesh(key);
                if (existing) return Promise.resolve(existing);
                if (!renderer.supportsDepth()) return Promise.resolve(null);
                return loadPixels(url).then(function (img) {
                    if (lost) return null;
                    return renderer.addMesh(key, buildDepthMesh(img.data, img.width, img.height, raw, height), keep);
                }).catch(function () { return null; });
            },
            isLost: function () { return lost; },
            show: function () {
                clearTimeout(hideTimer);
                canvas.style.transition = 'none';
                canvas.style.opacity = '1';
                canvas.style.display = 'block';
            },
            hide: function (fadeMs) {
                canvas.style.transition = 'opacity ' + fadeMs + 'ms';
                canvas.style.opacity = '0';
                hideTimer = setTimeout(function () { canvas.style.display = 'none'; }, fadeMs);
            },
            destroy: function () {
                clearTimeout(hideTimer);
                Object.keys(textures).forEach(forget);
                renderer.destroy();
                var ext = gl.getExtension('WEBGL_lose_context');
                if (ext) ext.loseContext();
                canvas.remove();
            }
        };
    }

    // Görüntünün piksellerini (renk dönüşümü olmadan) okur: { data, width, height }
    function loadPixels(url) {
        return new Promise(function (resolve, reject) {
            var img = new Image();
            img.onload = function () {
                var c = document.createElement('canvas');
                c.width = img.naturalWidth;
                c.height = img.naturalHeight;
                var ctx = c.getContext('2d', { willReadFrequently: true });
                ctx.drawImage(img, 0, 0);
                try {
                    resolve(ctx.getImageData(0, 0, c.width, c.height));
                } catch (e) {
                    reject(e);
                }
            };
            img.onerror = function () { reject(new Error('derinlik haritası açılamadı')); };
            img.src = url;
        });
    }

    // ------------------------------------------------------------------
    // Fotoğrafların yüklenmesi
    // ------------------------------------------------------------------

    // "Uygulama" export'u: fotoğraflar veri/*.js dosyalarında base64 olarak durur (çift tıklayınca da çalışır)
    var registeredImages = {};
    var imageWaiters = {};

    function base64ToObjectUrl(base64, mime) {
        var binary = window.atob(base64);
        var bytes = new Uint8Array(binary.length);
        for (var i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
        return URL.createObjectURL(new Blob([bytes], { type: mime }));
    }

    function registerImage(sceneId, mime, base64) {
        var url = base64ToObjectUrl(base64, mime);
        registeredImages[sceneId] = url;
        if (imageWaiters[sceneId]) {
            imageWaiters[sceneId](url);
            delete imageWaiters[sceneId];
        }
    }

    function scriptImageResolver(basePath, files) {
        var cache = {};
        return function (sceneId) {
            if (cache[sceneId]) return cache[sceneId];
            cache[sceneId] = new Promise(function (resolve, reject) {
                if (registeredImages[sceneId]) return resolve(registeredImages[sceneId]);
                imageWaiters[sceneId] = resolve;
                var script = document.createElement('script');
                script.src = basePath + files[sceneId];
                script.onload = function () { script.remove(); };
                script.onerror = function () {
                    script.remove();
                    delete cache[sceneId];
                    delete imageWaiters[sceneId];
                    reject(new Error(script.src));
                };
                document.head.appendChild(script);
            });
            return cache[sceneId];
        };
    }

    // "Web sitesi" export'u: fotoğraflar normal dosyalar olarak durur
    function urlImageResolver(basePath, files) {
        return function (sceneId) {
            return Promise.resolve(basePath + files[sceneId]);
        };
    }

    // ------------------------------------------------------------------
    // Tur
    // options: {
    //   mode: 'app' | 'web' | 'preview',
    //   dataPath, imagePath, files: { sceneId: dosya }       // panoramalar (app / web)
    //   resolveImage(sceneId) -> Promise<url>                // önizleme
    //   assets: { dosyaId: url }                              // logo, kat planı, bilgi noktası medyası
    //   thumbs: { sceneId: url }                              // oda şeridi küçük resimleri (yoksa scene.thumb)
    //   startSceneId, startView: { yaw, pitch }
    // }
    // ------------------------------------------------------------------

    function createTour(container, tour, options) {
        options = options || {};
        var root = typeof container === 'string' ? document.getElementById(container) : container;
        root.classList.add('sanaltur-root');
        var i18n = tour.i18n || {};
        var primaryLanguage = i18n.primary || 'tr';
        var languages = i18n.languages && i18n.languages.length ? i18n.languages : [primaryLanguage];
        var lang = pickLanguage(options.language, languages, primaryLanguage);
        var S = STRINGS[lang] || STRINGS.en;
        var t = translator(tour, lang);
        if (options.mode !== 'preview') document.documentElement.lang = lang;
        if (tour.theme && tour.theme.accent) root.style.setProperty('--sanaltur-accent', tour.theme.accent);
        var destroyed = false;
        var cleanups = [];

        function listen(target, type, fn, opts) {
            target.addEventListener(type, fn, opts);
            cleanups.push(function () { target.removeEventListener(type, fn, opts); });
        }

        var viewerEl = el('div', 'sanaltur-viewer');
        root.appendChild(viewerEl);
        var messageEl = el('div', 'sanaltur-message');
        root.appendChild(messageEl);

        function showMessage(text, isError) {
            messageEl.textContent = text || '';
            messageEl.className = 'sanaltur-message' + (text ? ' sanaltur-message--visible' : '') + (isError ? ' sanaltur-message--error' : '');
        }

        function toast(text) {
            var node = el('div', 'sanaltur-toast sanaltur-panel', text);
            root.appendChild(node);
            setTimeout(function () { node.remove(); }, 2200);
        }

        function destroy() {
            if (destroyed) return;
            destroyed = true;
            stopAutoTour();
            cleanups.forEach(function (fn) { fn(); });
            if (walker) walker.destroy();
            if (viewer) viewer.destroy();
            root.innerHTML = '';
            root.classList.remove('sanaltur-root');
        }

        var api = {
            goToScene: function (id) { jumpTo(id); },
            getViewer: function () { return viewer; },
            getScene: function () { return currentId; },
            getLanguage: function () { return lang; },
            setLanguage: function (code) { switchLanguage(code); },
            destroy: destroy
        };

        if (options.mode === 'web' && window.location.protocol === 'file:') {
            showMessage(S.webFile, true);
            return api;
        }

        var assets = options.assets || {};
        function assetUrl(id) { return id && assets[id] ? assets[id] : ''; }
        function thumbUrl(id) { return (options.thumbs && options.thumbs[id]) || tour.scenes[id].thumb || ''; }

        var resolveImage = options.resolveImage || (options.mode === 'app'
            ? scriptImageResolver(options.dataPath || 'veri/', options.files || {})
            : urlImageResolver(options.imagePath || '', options.files || {}));

        var ids = orderedSceneIds(tour);
        var orientation = computeOrientation(tour);
        var branding = tour.branding || {};
        var viewer = null;
        var currentId = null;
        var addedScenes = {};
        var busy = false;
        var pending = null;
        var firstView = options.startView || null;

        // --- Gezinme ---

        // variant: öncesi / sonrası görünümü (her zaman tek parça fotoğraf)
        function sceneConfig(sceneId, url, variant) {
            var scene = tour.scenes[sceneId];
            var horizon = imageHorizon(tour, variant ? sceneId + '~' : sceneId);
            var config = {
                type: 'equirectangular',
                panorama: url,
                yaw: scene.yaw || 0,
                pitch: scene.pitch || 0,
                horizonPitch: horizon ? horizon.pitch : undefined,
                horizonRoll: horizon ? horizon.roll : undefined,
                hotSpots: validHotSpots(scene, tour).map(function (hs) {
                    return toPannellumHotSpot(hs, tour, { onActivate: activateHotspot, translate: t, strings: S });
                })
            };
            if (scene.multires && !variant) {
                // Parçalı panorama: görünen yerin parçaları yüklenir (bkz. tiles.js)
                config.type = 'multires';
                delete config.panorama;
                config.multiRes = {
                    basePath: (options.imagePath || '') + scene.multires.dir,
                    path: '/%l/%s%y_%x',
                    fallbackPath: '/fallback/%s',
                    extension: 'jpg',
                    tileResolution: scene.multires.tileResolution,
                    maxLevel: scene.multires.maxLevel,
                    cubeResolution: scene.multires.cubeResolution
                };
            }
            return config;
        }

        function activateHotspot(hs) {
            noteActivity();
            if (hs.type === 'scene') followLink(hs);
            else openInfo(hs);
        }

        // Geçiş noktasına tıklanınca: yürüme efekti, sonra hedef odaya yürüme yönüne bakarak geç.
        function followLink(hs) {
            if (busy || !viewer || !tour.scenes[hs.sceneId]) return;
            walkThenGo(hs.yaw, hs.sceneId, arrivalView(tour, currentId, hs, orientation), hs.pitch);
        }

        // Oda şeridi, harita, kat butonu, otomatik tur ve direkt link ile bir odaya geçiş
        function jumpTo(targetId) {
            if (destroyed || !tour.scenes[targetId] || targetId === currentId) return;
            if (!viewer || busy) return goToScene(targetId);
            var plan = jumpPlan(tour, currentId, targetId, orientation);
            var linked = validHotSpots(tour.scenes[currentId], tour).some(function (hs) {
                return hs.type === 'scene' && hs.sceneId === targetId;
            });
            // Bağlantısı olmayan uzak odaya düz çizgide yürümek duvarların içinden geçmek gibi görünür
            walkThenGo(plan.walkYaw, targetId, plan.view, undefined, linked ? WALK_MAX_DISTANCE : WALK_UNLINKED_DISTANCE);
        }

        // Geçiş perdesi (derinlikli yürüyüş); ilk geçişte kurulur. null: henüz kurulmadı, false: kurulamadı
        var walker = null;
        var walkerWaiting = false; // perde, yeni odanın yüklenmesini bekliyor
        var walkerRun = 0; // her geçişte artar; eski geçişin geciken işi yenisini kapatmasın
        var walkerAnimating = false; // yürüyüş sürüyor (yeni oda perdenin arkasında erken yükleniyorsa)
        var walkerLoaded = false; // erken yüklenen oda, yürüyüş bitmeden yüklendi
        var settleHfov = null; // varıştan sonra dönülecek görüş açısı

        function walkOverlay() {
            if (walker === null) walker = createWalkOverlay(root, viewerEl) || false;
            return walker && !walker.isLost() ? walker : null;
        }

        // Odanın derinlik ağı (editörde yapay zekâyla hesaplanmış derinlik haritasından); yoksa ya da
        // açılamazsa null: o oda basit oda modeliyle çizilir
        function depthMesh(sceneId, keep) {
            var overlay = walkOverlay();
            var scene = tour.scenes[sceneId];
            if (!overlay || !scene || !scene.depth) return Promise.resolve(null);
            return resolveImage(sceneId + '#derinlik').then(function (url) {
                return overlay.depth(sceneId, url, horizonMatrix(imageHorizon(tour, sceneId)), cameraHeight(scene), keep);
            }).catch(function () { return null; });
        }

        function releaseWalker() {
            if (!walkerWaiting) return;
            walkerWaiting = false;
            var run = walkerRun;
            whenTilesReady(function () {
                if (run !== walkerRun) return;
                walker.hide(250);
                if (settleHfov) viewer.setHfov(settleHfov, 600);
                settleHfov = null;
            });
        }

        // Parçalı odada pannellum "load"u parçalar gelmeden verir: görünen parçalar yüklenene kadar
        // (en çok TILE_WAIT ms) beklenir ki perde kalkınca siyah ya da bulanık ekran görünmesin
        function whenTilesReady(callback) {
            var renderer = viewer && viewer.getRenderer();
            if (!renderer || !renderer.isLoading || viewer.getConfig().type !== 'multires') return callback();
            var start = Date.now();
            var check = function () {
                if (destroyed) return;
                if (!renderer.isLoading() || Date.now() - start > TILE_WAIT) return callback();
                requestAnimationFrame(check);
            };
            requestAnimationFrame(check); // ilk çizimden sonra: görünen parçalar o zaman belli olur
        }

        // walkPitch: geçiş noktasının dikey açısı (mesafe tahmini için), bilinmiyorsa boş
        // maxDistance: bundan uzağa yürünmez, görüntü karışarak geçilir
        function walkThenGo(walkYaw, targetId, view, walkPitch, maxDistance) {
            resolveImage(targetId).catch(function () {}); // efekt sürerken fotoğraf hazırlansın
            var overlay = walkOverlay();
            var motion = tour.walkEffect !== false && !prefersReducedMotion() && walkYaw != null;
            if (!overlay) {
                if (!motion) return goToScene(targetId, view);
                busy = true;
                viewer.stopAutoRotate();
                walkTowards(viewer, walkYaw, function () {
                    busy = false;
                    goToScene(targetId, view);
                });
                return;
            }
            var geom = motion ? walkGeometry(tour, currentId, targetId, walkYaw, walkPitch, orientation) : null;
            if (geom && maxDistance && geom.distance > maxDistance) geom = null;
            var fromId = currentId;
            var fromKey = currentVariant ? currentId + '~' + currentVariant : currentId;
            var hfov = viewer.getHfov();
            busy = true;
            viewer.stopAutoRotate();
            // Kamera dönerken iki fotoğraf (ve varsa derinlik haritaları) perdeye yüklenir
            var textures = Promise.all([
                resolveImage(fromKey).then(function (url) { return overlay.texture(fromKey, url, [targetId]); }),
                resolveImage(targetId).then(function (url) { return overlay.texture(targetId, url, [fromKey]); }),
                geom ? depthMesh(fromId, [targetId]) : null,
                geom ? depthMesh(targetId, [fromId]) : null
            ]);
            var play = function () {
                textures.then(function (tex) {
                    if (destroyed || currentId !== fromId) return;
                    playTransition(overlay, tex, geom, fromKey, targetId, view, geom ? null : hfov);
                }, function () {
                    busy = false;
                    goToScene(targetId, view);
                });
            };
            if (!motion) play();
            else if (geom) turnTowards(viewer, walkYaw, play);
            else walkTowards(viewer, walkYaw, play); // yürünemiyorsa eski efekt: dönüp yaklaş, sonra karış
        }

        // Perdede geçişi oynatır: geom varsa kamera B'nin çekim noktasına yürür, yoksa yerinde karışır.
        // settle: varıştan sonra dönülecek görüş açısı (yaklaşma efektinden sonra)
        // fromKey: şu an görünen fotoğraf (oda ya da "oda~görünüm")
        function playTransition(overlay, tex, geom, fromKey, targetId, view, settle) {
            var target = tour.scenes[targetId];
            var arrival = view || { yaw: target.yaw || 0, pitch: target.pitch || 0 };
            var start = { yaw: viewer.getYaw(), pitch: viewer.getPitch(), hfov: viewer.getHfov() };
            var flat = { height: WALK_CAMERA_HEIGHT, ceiling: 1.6, radius: 10 };
            var from = geom ? geom.from : flat;
            var to = geom ? geom.to : flat;
            // Kamera yerinde kalırsa B, varış bakışı şimdiki bakışla aynı hizaya gelecek şekilde döndürülür
            var delta = geom ? geom.delta : normalizeYaw(arrival.yaw - start.yaw);
            var targetPos = geom ? geom.target : [0, 0, 0];
            var turn = normalizeYaw(arrival.yaw - delta - start.yaw);
            var endPitch = arrival.pitch || 0;
            var duration = geom ? Math.min(1800, Math.max(900, 600 + geom.distance * 160)) : 450;
            var rawA = horizonMatrix(imageHorizon(tour, fromKey));
            var rawB = matMul(horizonMatrix(imageHorizon(tour, targetId)), yawMatrix(delta));
            // Derinlik ağları (sadece yürürken); harita odanın ana fotoğrafının ekseninde
            var usable = function (m) { return geom && m && !m.deleted ? m : null; };
            var meshA = usable(tex[2]);
            var meshB = usable(tex[3]);
            var geoA = horizonMatrix(imageHorizon(tour, String(fromKey).split('~')[0]));
            var frame = function (p) {
                var s = p * p * (3 - 2 * p);
                var m = walkMix(s, geom, meshA || meshB);
                overlay.draw({
                    yaw: start.yaw + turn * s,
                    pitch: start.pitch + (endPitch - start.pitch) * s,
                    hfov: start.hfov,
                    pos: [targetPos[0] * s, targetPos[1] * s, targetPos[2] * s],
                    target: targetPos,
                    mix: m,
                    texA: tex[0],
                    texB: tex[1],
                    rawA: rawA,
                    rawB: rawB,
                    roomA: from,
                    roomB: to,
                    meshA: meshA,
                    meshB: meshB,
                    geoA: geoA,
                    geoB: rawB
                });
            };
            walkerRun++;
            overlay.show(); // önce görünür olsun ki perdenin boyutu bilinsin
            frame(0);
            var endView = { yaw: arrival.yaw, pitch: endPitch, hfov: start.hfov };
            var finish = function () {
                // Yeni oda perdenin arkasında yüklenir; yüklenince perde kalkar (onSceneLoaded)
                walkerWaiting = true;
                settleHfov = settle;
                viewer.getConfig().sceneFadeDuration = 0;
                busy = false;
                goToScene(targetId, endView, true);
            };
            // Parçalı oda yürürken yüklenir: görünen parçalar varışa hazır olsun (küçük parçalar yürüyüşü
            // takılmadan yüklenir; tek parça büyük fotoğraf ise yürüyüş bitince yüklenir)
            var early = !!target.multires;
            walkerLoaded = false;
            walkerAnimating = early;
            if (early) finish();
            var t0 = null;
            var step = function (now) {
                if (destroyed) return;
                if (t0 === null) t0 = now;
                var p = Math.min(1, (now - t0) / duration);
                frame(p);
                if (p < 1) return requestAnimationFrame(step);
                if (!early) return finish();
                walkerAnimating = false;
                // Yürürken sürüklendiyse bile perdenin son karesiyle aynı bakışta açılsın
                if (currentId === targetId) {
                    viewer.setPitch(endView.pitch, false);
                    viewer.setYaw(endView.yaw, false);
                    viewer.setHfov(endView.hfov, false);
                }
                if (walkerLoaded) onSceneLoaded();
            };
            requestAnimationFrame(step);
        }

        // view: { yaw, pitch, hfov? } varışta bakılacak yön; verilmezse odanın başlangıç açısı kullanılır.
        // underOverlay: geçiş perdesinin arkasında yükleniyor (yükleniyor yazısı gösterilmez)
        function goToScene(sceneId, view, underOverlay) {
            if (destroyed || !tour.scenes[sceneId] || sceneId === currentId) return;
            if (busy) { pending = { id: sceneId, view: view }; return; }
            busy = true;
            if (options.mode === 'app' && !underOverlay) showMessage(S.loading);

            resolveImage(sceneId).then(function (url) {
                if (destroyed) return;
                showMessage('');
                if (!viewer) {
                    var scenes = {};
                    scenes[sceneId] = sceneConfig(sceneId, url);
                    if (view) {
                        scenes[sceneId].yaw = view.yaw;
                        scenes[sceneId].pitch = view.pitch;
                    }
                    viewer = pannellum.viewer(viewerEl, {
                        // ignoreGPanoXMP: kameranın yazdığı eğiklik / pusula bilgisi editörde ufuk düzeltmesine dönüştürülür;
                        // pannellum'un ayrıca uygulaması (ve pusula göstermesi) tutarsızlık yaratır
                        default: { firstScene: sceneId, sceneFadeDuration: 800, autoLoad: true, showControls: false, ignoreGPanoXMP: true },
                        scenes: scenes
                    });
                    // Parçalı odada pannellum "load"u hemen (loadScene / viewer() dönmeden) verir: işi bir sonraki
                    // adımda yapılır ki currentId güncel olsun
                    viewer.on('load', function () { setTimeout(onSceneLoaded, 0); });
                    if (viewer.isLoaded()) setTimeout(onSceneLoaded, 0); // "load" dinleyiciden önce geldiyse
                    viewer.on('error', function () {
                        busy = false;
                        releaseWalker();
                    });
                    buildGyroButton();
                } else {
                    if (!addedScenes[sceneId]) viewer.addScene(sceneId, sceneConfig(sceneId, url));
                    viewer.loadScene(sceneId, view ? view.pitch : undefined, view ? view.yaw : undefined, view && view.hfov ? view.hfov : undefined);
                }
                addedScenes[sceneId] = true;
                currentId = sceneId;
                currentVariant = null;
                sceneChanged();
            }).catch(function (err) {
                busy = false;
                releaseWalker();
                showMessage(S.fileNotFound + err.message, true);
            });
        }

        function onSceneLoaded() {
            if (destroyed) return;
            if (walkerAnimating) { walkerLoaded = true; return; } // yürüyüş bitince devam edilir
            busy = false;
            releaseWalker();
            if (variantSwitching) {
                variantSwitching = false;
                return;
            }
            preloadNeighbours(currentId);
            onSceneAudio();
            if (autoTour.running) {
                viewer.startAutoRotate(-3);
                scheduleAutoTour();
            }
            if (pending) {
                var next = pending;
                pending = null;
                goToScene(next.id, next.view);
            }
        }

        function preloadNeighbours(sceneId) {
            validHotSpots(tour.scenes[sceneId], tour).forEach(function (hs) {
                if (hs.type !== 'scene') return;
                resolveImage(hs.sceneId).then(function (url) {
                    if (options.mode === 'web') new Image().src = url;
                }, function () {});
                // Parçalı odanın en küçük katmanı (6 küçük parça): varınca hemen görünsün
                var multires = tour.scenes[hs.sceneId] && tour.scenes[hs.sceneId].multires;
                if (multires && options.mode === 'web') {
                    'fbudlr'.split('').forEach(function (face) {
                        new Image().src = (options.imagePath || '') + multires.dir + '/1/' + face + '0_0.jpg';
                    });
                }
            });
        }

        function sceneChanged() {
            updateVariantBar();
            updateFloorMenu();
            updateStrip();
            updateMinimap();
            updateHash();
        }


        // --- Öncesi / sonrası görünümleri ---
        // Aynı noktadan çekilmiş alternatif fotoğraflar; aynı bakış açısında yumuşak geçişle değişir.
        var variantBar = null;
        var currentVariant = null; // null: ana fotoğraf
        var variantSwitching = false;

        function updateVariantBar() {
            if (variantBar) variantBar.remove();
            variantBar = null;
            var scene = tour.scenes[currentId];
            if (!scene || !scene.variants || !scene.variants.length) return;
            variantBar = el('div', 'sanaltur-variants sanaltur-panel');
            var choices = [{ id: null, label: t('main:' + currentId, scene.mainLabel || '•') }].concat(scene.variants.map(function (v) {
                return { id: v.id, label: t('variant:' + v.id, v.label) };
            }));
            choices.forEach(function (choice) {
                variantBar.appendChild(button('sanaltur-variant-btn' + (choice.id === currentVariant ? ' sanaltur-variant-btn--active' : ''), choice.label, null, function () {
                    noteActivity();
                    showVariant(choice.id);
                }));
            });
            root.appendChild(variantBar);
        }

        function showVariant(variantId) {
            if (busy || !viewer || variantId === currentVariant) return;
            var key = variantId ? currentId + '~' + variantId : currentId;
            var sceneId = currentId;
            busy = true;
            variantSwitching = true;
            resolveImage(key).then(function (url) {
                if (destroyed || sceneId !== currentId) return;
                if (!addedScenes[key]) {
                    viewer.addScene(key, sceneConfig(currentId, url, !!variantId));
                    addedScenes[key] = true;
                }
                currentVariant = variantId;
                viewer.loadScene(key, 'same', 'same', 'same');
                updateVariantBar();
            }).catch(function (err) {
                busy = false;
                variantSwitching = false;
                showMessage(S.fileNotFound + err.message, true);
            });
        }

        // --- Bilgi penceresi (fotoğraf / video / bağlantı) ---

        var modal = null;

        function closeModal() {
            if (!modal) return;
            var video = modal.querySelector('video');
            if (video) {
                video.pause();
                if (music && !muted) music.play().catch(function () {});
            }
            modal.remove();
            modal = null;
        }

        function openInfo(hs) {
            closeModal();
            modal = el('div', 'sanaltur-modal');
            var box = el('div', 'sanaltur-modal-box');
            var close = button('sanaltur-modal-close', '✕', S.close, closeModal);
            box.appendChild(close);
            var header = t('hs:' + hs.id + ':header', hs.header);
            var text = t('hs:' + hs.id + ':text', hs.text);
            if (header) box.appendChild(el('h3', null, header));
            var mediaUrl = assetUrl(hs.mediaId);
            if (mediaUrl && hs.mediaType === 'video') {
                if (music) music.pause();
                stopNarration();
                var video = el('video');
                video.src = mediaUrl;
                video.controls = true;
                video.setAttribute('playsinline', '');
                box.appendChild(video);
            } else if (mediaUrl) {
                var img = el('img');
                img.src = mediaUrl;
                img.alt = header || '';
                box.appendChild(img);
            }
            if (text) box.appendChild(el('p', null, text));
            var link = safeLink(hs.link);
            if (link) {
                var a = el('a', 'sanaltur-modal-link', S.openLink);
                a.href = link;
                a.target = '_blank';
                a.rel = 'noopener';
                box.appendChild(a);
            }
            modal.appendChild(box);
            modal.addEventListener('click', function (e) { if (e.target === modal) closeModal(); });
            root.appendChild(modal);
            close.focus();
        }

        listen(document, 'keydown', function (e) { if (e.key === 'Escape') closeModal(); });

        // --- Logo ve başlık ---

        var logoUrl = assetUrl(branding.logo);
        if (branding.title || logoUrl) {
            var brand = el('div', 'sanaltur-brand sanaltur-panel');
            if (logoUrl) {
                var logo = el('img');
                logo.src = logoUrl;
                logo.alt = '';
                brand.appendChild(logo);
            }
            if (branding.title) brand.appendChild(el('span', null, t('name', branding.title)));
            root.appendChild(brand);
        }

        // --- Kat menüsü (sadece fotoğrafı olan katlar, en az iki kat varsa) ---

        var floorButtons = {};
        var floors = (tour.floors || []).filter(function (floor) {
            return ids.some(function (id) { return tour.scenes[id].floorId === floor.id; });
        });
        if (floors.length > 1) {
            var menu = el('div', 'sanaltur-floors');
            floors.forEach(function (floor) {
                floorButtons[floor.id] = button('sanaltur-floor-btn', t('floor:' + floor.id, floor.name), null, function () {
                    noteActivity();
                    var first = ids.filter(function (id) { return tour.scenes[id].floorId === floor.id; })[0];
                    if (first && tour.scenes[currentId].floorId !== floor.id) jumpTo(first);
                });
                menu.appendChild(floorButtons[floor.id]);
            });
            root.appendChild(menu);
        }

        function updateFloorMenu() {
            var activeFloor = tour.scenes[currentId].floorId;
            Object.keys(floorButtons).forEach(function (floorId) {
                floorButtons[floorId].classList.toggle('sanaltur-floor-btn--active', floorId === activeFloor);
            });
        }

        // --- Oda şeridi ---

        var strip = null;
        var stripItems = {};
        var stripFloor = null;
        var stripOpen = window.innerWidth > 600;

        if (tour.roomStrip !== false && ids.length > 1) {
            strip = el('div', 'sanaltur-strip');
            root.appendChild(strip);
        }

        function updateStripOffset() {
            var visible = strip && !strip.classList.contains('sanaltur-strip--hidden');
            root.style.setProperty('--sanaltur-strip-h', visible ? strip.offsetHeight + 'px' : '0px');
        }

        function updateStrip() {
            if (!strip) return;
            var floorId = tour.scenes[currentId].floorId;
            var floorIds = ids.filter(function (id) { return tour.scenes[id].floorId === floorId; });
            if (stripFloor !== floorId) {
                stripFloor = floorId;
                strip.innerHTML = '';
                stripItems = {};
                floorIds.forEach(function (id) {
                    var roomTitle = t('scene:' + id, tour.scenes[id].title);
                    var item = button('sanaltur-strip-item', null, roomTitle, function () {
                        noteActivity();
                        jumpTo(id);
                    });
                    var thumb = thumbUrl(id);
                    if (thumb) {
                        var img = el('img');
                        img.src = thumb;
                        img.alt = '';
                        img.loading = 'lazy';
                        item.appendChild(img);
                    } else {
                        item.appendChild(el('div', 'sanaltur-strip-thumb'));
                    }
                    item.appendChild(el('span', null, roomTitle));
                    stripItems[id] = item;
                    strip.appendChild(item);
                });
            }
            strip.classList.toggle('sanaltur-strip--hidden', !stripOpen || floorIds.length < 2);
            if (stripToggle) stripToggle.style.display = floorIds.length < 2 ? 'none' : '';
            Object.keys(stripItems).forEach(function (id) {
                stripItems[id].classList.toggle('sanaltur-strip-item--active', id === currentId);
            });
            if (stripItems[currentId] && stripItems[currentId].scrollIntoView && stripOpen) {
                stripItems[currentId].scrollIntoView({ block: 'nearest', inline: 'nearest' });
            }
            updateStripOffset();
        }

        // --- Mini harita (kat planı) ---

        var minimap = null;
        var minimapFloor = null;
        var minimapLarge = false;
        var minimapDots = {};
        var cone = null;
        var conePath = null;
        var rafId = 0;

        function minimapSize(aspect) {
            var small = window.innerWidth <= 600;
            var maxW = minimapLarge ? (small ? 260 : 380) : (small ? 130 : 190);
            var maxH = minimapLarge ? (small ? 260 : 320) : (small ? 130 : 170);
            var w = maxW;
            var h = w / aspect;
            if (h > maxH) {
                h = maxH;
                w = h * aspect;
            }
            return { w: Math.round(w), h: Math.round(h) };
        }

        function buildMinimap(floor) {
            if (minimap) minimap.remove();
            minimapFloor = floor.id;
            minimapDots = {};
            minimap = el('div', 'sanaltur-minimap sanaltur-panel');
            var inner = el('div', 'sanaltur-minimap-inner');
            var size = minimapSize(floor.plan.aspect || 1);
            inner.style.width = size.w + 'px';
            inner.style.height = size.h + 'px';
            var img = el('img');
            img.src = assetUrl(floor.plan.imageId);
            img.alt = t('floor:' + floor.id, floor.name);
            inner.appendChild(img);

            cone = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            cone.setAttribute('class', 'sanaltur-minimap-cone');
            cone.setAttribute('viewBox', '-50 -50 100 100');
            conePath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            conePath.setAttribute('fill', 'rgba(255, 87, 34, 0.4)');
            conePath.setAttribute('stroke', 'rgba(255, 87, 34, 0.9)');
            conePath.setAttribute('stroke-width', '1.5');
            cone.appendChild(conePath);
            inner.appendChild(cone);

            ids.forEach(function (id) {
                var scene = tour.scenes[id];
                if (scene.floorId !== floor.id || !scene.map) return;
                var dot = button('sanaltur-minimap-dot', null, t('scene:' + id, scene.title), function () {
                    noteActivity();
                    jumpTo(id);
                });
                dot.style.left = (scene.map.x * 100) + '%';
                dot.style.top = (scene.map.y * 100) + '%';
                minimapDots[id] = dot;
                inner.appendChild(dot);
            });
            minimap.appendChild(inner);
            minimap.appendChild(button('sanaltur-btn sanaltur-minimap-toggle', minimapLarge ? '−' : '+', minimapLarge ? S.mapSmaller : S.mapBigger, function () {
                minimapLarge = !minimapLarge;
                buildMinimap(floor);
                updateMinimap();
            }));
            root.appendChild(minimap);
        }

        function updateMinimap() {
            if (tour.miniMap === false) return;
            var scene = tour.scenes[currentId];
            var floor = findFloor(tour, scene.floorId);
            var hasPlan = floor && floor.plan && assetUrl(floor.plan.imageId) &&
                ids.some(function (id) { return tour.scenes[id].floorId === floor.id && tour.scenes[id].map; });
            if (!hasPlan) {
                if (minimap) minimap.remove();
                minimap = null;
                minimapFloor = null;
                return;
            }
            if (!minimap || minimapFloor !== floor.id) buildMinimap(floor);
            Object.keys(minimapDots).forEach(function (id) {
                minimapDots[id].classList.toggle('sanaltur-minimap-dot--active', id === currentId);
            });
            cone.style.display = scene.map && orientation.headings[currentId] != null ? '' : 'none';
            if (scene.map) {
                cone.style.left = (scene.map.x * 100) + '%';
                cone.style.top = (scene.map.y * 100) + '%';
            }
            if (!rafId) rafId = window.requestAnimationFrame(updateCone);
        }

        var lastConeHfov = null;
        function updateCone() {
            rafId = 0;
            if (destroyed || !minimap || !viewer) return;
            var heading = orientation.headings[currentId];
            if (heading != null && tour.scenes[currentId].map) {
                var hfov = Math.round(viewer.getHfov());
                if (hfov !== lastConeHfov) {
                    lastConeHfov = hfov;
                    var half = Math.min(80, hfov / 2) * Math.PI / 180;
                    var x = 45 * Math.sin(half);
                    var y = -45 * Math.cos(half);
                    conePath.setAttribute('d', 'M0 0 L' + (-x) + ' ' + y + ' A45 45 0 0 1 ' + x + ' ' + y + ' Z');
                }
                cone.style.transform = 'rotate(' + (viewer.getYaw() + heading) + 'deg)';
            }
            rafId = window.requestAnimationFrame(updateCone);
        }
        cleanups.push(function () { if (rafId) window.cancelAnimationFrame(rafId); });

        // --- Sağ alttaki butonlar ---

        var actions = el('div', 'sanaltur-actions');
        root.appendChild(actions);

        var contact = branding.contact || {};
        var phone = String(contact.phone || '').replace(/[^\d+]/g, '');
        if (phone) {
            var tel = el('a', 'sanaltur-btn', '📞');
            tel.href = 'tel:' + phone;
            tel.title = S.call + ': ' + contact.phone;
            tel.setAttribute('aria-label', tel.title);
            actions.appendChild(tel);
        }
        var wa = String(contact.whatsapp || '').replace(/\D/g, '');
        if (wa) {
            if (wa.length === 11 && wa.charAt(0) === '0') wa = '9' + wa;           // 05xx... -> 905xx...
            else if (wa.length === 10 && wa.charAt(0) === '5') wa = '90' + wa;     // 5xx...  -> 905xx...
            var whatsapp = el('a', 'sanaltur-btn sanaltur-btn--whatsapp', '💬');
            whatsapp.href = 'https://wa.me/' + wa;
            whatsapp.target = '_blank';
            whatsapp.rel = 'noopener';
            whatsapp.title = S.whatsapp;
            whatsapp.setAttribute('aria-label', whatsapp.title);
            actions.appendChild(whatsapp);
        }
        if (contact.email) {
            var mail = el('a', 'sanaltur-btn', '✉️');
            mail.href = 'mailto:' + String(contact.email).trim();
            mail.title = S.email + ': ' + contact.email;
            mail.setAttribute('aria-label', mail.title);
            actions.appendChild(mail);
        }
        var website = safeLink(contact.website);
        if (website) {
            var web = el('a', 'sanaltur-btn', '🌐');
            web.href = website;
            web.target = '_blank';
            web.rel = 'noopener';
            web.title = S.website;
            web.setAttribute('aria-label', web.title);
            actions.appendChild(web);
        }

        if (options.mode === 'web' && navigator.clipboard && window.isSecureContext) {
            actions.appendChild(button('sanaltur-btn', '🔗', S.copyLink, function () {
                navigator.clipboard.writeText(window.location.href).then(function () {
                    toast(S.copied);
                }, function () {
                    toast(window.location.href);
                });
            }));
        }

        var gyroButton = null;
        function buildGyroButton() {
            if (tour.gyroscope === false || !viewer.isOrientationSupported()) return;
            gyroButton = button('sanaltur-btn', '📱', S.gyro, function () {
                if (viewer.isOrientationActive()) viewer.stopOrientation();
                else viewer.startOrientation();
                setTimeout(updateGyroButton, 500);
            });
            actions.insertBefore(gyroButton, autoButton || stripToggle || fullscreenButton || null);
        }
        function updateGyroButton() {
            if (gyroButton) gyroButton.classList.toggle('sanaltur-btn--active', viewer.isOrientationActive());
        }


        // --- Ses: oda anlatımı ve fon müziği ---
        // Tarayıcılar kullanıcı dokunmadan ses çalmaya izin vermez; ses ilk dokunuşta başlar.
        var audioSettings = tour.audio || {};
        var musicUrl = assetUrl(audioSettings.music);
        var musicVolume = typeof audioSettings.musicVolume === 'number' ? audioSettings.musicVolume : 0.35;
        var hasNarration = ids.some(function (id) { return !!assetUrl(tour.scenes[id].audio); });
        var music = null;
        var narration = null;
        var audioUnlocked = false;
        var pendingNarration = false;
        var muted = !!options.audioMuted;
        var muteButton = null;
        var narrationButton = null;

        function setMusicVolume() {
            if (music) music.volume = muted ? 0 : musicVolume * (narration ? 0.25 : 1);
        }

        function stopNarration() {
            if (narration) narration.pause();
            narration = null;
            setMusicVolume();
        }

        function playNarration() {
            stopNarration();
            var url = currentId && assetUrl(tour.scenes[currentId].audio);
            if (!url || muted) return;
            if (!audioUnlocked) {
                pendingNarration = true;
                return;
            }
            narration = new Audio(url);
            narration.onended = function () {
                narration = null;
                setMusicVolume();
            };
            setMusicVolume();
            narration.play().catch(stopNarration);
        }

        function unlockAudio() {
            if (audioUnlocked || destroyed) return;
            audioUnlocked = true;
            if (musicUrl) {
                music = new Audio(musicUrl);
                music.loop = true;
                setMusicVolume();
                if (!muted) music.play().catch(function () {});
            }
            if (pendingNarration) {
                pendingNarration = false;
                playNarration();
            }
        }

        function updateAudioButtons() {
            if (muteButton) {
                muteButton.textContent = muted ? '🔇' : '🔊';
                muteButton.title = muted ? S.unmute : S.mute;
                muteButton.setAttribute('aria-label', muteButton.title);
            }
            if (narrationButton) narrationButton.style.display = currentId && assetUrl(tour.scenes[currentId].audio) ? '' : 'none';
        }

        // Odaya girilince (fotoğraf yüklenince) anlatım çalar
        function onSceneAudio() {
            updateAudioButtons();
            if (audioSettings.narrationAutoplay !== false) playNarration();
            else stopNarration();
        }

        if (musicUrl || hasNarration) {
            listen(root, 'pointerdown', unlockAudio, true);
            listen(document, 'keydown', unlockAudio);
            muteButton = button('sanaltur-btn', '🔊', S.mute, function () {
                muted = !muted;
                if (muted) {
                    stopNarration();
                    if (music) music.pause();
                } else if (music) {
                    music.play().catch(function () {});
                }
                setMusicVolume();
                updateAudioButtons();
            });
            actions.appendChild(muteButton);
            if (hasNarration) {
                narrationButton = button('sanaltur-btn', '🎙', S.narration, function () {
                    unlockAudio();
                    if (muted) {
                        muted = false;
                        if (music) music.play().catch(function () {});
                    }
                    playNarration();
                    updateAudioButtons();
                });
                actions.appendChild(narrationButton);
            }
            updateAudioButtons();
            if (options.audioUnlocked) unlockAudio(); // dil değişiminde ses kaldığı yerden sürsün
        }
        cleanups.push(function () {
            stopNarration();
            if (music) music.pause();
        });

        var autoTourSettings = tour.autoTour || {};
        var autoButton = null;
        if (autoTourSettings.button !== false && ids.length > 1) {
            autoButton = button('sanaltur-btn', '▶', S.autoTour, function () {
                if (autoTour.running) stopAutoTour();
                else startAutoTour();
            });
            actions.appendChild(autoButton);
        }

        var stripToggle = null;
        if (strip) {
            stripToggle = button('sanaltur-btn', '▦', S.rooms, function () {
                stripOpen = !stripOpen;
                stripToggle.classList.toggle('sanaltur-btn--active', stripOpen);
                updateStrip();
            });
            stripToggle.classList.toggle('sanaltur-btn--active', stripOpen);
            actions.appendChild(stripToggle);
        }

        // --- Dil ---
        // Dil değişince tur aynı oda ve aynı bakış açısıyla yeni dilde yeniden kurulur.
        function switchLanguage(next) {
            if (next === lang || destroyed) return;
            var nextOptions = {};
            Object.keys(options).forEach(function (key) { nextOptions[key] = options[key]; });
            nextOptions.language = next;
            nextOptions.startSceneId = currentId;
            nextOptions.startView = viewer ? { yaw: viewer.getYaw(), pitch: viewer.getPitch() } : null;
            nextOptions.skipCover = true;
            nextOptions.autoTourRunning = autoTour.running;
            nextOptions.audioUnlocked = audioUnlocked;
            nextOptions.audioMuted = muted;
            destroy();
            var fresh = createTour(root, tour, nextOptions);
            Object.keys(fresh).forEach(function (key) { api[key] = fresh[key]; });
        }
        if (languages.length > 1) {
            var langMenu = null;
            var langButton = button('sanaltur-btn sanaltur-lang-btn', lang.toUpperCase(), S.language + ': ' + (LANGUAGE_NAMES[lang] || lang), function () {
                if (languages.length === 2) return switchLanguage(languages[languages.indexOf(lang) === 0 ? 1 : 0]);
                if (langMenu) {
                    langMenu.remove();
                    langMenu = null;
                    return;
                }
                langMenu = el('div', 'sanaltur-lang-menu sanaltur-panel');
                languages.forEach(function (code) {
                    langMenu.appendChild(button('sanaltur-lang-option' + (code === lang ? ' sanaltur-lang-option--active' : ''), LANGUAGE_NAMES[code] || code, null, function () {
                        switchLanguage(code);
                    }));
                });
                actions.insertBefore(langMenu, langButton);
            });
            actions.appendChild(langButton);
        }

        var fullscreenButton = null;
        if (document.fullscreenEnabled || document.webkitFullscreenEnabled) {
            fullscreenButton = button('sanaltur-btn', '⛶', S.fullscreen, function () {
                if (document.fullscreenElement || document.webkitFullscreenElement) {
                    (document.exitFullscreen || document.webkitExitFullscreen).call(document);
                } else {
                    (root.requestFullscreen || root.webkitRequestFullscreen).call(root);
                }
            });
            actions.appendChild(fullscreenButton);
        }

        listen(window, 'resize', updateStripOffset);

        // --- Otomatik tur ---

        var autoTour = { running: false, timer: 0, lastActivity: Date.now() };
        var coverOpen = false;

        function updateAutoButton() {
            if (!autoButton) return;
            autoButton.textContent = autoTour.running ? '⏸' : '▶';
            autoButton.classList.toggle('sanaltur-btn--active', autoTour.running);
            autoButton.title = autoTour.running ? S.stopAutoTour : S.autoTour;
        }

        function scheduleAutoTour() {
            clearTimeout(autoTour.timer);
            autoTour.timer = setTimeout(function () {
                if (!autoTour.running || busy) return scheduleAutoTour();
                var next = ids[(ids.indexOf(currentId) + 1) % ids.length];
                if (next === currentId) return scheduleAutoTour();
                viewer.stopAutoRotate();
                jumpTo(next);
            }, Math.max(3, autoTourSettings.secondsPerScene || 12) * 1000);
        }

        function startAutoTour() {
            if (autoTour.running || destroyed || ids.length < 2) return;
            autoTour.running = true;
            closeModal();
            if (viewer && !busy) viewer.startAutoRotate(-3);
            scheduleAutoTour();
            updateAutoButton();
        }

        function stopAutoTour() {
            if (!autoTour || !autoTour.running) return;
            autoTour.running = false;
            clearTimeout(autoTour.timer);
            if (viewer) viewer.stopAutoRotate();
            updateAutoButton();
        }

        // Kullanıcı bir şeye dokunduğunda otomatik tur durur
        function noteActivity(e) {
            autoTour.lastActivity = Date.now();
            if (e && autoButton && autoButton.contains(e.target)) return;
            stopAutoTour();
        }
        listen(root, 'pointerdown', noteActivity, true);
        listen(root, 'touchstart', noteActivity, { capture: true, passive: true });
        listen(root, 'wheel', noteActivity, { capture: true, passive: true });
        listen(document, 'keydown', function (e) { noteActivity(e); });

        if (autoTourSettings.idleRestart > 0 && ids.length > 1) {
            var idleTimer = setInterval(function () {
                if (!autoTour.running && !modal && !coverOpen && viewer &&
                    Date.now() - autoTour.lastActivity > autoTourSettings.idleRestart * 1000) {
                    startAutoTour();
                }
            }, 1000);
            cleanups.push(function () { clearInterval(idleTimer); });
        }

        // --- Odaya direkt bağlantı (adres çubuğundaki #oda-adi) ---

        var slugs = {};
        var slugToId = {};
        ids.forEach(function (id) {
            var base = slugify(tour.scenes[id].title) || 'oda';
            var slug = base;
            var n = 2;
            while (slugToId[slug]) slug = base + '-' + (n++);
            slugs[id] = slug;
            slugToId[slug] = id;
        });
        var useHash = options.mode !== 'preview';

        function sceneFromHash() {
            var hash = window.location.hash.replace(/^#/, '');
            try { hash = decodeURIComponent(hash); } catch (e) { /* bozuk adres */ } // eslint-disable-line no-unused-vars
            return slugToId[hash] || (tour.scenes[hash] ? hash : null);
        }

        function updateHash() {
            if (!useHash) return;
            try { window.history.replaceState(null, '', '#' + slugs[currentId]); } catch (e) { /* bazı tarayıcılar file:// adreslerinde izin vermez */ } // eslint-disable-line no-unused-vars
        }

        if (useHash) {
            listen(window, 'hashchange', function () {
                var id = sceneFromHash();
                if (id && id !== currentId) jumpTo(id);
            });
        }

        // --- Kapak ekranı ---

        function afterCover() {
            if (autoTourSettings.autoStart || options.autoTourRunning) startAutoTour();
        }

        if (branding.cover && branding.cover.enabled && !options.skipCover) {
            coverOpen = true;
            var cover = el('div', 'sanaltur-cover');
            if (logoUrl) {
                var coverLogo = el('img');
                coverLogo.src = logoUrl;
                coverLogo.alt = '';
                cover.appendChild(coverLogo);
            }
            cover.appendChild(el('h1', null, t('name', tour.name || '')));
            var coverText = t('cover:text', branding.cover.text);
            if (coverText) cover.appendChild(el('p', null, coverText));
            cover.appendChild(button(null, S.start, null, function () {
                coverOpen = false;
                cover.remove();
                autoTour.lastActivity = Date.now();
                afterCover();
            }));
            root.appendChild(cover);
        }

        // --- Başlat ---

        var startId = (useHash && sceneFromHash()) || (tour.scenes[options.startSceneId] ? options.startSceneId : null) ||
            (tour.scenes[tour.startSceneId] ? tour.startSceneId : ids[0]);
        if (startId) {
            goToScene(startId, firstView);
            if (!coverOpen) afterCover();
        } else {
            showMessage(S.noPhotos, true);
        }

        return api;
    }

    window.SanalTur = {
        safeLink: safeLink,
        slugify: slugify,
        ICON_TYPES: ICON_TYPES,
        iconUrl: iconUrl,
        hotspotIcon: hotspotIcon,
        hotspotRenderer: hotspotRenderer,
        toPannellumHotSpot: toPannellumHotSpot,
        validHotSpots: validHotSpots,
        normalizeYaw: normalizeYaw,
        returnHotSpot: returnHotSpot,
        planBearing: planBearing,
        computeOrientation: computeOrientation,
        arrivalView: arrivalView,
        jumpPlan: jumpPlan,
        walkTowards: walkTowards,
        walkGeometry: walkGeometry,
        walkSampleDirections: walkSampleDirections,
        cameraMatrix: cameraMatrix,
        horizonMatrix: horizonMatrix,
        yawMatrix: yawMatrix,
        matMul: matMul,
        matVec: matVec,
        WALK_FRAGMENT_SHADER: WALK_FRAGMENT_SHADER,
        WALK_VERTEX_SHADER: WALK_VERTEX_SHADER,
        createWalkRenderer: createWalkRenderer,
        buildDepthMesh: buildDepthMesh,
        walkMix: walkMix,
        DEPTH_LOG_MIN: DEPTH_LOG_MIN,
        DEPTH_LOG_RANGE: DEPTH_LOG_RANGE,
        registerImage: registerImage,
        LANGUAGE_NAMES: LANGUAGE_NAMES,
        STRINGS: STRINGS,
        createTour: createTour
    };
})(window, document);
