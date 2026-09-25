/* MarkNote — shared renderer used by every card template and the editor.
 *
 * Loaded once per page via <script src>. Exposes window.MarkNote with:
 *   start(ids)         — load deps, render the listed elements, reveal them
 *   startEditor(opts)  — load deps, wire up the editor's live preview pane
 *   stopEditor()       — tear the preview pane down again
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

var editorCleanup = null;

function noteEditorFields() {
    try {
        var api = window.require('anki/NoteEditor');
        var instance = api.instances[api.instances.length - 1];
        return instance ? instance.fields : null;
    } catch (__) {
        return null;
    }
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

    // opts: { jsBase, cssBase, fieldNames }
    startEditor: function (opts) {
        opts = opts || {};
        this.stopEditor();
        if (opts.jsBase !== undefined) bases.js = opts.jsBase;
        if (opts.cssBase !== undefined) bases.css = opts.cssBase;

        var area = document.createElement('div');
        area.id = 'markdown-area';
        area.style.visibility = 'hidden';
        document.body.appendChild(area);

        var state = { unsubs: [], timer: null, cancelled: false };
        editorCleanup = function () {
            state.cancelled = true;
            for (var i = 0; i < state.unsubs.length; i++) state.unsubs[i]();
            if (state.timer !== null) clearTimeout(state.timer);
            area.remove();
        };

        var fields = noteEditorFields();
        if (!fields) {
            console.warn('MarkNote: NoteEditor API unavailable; preview disabled');
            return Promise.resolve();
        }
        var names = opts.fieldNames || [];

        return loadAll().then(function () {
            if (state.cancelled) return;
            var md = newMarkdownIt();
            var contents = fields.map(function () { return ''; });

            function rerender() {
                state.timer = null;
                var src = '';
                for (var i = 0; i < contents.length; i++) {
                    src += '## ' + (names[i] || 'Field ' + (i + 1)) + '\n\n' + contents[i] + '\n\n';
                }
                area.innerHTML = render(md, src);
                area.style.visibility = 'visible';
            }
            function schedule() {
                if (state.timer === null) state.timer = setTimeout(rerender, 50);
            }

            // Each field's content is a Svelte store; subscribing fires once
            // immediately and again on every edit (typing, paste, formatting).
            fields.forEach(function (field, i) {
                if (!field.editingArea || !field.editingArea.content) return;
                state.unsubs.push(field.editingArea.content.subscribe(function (value) {
                    contents[i] = value;
                    schedule();
                }));
            });
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
