/* ==========================================================================
   Portfolio — Siméon Nsasi · script.js
   JavaScript natif, sans dépendance. Chaque module est isolé : si l'un échoue,
   les autres continuent de fonctionner et le contenu reste accessible.
   ========================================================================== */
(() => {
    'use strict';

    const doc = document;
    const root = doc.documentElement;
    const $ = (sel, ctx = doc) => ctx.querySelector(sel);
    const $$ = (sel, ctx = doc) => Array.from(ctx.querySelectorAll(sel));
    const raf = requestAnimationFrame;

    const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;

    root.classList.add('js');

    const safe = (fn) => {
        try { return fn(); } catch (err) { console.error('[portfolio]', fn.name, err); }
    };

    /* ----------------------------------------------------------------------
       Intro (page d'accueil, une fois par session)
       -------------------------------------------------------------------- */
    function runIntro() {
        return new Promise((resolve) => {
            const intro = $('.intro');
            if (!intro || !root.classList.contains('show-intro') || reduceMotion) {
                root.classList.remove('show-intro');
                if (intro) intro.remove();
                return resolve();
            }

            // lettres du nom
            const name = $('.intro-name', intro);
            if (name) {
                const label = name.textContent.trim();
                name.setAttribute('aria-label', label);
                name.textContent = '';
                let i = 0;
                label.split(' ').forEach((word) => {
                    const w = doc.createElement('span');
                    w.className = 'word';
                    w.setAttribute('aria-hidden', 'true');
                    [...word].forEach((char) => {
                        const ch = doc.createElement('span');
                        ch.className = 'ch';
                        const inner = doc.createElement('span');
                        inner.style.setProperty('--i', i++);
                        inner.textContent = char;
                        ch.appendChild(inner);
                        w.appendChild(ch);
                    });
                    name.appendChild(w);
                });
            }

            const count = $('.intro-count', intro);
            const bar = $('.intro-bar i', intro);
            const duration = 1300;
            const start = performance.now();

            const step = (now) => {
                const t = Math.min(1, (now - start) / duration);
                const eased = 1 - Math.pow(1 - t, 3);
                if (count) count.textContent = String(Math.round(eased * 100)).padStart(3, '0');
                if (bar) bar.style.setProperty('--p', eased);
                if (t < 1) return raf(step);
                setTimeout(() => {
                    root.classList.add('intro-done');
                    setTimeout(resolve, 150);
                    setTimeout(() => { intro.remove(); root.classList.remove('show-intro'); }, 1200);
                }, 160);
            };
            raf(step);
        });
    }

    /* ----------------------------------------------------------------------
       Menu mobile
       -------------------------------------------------------------------- */
    function initMenu() {
        const toggle = $('#menu-icon');
        const nav = $('#site-nav');
        if (!toggle || !nav) return;
        const icon = $('i', toggle);

        $$('a', nav).forEach((a, i) => a.style.setProperty('--i', i));

        const set = (open) => {
            nav.classList.toggle('is-open', open);
            doc.body.classList.toggle('menu-open', open);
            toggle.setAttribute('aria-expanded', String(open));
            toggle.setAttribute('aria-label', open ? 'Fermer le menu' : 'Ouvrir le menu');
            if (icon) { icon.classList.toggle('bx-x', open); icon.classList.toggle('bx-menu', !open); }
        };
        toggle.addEventListener('click', () => set(!nav.classList.contains('is-open')));
        doc.addEventListener('keydown', (e) => { if (e.key === 'Escape') set(false); });
        matchMedia('(min-width: 821px)').addEventListener('change', (e) => { if (e.matches) set(false); });
        nav._close = () => set(false);
    }

    /* ----------------------------------------------------------------------
       Header + barre de progression
       -------------------------------------------------------------------- */
    function initScroll() {
        const header = $('.site-header');
        const bar = $('.scroll-progress');
        let ticking = false;
        const update = () => {
            const y = window.scrollY;
            if (header) header.classList.toggle('is-scrolled', y > 20);
            if (bar) {
                const max = root.scrollHeight - innerHeight;
                bar.style.setProperty('--p', max > 0 ? Math.min(1, y / max).toFixed(4) : 0);
            }
            ticking = false;
        };
        addEventListener('scroll', () => { if (!ticking) { ticking = true; raf(update); } }, { passive: true });
        addEventListener('resize', update, { passive: true });
        update();
    }

    /* ----------------------------------------------------------------------
       Transition de page (rideau)
       -------------------------------------------------------------------- */
    function initTransitions() {
        const curtain = $('.curtain');
        if (!curtain || reduceMotion) return;

        doc.addEventListener('click', (e) => {
            const a = e.target.closest('a[href]');
            if (!a || e.defaultPrevented || e.button !== 0) return;
            if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
            if ((a.target && a.target !== '_self') || a.hasAttribute('download')) return;

            let url;
            try { url = new URL(a.href, location.href); } catch (_) { return; }
            if (!/^(https?:|file:)$/.test(url.protocol) || url.origin !== location.origin) return;

            const samePage = url.pathname === location.pathname && url.search === location.search;
            if (samePage && url.hash) return;                       // ancre : comportement natif
            if (samePage) { e.preventDefault(); scrollTo({ top: 0, behavior: 'smooth' }); return; }
            if (/\.(pdf|zip|png|jpe?g|svg|docx?)$/i.test(url.pathname)) return;

            e.preventDefault();
            const nav = $('#site-nav');
            if (nav && nav._close) nav._close();
            try { sessionStorage.setItem('pt', '1'); } catch (_) { /* navigation privée */ }
            curtain.classList.add('is-in');
            setTimeout(() => { location.href = url.href; }, 580);
        });

        // retour arrière (cache bfcache) : on remet la page à neuf
        addEventListener('pageshow', (e) => {
            if (e.persisted) { curtain.classList.remove('is-in'); root.classList.remove('pt-enter'); }
        });
    }

    /* ----------------------------------------------------------------------
       Texte : découpage en mots + révélation au scroll
       -------------------------------------------------------------------- */
    function splitText(el) {
        const label = el.textContent.replace(/\s+/g, ' ').trim();
        el.setAttribute('aria-label', label);
        let idx = 0;

        const walk = (parent, grad) => {
            Array.from(parent.childNodes).forEach((node) => {
                if (node.nodeType === 3) {
                    const frag = doc.createDocumentFragment();
                    node.textContent.split(/(\s+)/).forEach((part) => {
                        if (!part) return;
                        if (/^\s+$/.test(part)) { frag.appendChild(doc.createTextNode(' ')); return; }
                        const w = doc.createElement('span');
                        w.className = 'w';
                        w.setAttribute('aria-hidden', 'true');
                        const wi = doc.createElement('span');
                        wi.className = 'wi' + (grad ? ' grad' : '');
                        wi.style.setProperty('--wi', idx++);
                        wi.textContent = part;
                        w.appendChild(wi);
                        frag.appendChild(w);
                    });
                    parent.replaceChild(frag, node);
                } else if (node.nodeType === 1 && node.tagName !== 'BR') {
                    const isGrad = grad || node.classList.contains('grad');
                    walk(node, isGrad);
                    node.classList.remove('grad');   // le dégradé est porté par chaque mot
                }
            });
        };
        walk(el, false);
    }

    function initReveal() {
        $$('[data-split]').forEach((el) => safe(() => splitText(el)));
        $$('[data-stagger]').forEach((parent) => {
            Array.from(parent.children).forEach((child) => {
                child.dataset.s = '1';
                if (!child.hasAttribute('data-reveal')) child.setAttribute('data-reveal', '');
            });
        });

        const targets = $$('[data-reveal], [data-split]');
        if (reduceMotion || !('IntersectionObserver' in window)) {
            targets.forEach((t) => t.classList.add('is-in'));
            return;
        }
        const io = new IntersectionObserver((entries) => {
            let k = 0;
            entries.filter((en) => en.isIntersecting).forEach((en) => {
                if (en.target.dataset.s) en.target.style.setProperty('--i', k++);
                en.target.classList.add('is-in');
                io.unobserve(en.target);
            });
        }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
        targets.forEach((t) => io.observe(t));
    }

    /* ----------------------------------------------------------------------
       Machine à écrire (rôles)
       -------------------------------------------------------------------- */
    function initTyper() {
        const el = $('[data-typer]');
        if (!el) return;
        let words;
        try { words = JSON.parse(el.dataset.typer); } catch (_) { return; }
        if (!words.length) return;
        if (reduceMotion) { el.textContent = words[0]; return; }

        let w = 0, c = 0, deleting = false;
        const tick = () => {
            const word = words[w];
            c += deleting ? -1 : 1;
            el.textContent = word.slice(0, c);
            let delay = deleting ? 32 : 68;
            if (!deleting && c === word.length) { deleting = true; delay = 1900; }
            else if (deleting && c === 0) { deleting = false; w = (w + 1) % words.length; delay = 380; }
            setTimeout(tick, delay);
        };
        tick();
    }

    /* ----------------------------------------------------------------------
       Inclinaison 3D + halo qui suit le curseur
       -------------------------------------------------------------------- */
    function initTilt() {
        if (!finePointer || reduceMotion) return;
        $$('[data-tilt]').forEach((el) => {
            const max = parseFloat(el.dataset.tilt) || 6;
            let frame = 0;
            el.addEventListener('pointermove', (e) => {
                if (e.pointerType === 'touch') return;
                const r = el.getBoundingClientRect();
                const x = (e.clientX - r.left) / r.width;
                const y = (e.clientY - r.top) / r.height;
                cancelAnimationFrame(frame);
                frame = raf(() => {
                    el.style.setProperty('--mx', (x * 100).toFixed(1) + '%');
                    el.style.setProperty('--my', (y * 100).toFixed(1) + '%');
                    el.style.setProperty('--rx', ((0.5 - y) * 2 * max).toFixed(2) + 'deg');
                    el.style.setProperty('--ry', ((x - 0.5) * 2 * max).toFixed(2) + 'deg');
                });
            });
            el.addEventListener('pointerleave', () => {
                cancelAnimationFrame(frame);
                el.style.setProperty('--rx', '0deg');
                el.style.setProperty('--ry', '0deg');
            });
        });
    }

    /* ----------------------------------------------------------------------
       Boutons magnétiques
       -------------------------------------------------------------------- */
    function initMagnetic() {
        if (!finePointer || reduceMotion) return;
        $$('[data-magnetic]').forEach((el) => {
            el.addEventListener('pointermove', (e) => {
                const r = el.getBoundingClientRect();
                const dx = e.clientX - (r.left + r.width / 2);
                const dy = e.clientY - (r.top + r.height / 2);
                el.style.setProperty('--tx', (dx * 0.22).toFixed(1) + 'px');
                el.style.setProperty('--ty', (dy * 0.3).toFixed(1) + 'px');
            });
            el.addEventListener('pointerleave', () => {
                el.style.setProperty('--tx', '0px');
                el.style.setProperty('--ty', '0px');
            });
        });
    }

    /* ----------------------------------------------------------------------
       Curseur personnalisé (souris uniquement ; le curseur natif reste visible)
       -------------------------------------------------------------------- */
    function initCursor() {
        if (!finePointer || reduceMotion) return;
        const c = doc.createElement('div');
        c.className = 'cursor';
        c.setAttribute('aria-hidden', 'true');
        doc.body.appendChild(c);

        let x = 0, y = 0, cx = 0, cy = 0, running = false;
        const loop = () => {
            cx += (x - cx) * 0.2;
            cy += (y - cy) * 0.2;
            c.style.transform = `translate3d(${cx.toFixed(1)}px, ${cy.toFixed(1)}px, 0)`;
            if (Math.abs(x - cx) > 0.1 || Math.abs(y - cy) > 0.1) raf(loop);
            else running = false;
        };
        addEventListener('pointermove', (e) => {
            if (e.pointerType === 'touch') return;
            x = e.clientX; y = e.clientY;
            if (!c.classList.contains('is-visible')) { cx = x; cy = y; c.classList.add('is-visible'); }
            if (!running) { running = true; raf(loop); }
        }, { passive: true });

        const interactive = 'a, button, input, textarea, [data-magnetic]';
        doc.addEventListener('pointerover', (e) => c.classList.toggle('is-hover', !!e.target.closest(interactive)));
        doc.addEventListener('pointerdown', () => c.classList.add('is-down'));
        doc.addEventListener('pointerup', () => c.classList.remove('is-down'));
        root.addEventListener('mouseleave', () => c.classList.remove('is-visible'));
    }

    /* ----------------------------------------------------------------------
       Fond : réseau de nœuds (clin d'œil à la cybersécurité / réseaux)
       -------------------------------------------------------------------- */
    function initCanvas() {
        if (reduceMotion) return;
        const cv = doc.createElement('canvas');
        cv.id = 'bg-canvas';
        cv.setAttribute('aria-hidden', 'true');
        doc.body.prepend(cv);
        const ctx = cv.getContext('2d');
        if (!ctx) { cv.remove(); return; }

        const LINK = 140;
        let w = 0, h = 0, nodes = [];
        const mouse = { x: -9999, y: -9999 };

        const resize = () => {
            const dpr = Math.min(devicePixelRatio || 1, 1.5);
            w = innerWidth; h = innerHeight;
            cv.width = w * dpr; cv.height = h * dpr;
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            const n = Math.round(Math.min(64, Math.max(20, (w * h) / 24000)));
            nodes = Array.from({ length: n }, () => ({
                x: Math.random() * w, y: Math.random() * h,
                vx: (Math.random() - 0.5) * 0.28, vy: (Math.random() - 0.5) * 0.28,
                r: Math.random() * 1.3 + 0.6, cyan: Math.random() < 0.18,
            }));
        };

        const frame = () => {
            raf(frame);
            if (doc.hidden) return;
            ctx.clearRect(0, 0, w, h);
            for (const p of nodes) {
                p.x += p.vx; p.y += p.vy;
                if (p.x < -20) p.x = w + 20; else if (p.x > w + 20) p.x = -20;
                if (p.y < -20) p.y = h + 20; else if (p.y > h + 20) p.y = -20;
                const dx = p.x - mouse.x, dy = p.y - mouse.y, d2 = dx * dx + dy * dy;
                if (d2 < 14000) { const f = (1 - d2 / 14000) * 0.6; p.x += (dx / Math.sqrt(d2 || 1)) * f; p.y += (dy / Math.sqrt(d2 || 1)) * f; }
            }
            for (let i = 0; i < nodes.length; i++) {
                const a = nodes[i];
                for (let j = i + 1; j < nodes.length; j++) {
                    const b = nodes[j];
                    const dx = a.x - b.x, dy = a.y - b.y, d2 = dx * dx + dy * dy;
                    if (d2 < LINK * LINK) {
                        const alpha = (1 - Math.sqrt(d2) / LINK) * 0.28;
                        ctx.strokeStyle = `rgba(197,139,255,${alpha.toFixed(3)})`;
                        ctx.lineWidth = 1;
                        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
                    }
                }
            }
            for (const p of nodes) {
                ctx.fillStyle = p.cyan ? 'rgba(94,234,212,.75)' : 'rgba(197,139,255,.7)';
                ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.2832); ctx.fill();
            }
        };

        let resizeTimer;
        addEventListener('resize', () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(resize, 200); }, { passive: true });
        if (finePointer) {
            addEventListener('pointermove', (e) => { mouse.x = e.clientX; mouse.y = e.clientY; }, { passive: true });
        }
        resize();
        raf(frame);
    }

    /* ----------------------------------------------------------------------
       À propos : onglets accessibles
       -------------------------------------------------------------------- */
    function initTabs() {
        const tabs = $$('[role="tab"]');
        if (!tabs.length) return;
        const panels = $$('[role="tabpanel"]');

        $$('.rise').forEach((r) => Array.from(r.children).forEach((c, i) => c.style.setProperty('--i', i)));

        const activate = (tab, { focus = false, hash = true } = {}) => {
            tabs.forEach((t) => {
                const on = t === tab;
                t.setAttribute('aria-selected', String(on));
                t.tabIndex = on ? 0 : -1;
            });
            panels.forEach((p) => {
                const on = p.id === tab.getAttribute('aria-controls');
                p.hidden = !on;
                p.classList.toggle('is-active', on);
            });
            if (focus) tab.focus();
            if (hash) { try { history.replaceState(null, '', '#' + tab.dataset.tab); } catch (_) { /* file:// */ } }
        };

        tabs.forEach((tab, i) => {
            tab.addEventListener('click', () => activate(tab));
            tab.addEventListener('keydown', (e) => {
                const keys = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 };
                let next;
                if (keys[e.key]) next = tabs[(i + keys[e.key] + tabs.length) % tabs.length];
                else if (e.key === 'Home') next = tabs[0];
                else if (e.key === 'End') next = tabs[tabs.length - 1];
                if (next) { e.preventDefault(); activate(next, { focus: true }); }
            });
        });

        const fromHash = tabs.find((t) => '#' + t.dataset.tab === location.hash);
        activate(fromHash || tabs[0], { hash: false });
    }

    /* ----------------------------------------------------------------------
       Portfolio : filtres animés
       -------------------------------------------------------------------- */
    function initFilters() {
        const buttons = $$('.filter-btn');
        const grid = $('.projects');
        if (!buttons.length || !grid) return;
        const cards = $$('.project', grid);
        const live = $('#filter-count');
        let timer;

        const apply = (filter, animate = true) => {
            buttons.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.filter === filter)));
            const run = () => {
                let k = 0;
                cards.forEach((card) => {
                    const show = filter === 'all' || card.dataset.category === filter;
                    card.hidden = !show;
                    card.classList.remove('card-in');
                    if (show) { card.classList.add('is-in'); card.style.setProperty('--k', k++); }
                });
                void grid.offsetWidth; // relance les animations
                if (animate && !reduceMotion) cards.forEach((card) => { if (!card.hidden) card.classList.add('card-in'); });
                grid.classList.remove('is-filtering');
                if (live) live.textContent = k + (k > 1 ? ' projets affichés' : ' projet affiché');
            };
            if (!animate || reduceMotion) return run();
            grid.classList.add('is-filtering');
            clearTimeout(timer);
            timer = setTimeout(run, 230);
        };

        buttons.forEach((b) => b.addEventListener('click', () => {
            apply(b.dataset.filter);
            try {
                const url = new URL(location.href);
                if (b.dataset.filter === 'all') url.searchParams.delete('filter');
                else url.searchParams.set('filter', b.dataset.filter);
                history.replaceState(null, '', url);
            } catch (_) { /* file:// */ }
        }));

        const wanted = new URLSearchParams(location.search).get('filter');
        if (wanted && buttons.some((b) => b.dataset.filter === wanted)) apply(wanted, false);
    }

    /* ----------------------------------------------------------------------
       Contact : formulaire EmailJS (identifiants d'origine conservés)
       -------------------------------------------------------------------- */
    function initForm() {
        const form = $('#contact-form');
        if (!form) return;
        const status = $('.form-status', form);
        const btn = $('button[type="submit"]', form);
        const PUBLIC_KEY = '9TRj38srDIEh8ENRj';
        const SERVICE_ID = 'service_hl7e99a';
        const TEMPLATE_ID = 'template_52vs3s7';
        const FALLBACK = 'ivannsasi06@gmail.com';

        if (window.emailjs) emailjs.init(PUBLIC_KEY);

        const say = (msg, kind) => {
            status.textContent = msg;
            status.className = 'form-status' + (kind ? ' is-' + kind : '');
        };

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (!form.checkValidity()) { form.reportValidity(); return; }
            const d = Object.fromEntries(new FormData(form));

            // Le gabarit EmailJS n'est pas visible d'ici : on envoie les noms de variables usuels.
            const params = {
                name: d.name, from_name: d.name, user_name: d.name,
                email: d.email, from_email: d.email, user_email: d.email, reply_to: d.email,
                phone: d.phone, from_phone: d.phone,
                subject: d.subject, title: d.subject,
                message: d.message,
            };

            btn.disabled = true;
            btn.classList.add('is-loading');
            say('Envoi en cours…');
            try {
                if (!window.emailjs) throw new Error('EmailJS indisponible');
                await emailjs.send(SERVICE_ID, TEMPLATE_ID, params);
                say('Message envoyé avec succès !', 'ok');
                form.reset();
            } catch (err) {
                console.error('[portfolio] EmailJS', err);
                say("Erreur lors de l'envoi du message. Réessayez ou écrivez-moi directement à " + FALLBACK + '.', 'err');
            } finally {
                btn.disabled = false;
                btn.classList.remove('is-loading');
            }
        });
    }

    /* ----------------------------------------------------------------------
       Démarrage
       -------------------------------------------------------------------- */
    $$('[data-year]').forEach((el) => { el.textContent = new Date().getFullYear(); });

    [initMenu, initScroll, initTransitions, initTilt, initMagnetic, initCursor, initCanvas, initTabs, initFilters, initForm].forEach(safe);

    let ready;
    try { ready = runIntro(); } catch (err) { console.error(err); ready = Promise.resolve(); }
    // les CSS ont aussi leurs propres filets de sécurité (animations « failsafe »)
    ready.then(() => { safe(initReveal); safe(initTyper); });
})();
