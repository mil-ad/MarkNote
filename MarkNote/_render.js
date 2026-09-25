/* MarkNote — shared renderer used by every card template and the editor.
 *
 * Loaded once per page via <script src>. Exposes window.MarkNote with:
 *   start(ids)         — load deps, render the listed elements, reveal them
 *   startEditor(opts)  — load deps, overlay a rendered preview on each editor
 *                        field whenever that field doesn't have focus
 *   stopEditor()       — remove the overlays again
 *
 * Anki's reviewer keeps a single page alive and re-runs template scripts for
 * every card, so this file may be <script>-injected many times per session.
 * The guard below makes later copies no-ops, and dependency loading is
 * memoised so the libraries are fetched and evaluated only once per page.
 *
 * Versions here should track the pins in the repo's Makefile.
 */
(function () {
'use strict';

if (window.MarkNote) return;

var RESOURCES = [
    { type: 'css', path: '_katex.css',           alt: 'https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css' },
    { type: 'css', path: '_texmath.min.css',     alt: 'https://cdn.jsdelivr.net/npm/markdown-it-texmath@1.0.0/css/texmath.min.css' },
    { type: 'css', path: '_highlight.css',       alt: 'https://cdn.jsdelivr.net/npm/@highlightjs/cdn-assets@11.10.0/styles/github.min.css' },
    { type: 'css', path: '_highlight-dark.css',  alt: 'https://cdn.jsdelivr.net/npm/@highlightjs/cdn-assets@11.10.0/styles/github-dark.min.css' },
    { type: 'js',  path: '_highlight.js',        alt: 'https://cdn.jsdelivr.net/npm/@highlightjs/cdn-assets@11.10.0/highlight.min.js' },
    { type: 'js',  path: '_katex.min.js',        alt: 'https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.js' },
    { type: 'js',  path: '_markdown-it.min.js',  alt: 'https://cdn.jsdelivr.net/npm/markdown-it@14.1.0/dist/markdown-it.min.js' },
    { type: 'js',  path: '_markdown-it-mark.js', alt: 'https://cdn.jsdelivr.net/npm/markdown-it-mark@4.0.0/dist/markdown-it-mark.min.js' },
    { type: 'js',  path: '_texmath.min.js',      alt: 'https://cdn.jsdelivr.net/npm/markdown-it-texmath@1.0.0/texmath.min.js' },
];

// mhchem requires KaTeX to be present at evaluation, so it's loaded after the rest.
var MHCHEM = { type: 'js', path: '_mhchem.js', alt: 'https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/contrib/mhchem.min.js' };

// URL prefixes for the bundled files. Cards use relative paths (the reviewer
// page's <base> points at the media folder). The editor passes absolute
// prefixes because its Content Security Policy only allows scripts from
// /_addons/ (see editor.py). Whichever start*() runs first fixes them.
var bases = { js: '', css: '' };
var readyPromise = null;

function makeScript(src) {
    var s = document.createElement('script');
    s.src = src;
    return s;
}

function makeLink(href) {
    var l = document.createElement('link');
    l.rel = 'stylesheet';
    l.type = 'text/css';
    l.href = href;
    return l;
}

function loadOne(r) {
    var make = r.type === 'css' ? makeLink : makeScript;
    var base = r.type === 'css' ? bases.css : bases.js;
    return new Promise(function (resolve, reject) {
        var primary = make(base + r.path);
        primary.onload = resolve;
        primary.onerror = function () {
            var fallback = make(r.alt);
            fallback.onload = resolve;
            fallback.onerror = function () {
                reject(new Error('MarkNote: failed to load ' + r.path + ' (and its CDN fallback)'));
            };
            document.head.appendChild(fallback);
        };
        document.head.appendChild(primary);
    });
}

function loadAll() {
    if (!readyPromise) {
        readyPromise = Promise.all(RESOURCES.map(loadOne))
            .then(function () { return loadOne(MHCHEM); })
            .catch(function (err) {
                readyPromise = null;  // allow a later call to retry
                throw err;
            });
    }
    return readyPromise;
}

// --- Cloze handling -------------------------------------------------------
//
// {{cloze:Field}} wraps the active deletion in <span class="cloze">…</span>
// and the others in <span class="cloze-inactive">. Stripping those spans
// (as every other editor-generated span is) loses Anki's cloze styling;
// passing them through as raw HTML breaks clozes inside math or code. So
// they're swapped for private-use-area marker characters before markdown-it
// runs and swapped back afterwards. Inside a formula, the KaTeX wrapper below
// turns the markers into \htmlClass{cloze}{…} instead.
var CLOZE_OPEN = '';
var CLOZE_INACTIVE_OPEN = '';
var CLOZE_CLOSE = '';

// Unwrap every <span>, leaving markers around the cloze ones.
function protectClozes(html) {
    var tpl = document.createElement('template');
    tpl.innerHTML = html;
    var spans = Array.prototype.slice.call(tpl.content.querySelectorAll('span'));
    for (var i = 0; i < spans.length; i++) {
        var span = spans[i];
        var cls = ' ' + (span.getAttribute('class') || '') + ' ';
        var open = null;
        if (cls.indexOf(' cloze ') >= 0) open = CLOZE_OPEN;
        else if (cls.indexOf(' cloze-inactive ') >= 0) open = CLOZE_INACTIVE_OPEN;

        var frag = document.createDocumentFragment();
        if (open) frag.appendChild(document.createTextNode(open));
        while (span.firstChild) frag.appendChild(span.firstChild);
        if (open) frag.appendChild(document.createTextNode(CLOZE_CLOSE));
        span.parentNode.replaceChild(frag, span);
    }
    return tpl.innerHTML;
}

function restoreClozes(html) {
    return html
        .replace(//g, '<span class="cloze">')
        .replace(//g, '<span class="cloze-inactive">')
        .replace(//g, '</span>');
}

// KaTeX stand-in handed to texmath: rewrites cloze markers inside a formula
// to \htmlClass so the deletion is styled without breaking the parse.
var KATEX_ENGINE = {
    renderToString: function (tex, options) {
        tex = tex
            .replace(//g, '\\htmlClass{cloze}{')
            .replace(//g, '\\htmlClass{cloze-inactive}{')
            .replace(//g, '}');
        return window.katex.renderToString(tex, options);
    },
};

// --- Markdown pipeline ----------------------------------------------------

// Anki stores field content as HTML (with <div>, <br>, &nbsp;, ...). Reduce it
// back to a plain markdown source string before handing to markdown-it.
function ankiHtmlToSource(html) {
    return protectClozes(html)
        .replace(/<\/?pre\b[^>]*>/gi, '')
        .replace(/<br\b[^>]*>/gi, '\n')
        .replace(/<div\b[^>]*>/gi, '\n')
        .replace(/<\/div\s*>/gi, '')
        .replace(/&nbsp;/gi, ' ')
        .replace(/&tab;/gi, '\t')
        .replace(/&gt;/gi, '>')
        .replace(/&lt;/gi, '<')
        .replace(/&amp;/gi, '&');
}

function newMarkdownIt() {
    return window.markdownit({
        typographer: true,
        html: true,
        highlight: function (str, lang) {
            if (lang && window.hljs.getLanguage(lang)) {
                try { return window.hljs.highlight(str, { language: lang }).value; } catch (__) {}
            }
            return '';
        },
    })
    .use(window.markdownitMark)
    .use(window.texmath, {
        // 'dollars'  → $...$ inline, $$...$$ display
        // 'brackets' → \(...\) inline, \[...\] display
        engine: KATEX_ENGINE,
        delimiters: ['dollars', 'brackets'],
        katexOptions: {
            throwOnError: false,
            // \htmlClass (used for clozes inside math) is gated behind `trust`
            // and flagged by strict mode; allow exactly that and nothing else.
            trust: function (context) { return context.command === '\\htmlClass'; },
            strict: function (errorCode) { return errorCode === 'htmlExtension' ? 'ignore' : 'warn'; },
        },
    });
}

function render(md, html) {
    return restoreClozes(md.render(ankiHtmlToSource(html)));
}

function reveal(ids) {
    for (var i = 0; i < ids.length; i++) {
        var el = document.getElementById(ids[i]);
        if (el) el.style.visibility = 'visible';
    }
}

// --- Editor preview -------------------------------------------------------
//
// Each field gets an overlay inside its editing area. While the field has
// focus the overlay is hidden and you see (and type) the raw markdown; as soon
// as focus moves elsewhere the overlay shows the rendered result on top of the
// raw text. Clicking the overlay drops you back into the raw text.
//
// Everything goes through the anki/NoteEditor API (field elements, content
// stores, the focusedField store, refocus()) rather than probing Anki's DOM.

var editorCleanup = null;

function noteEditorInstance() {
    try {
        var api = window.require('anki/NoteEditor');
        return api.instances[api.instances.length - 1] || null;
    } catch (__) {
        return null;
    }
}

// `fields` has been a plain array, but be tolerant of a store or promise.
function resolveFields(instance) {
    var fields = instance.fields;
    if (fields && typeof fields.subscribe === 'function') {
        var value = null;
        fields.subscribe(function (v) { value = v; })();
        return Promise.resolve(value);
    }
    return Promise.resolve(fields);
}

function sameField(a, b) {
    return !!a && !!b && (a === b || (a.element !== undefined && a.element === b.element));
}

// Focus the field's editing input. The API's refocus() targets the first
// focusable input; fall back to the rich-text host if that didn't take.
function focusField(field, element) {
    try {
        if (field.editingArea && typeof field.editingArea.refocus === 'function') field.editingArea.refocus();
    } catch (__) {}
    if (element && !element.contains(document.activeElement)) {
        var input = element.querySelector('.rich-text-editable, .CodeMirror textarea');
        if (input && typeof input.focus === 'function') input.focus();
    }
}

// Wire one field: overlay element, content tracking, show/hide, height fit.
// `font` ({family, size}) is the field's editing font, so the rendered view
// matches the raw source it covers.
function attachFieldPreview(field, md, state, font) {
    var p = {
        field: field,
        content: '',
        dirty: true,
        editing: false,
        element: null,
        host: null,
        overlay: null,
    };

    function fit() {
        // Let the overlay size to its content, measure, then pin the host to
        // that height so the rendered view isn't clipped to (or padded by) the
        // raw text's height underneath.
        p.overlay.style.bottom = 'auto';
        var h = p.overlay.offsetHeight;
        p.overlay.style.bottom = '';
        if (h > 0) {
            p.host.style.minHeight = h + 'px';
            p.host.style.maxHeight = h + 'px';
            p.host.style.overflow = 'hidden';
        }
    }

    function unfit() {
        p.host.style.minHeight = '';
        p.host.style.maxHeight = '';
        p.host.style.overflow = '';
    }

    p.update = function () {
        if (!p.overlay || state.cancelled) return;
        var show = !p.editing && ankiHtmlToSource(p.content).trim() !== '';
        if (show) {
            if (p.dirty) {
                p.overlay.innerHTML = render(md, p.content);
                p.dirty = false;
            }
            p.overlay.classList.add('visible');
            fit();
        } else {
            p.overlay.classList.remove('visible');
            unfit();
        }
    };

    p.setEditing = function (editing) {
        if (p.editing === editing) return;
        p.editing = editing;
        p.update();
    };

    if (field.editingArea && field.editingArea.content) {
        state.unsubs.push(field.editingArea.content.subscribe(function (value) {
            p.content = value || '';
            p.dirty = true;
            p.update();
        }));
    }

    Promise.resolve(field.element).then(function (element) {
        if (state.cancelled || !element) return;
        p.element = element;
        p.host = element.querySelector('.editing-area') || element;

        var overlay = document.createElement('div');
        overlay.className = 'marknote-preview';
        if (font) {
            if (font.family) overlay.style.fontFamily = font.family;
            if (font.size) overlay.style.fontSize = font.size + 'px';
        }
        overlay.addEventListener('click', function () {
            p.setEditing(true);
            focusField(field, element);
        });
        var hostPosition = p.host.style.position;
        p.host.style.position = 'relative';
        p.host.appendChild(overlay);
        p.overlay = overlay;

        var resize = null;
        if (window.ResizeObserver) {
            resize = new ResizeObserver(function () {
                if (overlay.classList.contains('visible')) fit();
            });
            resize.observe(p.host);
        }
        state.cleanups.push(function () {
            if (resize) resize.disconnect();
            overlay.remove();
            unfit();
            p.host.style.position = hostPosition;
        });

        p.update();
    });

    return p;
}

// Keep each overlay in step with which field has focus.
function trackFocus(instance, previews, state) {
    function apply(focused) {
        for (var i = 0; i < previews.length; i++) {
            previews[i].setEditing(sameField(focused, previews[i].field));
        }
    }

    if (instance.focusedField && typeof instance.focusedField.subscribe === 'function') {
        state.unsubs.push(instance.focusedField.subscribe(apply));
        return;
    }

    // Fallback: infer focus from the DOM. focusin/focusout are composed, so
    // they surface from inside the fields' shadow roots; activeElement is
    // retargeted to the shadow host, which sits inside the field element.
    var timer = null;
    function check() {
        timer = null;
        var active = document.activeElement;
        for (var i = 0; i < previews.length; i++) {
            var el = previews[i].element;
            previews[i].setEditing(!!el && el.contains(active));
        }
    }
    function schedule() {
        if (timer !== null) clearTimeout(timer);
        timer = setTimeout(check, 30);
    }
    document.addEventListener('focusin', schedule);
    document.addEventListener('focusout', schedule);
    state.cleanups.push(function () {
        document.removeEventListener('focusin', schedule);
        document.removeEventListener('focusout', schedule);
        if (timer !== null) clearTimeout(timer);
    });
    schedule();
}

window.MarkNote = {
    start: function (ids) {
        return loadAll().then(function () {
            var md = newMarkdownIt();
            for (var i = 0; i < ids.length; i++) {
                var el = document.getElementById(ids[i]);
                if (el) el.innerHTML = render(md, el.innerHTML);
            }
        }).catch(function (err) {
            console.error(err);  // fall through: show the raw field rather than nothing
        }).then(function () {
            reveal(ids);
        });
    },

    // opts: { jsBase, cssBase, fieldFonts: [{family, size}, ...] }
    startEditor: function (opts) {
        opts = opts || {};
        this.stopEditor();
        if (opts.jsBase !== undefined) bases.js = opts.jsBase;
        if (opts.cssBase !== undefined) bases.css = opts.cssBase;

        var state = { unsubs: [], cleanups: [], cancelled: false };
        editorCleanup = function () {
            state.cancelled = true;
            for (var i = 0; i < state.unsubs.length; i++) state.unsubs[i]();
            for (var j = 0; j < state.cleanups.length; j++) state.cleanups[j]();
        };

        var instance = noteEditorInstance();
        if (!instance) {
            console.warn('MarkNote: NoteEditor API unavailable; preview disabled');
            return Promise.resolve();
        }

        return Promise.all([loadAll(), resolveFields(instance)]).then(function (results) {
            var fields = results[1] || [];
            if (state.cancelled) return;
            var md = newMarkdownIt();
            var fonts = opts.fieldFonts || [];
            var previews = fields.map(function (field, i) { return attachFieldPreview(field, md, state, fonts[i]); });
            trackFocus(instance, previews, state);
        }).catch(function (err) {
            console.error(err);
        });
    },

    stopEditor: function () {
        if (editorCleanup) {
            editorCleanup();
            editorCleanup = null;
        }
    },
};
})();
