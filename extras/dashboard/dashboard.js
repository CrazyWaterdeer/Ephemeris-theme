/* Jinome dashboard — the whole page, drawn by one view.
 *
 *   ```dataviewjs
 *   await dv.view("Vector/dashboard")
 *   ```
 *
 * That single line is the entire body of Vector/Dashboard.md. Everything
 * below — the stats strip, the nav rail, the projects table, the tabbed work
 * card, the calendar, the weather widget and Recent — is built here with
 * createDiv/createEl into one container, and the CSS snippet
 * (.obsidian/snippets/dashboard.css) lays those elements out.
 *
 * Why one block instead of a grid over the note's own markdown: a CSS grid
 * applied to the note wrapper only works in Reading view. Live Preview is a
 * CodeMirror document — it makes one .cm-line per SOURCE line, so the "cards"
 * the grid is supposed to place do not exist as siblings there and the layout
 * silently falls apart. A grid INSIDE a dataviewjs container works in both
 * modes, because the block renders as a single element (.cm-embed-block in
 * Live Preview, .block-language-dataviewjs in Reading view) and its children
 * are ours.
 *
 * The UI is English throughout — every label, tab, header, tooltip and empty
 * state. Note TITLES are printed exactly as they are on disk, so the Korean
 * ones stay Korean: nothing in the vault's own data is translated here.
 *
 * The things that are easy to get wrong here, in the order they bite:
 *
 *   1. ONE dv.pages() call, at the top, bucketed into Maps. Every panel reads
 *      the buckets. There is no second dv.pages() anywhere in this file, and
 *      nothing rescans inside a .map()/.where() — the two rules from
 *      CLAUDE.md §11.3 that this vault has already been bitten by.
 *   2. File timestamps are corrupted (213 files have ctime > mtime; 1,993
 *      share one maintenance-batch mtime), so file.ctime/mtime/cday/mday
 *      appear nowhere below. The zk stamp in the FILENAME is the only
 *      trustworthy creation date — which is why the panel is Recent (created)
 *      and never "recently modified".
 *   3. Dates are DISPLAYED as 2026/8/7 — slashes, no zero padding, no
 *      weekday. Every comparison, filter and sort still runs on the ISO
 *      yyyy-MM-dd string, where a plain string compare is chronological.
 *      fmtDay() is the last thing that touches a date, never the first.
 *   4. Dataview re-renders this block on a 2.5s debounce after ANY index
 *      change, so no DOM state survives. The selected tab and the calendar's
 *      month offset live in localStorage; the weather response is cached
 *      there too, or an editing session would fire hundreds of requests.
 *      The work card's checkbox and date picker are the OPPOSITE case and are
 *      cached nowhere: they read their state from the vault on every render,
 *      and after a write the re-render IS the update.
 *   5. Most panels are empty on day one — 0 scheduled, 0 open due dates. So
 *      an empty card does not say "no results": it says, in one short line,
 *      what to type to make the panel light up, and marks itself
 *      data-empty="true" so the CSS can collapse it instead of parking a
 *      blank box.
 *   6. Two table renderers, deliberately. A table you only READ (Recent) goes
 *      through dv.el() as one markdown string, so the [[links]] in it are real
 *      links — hover preview, unresolved styling, click — for one markdown
 *      parse instead of one per cell. The work card is a WORKLIST, so its rows
 *      are hand-built DOM: a control inside a markdown string is inert. Its
 *      title cell is still markdown, rendered into a cell we own, which is what
 *      keeps those links real too. The chrome around both is hand-built DOM.
 *   7. Every panel is wrapped: one panel throwing must not take the page
 *      down. require("obsidian") is guarded the same way, and that guard has
 *      been taking its fallback branch on every platform — see the environment
 *      note. The weather icons stopped depending on it and are inlined path
 *      data now.
 */

// ── environment ─────────────────────────────────────────────────────────
/**
 * require("obsidian") does NOT work here — not on mobile and not on desktop
 * either, which is the opposite of what these lines used to claim, so the
 * finding is written down rather than left to be rediscovered.
 *
 * Whether a global `require` exists here was never measured, and it does not
 * matter: "obsidian" is not reachable from a new Function body either way.
 * Obsidian hands its API to a plugin through a PRIVATE `require` parameter of
 * the wrapper function it compiles the plugin into. An inline dataviewjs block
 * inherits that parameter, because Dataview runs one through a direct eval()
 * and direct eval keeps the caller's scope. This file is not inline —
 * Dashboard.md loads it with dv.view(), which compiles it with new Function(),
 * and a new Function body is compiled in GLOBAL scope, where the private
 * require is not visible. So the call fails, the guard takes its null branch,
 * and OBS is null. The identical code pasted into an inline block does work,
 * which is exactly what made this hard to see. Re-derive it from
 * .obsidian/plugins/dataview/main.js: the codeblock path runs a direct eval(),
 * the dv.view path builds a new Function.
 *
 * The free confirmation is on screen. The calendar's month steppers fall back
 * to the text characters ‹ › when setIcon draws nothing — and that is what they
 * have been showing, on the desktop, all along.
 *
 * OBS stays, because it would start working the day a future Obsidian hands us
 * the module. But it is null TODAY, and the cost is wider than the icons, so
 * the whole list is here rather than only the part that prompted the fix:
 *   - requestUrl (weather): harmless. Plain fetch already covers it, and
 *     Open-Meteo sends Access-Control-Allow-Origin: *.
 *   - icon() at the nav and the two calendar chevrons: nothing is drawn. The
 *     chevrons fall back to text arrows; the nav boxes are simply empty.
 *   - notify(): `new OBS.Notice` throws into its own catch, so every message
 *     is demoted to console.warn — including the ones that explain a
 *     frontmatter write that did NOT happen. window.Notice is a real global,
 *     so this one is a one-line fix. Jinome/Introns/Scripts/weekly.js carries
 *     the identical dead helper.
 *   - OBS.Modal in editEpigraph: a bare dereference of null inside a Promise
 *     executor, so it throws into its own catch and returns. The epigraph is a
 *     dead control, not a slow one.
 * What does not have to wait for any of that is anything that has to LOOK
 * right — see msIcon.
 */
const OBS = (() => {
    try { return typeof require === "function" ? require("obsidian") : null; }
    catch (e) { return null; }
})();

/**
 * Lucide icon into `el`. Per the note above this is a no-op today, on every
 * platform; the nav and calendar icons are the ones still paying for it. Do
 * not try to fix the weather here — it is drawn by msIcon, which needs no
 * module, and the same treatment is what would bring the others back.
 */
const icon = (el, name) => { try { OBS?.setIcon?.(el, name); } catch (e) { /* no icons, still readable */ } };

const goto = (linktext) => { try { app.workspace.openLinkText(linktext, "", false); } catch (e) { } };
const hasCommand = (id) => { try { return !!app.commands?.commands?.[id]; } catch (e) { return false; } };
const runCommand = (id) => { try { app.commands.executeCommandById(id); } catch (e) { } };

/**
 * localStorage, but it can throw outright (private windows, blocked site
 * data). Every read carries a default and every write is allowed to fail —
 * the dashboard must render identically with no stored value at all.
 */
const LS_TAB = "jinome-dash.tab";
const LS_MONTH = "jinome-dash.month";
/* Bumped to wx2 when is_day joined the request. An entry written before that
   carries no is_day, and the `=== 0` night guard would then keep drawing the
   DAY glyph — for 30 minutes normally, but forever while the network is down,
   because a stale entry is deliberately reused rather than dropped. A new key
   costs one refetch and the field is present from the first render. */
const LS_WX = "jinome-dash.wx2";
const LS_WX_ERR = "jinome-dash.wxfail";
const store = {
    get(k, d) { try { const v = window.localStorage.getItem(k); return v == null ? d : v; } catch (e) { return d; } },
    set(k, v) { try { window.localStorage.setItem(k, String(v)); } catch (e) { } },
};

// ── identity helpers (from weekly.js — its set is the corrected one) ─────
const toId = (v) => {
    if (v == null) return null;
    if (v.path) return v.path;              // Link object
    const s = String(v).trim();
    return s || null;
};

const asArray = (v) => (v == null ? [] : Array.isArray(v) ? v : [v]);

/** Iterate a Set / Array / DataArray alike; a bare string is one item, not chars. */
const iter = (v) => (v == null ? []
    : (typeof v !== "string" && typeof v[Symbol.iterator] === "function") ? [...v] : [v]);

/**
 * Every tag on a note, '#' stripped.
 *
 * file.etags is a plain string[] in Dataview 0.5.68 (`etags: Array.from(this.tags)`,
 * bundle line 9515) — NOT a Set, so a `typeof e.has === "function"` guard never
 * fires and silently drops it. It matters because etags also holds tags written
 * in the BODY, which frontmatter `tags:` misses: this is how a Meeting note
 * carrying an inline #PRJ-HGA-2026 gets counted against its project at all.
 */
const tagStrings = (p) => {
    const clean = (t) => String(toId(t) ?? "").replace(/^#/, "");
    const out = [...asArray(p.tags).map(clean), ...iter(p.file?.etags).map(clean)];
    return [...new Set(out.filter(Boolean))];
};

// PRJ-CODE-YEAR is a main project; a fourth segment makes it a subcode.
const PRJ_RE = /^PRJ-[A-Za-z0-9]+-\d{4}(-[A-Za-z0-9]+)?$/;

/** Every project id on a note. Experiments use `project-id:`, meetings a PRJ-* tag. */
const pidList = (p) => {
    const ids = asArray(p["project-id"]).map(toId).filter(Boolean);
    if (ids.length) return ids;
    return tagStrings(p).filter((t) => PRJ_RE.test(t));
};

/** The main project an id belongs to — a main project owns its subcodes. */
const mainOf = (id) => id.split("-").slice(0, 3).join("-");

/**
 * Templates are real notes to Dataview, and each carries the very tag it
 * generates: Templates/Experiment.md is tags:[Experiment], ✏Draft, with no
 * scheduled/due/finished — exactly the shape the Unscheduled tab looks for.
 * Unfiltered it parks itself there forever, and Jin can never clear it,
 * because putting a `scheduled:` on a template would be absurd.
 */
const TEMPLATES = "Jinome/Introns/Templates/";
const isTemplate = (p) => String(p?.file?.path ?? "").startsWith(TEMPLATES);

// ── dates ───────────────────────────────────────────────────────────────
const pad2 = (n) => String(n).padStart(2, "0");
const ymd = (y, m, d) => `${y}-${pad2(m)}-${pad2(d)}`;

/**
 * Today, read off the LOCAL calendar. Never toISOString(): Jin writes notes at
 * 01:00–04:00 KST, where a UTC "today" is yesterday — and on a Monday morning,
 * last week.
 *
 * A function rather than a constant, because the work card's CONTROLS call it
 * at click time. Dataview only redraws this block when the index changes, so a
 * dashboard left open overnight is still showing the DOM it built yesterday; a
 * captured constant would then stamp yesterday onto a box ticked this morning
 * — the exact slip this helper exists to prevent, and the one Mod+Shift+D
 * cannot make because it reads the clock when the key is pressed.
 *
 * TODAY, further down, is this value frozen for one render. That is right for
 * everything that describes the RENDER — the week window, the overdue test,
 * the calendar's today cell, the month-offset stamp — and wrong for anything
 * that describes a CLICK.
 */
const todayLocal = () => {
    const n = new Date();
    return ymd(n.getFullYear(), n.getMonth() + 1, n.getDate());
};

/**
 * Any date-ish value → "yyyy-MM-dd", or null.
 *
 * Four shapes reach us, and this vault contains all of them: a Luxon DateTime
 * (built either from the UTC-midnight JS Date js-yaml made for an unquoted
 * `2026-08-24`, or from Dataview's own LOCAL-midnight string parse), a raw JS
 * Date, a one-element list because almost every key here is written in list
 * form, and a bare string — `started:` is written BOTH as 2026-06-01 and as
 * 2025/08/06. Reading the wrong set of calendar fields moves the day by one,
 * so the UTC-midnight signature is tested first. Everything ends up a
 * yyyy-MM-dd string, after which every comparison is a string compare: it is
 * chronological, and no time zone can shift it.
 */
const asDate = (v) => {
    if (v == null) return null;
    if (Array.isArray(v)) return asDate(v.find((x) => x != null));

    if (typeof v?.toFormat === "function" && typeof v?.toUTC === "function") {
        if (v.isValid === false) return null;
        const u = v.toUTC();
        return u.hour === 0 && u.minute === 0 && u.second === 0 && u.millisecond === 0
            ? ymd(u.year, u.month, u.day)       // came from a UTC-midnight JS Date
            : ymd(v.year, v.month, v.day);      // a genuine local wall-clock time
    }

    if (v instanceof Date) {                    // raw cache value; js-yaml made it UTC
        if (isNaN(v.getTime())) return null;
        return ymd(v.getUTCFullYear(), v.getUTCMonth() + 1, v.getUTCDate());
    }

    const s = String(toId(v) ?? "").trim();
    const m = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
    return m ? ymd(Number(m[1]), Number(m[2]), Number(m[3])) : null;
};

/** Whole-day arithmetic on yyyy-MM-dd, done in UTC so no zone can shift it. */
const dayNum = (iso) => {
    const [y, m, d] = iso.split("-").map(Number);
    return Date.UTC(y, m - 1, d) / 86400000;
};
const isoOf = (n) => {
    const d = new Date(n * 86400000);
    return ymd(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
};
const diffDays = (a, b) => dayNum(a) - dayNum(b);
const dow = (iso) => new Date(dayNum(iso) * 86400000).getUTCDay();   // 0=Sun, 1=Mon, …

/** Sun-first, because dow() returns 0 for Sunday. The calendar re-orders it. */
const WD3 = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/**
 * DISPLAY only: "2026-08-07" → "2026/8/7". No zero padding, no weekday.
 *
 * This is the LAST thing that touches a date. Nothing downstream of fmtDay
 * ever compares or sorts its output — "2026/8/7" < "2026/12/1" is false as a
 * string, and every filter, bucket and .sort() in this file runs on the ISO
 * form for exactly that reason.
 */
const fmtDay = (iso) => {
    if (!iso) return "—";
    const [y, m, d] = iso.split("-");
    return `${Number(y)}/${Number(m)}/${Number(d)}`;
};

/**
 * "D+3" for a date that has slipped, "" otherwise.
 *
 * It rides in the Date cell rather than in a column of its own: a D-day
 * column was one more column of nothing on every row that is on time, and the
 * row is already washed red by rowAttr. A future D-n is deliberately absent —
 * the date is right there, and counting down to it is not what this card is
 * for.
 *
 * The " · " separator left this string when the Date cell became a control:
 * the mark is now a <span> beside the picker, not text appended to a printed
 * date, so it carries no punctuation of its own.
 */
const lateMark = (iso) => {
    const n = diffDays(TODAY, iso);
    return n > 0 ? `D+${n}` : "";
};

/**
 * Creation date from the zk timestamp in the filename — `20260824_091500 Title`.
 *
 * The ONLY trustworthy creation date in this vault, and it costs Jin nothing
 * because it is already in every filename: 1,141/1,142 notes in Exons and 3/3
 * in Vector carry a stamp. Papers and People are stamp-free by design and
 * return null. The trailing `(?:\s|$)` demands the separator the zk-prefixer
 * writes, so "20260824-091500 Title" is rejected rather than read as a date,
 * and "2026-W35" — the weekly note, deliberately stampless — returns null.
 *
 * ZK_FULL keeps the time as well, because Recent has to order eight notes
 * made on the same day.
 */
const ZK_RE = /^(\d{4})(\d{2})(\d{2})_\d{6}(?:\s|$)/;
const ZK_FULL = /^(\d{8}_\d{6})(?:\s|$)/;
const zkDate = (name) => {
    const m = ZK_RE.exec(String(name ?? ""));
    return m ? `${m[1]}-${m[2]}-${m[3]}` : null;
};
const zkStamp = (name) => {
    const m = ZK_FULL.exec(String(name ?? ""));
    return m ? m[1] : "";
};

/**
 * The ISO 8601 week a date falls in, as "GGGG-Www".
 *
 * moment's `gggg-[W]ww` is the LOCALE week — under an en-US locale it starts
 * on Sunday and drifts a day — and a slip there has no symptom: the week
 * column just quietly links to the wrong note. Weeks run Monday–Sunday and are
 * numbered by the year their Thursday lands in, which is what makes 2026-12-28
 * the Monday of 2026-W53 while 2027-01-04 opens 2027-W01.
 */
const isoMonday = (iso) => dayNum(iso) - ((dow(iso) + 6) % 7);       // Mon=0 … Sun=6
const isoWeekId = (iso) => {
    const mon = isoMonday(iso);
    const year = new Date((mon + 3) * 86400000).getUTCFullYear();    // its Thursday
    return `${year}-W${pad2(Math.round((mon - isoMonday(`${year}-01-04`)) / 7) + 1)}`;
};

const TODAY = todayLocal();
const WEEK_ID = isoWeekId(TODAY);
const WEEK_START = isoOf(isoMonday(TODAY));
const WEEK_END = isoOf(isoMonday(TODAY) + 6);
const inWeek = (iso) => !!iso && iso >= WEEK_START && iso <= WEEK_END;

// ── one scan, bucketed ──────────────────────────────────────────────────
/*
 * The single most expensive thing on this page, done exactly once.
 *
 * `!"Jinome/Introns/People"` alone drops 2,659 of 4,298 notes: People carry no
 * status, no type and no project-id, so nothing here could ever match them.
 * Negation rather than an allowlist, so a folder Jin adds next month is picked
 * up without editing this file.
 *
 * Each surviving page is flattened ONCE into a plain record — tags, type,
 * status, the three dates, the zk stamp, the project ids — and every panel
 * reads records. That is what keeps the per-panel cost linear in the rows it
 * actually prints instead of in the size of the vault.
 */
const VAULT = '!"Jinome/Introns/People"';
const SELF = dv.current()?.file?.path ?? null;

const WORK_TAGS = ["Prep", "Experiment", "Meeting"];
/** Types that are reference material, not something to be done. */
const REF_TYPES = new Set(["Review", "Paper", "Project", "Plan", "Index"]);

const rows = [];
const projects = [];            // type: Project
const events = new Map();       // yyyy-MM-dd → [{ kind, name, path }]
let reviewWaiting = 0;          // 📚Not started reviews

const addEvent = (iso, kind, r) => {
    if (!iso) return;
    let a = events.get(iso);
    if (!a) events.set(iso, (a = []));
    a.push({ kind, name: r.name, path: r.path });
};

/*
 * The scan is the one thing panel() cannot protect, because it runs before any
 * card exists. A single malformed page reaching asDate/tagStrings would
 * otherwise take the whole dashboard down to Dataview's raw "Evaluation Error"
 * stack. Catching here means the panels still draw against whatever was read
 * before the failure, and one card says what happened.
 */
let scanError = null;
try {
for (const p of dv.pages(VAULT)) {
    if (isTemplate(p)) continue;                  // §see isTemplate
    if (p.file.path === SELF) continue;           // the dashboard never lists itself

    const tags = tagStrings(p);
    const types = asArray(p.type).map(String).filter(Boolean);
    const status = asArray(p.status).map(String).filter(Boolean);
    const r = {
        p,
        path: p.file.path,
        name: p.file.name,
        // done means a real `finished` date OR a 📗Done / 📜Final status
        done: !!asDate(p.finished) || status.some((s) => /Done|Final/.test(s)),
        sch: asDate(p.scheduled),
        due: asDate(p.due),
        fin: asDate(p.finished),
        zk: zkDate(p.file.name),
        stamp: zkStamp(p.file.name),
        pids: pidList(p),
        work: tags.some((t) => WORK_TAGS.includes(t)),
        // Which date key this note's picker writes — see dateKeyOf() below.
        // Read here, in the one scan, so no panel has to re-derive tags.
        prep: tags.includes("Prep"),
        ref: types.some((t) => REF_TYPES.has(t)) || tags.includes("Gene") || tags.includes("Index"),
    };
    rows.push(r);

    if (types.includes("Project")) projects.push(r);
    if (types.includes("Review") && status.some((s) => s.includes("Not started"))) reviewWaiting += 1;

    addEvent(r.due, "due", r);
    addEvent(r.sch, "sch", r);
    addEvent(r.fin, "fin", r);
    // Creation dots are what give the calendar something to show on day one:
    // 0 notes carry `scheduled:` today, but 1,144 carry a zk stamp.
    if (r.zk && r.zk !== r.sch && r.zk !== r.due && r.zk !== r.fin) addEvent(r.zk, "new", r);
}
} catch (e) { scanError = e; }

/** Filenames that exist, so the week column can mark an unresolved link itself. */
const NAMES = new Set(rows.map((r) => r.name));

// ── derived selections (all from `rows`, no rescan) ─────────────────────
/*
 * Two pools, deliberately different.
 *
 * `openWork` is the tag-declared work: Experiment / Meeting / Prep.
 * `dated` is anything at all, open, that carries a `scheduled:` or a `due:` —
 * because the day Jin puts a due date on a Review or a concept note, he means
 * it, and a dashboard that only honours dates on three blessed tags would
 * swallow it. Today the two pools have the same 46 members (no OPEN note
 * carries either key), which is exactly when the distinction is free to make.
 */
const openWork = rows.filter((r) => r.work && !r.done);
const dated = rows.filter((r) => !r.done && (r.sch || r.due));

const overdue = dated.filter((r) => {
    const d = r.sch ?? r.due;
    return d && d < TODAY;
});
const todayItems = dated.filter((r) => r.sch === TODAY || r.due === TODAY);
const dueThisWeek = dated.filter((r) => inWeek(r.due));
const weekItems = dated.filter((r) => inWeek(r.sch) || inWeek(r.due));

/** openWork ∪ dated, deduped — the All tab. */
const allOpen = (() => {
    const seen = new Map();
    for (const r of [...openWork, ...dated]) if (!seen.has(r.path)) seen.set(r.path, r);
    return [...seen.values()];
})();

/*
 * Unscheduled — open work with no date on it at all.
 *
 * This is what makes the system need no migration: nothing has to be
 * backfilled onto the notes that already exist, because a note with no
 * `scheduled` simply shows up here, and planning a week means moving rows OUT
 * of this tab rather than filling a blank page.
 *
 * Gene notes are excluded (183 of them, ~105 still open) and so are Reviews,
 * Papers, Projects and weekly Plans. They are reference material — a gene note
 * is never "done", and leaving them in buries the 40-odd real drafts under a
 * reference library that can never be cleared.
 *
 * `r.work` is the load-bearing filter, and it is there so this number MATCHES
 * the weekly note's own unscheduled table. weekly.js scopes its `unscheduled`
 * view to #Experiment / #Meeting / #Prep; without the same scope the dashboard
 * said 135 and the weekly note said 44 under the identical label, which is
 * worse than either number being wrong. Two surfaces, one definition.
 */
const unassigned = rows
    .filter((r) => r.work && !r.ref && !r.done && !r.sch && !r.due)
    .sort((a, b) => b.stamp.localeCompare(a.stamp));

const recent = rows
    .filter((r) => r.stamp)
    .sort((a, b) => b.stamp.localeCompare(a.stamp))
    .slice(0, 8);

/** The project ids on a note. 19 of 46 open items carry one; the rest get "—". */
const pidsOf = (r) => (r.pids.length ? r.pids.join(", ") : "—");

// ── rendering primitives ────────────────────────────────────────────────
// `|` separates table cells, so escape it everywhere — including inside
// [[path|display]], which Obsidian reads back as an aliased link. A newline in
// a cell would end the row outright, so it becomes a <br> (allowHtml is on).
const cell = (v) => String(v ?? "").replaceAll("|", "\\|").replaceAll("\n", "<br>");

/**
 * The note's title without its zk stamp — "nanos", not "20260728_040041 nanos".
 *
 * weekly.js prints the full file.name, and in a full-width weekly note that is
 * fine. Here every table lives in a column, and fifteen characters of
 * timestamp on the front of every row is fifteen characters not spent on the
 * title. The stamp is not lost: it IS the Created column right next to it.
 * The link still points at the path, so it resolves whatever the display says.
 */
const titleOf = (r) => (r.stamp ? r.name.slice(r.stamp.length).trim() || r.name : r.name);
const link = (r, label) => `[[${r.path}|${label ?? titleOf(r)}]]`;

const root = dv.container.createDiv({ cls: "jd" });
// Layout variant, chosen per note: dv.view("Vector/dashboard", { layout: "broadsheet" | "log" }).
// "cards" (no input) is the original grid. The variants only add a head and one moving
// element; every card, query and control below is shared.
const LAYOUT = (() => { try { return String(input?.layout ?? "cards"); } catch (e) { return "cards"; } })();
root.addClass("jd--" + LAYOUT);
/** Moon phase from the date (synodic month from the 2000-01-06 new moon): name + illumination %. */
const moonPhase = (d = new Date()) => {
    const syn = 29.530588853;
    const age = (((d.getTime() / 86400000 + 2440587.5) - 2451550.1) % syn + syn) % syn;
    const ill = Math.round((1 - Math.cos(age / syn * 2 * Math.PI)) / 2 * 100);
    const names = ["New moon", "Waxing crescent", "First quarter", "Waxing gibbous", "Full moon", "Waning gibbous", "Last quarter", "Waning crescent"];
    return { age, ill, name: names[Math.floor(((age / syn) * 8 + 0.5) % 8)] };
};
const hhmm = (v) => { const m = /T(\d{2}:\d{2})/.exec(String(v ?? "")); return m ? m[1] : "—"; };
const nowHHMM = () => new Date().toTimeString().slice(0, 5);
const beaufort = (kmh) => { const t = [1, 5, 11, 19, 28, 38, 49, 61, 74, 88, 102, 117]; let b = 0; while (b < 12 && Number(kmh) >= t[b]) b++; return b; };
const transparency = (cloud) => Number.isFinite(Number(cloud)) ? Math.max(1, Math.min(5, 5 - Math.floor(Number(cloud) / 20))) : null;
/** "· Vol. III · No. 736": Vol. = year of publication counted from the first zk note by anniversary,
 *  No. = days since that first note, cumulative. Empty when the vault has no stamped note. */
const edition = () => {
    const first = rows.filter((r) => r.stamp).map((r) => String(r.stamp)).sort()[0];
    const firstIso = first && /^\d{8}/.test(first) ? `${first.slice(0, 4)}-${first.slice(4, 6)}-${first.slice(6, 8)}` : null;
    if (!firstIso) return "";
    const issue = dayNum(TODAY) - dayNum(firstIso) + 1;
    const vol = Number(TODAY.slice(0, 4)) - Number(firstIso.slice(0, 4)) + (TODAY.slice(5) >= firstIso.slice(5) ? 1 : 0);
    const roman = (n) => { let s = ""; for (const [v, r] of [[1000, "M"], [900, "CM"], [500, "D"], [400, "CD"], [100, "C"], [90, "XC"], [50, "L"], [40, "XL"], [10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"]]) while (n >= v) { s += r; n -= v; } return s; };
    return ` · Vol. ${roman(vol)} · No. ${issue.toLocaleString("en-US")}`;
};
const dateLine = () => {
    const d = new Date();
    return d.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
};

/*
 * Cover.
 *
 * Drawn here rather than left to a markdown `![[Home.webp|banner]]` embed,
 * because the embed route depends on Obsidian putting the pipe text into the
 * <img>'s alt attribute so a stylesheet can find it — which it does not do
 * reliably, and when it does not, the banner renders as an ordinary inline
 * image and every CSS rule aimed at it misses silently. That is exactly what
 * happened here.
 *
 * getResourcePath turns a vault path into the app:// URL the renderer can
 * actually load. It has to be computed at runtime: a CSS url() cannot reach a
 * vault file, because the app:// host is a per-install random value.
 *
 * To change the cover, put a file in Jinome/Introns/Media and edit COVER. Set
 * it to "" for no cover — the page is designed to look right without one.
 */
const COVER = "AVG_20250715 Canton S vF Venerose Dh44-PI 3.png";   // was Home.webp; any file in Media works
const MEDIA = "Jinome/Introns/Media/";

/*
 * Weather location — FIXED, not detected. No geolocation prompt, no IP lookup.
 * Which is exactly why the card has to say where it is: an unlabelled reading
 * from the wrong city reads as a broken thermometer rather than a stale
 * setting. WX.name is the card's label.
 *
 * To move it, change all three fields together. The coordinates are the city
 * centre; Open-Meteo snaps to its nearest grid cell, so four decimals is
 * already finer than the data behind it.
 */
const WX = { name: "Gwangju", lat: 35.1595, lon: 126.8526 };
/*
 * Title and epigraph, laid OVER the cover.
 *
 * They live here rather than in the note because of ordering. A note renders
 * inline-title -> properties -> body, so anything written in Dashboard.md
 * arrives BELOW the title and the properties block, and the cover ends up
 * third on the page instead of first. The stylesheet hides both of those, and
 * then the first thing in the note is this dataviewjs block — so whatever it
 * draws first is genuinely the top of the page.
 *
 * That is also what the InlitX gallery dashboards do: none of them puts an
 * image above the title. They hide .metadata-container, widen the sizer, and
 * build a header as the first element of their one dataviewjs block.
 *
 * Edit EPIGRAPH here. One line, same place as COVER.
 */
const TITLE = "Dashboard";

/*
 * The epigraph is JIN'S text, so it must not live in this file — it lived here
 * for one revision and immediately became something he could not change.
 *
 * It reads from the note's own `quote:` frontmatter, and CLICKING it opens a
 * prompt that writes the new text back. The properties block is hidden on this
 * note, so a prompt is the only place the edit can happen without switching to
 * source mode.
 */
const EPIGRAPH_DEFAULT = "";
const epigraphOf = () => {
    const q = dv.current()?.quote;
    const s = Array.isArray(q) ? q.find((x) => x != null) : q;
    return (s == null ? EPIGRAPH_DEFAULT : String(s)).trim();
};

const editEpigraph = async (el) => {
    const path = dv.current()?.file?.path;
    if (!path) return;
    const file = app.vault.getAbstractFileByPath(path);
    if (!file) return;
    const cur = epigraphOf();
    let next;
    try {
        // Templater's prompt is not reachable from a dataviewjs block, so this
        // is Obsidian's own modal, driven directly.
        next = await new Promise((resolve) => {
            const m = new OBS.Modal(app);
            m.titleEl.setText("Epigraph");
            const input = m.contentEl.createEl("input", {
                type: "text", value: cur, cls: "jd-epigraph__input",
                attr: { placeholder: "Leave empty to remove", style: "width:100%" },
            });
            const done = (v) => { resolve(v); m.close(); };
            input.addEventListener("keydown", (ev) => {
                if (ev.key === "Enter") done(input.value);
                if (ev.key === "Escape") done(null);
            });
            m.onClose = () => resolve(undefined);
            m.open();
            setTimeout(() => input.focus(), 0);
        });
    } catch (e) { return; }
    if (next === null || next === undefined || next === cur) return;

    try {
        await app.fileManager.processFrontMatter(file, (fm) => {
            if (!next.trim()) delete fm.quote;
            else fm.quote = next.trim();
        });
    } catch (e) {
        try { new OBS.Notice("Could not save the epigraph: " + e.message); } catch (_) { }
    }
};

/* Rendered only when there is text. The empty state used to draw an "Add an
 * epigraph" placeholder to keep a click target, but the modal behind that
 * click is dead (OBS is null — see the note at the top of this file), so the
 * placeholder advertised an edit that could not happen and sat on the cover
 * on every open. The epigraph now comes back the moment `quote:` is set in
 * Dashboard.md's frontmatter. */
const mountEpigraph = (host) => {
    const text = epigraphOf();
    if (!text) return;
    const el = host.createEl("p", {
        cls: "jd-cover__sub",
        text,
        attr: { role: "button", tabindex: "0", title: "Click to edit" },
    });
    el.addEventListener("click", (ev) => { ev.preventDefault(); editEpigraph(el); });
    el.addEventListener("keydown", (ev) => {
        if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); editEpigraph(el); }
    });
};

if (COVER && LAYOUT === "cards") {
    try {
        const f = app.vault.getAbstractFileByPath(MEDIA + COVER);
        if (f) {
            const url = app.vault.adapter.getResourcePath(f.path);
            const c = root.createDiv({ cls: "jd-cover" });
            c.style.backgroundImage = `url("${url.replace(/"/g, '\\"')}")`;
            if (TITLE) c.createEl("h1", { cls: "jd-cover__title", text: TITLE });
            mountEpigraph(c);
        }
    } catch (e) { /* no cover is a valid state, never a broken page */ }
}

// No cover file: the title still has to exist, or the page opens with a table
// and no name. A plain band, same slot, no image.
if (!root.querySelector(".jd-cover") && TITLE && LAYOUT === "cards") {
    const b = root.createDiv({ cls: "jd-cover jd-cover--bare" });
    b.createEl("h1", { cls: "jd-cover__title", text: TITLE });
    mountEpigraph(b);
}

if (LAYOUT === "broadsheet") {
    const m = root.createDiv({ cls: "jd-mast" });
    const ears = m.createDiv({ cls: "jd-mast__ears" });
    ears.createSpan({ text: dateLine() + edition() });
    ears.createSpan({ cls: "jd-mast__ear-wx", text: "" });
    m.createEl("h1", { cls: "jd-mast__name", text: "JINOME" });
    m.createDiv({ cls: "jd-mast__sub", text: "Drosophila · Neurobiology · Genetics" });
    const mp = moonPhase();
    m.createDiv({ cls: "jd-mast__folio", text: `${rows.length.toLocaleString("en-US")} notes · ${mp.name}, ${mp.ill}% · as of ${nowHHMM()}` });
    mountEpigraph(m);
}
if (LAYOUT === "log") {
    const h = root.createDiv({ cls: "jd-head" });
    h.createEl("h1", { cls: "jd-head__name", text: "JINOME" });
    const mp = moonPhase();
    h.createDiv({ cls: "jd-head__sub", text: `Observation log · ${dateLine()}${edition()} · ${WX.name} · ${nowHHMM()} KST · ${mp.name}, ${mp.ill}%` });
    mountEpigraph(h);
}

const grid = root.createDiv({ cls: "jd-grid" });
const strip = grid.createDiv({ cls: "jd-strip" });
const colLeft = grid.createDiv({ cls: "jd-col jd-col--left" });
const colMain = grid.createDiv({ cls: "jd-col jd-col--main" });
const colRight = grid.createDiv({ cls: "jd-col jd-col--right" });
if (LAYOUT === "broadsheet") {
    try {
        // Photo of the day: the newest image in Media by the date its filename carries (MAX_/AVG_ YYYYMMDD …),
        // else by mtime. The cutline is the filename's own encoded fields, not a caption written by hand.
        const imgs = app.vault.getFiles().filter((f) => f.path.startsWith(MEDIA) && /^(png|jpe?g|webp|gif)$/i.test(f.extension));
        const stampOf = (f) => { const m = /^(?:MAX_|AVG_)?(\d{8})/.exec(f.basename); return m ? m[1] : ""; };
        imgs.sort((a, b) => stampOf(b).localeCompare(stampOf(a)) || (b.stat?.mtime ?? 0) - (a.stat?.mtime ?? 0));
        const f = imgs[0] ?? (COVER ? app.vault.getAbstractFileByPath(MEDIA + COVER) : null);
        if (f) {
            const plate = colLeft.createDiv({ cls: "jd-plate" });
            const img = plate.createDiv({ cls: "jd-plate__img", attr: { role: "img", "aria-label": f.basename } });
            img.style.backgroundImage = `url("${app.vault.adapter.getResourcePath(f.path).replace(/"/g, '\\"')}")`;
            const m = /^(MAX_|AVG_)?(\d{4})(\d{2})(\d{2})\s*(.*)$/.exec(f.basename);
            const cut = m ? [m[1] ? (m[1] === "MAX_" ? "Max projection" : "Average projection") : null, `${m[2]}-${m[3]}-${m[4]}`, m[5]].filter(Boolean).join(" · ") : f.basename;
            const cap = plate.createDiv({ cls: "jd-plate__cap" });
            cap.createSpan({ text: cut });
            cap.addEventListener("click", () => { try { app.workspace.openLinkText(f.path, "", false); } catch (e) { } });
        }
    } catch (e) { /* a missing plate is not a broken page */ }
}

const card = (parent, panel, label) => {
    const section = parent.createEl("section", { cls: "jd-card", attr: { "data-panel": panel } });
    section.createDiv({ cls: "jd-card__label", text: label });
    const body = section.createDiv({ cls: "jd-card__body" });
    return { section, body };
};

/** One short line that teaches the next action — never "no results". */
const empty = (c, text) => {
    c.section.setAttribute("data-empty", "true");
    c.body.createEl("p", { cls: "jd-empty", text });
};

/**
 * A table, emitted as ONE markdown string and rendered once.
 *
 * dv.table() would run a full MarkdownRenderer pass per cell (bundle 15277);
 * this is one pass for the whole table, and the [[links]] stay real — hover
 * preview, unresolved styling, click all keep working, which is the entire
 * reason not to build the <table> by hand.
 *
 * `rowAttr` is how a row gets a class it could not carry through markdown: the
 * table is watched until it lands, then the attributes are stamped onto the
 * matching <tr>. That is what makes an overdue row red as a ROW rather than as
 * a lone red cell.
 */
const table = (host, headers, data, rowAttr) => {
    const head = headers.map((h, i) =>
        i === 0 ? `${h} <span class="dataview small-text">${data.length}</span>` : h);
    let md = `| ${head.join(" | ")} |\n| ${headers.map(() => "---").join(" | ")} |\n`;
    for (const r of data) md += "| " + r.map(cell).join(" | ") + " |\n";

    const el = dv.el("div", md, { container: host, cls: "jd-table" });

    const decorate = () => {
        const t = el.querySelector("table");
        if (!t) return false;
        t.classList.add("dataview", "table-view-table");
        if (t.parentElement) t.parentElement.style.display = "block";
        if (rowAttr) {
            const trs = t.querySelectorAll("tbody tr");
            for (let i = 0; i < trs.length; i++) {
                const a = rowAttr[i];
                if (!a) continue;
                for (const [k, v] of Object.entries(a)) {
                    // setAttribute("class", …) REPLACES the class list. Rows out
                    // of renderCompactMarkdown happen to have none today, but a
                    // future Dataview could add one and this would silently
                    // delete it — so a class is added, never assigned.
                    if (k === "class") trs[i].classList.add(...String(v).split(/\s+/).filter(Boolean));
                    else trs[i].setAttribute(k, v);
                }
            }
        }
        return true;
    };

    // renderCompactMarkdown resolves asynchronously, but not always — check
    // first, then watch, and always give the observer an exit so it cannot
    // outlive the block across a re-render.
    if (!decorate()) {
        const obs = new MutationObserver(() => { if (decorate()) obs.disconnect(); });
        obs.observe(el, { childList: true, subtree: true });
        setTimeout(() => obs.disconnect(), 5000);
    }
    return el;
};

// ── interactive tables ──────────────────────────────────────────────────
/*
 * table() above is the right renderer for a table you only READ — one markdown
 * pass for the whole thing instead of one per cell. It cannot carry a control:
 * renderCompactMarkdown re-parses whatever it is handed, so an <input> written
 * into that string comes back as fresh DOM with no listeners on it. The work
 * card's three tabs are a worklist, not a record, so they get a real <table>
 * built with createEl. Recent, Projects and the Calendar keep table() and the
 * hand-built DOM they already had.
 *
 * The hybrid, which is why this is not innerHTML: the ROW is DOM, the TITLE
 * CELL is markdown. dv.el("span", "[[path|title]]", {container: td}) renders
 * one real internal link into a cell we own, so hover preview, unresolved
 * styling and click-through survive. A hand-built <a class="internal-link">
 * looks identical and has none of them.
 *
 * Cost: one markdown parse per ROW rather than one per table — 46 in the
 * largest case this vault holds, well under CLAUDE.md §11.2's ~500-cell
 * threshold. No extra dv.pages(): every row is built from the single scan.
 *
 * The same helper, in the same shape, lives in Jinome/Introns/Scripts/weekly.js
 * for the weekly note's five worklist views. They are separate programs (as the
 * date and tag helpers above already are); keep the two in step by hand.
 */

const notify = (msg) => {
    try { new OBS.Notice(msg, 8000); }
    catch (e) { console.warn("[dashboard.js]", msg); }
};

/** Basename without ".md" — for a message about a path we no longer have a row for. */
const baseOf = (path) => {
    const s = String(path ?? "");
    const b = s.slice(s.lastIndexOf("/") + 1);
    return b.endsWith(".md") ? b.slice(0, -3) : b;
};

/**
 * The TFile at a path, or null — resolved at CLICK time, never captured when
 * the row was drawn.
 *
 * Dataview re-renders this block on a 2.5 s debounce after any index change,
 * and a note can be renamed, moved or deleted between the render that drew a
 * row and the click that acts on it. A TFile captured at render time would then
 * write to a file that is no longer there. `extension` is the duck test for a
 * TFile — a TFolder has none — so this needs no obsidian module and works on
 * mobile too.
 */
const fileAt = (path) => {
    try {
        const f = app.vault.getAbstractFileByPath(path);
        return f && typeof f.extension === "string" ? f : null;
    } catch (e) { return null; }
};

/**
 * One frontmatter edit, atomically, with the control locked for the duration.
 *
 * app.fileManager.processFrontMatter is the same call Templates/Schedule.md
 * (Mod+Shift+D) uses: it runs inside vault.process — read → modify → write
 * under the vault's own queue — and the open editor reloads from that write,
 * so nothing races it.
 *
 * It is NOT lossless, and this comment is here so nobody claims it is. It
 * re-serialises the WHOLE frontmatter block with stringifyYaml: values and key
 * order survive, but cosmetic quoting on keys this never meant to touch can
 * change (`aliases:\n  - "X"` becomes `- X`; an inline `authors: [A, B]`
 * expands into a block list). Measured over Exons + Papers, 1,689 notes: 0
 * values changed, 0 parse failures, bodies byte-identical, 505 notes
 * reformatted that way. A one-time normalisation per note, accepted
 * deliberately — hand-editing the YAML text would cost the atomicity and the
 * editor reload, which is worse.
 *
 * `undo` puts the control back the way the vault has it, on every failure path.
 * A checkbox left ticked after a write that did not happen is the one outcome
 * worse than the write failing.
 */
const commit = async (ctl, path, mutate, undo) => {
    ctl.disabled = true;                    // a second click cannot double-write

    const f = fileAt(path);
    if (!f || typeof app?.fileManager?.processFrontMatter !== "function") {
        undo();
        ctl.disabled = false;
        notify(f
            ? "This Obsidian cannot edit frontmatter from a script — nothing was written."
            : `${baseOf(path)} is no longer in the vault — nothing was written.`);
        return;
    }

    try {
        // A frontmatter block that does not parse lands in the catch:
        // processFrontMatter rejects rather than writing half a file.
        await app.fileManager.processFrontMatter(f, mutate);
        // The re-render IS the update. The write reindexes the file, Dataview
        // redraws this block, and the fresh row reads its state from the vault
        // — so the control stays locked rather than being flipped back by hand.
        // Not forever, though: if no re-render arrives, the row must not be
        // left dead.
        window.setTimeout(() => { if (ctl.isConnected) ctl.disabled = false; }, 3000);
    } catch (e) {
        undo();
        ctl.disabled = false;
        notify(`Could not edit ${baseOf(path)}: ${e?.message ?? e}`);
    }
};

/**
 * Which key a row's date control writes.
 *
 * The rule Templates/Schedule.md already applies, so the two ways of dating a
 * note can never disagree: a #Prep note carries a DEADLINE and takes `due`,
 * everything else carries a PLAN and takes `scheduled`. Prep wins outright on a
 * note tagged both — #Prep #Experiment is a deliverable that happens to need
 * bench work, and `due` is the key its Prep row and D-day column read.
 *
 * One consequence, deliberate: a non-Prep note carrying only `due:` (this card
 * honours a date wherever it is written, not only on the three work tags) shows
 * an empty picker while its Date cell's late mark comes from that due date. The
 * control still writes `scheduled`, because that is exactly what Mod+Shift+D
 * would do to the same note. One rule, two surfaces.
 */
const dateKeyOf = (r) => (r.prep ? "due" : "scheduled");

/* The two status values the finish checkbox writes. Vault vocabulary
 * (CLAUDE.md §2), not UI text, so they are spelled exactly as the rest of
 * the vault spells them — the In-progress book is 📖, never 📝. */
const DONE_STATUS = "📗Done";
const OPEN_STATUS = "📖In progress";

/** One interactive row: the identity the writes need, plus the cells to print. */
const actionRow = (r, cells, attr) => ({
    path: r.path,
    title: titleOf(r),
    // Checked state comes from the VAULT, never from DOM state — this block's
    // 2.5 s re-render destroys DOM constantly.
    //
    // It reads BOTH signals, because the vault has two ways to say "done": a
    // `finished` date and a Done / Final status. Reading only the date left a
    // note marked done in the properties panel showing an EMPTY box while
    // already being filtered out of Carryover — the same row saying both things
    // at once. The tick now writes both and the untick reverts both, so there
    // is one answer to "is this finished".
    finished: r.fin,
    done: r.done,
    status: r.status,
    dateKey: dateKeyOf(r),
    dateValue: r.prep ? r.due : r.sch,
    cells,
    attr,
});

/**
 * In Live Preview this block is a CodeMirror widget. A click that bubbles out
 * of it moves the editor's cursor and can tear the widget down mid-interaction,
 * so it stops here. The control's own default action — ticking, opening the
 * calendar — is untouched: this cancels propagation, not the default.
 */
const swallow = (ev) => ev.stopPropagation();

/** Leftmost cell: tick to stamp today into `finished:`, untick to clear it. */
const checkCell = (tr, r) => {
    const td = tr.createEl("td", { cls: "jd-action__check" });
    const box = td.createEl("input", {
        cls: "jd-check",
        attr: {
            type: "checkbox",
            "aria-label": `Mark ${r.title} finished`,
            title: r.done
                ? (r.finished ? `finished: ${r.finished} — untick to reopen` : "Done — untick to reopen")
                : `Tick to finish: ${TODAY}`,
        },
    });
    box.checked = !!r.done;
    box.addEventListener("click", swallow);

    // The status to restore on untick. Captured at RENDER time, so an immediate
    // mis-click reverts exactly what was there. After a re-render the note IS
    // done and its previous state is unknowable, so it falls back to
    // In progress — which is what a note you just reopened is.
    const prev = (Array.isArray(r.status) ? r.status : [r.status])
        .map(String).filter(Boolean).filter((s) => !/Done|Final/.test(s));

    box.addEventListener("change", () => {
        const want = box.checked;
        commit(box, r.path,
            // todayLocal(), called HERE rather than the render-time TODAY: the
            // stamp has to be the day of the CLICK. Never toISOString() either
            // — see todayLocal() for both halves of the reason.
            (fm) => {
                if (want) {
                    fm.finished = todayLocal();
                    fm.status = [DONE_STATUS];
                } else {
                    delete fm.finished;
                    fm.status = prev.length ? prev : [OPEN_STATUS];
                }
            },
            () => { box.checked = !want; });
    });
};

/**
 * The date cell: <input type="date"> — Electron's native calendar, one click.
 *
 * Its value format is yyyy-MM-dd, which is exactly the storage format, so
 * nothing is parsed and nothing is converted. This is the ONE place a date
 * appears in ISO form on this page; every other date still displays as 2026/8/7
 * through fmtDay, because the browser control cannot take that form.
 */
const dateCell = (tr, r, c) => {
    const td = tr.createEl("td", { cls: "jd-action__date" });
    const inp = td.createEl("input", {
        cls: "jd-date",
        attr: {
            type: "date",
            "aria-label": `${r.dateKey} for ${r.title}`,
            title: `${r.dateKey}${r.dateValue ? `: ${r.dateValue}` : ""}`
                + " — pick a day, or clear the field to remove the key",
            // an empty picker prints Chromium's own "yyyy-mm-dd"; the
            // stylesheet fades that until the row is hovered
            "data-empty": r.dateValue ? "false" : "true",
        },
    });
    inp.value = r.dateValue ?? "";          // read from the vault on every render
    inp.addEventListener("click", swallow);
    inp.addEventListener("change", () => {
        const raw = String(inp.value ?? "").trim();
        // The control can only yield "" or a valid yyyy-MM-dd. Anything else
        // means we are not talking to the control we think we are, so it is
        // refused rather than written.
        if (raw && !/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
            inp.value = r.dateValue ?? "";
            notify(`"${raw}" is not a yyyy-MM-dd date. Nothing changed.`);
            return;
        }
        const key = r.dateKey;
        commit(inp, r.path,
            (fm) => { if (raw) fm[key] = raw; else delete fm[key]; },
            () => { inp.value = r.dateValue ?? ""; });
    });
    // The late mark rides in this cell rather than in a column of its own, the
    // same trade lateMark() already made — the row is washed red anyway.
    if (c?.note) td.createEl("span", { cls: "jd-dday", text: String(c.note) });
};

/**
 * One printed cell. A string is text; `{ link, text }` is the markdown link
 * cell; `{ control: "date" }` is the picker. Nothing is escaped into HTML by
 * hand — text goes through createEl's `text` option, which sets textContent.
 */
const bodyCell = (tr, r, c) => {
    const o = (c && typeof c === "object") ? c : null;
    if (o?.control === "date") return dateCell(tr, r, o);
    if (o?.link) {
        const td = tr.createEl("td", { cls: "jd-action__title" });
        dv.el("span", `[[${o.link}|${o.text ?? o.link}]]`, { container: td });
        return;
    }
    tr.createEl("td", { cls: o?.cls, text: String((o ? o.text : c) ?? "") });
};

/**
 * A worklist table: real DOM, a finish checkbox in the leftmost cell, and a
 * date picker wherever the caller puts `{ control: "date" }`.
 *
 * `headers` describes the printed columns only — the check column is this
 * function's, and it is always first. It wears .jd-table like table()'s output
 * does, so section 8 of dashboard.css dresses it and the work card's scroll cap
 * and sticky header apply unchanged. The empty state stays with the caller,
 * exactly as it is for table().
 */
const actionTable = (host, headers, rows) => {
    const wrap = host.createDiv({ cls: "jd-table jd-action" });
    const t = wrap.createEl("table", { cls: "dataview table-view-table jd-action__table" });

    const htr = t.createEl("thead").createEl("tr");
    // The row count keeps the place table() gives it: the FIRST header cell.
    // That cell is now the checkbox column, so it carries the number ALONE and
    // no word — "Done 46" above a column of empty boxes would read as
    // forty-six finished items, which is the opposite of what it counts.
    const th0 = htr.createEl("th", {
        cls: "jd-action__check",
        attr: { scope: "col", title: `Finish · ${rows.length} items` },
    });
    th0.createEl("span", { cls: "dataview small-text", text: String(rows.length) });
    for (const h of headers) htr.createEl("th", { text: h, attr: { scope: "col" } });

    const tb = t.createEl("tbody");
    for (const r of rows) {
        const tr = tb.createEl("tr");
        for (const [k, v] of Object.entries(r.attr ?? {})) {
            // setAttribute("class", …) REPLACES the class list, so a class is
            // added, never assigned.
            if (k === "class") tr.classList.add(...String(v).split(/\s+/).filter(Boolean));
            else tr.setAttribute(k, v);
        }
        checkCell(tr, r);
        for (const c of r.cells) bodyCell(tr, r, c);
    }
    return wrap;
};

/**
 * One panel throwing must not take the page down.
 *
 * The replacement card lands in the main column whatever panel failed, because
 * the failure may well be that the column it belonged in never got built. It
 * keeps its own data-panel ("calendar-error"), so the stylesheet can tell an
 * error apart from a card and Jin can tell WHICH panel died from the label.
 */
const panel = (name, build) => {
    try { build(); }
    catch (e) {
        const c = card(colMain, name + "-error", `Error · ${name}`);
        empty(c, `This card failed to draw — ${e?.message ?? e}`);
    }
};

// A failed scan gets ONE card, not eight identical ones — see the try/catch
// around the scan. Everything below still runs, against whatever it did read.
if (scanError) {
    const c = card(colMain, "scan-error", "Scan error");
    empty(c, `Vault scan failed — ${scanError?.message ?? scanError}. Cards below show partial data.`);
}

// ── 1. stats strip ──────────────────────────────────────────────────────
/*
 * Five numbers, and three of them are 0 today. That is the honest state of the
 * vault — 0 notes carry `scheduled:`, and every note that carries `due:` is
 * already finished — so instead of hiding them, a zero counter gets data-zero
 * for the CSS to mute and a tooltip that says which key would make it count.
 */
const stat = (n, label, tip, onClick, tone) => {
    const el = strip.createDiv({
        cls: "jd-stat",
        attr: { role: "button", tabindex: "0", title: tip },
    });
    if (!n) el.setAttribute("data-zero", "true");
    if (tone && n) el.setAttribute("data-tone", tone);
    el.createEl("span", { cls: "jd-stat__n", text: String(n) });
    el.createEl("span", { cls: "jd-stat__l", text: label });
    const fire = () => { try { onClick(); } catch (e) { } };
    el.addEventListener("click", fire);
    el.addEventListener("keydown", (ev) => {
        if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); fire(); }
    });
    return el;
};

/*
 * The strip's DIV is already in the grid (created above, so it sits on top
 * whatever order the panels fill in), but the strip is FILLED after the work
 * card, because four of its five counters are buttons that select a tab in
 * that card — so it has to exist and have published selectTab first.
 */
let selectTab = () => { };
const scrollTo = (c) => { try { c.section.scrollIntoView({ behavior: "smooth", block: "start" }); } catch (e) { } };

// ── 2. work (built early so the strip can drive its tabs) ───────────────
const workCard = card(colMain, "work", "Work");
const tabsEl = workCard.body.createDiv({ cls: "jd-tabs" });
const workHost = workCard.body.createDiv({ cls: "jd-work" });

panel("work", () => {
    /*
     * Four views of one pool, so there is one work card instead of two. The
     * Unscheduled tab used to be a card of its own directly below this one,
     * showing the same rows out of the same bucket — a second table, a second
     * label and a second scroll cap for a list that belongs here.
     */
    // Three tabs, not four. "All" was dropped: Unscheduled is a strict subset of
    // it, and with 0 notes carrying a date today the two rendered the identical
    // 46 rows — a tab that duplicates its neighbour is exactly the clutter this
    // pass exists to remove. Unscheduled is the one kept because it is the
    // planning surface: choosing a week means moving rows OUT of it.
    const TABS = [
        { id: "today", label: "Today" },
        { id: "week", label: "This week" },
        { id: "unscheduled", label: "Unscheduled" },
    ];

    const build = (id) => {
        workHost.empty();

        // `dates` picks the shape of the tail columns. Today/This week are date
        // views: the Date cell is the picker and it carries the late mark.
        // Unscheduled has a picker too — an empty one, which is the point — and
        // adds Created beside it, because the zk stamp is the only date those
        // rows actually have and it is what orders them.
        let list, emptyMsg, dates = false;
        if (id === "today") {
            // Overdue first — the whole point of the tab is that yesterday's
            // work is today's work until it is finished.
            const seen = new Set();
            list = [...overdue, ...todayItems].filter((r) => !seen.has(r.path) && seen.add(r.path));
            list.sort((a, b) => String(a.sch ?? a.due).localeCompare(String(b.sch ?? b.due)));
            emptyMsg = `Nothing today. Add \`scheduled: ${TODAY}\` to a note.`;
            dates = true;
        } else if (id === "week") {
            list = weekItems.slice().sort((a, b) =>
                String(a.sch ?? a.due).localeCompare(String(b.sch ?? b.due)));
            emptyMsg = `Nothing in ${WEEK_ID} · ${fmtDay(WEEK_START)}–${fmtDay(WEEK_END)}. Add a \`scheduled:\` date.`;
            dates = true;
        } else if (id === "unscheduled") {
            list = unassigned;      // already sorted newest zk first
            emptyMsg = "Nothing unscheduled — every open item has a date.";
        } else {
            list = allOpen.slice().sort((a, b) => b.stamp.localeCompare(a.stamp));
            emptyMsg = "No open work. Tag a note `Experiment`, `Meeting` or `Prep`.";
        }

        // data-empty goes on the BODY, not the section: this card owns the tab
        // strip, and collapsing the whole thing because today happens to be
        // clear would take the other three tabs away with it.
        if (!list.length) {
            workHost.setAttribute("data-empty", "true");
            workHost.createEl("p", { cls: "jd-empty", text: emptyMsg });
            return;
        }
        workHost.removeAttribute("data-empty");

        const rowAttr = (r) => {
            const d = r.sch ?? r.due;
            return d && d < TODAY ? { "data-overdue": "true", class: "jd-row--overdue" } : null;
        };

        /*
         * All three tabs are interactive now — they are the worklist, and the
         * complaint they answer is that finishing or moving one item used to
         * mean opening its note and pressing Mod+Shift+D, per item. Tick the
         * box to stamp `finished:`, pick a day in the Date cell to schedule.
         *
         * Unscheduled gains a Date column it did not have. Its rows are
         * dateless by definition, so the column is 46 empty pickers — which is
         * exactly the point: it is the one place where giving a note a date is
         * a single click, and the row leaves the tab as soon as it has one.
         */
        if (dates) {
            actionTable(workHost, ["Item", "Project", "Date"],
                list.map((r) => {
                    const d = r.sch ?? r.due;
                    return actionRow(r, [
                        { link: r.path, text: titleOf(r) },
                        pidsOf(r),
                        { control: "date", note: d ? lateMark(d) : "" },
                    ], rowAttr(r));
                }));
        } else {
            actionTable(workHost, ["Item", "Project", "Date", "Created"],
                list.map((r) => actionRow(r, [
                    { link: r.path, text: titleOf(r) },
                    pidsOf(r),
                    { control: "date" },
                    fmtDay(r.zk),
                ], rowAttr(r))));
        }
    };

    let active = store.get(LS_TAB, "today");
    if (!TABS.some((t) => t.id === active)) active = "today";

    const buttons = new Map();
    for (const t of TABS) {
        const b = tabsEl.createEl("button", {
            cls: "jd-tab",
            text: t.label,
            attr: { "data-tab": t.id, type: "button", "aria-selected": String(t.id === active) },
        });
        buttons.set(t.id, b);
        b.addEventListener("click", () => selectTab(t.id));
    }

    selectTab = (id) => {
        if (!buttons.has(id)) return;
        active = id;
        store.set(LS_TAB, id);
        for (const [k, b] of buttons) b.setAttribute("aria-selected", String(k === id));
        build(id);
    };

    build(active);
});

// now the strip, which needs selectTab
panel("strip", () => {
    stat(overdue.length, "Overdue",
        "Past its date and not finished. Opens the Today tab.",
        () => { selectTab("today"); scrollTo(workCard); }, "overdue");

    stat(todayItems.length, "Today",
        "Scheduled or due today. Opens the Today tab.",
        () => { selectTab("today"); scrollTo(workCard); });

    stat(dueThisWeek.length, "Due this week",
        `A \`due:\` date in ${WEEK_ID}. Opens the This week tab.`,
        () => { selectTab("week"); scrollTo(workCard); });

    stat(unassigned.length, "Unscheduled",
        "Open work with no date. Opens the Unscheduled tab.",
        () => { selectTab("unscheduled"); scrollTo(workCard); });

    stat(reviewWaiting, "Reviews waiting",
        "Reviews still at 📚Not started. Opens the Papers index.",
        () => goto("Jinome/Introns/Indeces/Papers"));
});

// ── 3. nav ──────────────────────────────────────────────────────────────
const navCard = card(colLeft, "nav", "Navigation");

panel("nav", () => {
    const wrap = navCard.body.createDiv({ cls: "jd-nav" });

    const item = (iconName, label, sub, onClick, unresolved) => {
        const a = wrap.createEl("a", {
            cls: "jd-nav__item",
            attr: { role: "button", tabindex: "0", title: sub ?? label },
        });
        if (unresolved) a.addClass("is-unresolved");
        icon(a.createEl("span", { cls: "jd-nav__icon" }), iconName);
        a.createEl("span", { cls: "jd-nav__label", text: label });
        const fire = (ev) => { ev.preventDefault(); try { onClick(); } catch (e) { } };
        a.addEventListener("click", fire);
        a.addEventListener("keydown", (ev) => {
            if (ev.key === "Enter" || ev.key === " ") fire(ev);
        });
        return a;
    };

    // The weekly note is the one link here that may not exist yet — clicking an
    // unresolved [[2026-W36]] is how the next week gets made, so it is offered
    // either way, just marked.
    item("calendar-days", `This week · ${WEEK_ID}`,
        NAMES.has(WEEK_ID) ? `Open ${WEEK_ID}` : `Create ${WEEK_ID}`,
        () => goto(WEEK_ID), !NAMES.has(WEEK_ID));

    // The week is where work happens; the four indices are reference. A rule
    // between them says so, and saves the reader from scanning five equal rows
    // to find the one they open every day.
    wrap.createEl("hr", { cls: "jd-nav__rule" });

    item("quote", "Commonplace", "Quotes and excerpts",
        () => goto("Jinome/Introns/Indeces/Commonplace"));
    item("folder-kanban", "Projects", "Projects dashboard",
        () => goto("Jinome/Introns/Indeces/Projects"));
    item("book-open", "Papers", "Paper index",
        () => goto("Jinome/Introns/Indeces/Papers"));
    item("star", "Favourites", "Favourites",
        () => goto("Jinome/Introns/Indeces/Favourites"));

    /*
     * The one tile that is conditional. Templater registers a command per
     * template listed in enabled_templates_hotkeys, so the id is exact — but
     * if Templater is disabled, or that list is edited, the command is simply
     * gone. A dead button that does nothing when clicked is worse than no
     * button, so the tile is omitted rather than rendered broken.
     */
    // Second rule: reference above, things that CREATE below.
    wrap.createEl("hr", { cls: "jd-nav__rule" });

    /*
     * CREATE a note from a template — not "insert into the note I am looking at".
     *
     * Templater registers TWO commands per template and their ids differ by one
     * prefix (verified in the 2.24.3 bundle):
     *
     *   id: <template path>            -> "Insert X"  -> append_template_to_active_file
     *   id: "create-" + <template path> -> "Create X"  -> create_new_note_from_template
     *
     * The bare path is the INSERT one, and using it here meant clicking
     * "New note" pasted the Note template into Dashboard.md instead of making
     * anything. The "create-" command only exists when that template's entry
     * has create_enabled, which a plain-string settings entry does not carry —
     * so the command is not a reliable target either.
     *
     * Calling the plugin's own method is what actually always works:
     * create_new_note_from_template(templateFile) opens Templater's folder
     * picker and creates the note, exactly like Ctrl+Q does.
     */
    const templater = () => {
        try { return app.plugins?.plugins?.["templater-obsidian"]?.templater ?? null; }
        catch (e) { return null; }
    };

    /*
     * Every new note is born in Vector. CLAUDE.md §1: Vector is the incubator,
     * and Jin moves a note to Exons himself once it is worth keeping.
     *
     * The folder is passed EXPLICITLY rather than left to Templater's fallback.
     * With no folder it reads vault config `newFileLocation`, which today is
     * "folder" pointing at Vector — the right answer by coincidence, and one
     * that silently changes the day that setting is touched. Signature is
     * create_new_note_from_template(template, folder, filename, open_new), and
     * `folder` accepts a plain path string (`r instanceof TFolder ? r.path : r`
     * in the 2.24.3 bundle), so the string is enough.
     */
    const INCUBATOR = "Vector";

    const newFromTemplate = (templatePath) => {
        const t = templater();
        const f = app.vault.getAbstractFileByPath(templatePath);
        if (t && f) {
            try { t.create_new_note_from_template(f, INCUBATOR, "", true); return; }
            catch (e) { /* fall through to the command */ }
        }
        // Fallback: the command cannot be told a folder, so it lands wherever
        // `newFileLocation` says — Vector today. Reachable only if the direct
        // call above is unavailable at all.
        const id = "templater-obsidian:create-" + templatePath;
        if (hasCommand(id)) runCommand(id);
    };

    /** Only offer the tile if SOMETHING behind it will work. */
    const canCreate = (templatePath) =>
        (!!templater() && !!app.vault.getAbstractFileByPath(templatePath))
        || hasCommand("templater-obsidian:create-" + templatePath);

    const NOTE_T = "Jinome/Introns/Templates/Note.md";
    if (canCreate(NOTE_T)) {
        item("file-plus", "New note", "New note from the Note template (Ctrl+Q)",
            () => newFromTemplate(NOTE_T));
    }

    const EXP_T = "Jinome/Introns/Templates/Experiment.md";
    if (canCreate(EXP_T)) {
        item("flask-conical", "New experiment", "New note from the Experiment template (Ctrl+E)",
            () => newFromTemplate(EXP_T));
    }
});

// ── 4. projects ─────────────────────────────────────────────────────────
const projectCard = card(colLeft, "projects", "Projects");

panel("projects", () => {
    /*
     * Two columns, and that is the whole card.
     *
     * Status is absent because all 15 Project notes are 📖In progress — 15
     * identical cells is zero information taking a third of a narrow card. A
     * derived "progress" column (open items · last activity) used to sit here
     * and was cut for the opposite reason: it was the longest text on the page
     * in the narrowest column on the page, wrapping to three lines per row to
     * say something the project note itself says better. Priority is the only
     * declared field with any variance, so Priority is what is left.
     */
    const byId = new Map();
    for (const r of projects) for (const id of r.pids) if (!byId.has(id)) byId.set(id, r);

    const ids = [...byId.keys()];
    const mains = [...new Set(ids.map(mainOf))].sort();

    if (!mains.length) {
        empty(projectCard, "No Project notes. Mod+R, then set `project-id: PRJ-XXX-2026`.");
        return;
    }

    /*
     * Not a table. This is the narrowest column on the page, and a two-column
     * table spent most of its width on chrome and on repeating the "PRJ-" and
     * "-2026" that every row shares. So: a list, showing the CODE only —
     * PRJ-HGA-2026 reads as "HGA", PRJ-HGA-2026-ExM as "ExM" indented under it.
     * The full id is still the link target and the tooltip.
     *
     * Priority stops being a word and becomes a dot: one hue, three steps of
     * it. High is solid, Medium half, Low a faint ring. That is the entire
     * information content of the old column, in 8px, and it reads at a glance
     * instead of asking to be parsed.
     */
    const codeOf = (id) => {
        const seg = id.split("-");
        return seg.length >= 4 ? seg.slice(3).join("-") : (seg[1] ?? id);
    };
    const prioOf = (r) => {
        const p = asArray(r?.p?.priority).map(String).join(" ").toLowerCase();
        return p.includes("high") ? "high" : p.includes("medium") ? "medium"
            : p.includes("low") ? "low" : "none";
    };

    const wrap = projectCard.body.createDiv({ cls: "jd-proj" });

    const row = (id, r, isSub) => {
        const a = wrap.createEl("a", {
            cls: "jd-proj__item" + (isSub ? " jd-proj__item--sub" : ""),
            attr: {
                role: "button", tabindex: "0",
                title: r ? `${id} · ${asArray(r.p.priority).join(", ") || "no priority"}` : id,
                "data-prio": prioOf(r),
            },
        });
        a.createEl("span", { cls: "jd-proj__dot" });
        a.createEl("span", { cls: "jd-proj__code", text: codeOf(id) });
        if (r) {
            a.createEl("span", { cls: "jd-proj__title", text: titleOf(r) });
            const st = asArray(r.p?.status).map(String).join(" ");
            if (st) a.createEl("span", { cls: "jd-proj__status", text: st });
        }
        if (!r) a.addClass("is-unresolved");
        const fire = (ev) => { ev.preventDefault(); if (r) goto(r.path); };
        a.addEventListener("click", fire);
        a.addEventListener("keydown", (ev) => {
            if (ev.key === "Enter" || ev.key === " ") fire(ev);
        });
    };

    // A main project owns its subcodes: PRJ-HGA-2026-mCT is listed under
    // PRJ-HGA-2026, the same ownership rule project.js uses.
    for (const main of mains) {
        row(main, byId.get(main), false);
        // MISC is the per-project catch-all, so it belongs at the bottom of its
        // group no matter where the alphabet would put it — the same rule
        // Indeces/Projects.md already uses. Everything else sorts normally.
        const isMisc = (id) => id.endsWith("-MISC");
        const subs = ids
            .filter((x) => x !== main && mainOf(x) === main)
            .sort((a, b) => (isMisc(a) - isMisc(b)) || a.localeCompare(b));
        for (const id of subs) {
            row(id, byId.get(id), true);
        }
    }
});

// ── 5. calendar ─────────────────────────────────────────────────────────
const calCard = card(colRight, "calendar", "Calendar");

panel("calendar", () => {
    const KIND_ORDER = ["due", "sch", "fin", "new"];
    const KIND_LABEL = { due: "Due", sch: "Scheduled", fin: "Done", new: "New" };

    const head = calCard.body.createDiv({ cls: "jd-cal__head" });
    const prev = head.createEl("button", { cls: "jd-cal__nav", attr: { type: "button", title: "Previous month", "aria-label": "Previous month" } });
    const title = head.createEl("span", { cls: "jd-cal__title" });
    const next = head.createEl("button", { cls: "jd-cal__nav", attr: { type: "button", title: "Next month", "aria-label": "Next month" } });
    icon(prev, "chevron-left");
    icon(next, "chevron-right");
    if (!prev.hasChildNodes()) prev.setText("‹");           // no obsidian module → text arrows
    if (!next.hasChildNodes()) next.setText("›");
    const host = calCard.body.createDiv({ cls: "jd-cal__host" });

    /*
     * The month offset is stored to survive Dataview's 2.5s re-render, NOT as a
     * preference — so it is stamped with the day it was set and expires with it.
     * Without the stamp, paging back to last December and closing the vault
     * means the dashboard opens on December every day after, and a page whose
     * whole job is "what do I do today" starts by showing the wrong month with
     * no indication that it has. Same day: keep the offset. Next day: this
     * month.
     */
    const readOffset = () => {
        const [o, day] = String(store.get(LS_MONTH, "")).split("|");
        const n = Number(o);
        return day === TODAY && Number.isFinite(n) ? n : 0;
    };
    const writeOffset = (n) => store.set(LS_MONTH, `${n}|${TODAY}`);

    let offset = readOffset();

    const draw = () => {
        host.empty();

        const now = new Date();
        const base = new Date(now.getFullYear(), now.getMonth() + offset, 1);
        const y = base.getFullYear();
        const m = base.getMonth() + 1;
        title.setText(`${y}/${m}${offset ? "" : " · This month"}`);

        const first = ymd(y, m, 1);
        const lastDom = new Date(y, m, 0).getDate();        // day 0 of next month
        const start = isoMonday(first);
        const weeks = Math.round((isoMonday(ymd(y, m, lastDom)) - start) / 7) + 1;

        const t = host.createEl("table", { cls: "jd-cal" });
        const thead = t.createEl("thead").createEl("tr");
        thead.createEl("th", { text: "Wk", cls: "jd-cal__wk" });
        // Monday-first, so the columns match the ISO week the Wk column links to.
        for (const i of [1, 2, 3, 4, 5, 6, 0]) thead.createEl("th", { text: WD3[i] });

        const tbody = t.createEl("tbody");
        for (let w = 0; w < weeks; w++) {
            const tr = tbody.createEl("tr");
            const mon = start + w * 7;
            const wid = isoWeekId(isoOf(mon));

            /*
             * The week column is what turns the calendar from decoration into
             * navigation: it links to the weekly note, where weekly.js already
             * assembles the week. Day cells deliberately link to nothing —
             * there are no daily notes in this vault, and a grid of 31 dead
             * links would be worse than none.
             *
             * The anchor carries no href/data-href on purpose: Obsidian's
             * delegated click handler reads those, and with our own listener
             * attached the note would open twice.
             */
            const wk = tr.createEl("td", { cls: "jd-cal__wk" });
            const a = wk.createEl("a", {
                cls: "internal-link",
                text: wid.slice(-3),                        // "W35"
                attr: { role: "link", tabindex: "0", title: NAMES.has(wid) ? `Open ${wid}` : `Create ${wid}` },
            });
            if (!NAMES.has(wid)) a.addClass("is-unresolved");
            a.addEventListener("click", (ev) => { ev.preventDefault(); goto(wid); });

            for (let i = 0; i < 7; i++) {
                const iso = isoOf(mon + i);
                const inMonth = iso.slice(0, 7) === `${y}-${pad2(m)}`;
                const td = tr.createEl("td", { cls: "jd-cal__day" });
                if (!inMonth) td.setAttribute("data-out", "true");
                if (iso === TODAY) td.setAttribute("data-today", "true");

                td.createEl("span", { cls: "jd-cal__date", text: String(Number(iso.slice(-2))) });

                const list = (events.get(iso) ?? [])
                    .slice()
                    .sort((p, q) => KIND_ORDER.indexOf(p.kind) - KIND_ORDER.indexOf(q.kind));

                // Load hooks — written on EVERY cell, including empty ones.
                //
                // Petri does not use these; the "Rig" stylesheet does, and the
                // whole point of emitting them now is that switching themes is
                // then one word in the note's `cssclasses` and not a rewrite of
                // this file. data-count is the exact number (so a tooltip or a
                // future view can be honest about it); data-load is the bucket
                // the heatmap paints, capped at 4 because more steps than that
                // are not distinguishable as background tints.
                const n = list.length;
                td.setAttribute("data-count", String(n));
                td.setAttribute("data-load",
                    String(n === 0 ? 0 : n === 1 ? 1 : n <= 3 ? 2 : n <= 6 ? 3 : 4));

                if (!n) continue;

                if (list.some((e) => e.kind === "due")) {
                    // the 3px red edge — set three ways so whichever hook the
                    // stylesheet uses, the deadline is visible
                    td.setAttribute("data-deadline", "true");
                    td.setAttribute("data-due", "true");
                    td.addClass("jd-cal__day--due");
                }

                // Titles never go in the cell — a month grid has no room for
                // them and truncating a note title silently is worse than not
                // showing it. They go in the tooltip, all of them.
                td.setAttribute("title", list.slice(0, 12)
                    .map((e) => `${KIND_LABEL[e.kind]} · ${e.name}`)
                    .join("\n") + (list.length > 12 ? `\n…+${list.length - 12} more` : ""));

                const dots = td.createDiv({ cls: "jd-cal__dots" });
                for (const e of list.slice(0, 3)) {
                    dots.createEl("span", {
                        cls: `jd-cal__dot jd-cal__dot--${e.kind}`,
                        attr: { "data-kind": e.kind },
                    });
                }
                // NEVER truncate silently.
                if (list.length > 3) {
                    dots.createEl("span", { cls: "jd-cal__more", text: `+${list.length - 3}` });
                }
            }
        }
    };

    const shift = (n) => { offset += n; writeOffset(offset); draw(); };
    prev.addEventListener("click", () => shift(-1));
    next.addEventListener("click", () => shift(1));
    title.addEventListener("click", () => { offset = 0; writeOffset(0); draw(); });
    title.setAttribute("title", "Back to this month");

    draw();
});

// ── 6. weather ──────────────────────────────────────────────────────────
const wxCard = card(colRight, "weather", LAYOUT === "log" ? "Conditions" : LAYOUT === "broadsheet" ? "Weather" : WX.name);
const wxEl = wxCard.body.createDiv({ cls: "jd-wx" });
const wxNow = wxEl.createDiv({ cls: "jd-wx__now" });
const wxDays = wxEl.createDiv({ cls: "jd-wx__days" });

/*
 * Weather icons: Material Symbols, inlined as path data.
 *
 * They used to be Lucide names handed to icon(), and they never drew a single
 * pixel — OBS is null in this file (see the environment note at the top), so
 * setIcon was never called and every weather icon has been an empty 32px box
 * on the desktop as well as on the phone. The replacement is chosen so that
 * failure cannot come back: an inlined path asks for no module, no plugin API,
 * no font and no network, so it draws the same on both platforms, and a glyph
 * that is missing is missing HERE, in a table, rather than silently at runtime.
 *
 * Material Symbols (google/material-design-icons), Apache-2.0. The licence does
 * not require attribution; this line is courtesy.
 *
 * Two properties of this data are load-bearing and easy to break:
 *   - the viewBox is "0 -960 960 960", NOT Lucide's "0 0 24 24". Material
 *     Symbols are drawn on a y = -960..0 grid, so the wrong viewBox does not
 *     merely look wrong, it renders an empty box — the same symptom as the bug
 *     this is fixing, which would make it very hard to spot twice.
 *   - no glyph carries a fill, stroke or colour of its own. That is what lets
 *     fill="currentColor" inherit the `color: var(--text-muted)` the CSS box
 *     already sets, and it is why light and dark both come free. Do not put a
 *     colour in here.
 */
const MS_PATHS = {
    clear_day: "M440-760v-160h80v160h-80Zm266 110-55-55 112-115 56 57-113 113Zm54 210v-80h160v80H760ZM440-40v-160h80v160h-80ZM254-652 140-763l57-56 113 113-56 54Zm508 512L651-255l54-54 114 110-57 59ZM40-440v-80h160v80H40Zm157 300-56-57 112-112 29 27 29 28-114 114Zm113-170q-70-70-70-170t70-170q70-70 170-70t170 70q70 70 70 170t-70 170q-70 70-170 70t-170-70Zm283-57q47-47 47-113t-47-113q-47-47-113-47t-113 47q-47 47-47 113t47 113q47 47 113 47t113-47ZM480-480Z",
    partly_cloudy_day: "M440-760v-160h80v160h-80Zm266 110-56-56 113-114 56 57-113 113Zm54 210v-80h160v80H760Zm3 299L650-254l56-56 114 112-57 57ZM254-650 141-763l57-57 112 114-56 56Zm-14 450h180q25 0 42.5-17.5T480-260q0-25-17-42.5T421-320h-51l-20-48q-14-33-44-52.5T240-440q-50 0-85 35t-35 85q0 50 35 85t85 35Zm0 80q-83 0-141.5-58.5T40-320q0-83 58.5-141.5T240-520q60 0 109.5 32.5T423-400q58 0 97.5 43T560-254q-2 57-42.5 95.5T420-120H240Zm320-134q-5-20-10-39t-10-39q45-19 72.5-59t27.5-89q0-66-47-113t-113-47q-60 0-105 39t-53 99q-20-5-41-9t-41-9q14-88 82.5-144T480-720q100 0 170 70t70 170q0 77-44 138.5T560-254Zm-79-226Z",
    cloud: "M260-160q-91 0-155.5-63T40-377q0-78 47-139t123-78q25-92 100-149t170-57q117 0 198.5 81.5T760-520q69 8 114.5 59.5T920-340q0 75-52.5 127.5T740-160H260Zm0-80h480q42 0 71-29t29-71q0-42-29-71t-71-29h-60v-80q0-83-58.5-141.5T480-720q-83 0-141.5 58.5T280-520h-20q-58 0-99 41t-41 99q0 58 41 99t99 41Zm220-240Z",
    foggy: "M720-200q-17 0-28.5-11.5T680-240q0-17 11.5-28.5T720-280q17 0 28.5 11.5T760-240q0 17-11.5 28.5T720-200ZM280-80q-17 0-28.5-11.5T240-120q0-17 11.5-28.5T280-160q17 0 28.5 11.5T320-120q0 17-11.5 28.5T280-80Zm-40-120q-17 0-28.5-11.5T200-240q0-17 11.5-28.5T240-280h360q17 0 28.5 11.5T640-240q0 17-11.5 28.5T600-200H240ZM400-80q-17 0-28.5-11.5T360-120q0-17 11.5-28.5T400-160h280q17 0 28.5 11.5T720-120q0 17-11.5 28.5T680-80H400ZM300-320q-91 0-155.5-64.5T80-540q0-83 55-145t136-73q32-57 87.5-89.5T480-880q90 0 156.5 57.5T717-679q69 6 116 57t47 122q0 75-52.5 127.5T700-320H300Zm0-80h400q42 0 71-29t29-71q0-42-29-71t-71-29h-60v-40q0-66-47-113t-113-47q-48 0-87.5 26T333-704l-10 24h-25q-57 2-97.5 42.5T160-540q0 58 41 99t99 41Zm180-200Z",
    rainy: "M558-84q-15 8-30.5 2.5T504-102l-60-120q-8-15-2.5-30.5T462-276q15-8 30.5-2.5T516-258l60 120q8 15 2.5 30.5T558-84Zm240 0q-15 8-30.5 2.5T744-102l-60-120q-8-15-2.5-30.5T702-276q15-8 30.5-2.5T756-258l60 120q8 15 2.5 30.5T798-84Zm-480 0q-15 8-30.5 2.5T264-102l-60-120q-8-15-2.5-30.5T222-276q15-8 30.5-2.5T276-258l60 120q8 15 2.5 30.5T318-84Zm-18-236q-91 0-155.5-64.5T80-540q0-83 55-145t136-73q32-57 87.5-89.5T480-880q90 0 156.5 57.5T717-679q69 6 116 57t47 122q0 75-52.5 127.5T700-320H300Zm0-80h400q42 0 71-29t29-71q0-42-29-71t-71-29h-60v-40q0-66-47-113t-113-47q-48 0-87.5 26T333-704l-10 24h-25q-57 2-97.5 42.5T160-540q0 58 41 99t99 41Zm180-200Z",
    weather_mix: "M457.5-57Q440-74 440-99q0-12 4.5-23t13.5-19l42-39 42 39q9 8 13.5 19t4.5 23q0 25-17.5 42T500-40q-25 0-42.5-17ZM362-100l-42-42 118-118 42 42-118 118Zm258-60-60-60 60-60 60 60-60 60Zm-360 0-60-60 60-60 60 60-60 60Zm40-160q-91 0-155.5-64.5T80-540q0-83 55-145t136-73q32-57 87.5-89.5T480-880q90 0 156.5 57.5T717-679q69 6 116 57t47 122q0 75-52.5 127.5T700-320H300Zm0-80h400q42 0 71-29t29-71q0-42-29-71t-71-29h-60v-40q0-66-47-113t-113-47q-48 0-87.5 26T333-704l-10 24h-25q-57 2-97.5 42.5T160-540q0 58 41 99t99 41Zm180-200Z",
    weather_snowy: "M224.5-214.5Q210-229 210-250t14.5-35.5Q239-300 260-300t35.5 14.5Q310-271 310-250t-14.5 35.5Q281-200 260-200t-35.5-14.5Zm120 120Q330-109 330-130t14.5-35.5Q359-180 380-180t35.5 14.5Q430-151 430-130t-14.5 35.5Q401-80 380-80t-35.5-14.5Zm120-120Q450-229 450-250t14.5-35.5Q479-300 500-300t35.5 14.5Q550-271 550-250t-14.5 35.5Q521-200 500-200t-35.5-14.5Zm240 0Q690-229 690-250t14.5-35.5Q719-300 740-300t35.5 14.5Q790-271 790-250t-14.5 35.5Q761-200 740-200t-35.5-14.5Zm-120 120Q570-109 570-130t14.5-35.5Q599-180 620-180t35.5 14.5Q670-151 670-130t-14.5 35.5Q641-80 620-80t-35.5-14.5ZM300-360q-91 0-155.5-64.5T80-580q0-83 55-145t136-73q32-57 87.5-89.5T480-920q90 0 156.5 57.5T717-719q69 6 116 57t47 122q0 75-52.5 127.5T700-360H300Zm0-80h400q42 0 71-29t29-71q0-42-29-71t-71-29h-60v-40q0-66-47-113t-113-47q-48 0-87.5 26T333-744l-10 24h-25q-57 2-97.5 42.5T160-580q0 58 41 99t99 41Zm180-100Z",
    thunderstorm: "m300-40 36-100h-76l50-140h100l-43 100h83L340-40h-40Zm270-40 28-80h-78l43-120h100l-35 80h82L610-80h-40ZM300-320q-91 0-155.5-64.5T80-540q0-83 55-145t136-73q32-57 87.5-89.5T480-880q90 0 156.5 57.5T717-679q69 6 116 57t47 122q0 75-52.5 127.5T700-320H300Zm0-80h400q42 0 71-29t29-71q0-42-29-71t-71-29h-60v-40q0-66-47-113t-113-47q-48 0-87.5 26T333-704l-10 24h-25q-57 2-97.5 42.5T160-540q0 58 41 99t99 41Zm180-200Z",
    clear_night: "M484-80q-84 0-157.5-32t-128-86.5Q144-253 112-326.5T80-484q0-146 93-257.5T410-880q-18 99 11 193.5T521-521q71 71 165.5 100T880-410q-26 144-138 237T484-80Zm0-80q88 0 163-44t118-121q-86-8-163-43.5T464-465q-61-61-97-138t-43-163q-77 43-120.5 118.5T160-484q0 135 94.5 229.5T484-160Zm-20-305Z",
    partly_cloudy_night: "M504-465Zm20 385H420l20-12.5q20-12.5 43.5-28t43.5-28l20-12.5q81-6 149.5-49T805-325q-86-8-163-43.5T504-465q-61-61-97-138t-43-163q-77 43-120.5 118.5T200-484v12l-12 5.5q-12 5.5-26.5 11.5T135-443.5l-12 5.5q-2-11-2.5-23t-.5-23q0-146 93-257.5T450-880q-18 99 11 193.5T561-521q71 71 165.5 100T920-410q-26 144-138 237T524-80Zm-284-80h180q25 0 42.5-17.5T480-220q0-25-17-42.5T422-280h-52l-20-48q-14-33-44-52.5T240-400q-50 0-85 34.5T120-280q0 50 35 85t85 35Zm0 80q-83 0-141.5-58.5T40-280q0-83 58.5-141.5T240-480q60 0 109.5 32.5T423-360q57 2 97 42.5t40 97.5q0 58-41 99t-99 41H240Z",
};

/**
 * One Material Symbol into `el`, as a real <svg> element.
 *
 * document.createElementNS, not Obsidian's createSvg() and not innerHTML.
 * createSvg() would in fact work — it is the same global-prototype family as
 * the createDiv/createEl this whole file is built on. The reason to use the
 * standard call anyway is narrower than "the helper might vanish" — both call
 * sites already run createEl before msIcon is entered, so that failure could
 * never reach here. It is that the weather icons end up depending on NOTHING
 * Obsidian-specific: not a module, not a prototype extension, not a plugin.
 * Given what the rest of this comment is about, that is the property worth
 * keeping.
 *
 * aria-hidden by DEFAULT, because the current conditions already print the
 * condition next to the icon in .jd-wx__desc and saying it twice is worse than
 * not saying it. The forecast tiles are the exception and pass a `label`: their
 * only visible children are the weekday and the temperature range, and the
 * condition lives in a `title` on a plain <div>, which is not a reliable
 * accessible name. Those get role="img" and an aria-label instead.
 * width/height are set but are only a floor — on an
 * <svg> they are presentation attributes, so any stylesheet rule beats them,
 * and dashboard.css sizes the real thing (30px in .jd-wx__icon, 16px inside
 * .jd-wx__day). Without them, a render with the snippet switched off would fall
 * back to the SVG default of 300x150 and tear the card open.
 */
const msIcon = (el, name, label) => {
    try {
        const d = MS_PATHS[name];
        if (!d) return;
        const NS = "http://www.w3.org/2000/svg";
        const svg = document.createElementNS(NS, "svg");
        svg.setAttribute("viewBox", "0 -960 960 960");
        svg.setAttribute("width", "24");
        svg.setAttribute("height", "24");
        svg.setAttribute("fill", "currentColor");
        if (label) {
            svg.setAttribute("role", "img");
            svg.setAttribute("aria-label", String(label));
        } else {
            svg.setAttribute("aria-hidden", "true");
        }
        const p = document.createElementNS(NS, "path");
        p.setAttribute("d", d);
        svg.appendChild(p);
        el.appendChild(svg);
    } catch (e) { /* no icon, still readable */ }
};

/*
 * WMO weather codes. Open-Meteo returns a code, not a description, so both the
 * text and the icon name are looked up here.
 *
 * Eight glyphs for twenty-eight codes, deliberately. At 30px — and at 16px in
 * the forecast row — "light drizzle" and "heavy drizzle" are the same picture,
 * and the label next to it is what carries the degree. Material Symbols does
 * ship rainy_light / rainy_heavy / snowing, but those glyphs have NO CLOUD in
 * them at all; they are bare streaks, and at 16px they read as scratches on the
 * screen rather than as weather. So the cloud-bearing members of the family do
 * all the work. The one distinction worth a separate glyph is freezing/mixed
 * precipitation (weather_mix), because that is the code you want to notice.
 */
const WMO = {
    0: ["Clear", "clear_day"],
    1: ["Mostly clear", "partly_cloudy_day"], 2: ["Partly cloudy", "partly_cloudy_day"], 3: ["Overcast", "cloud"],
    45: ["Fog", "foggy"], 48: ["Freezing fog", "foggy"],
    51: ["Light drizzle", "rainy"], 53: ["Drizzle", "rainy"], 55: ["Heavy drizzle", "rainy"],
    56: ["Freezing drizzle", "weather_mix"], 57: ["Heavy freezing drizzle", "weather_mix"],
    61: ["Light rain", "rainy"], 63: ["Rain", "rainy"], 65: ["Heavy rain", "rainy"],
    66: ["Freezing rain", "weather_mix"], 67: ["Heavy freezing rain", "weather_mix"],
    71: ["Light snow", "weather_snowy"], 73: ["Snow", "weather_snowy"], 75: ["Heavy snow", "weather_snowy"],
    77: ["Snow grains", "weather_snowy"],
    80: ["Showers", "rainy"], 81: ["Showers", "rainy"], 82: ["Heavy showers", "rainy"],
    85: ["Snow showers", "weather_snowy"], 86: ["Heavy snow showers", "weather_snowy"],
    95: ["Thunderstorm", "thunderstorm"], 96: ["Thunderstorm, hail", "thunderstorm"], 99: ["Severe thunderstorm", "thunderstorm"],
};
const wmo = (c) => WMO[c] ?? ["—", "cloud"];

/*
 * Day/night, and only for the current conditions.
 *
 * Two glyphs have the sun drawn INTO them, so exactly two have a night twin;
 * everything else is a cloud, and a cloud looks the same at midnight. The
 * forecast row never calls this: Open-Meteo's daily block carries no is_day at
 * all, and a whole-day summary is a daytime statement anyway.
 *
 * The test is `=== 0`, not `!isDay`, and that is not fussiness. A payload
 * cached before is_day was added to WX_URL does not have the field, and it can
 * sit in localStorage for the whole TTL — or indefinitely, since a stale entry
 * is deliberately reused when the network is down. `!undefined` is true, so
 * `!isDay` would paint a moon on every one of those renders, including at noon.
 * `undefined === 0` is false, so an unknown value falls back to the day glyph,
 * which is the harmless direction to be wrong in.
 */
const NIGHT = { clear_day: "clear_night", partly_cloudy_day: "partly_cloudy_night" };
const atNight = (name, isDay) => (isDay === 0 ? (NIGHT[name] ?? name) : name);

const wxFail = () => {
    wxEl.setAttribute("data-empty", "true");
    wxCard.section.setAttribute("data-empty", "true");
    wxNow.empty();
    wxDays.empty();
    wxNow.createEl("p", { cls: "jd-empty", text: "No weather data." });
};

/** A temperature, or an em dash — never the string "NaN°". */
const degC = (v) => (Number.isFinite(Number(v)) ? `${Math.round(Number(v))}°` : "—");

/** The observer's lines: transparency from cloud cover, wind as Beaufort force, sun and moon. */
const wxExtra = (cur, day, meta) => {
    const lines = [];
    const sr = day.sunrise?.[0], ss = day.sunset?.[0];
    if (LAYOUT === "log") {
        const tr = transparency(cur.cloud_cover);
        if (tr) lines.push(`Transparency ${tr}/5 · cloud ${Math.round(cur.cloud_cover)}%`);
        if (Number.isFinite(Number(cur.wind_speed_10m))) lines.push(`Wind force ${beaufort(cur.wind_speed_10m)} · ${Math.round(cur.wind_speed_10m)} km/h`);
        if (sr && ss) lines.push(`Sunrise ${hhmm(sr)} · Sunset ${hhmm(ss)}`);
        const mp = moonPhase(); lines.push(`Moon ${mp.name.toLowerCase()}, ${mp.ill}%`);
    } else if (Number.isFinite(Number(cur.wind_speed_10m))) {
        lines.push(`Wind ${Math.round(cur.wind_speed_10m)} km/h`);
    }
    for (const t of lines) meta.createEl("span", { cls: "jd-wx__obs", text: t });
    const ear = document.querySelector(".jd-mast__ear-wx");
    if (ear && sr && ss) ear.textContent = `Sunrise ${hhmm(sr)} · Sunset ${hhmm(ss)}`;
};
const wxPaint = (d) => {
    try {
        wxEl.removeAttribute("data-empty");
        wxCard.section.removeAttribute("data-empty");
        wxNow.empty();
        wxDays.empty();

        const cur = d?.current;
        const day = d?.daily;
        if (!cur || !day?.time?.length) return wxFail();

        const [text, ic] = wmo(cur.weather_code);
        msIcon(wxNow.createEl("span", { cls: "jd-wx__icon" }), atNight(ic, cur.is_day));
        wxNow.createEl("span", { cls: "jd-wx__temp", text: degC(cur.temperature_2m) });
        const meta = wxNow.createDiv({ cls: "jd-wx__meta" });
        meta.createEl("span", { cls: "jd-wx__desc", text });
        if (Number.isFinite(Number(cur.relative_humidity_2m))) {
            meta.createEl("span", { cls: "jd-wx__hum", text: `Humidity ${Math.round(cur.relative_humidity_2m)}%` });
        }

        // The weekday, not "Today / Tomorrow / Day after": three three-letter
        // labels are the same width and say the same thing without the reader
        // having to hold an offset in their head.
        if (LAYOUT !== "cards") wxExtra(cur, day, meta);
        for (let i = 0; i < Math.min(3, day.time.length); i++) {
            const iso = asDate(day.time[i]);
            const [t2, i2] = wmo(day.weather_code?.[i]);
            const box = wxDays.createDiv({ cls: "jd-wx__day", attr: { title: `${iso ? fmtDay(iso) : day.time[i]} · ${t2}` } });
            box.createEl("span", { cls: "jd-wx__dow", text: iso ? WD3[dow(iso)] : "" });
            msIcon(box.createEl("span", { cls: "jd-wx__icon" }), i2, t2);
            box.createEl("span", {
                cls: "jd-wx__range",
                text: `${degC(day.temperature_2m_max?.[i])} / ${degC(day.temperature_2m_min?.[i])}`,
            });
        }
    } catch (e) { wxFail(); }
};

/*
 * Caching is not an optimisation here, it is a correctness requirement.
 * Dataview re-renders this block on a 2.5s debounce on ANY index change, so an
 * uncached fetch would turn one editing session into hundreds of requests
 * against a 600/min limit. 30 minutes of TTL, and a stale entry is still used
 * when the network is down — a slightly old temperature beats an empty box.
 *
 * The whole thing runs AFTER the dashboard is on screen and swallows every
 * error: the weather is the least important thing on this page and must never
 * be able to stop the rest of it from rendering.
 */
const WX_SITES = [WX, { name: "Jeonju", lat: 35.8242, lon: 127.1480 }];
const wxUrl = (s) => "https://api.open-meteo.com/v1/forecast"
    + `?latitude=${s.lat}&longitude=${s.lon}`
    + "&current=temperature_2m,weather_code,relative_humidity_2m,is_day,cloud_cover,wind_speed_10m"
    + "&daily=temperature_2m_max,temperature_2m_min,weather_code,sunrise,sunset"
    + "&timezone=Asia%2FSeoul&forecast_days=3";
const WX_TTL = 30 * 60 * 1000;
const WX_RETRY = 5 * 60 * 1000;
const wxGet = async (url) => {
    if (OBS?.requestUrl) return (await OBS.requestUrl({ url, method: "GET" })).json;
    const res = await fetch(url);
    if (!res.ok) throw new Error(String(res.status));
    return await res.json();
};
let wxSite = WX;
const wxLabel = () => { if (LAYOUT !== "cards") return; const el = wxCard.section.querySelector(".jd-card__label"); if (el) el.textContent = wxSite.name; };
/** Fetch-and-paint for one site, cached per site for 30 min with a 5 min cooldown after a failure. */
const wxLoad = async (site) => {
    wxSite = site; wxLabel();
    try { store.set(LS_WX + ":site", JSON.stringify(site)); } catch (e) { }
    const key = LS_WX + ":" + String(site.name).toLowerCase(), errKey = LS_WX_ERR + ":" + String(site.name).toLowerCase();
    let stale = null;
    try {
        const raw = store.get(key, null);
        if (raw) { const c = JSON.parse(raw); if (c && c.d) { if (Date.now() - Number(c.t) < WX_TTL) return wxPaint(c.d); stale = c.d; } }
    } catch (e) { }
    if (stale) wxPaint(stale);
    try {
        const failedAt = Number(store.get(errKey, 0));
        if (failedAt && Date.now() - failedAt < WX_RETRY) { if (!stale) wxFail(); return; }
    } catch (e) { }
    try {
        const d = await wxGet(wxUrl(site));
        store.set(key, JSON.stringify({ t: Date.now(), d }));
        store.set(errKey, 0);
        if (wxSite === site) wxPaint(d);
    } catch (e) {
        store.set(errKey, Date.now());
        if (!stale) wxFail();
    }
};
const wxGeocode = async (q) => {
    const j = await wxGet("https://geocoding-api.open-meteo.com/v1/search?name=" + encodeURIComponent(q) + "&count=6&language=en&format=json");
    return (j?.results ?? []).slice(0, 6).map((r) => ({ name: r.name, lat: r.latitude, lon: r.longitude, admin1: r.admin1, country: r.country }));
};
{
    // Three tabs: Gwangju, Jeonju, and a third that starts empty. On the empty tab only a search box shows;
    // typing a name lists candidates, choosing one makes the tab that place. The × at the bar's right empties it.
    // Every event is swallowed so Live Preview's editor never sees keys pressed inside the widget.
    const bar = document.createElement("div"); bar.className = "jd-wx__sites";
    wxCard.body.insertBefore(bar, wxCard.body.firstChild);
    const swallowAll = (el) => ["click", "mousedown", "keydown", "keyup", "keypress", "focus", "input"].forEach((t) => el.addEventListener(t, (ev) => ev.stopPropagation()));
    let custom = null;
    try { const c = JSON.parse(store.get(LS_WX + ":custom", "null")); if (c && c.name && Number.isFinite(Number(c.lat))) custom = c; } catch (e) { }
    const btns = [];
    const tabBtn = (label, i) => {
        const btn = bar.createEl("button", { cls: "jd-wx__site", text: label, attr: { type: "button" } });
        swallowAll(btn);
        btn.addEventListener("click", (ev) => { ev.preventDefault(); select(i); });
        btns.push(btn);
        return btn;
    };
    WX_SITES.forEach((s, i) => tabBtn(s.name, i));
    const third = tabBtn(custom ? custom.name : "Elsewhere", 2);
    const clear = bar.createEl("button", { cls: "jd-wx__clear", text: "×", attr: { type: "button", title: "Empty this tab", "aria-label": "Empty this tab" } });
    swallowAll(clear);
    const find = wxCard.body.createDiv({ cls: "jd-wx__find" });
    const inp = find.createEl("input", { cls: "jd-wx__search", type: "text", attr: { placeholder: "City ⏎", "aria-label": "place", spellcheck: "false" } });
    const list = find.createEl("ul", { cls: "jd-wx__cands" });
    swallowAll(inp);
    let cur = 0;
    const render = () => {
        btns.forEach((btn, i) => btn.toggleClass("is-on", i === cur));
        const searching = cur === 2 && !custom;
        find.toggle(searching);
        wxEl.toggle(!searching);
        clear.toggle(cur === 2 && !!custom);
        third.textContent = custom ? custom.name : "Elsewhere";
        if (searching) setTimeout(() => { try { inp.focus(); } catch (e) { } }, 0);
    };
    const select = (i) => {
        cur = i;
        try { store.set(LS_WX + ":tab", String(i)); } catch (e) { }
        render();
        const s = i === 2 ? custom : WX_SITES[i];
        if (s) wxLoad(s);
    };
    clear.addEventListener("click", (ev) => {
        ev.preventDefault();
        custom = null;
        try { store.set(LS_WX + ":custom", "null"); } catch (e) { }
        inp.value = ""; list.empty();
        render();
    });
    const muted = (text) => { list.empty(); list.createEl("li", { cls: "jd-wx__cand is-muted", text }); };
    inp.addEventListener("keydown", async (ev) => {
        if (ev.key !== "Enter") return;
        ev.preventDefault();
        const q = inp.value.trim(); if (!q) return;
        muted("…");
        try {
            const cands = await wxGeocode(q);
            if (!cands.length) { muted(`"${q}" — no such place.`); return; }
            list.empty();
            for (const c of cands) {
                const li = list.createEl("li", { cls: "jd-wx__cand", attr: { role: "button", tabindex: "0" } });
                li.createSpan({ text: c.name });
                li.createSpan({ cls: "jd-wx__cand-sub", text: [c.admin1, c.country].filter(Boolean).join(", ") });
                swallowAll(li);
                const pick = (e2) => {
                    e2.preventDefault();
                    custom = { name: c.name, lat: c.lat, lon: c.lon };
                    try { store.set(LS_WX + ":custom", JSON.stringify(custom)); } catch (e) { }
                    inp.value = ""; list.empty();
                    render();
                    wxLoad(custom);
                };
                li.addEventListener("click", pick);
                li.addEventListener("keydown", (e2) => { if (e2.key === "Enter" || e2.key === " ") pick(e2); });
            }
        } catch (e) { muted("Place lookup failed."); }
    });
    let saved = 0;
    try { saved = Number(store.get(LS_WX + ":tab", 0)) || 0; } catch (e) { }
    cur = saved === 2 && custom ? 2 : saved === 1 ? 1 : 0;
    render();
    wxLoad(cur === 2 ? custom : WX_SITES[cur]);
}
if (LAYOUT === "log") {
    try {
        const idsOf = (r) => r.pids ?? pidList(r.p);
        const mainsAll = [...new Set(projects.flatMap((r) => idsOf(r).map(mainOf)))].sort().slice(0, 5);
        const isType = (r, t) => asArray(r.p?.type).map(String).includes(t) || tagStrings(r.p).includes(t);
        const count = (main, t) => rows.filter((r) => idsOf(r).some((id) => mainOf(id) === main) && isType(r, t)).length;
        const titleFor = (main) => { const r = projects.find((x) => idsOf(x).includes(main)); return r ? titleOf(r) : main; };
        const seeded = (s) => () => { s = (s * 1664525 + 1013904223) % 4294967296; return s / 4294967296; };
        const NS = "http://www.w3.org/2000/svg";
        const box = document.createElement("div"); box.className = "jd-chart";
        const svg = document.createElementNS(NS, "svg"); svg.setAttribute("viewBox", "0 0 400 400"); svg.setAttribute("aria-label", "the vault as a star chart"); box.appendChild(svg);
        const el = (n, a, parent) => { const e = document.createElementNS(NS, n); for (const k in a) e.setAttribute(k, a[k]); (parent ?? svg).appendChild(e); return e; };
        [190, 150, 100, 50].forEach((r, i) => el("circle", { cx: 200, cy: 200, r, class: "jd-chart__ring" + (i === 1 ? " is-major" : "") }));
        [[200, 10, 200, 22], [390, 200, 378, 200], [200, 390, 200, 378], [10, 200, 22, 200]].forEach(([x1, y1, x2, y2]) => el("line", { x1, y1, x2, y2, class: "jd-chart__tick" }));
        const field = el("g", { class: "jd-chart__field" });   // the backdrop turns; the constellations hold still
        const g = el("g", { class: "jd-chart__sky" });
        const key = [];
        const rnd = seeded(7);
        const waiting = rows.filter((r) => isType(r, "Review") && asArray(r.p?.status).map(String).some((s) => s.includes("Not started")))
            .sort((a, b) => String(b.stamp).localeCompare(String(a.stamp)));
        const fieldN = Math.min(60, waiting.length || Number(reviewWaiting) || 0);
        svg.style.setProperty("--jd-moon", String(moonPhase().ill / 100));
        for (let i = 0; i < fieldN; i++) {
            const a = rnd() * Math.PI * 2, d = 40 + rnd() * 145;
            const c = el("circle", { cx: (200 + Math.cos(a) * d).toFixed(1), cy: (200 + Math.sin(a) * d).toFixed(1), r: (0.7 + rnd() * 0.6).toFixed(2), class: "jd-chart__star is-field" }, field);
            const w = waiting[i];
            if (w) {   // catalogue number = the note's own zk stamp; the star opens the review
                const t = document.createElementNS(NS, "title"); t.textContent = `${w.stamp ?? ""} · ${titleOf(w)}`; c.appendChild(t);
                c.style.cursor = "pointer"; c.addEventListener("click", () => goto(w.path));
            }
        }
        mainsAll.forEach((main, i) => {
            const papers = count(main, "Paper"), exps = count(main, "Experiment");
            const n = Math.max(3, Math.min(7, exps || 3));
            const a0 = (i / mainsAll.length) * Math.PI * 2 - Math.PI / 2;
            const cx = 200 + Math.cos(a0) * 105, cy = 200 + Math.sin(a0) * 105;
            const r2 = seeded(11 + i * 97), pts = [];
            for (let k = 0; k < n; k++) pts.push([cx + (r2() - 0.5) * 80, cy + (r2() - 0.5) * 70]);
            el("polyline", { points: pts.map((p) => p.map((v) => v.toFixed(1)).join(",")).join(" "), class: "jd-chart__con" }, g);
            pts.forEach((p, k) => el("circle", { cx: p[0].toFixed(1), cy: p[1].toFixed(1), r: (1.8 + Math.min(2.4, papers / 40)).toFixed(2), class: "jd-chart__star", style: `animation-delay:${(k * 0.8 + i * 0.3).toFixed(1)}s` }, g));
            const code = main.split("-")[1] ?? main;   // PRJ-VNRSIG-2025 → VNRSIG: short enough not to collide
            el("text", { x: cx.toFixed(1), y: (cy - 44).toFixed(1), "text-anchor": "middle", class: "jd-chart__lbl" }, g).textContent = code;
            key.push({ code, title: titleFor(main), papers, exps });
        });
        el("text", { x: 200, y: 392, "text-anchor": "middle", class: "jd-chart__lbl is-sub" }).textContent = `field stars: ${fieldN} reviews not yet begun`;
        const ul = document.createElement("ul"); ul.className = "jd-chart__key";
        for (const k of key) {
            const li = document.createElement("li");
            const b = document.createElement("b"); b.textContent = k.code; li.appendChild(b);
            const span = document.createElement("span"); span.textContent = k.title;
            const small = document.createElement("small"); small.textContent = `${k.papers} papers · ${k.exps} experiments`; span.appendChild(small);
            li.appendChild(span); ul.appendChild(li);
        }
        box.appendChild(ul);
        const legend = document.createElement("div"); legend.className = "jd-chart__legend";
        legend.textContent = "a star per experiment, sized by papers; field stars are reviews not yet begun. The sky turns behind the constellations, once an hour.";
        box.appendChild(legend);
        colLeft.insertBefore(box, colLeft.firstChild);
    } catch (e) { /* the chart is decoration; never break the page */ }
}
const recentCard = card(LAYOUT === "broadsheet" ? colMain : colRight, "recent", LAYOUT === "broadsheet" ? "Latest" : "Recent");
/** The opening prose of a note, ~240 characters: frontmatter cut by the metadata cache's own
 *  offset, then only lines that read as sentences — no tables, rules, headings, embeds, empty
 *  list stubs or callout headers. */
const excerptOf = async (path) => {
    try {
        const f = app.vault.getAbstractFileByPath(path);
        if (!f) return "";
        let s = await app.vault.cachedRead(f);
        const fm = app.metadataCache.getFileCache(f)?.frontmatterPosition;
        if (fm?.end?.offset) s = s.slice(fm.end.offset);
        else s = s.replace(/^﻿?---\r?\n[\s\S]*?\r?\n---\s*/, "");
        s = s.replace(/```[\s\S]*?```/g, " ").replace(/<%[\s\S]*?%>/g, " ").replace(/%%[\s\S]*?%%/g, " ");
        const out = [];
        for (let line of s.split(/\r?\n/)) {
            line = line.trim();
            if (!line) continue;
            if (/^(\||#|---|\*\*\*|>|!\[\[|<|\d+\.\s*$|[-*+]\s*$|[-*+]\s+\[[ xX]\]\s*$)/.test(line)) continue;
            line = line.replace(/^([-*+]|\d+\.)\s+/, "").replace(/^\[[ xX]\]\s*/, "");
            line = line.replace(/!\[\[[^\]]*\]\]/g, " ").replace(/\[\[([^\]|]*)(?:\|([^\]]*))?\]\]/g, (m, a, b) => b ?? a);
            line = line.replace(/\[([^\]]*)\]\([^)]*\)/g, "$1").replace(/[*_`=~]+/g, "").replace(/\s+/g, " ").trim();
            if (line.length < 8) continue;
            out.push(line);
            if (out.join(" ").length >= 240) break;
        }
        const t = out.join(" ");
        return t.length > 240 ? t.slice(0, 240).replace(/\s+\S*$/, "") + " …" : t;
    } catch (e) { return ""; }
};
/** A run of stories: title, date (and project), opening lines. */
const stories = (host, list) => {
    const run = host.createDiv({ cls: "jd-stories" });
    for (const r of list) {
        const a = run.createEl("article", { cls: "jd-story" });
        const h = a.createEl("a", { cls: "jd-story__hl", text: titleOf(r), attr: { role: "button", tabindex: "0" } });
        const fire = (ev) => { ev.preventDefault(); goto(r.path); };
        h.addEventListener("click", fire);
        h.addEventListener("keydown", (ev) => { if (ev.key === "Enter" || ev.key === " ") fire(ev); });
        a.createDiv({ cls: "jd-story__meta", text: fmtDay(r.zk) + (r.pids?.length ? " · " + r.pids.join(", ") : "") });
        const ex = a.createEl("p", { cls: "jd-story__ex" });
        excerptOf(r.path).then((t) => { if (t) ex.textContent = t; else ex.remove(); });
    }
};
/** A card whose title opens a note — the index the card is a window onto. */
const linkLabel = (c, path) => {
    const el = c.section.querySelector(".jd-card__label");
    if (!el) return;
    el.addClass("jd-card__label--link");
    el.setAttribute("role", "link"); el.setAttribute("tabindex", "0"); el.setAttribute("title", "Open " + path.split("/").pop());
    const fire = (ev) => { ev.preventDefault(); goto(path); };
    el.addEventListener("click", fire);
    el.addEventListener("keydown", (ev) => { if (ev.key === "Enter" || ev.key === " ") fire(ev); });
};
if (LAYOUT === "broadsheet") {
    const stamped = rows.filter((r) => r.stamp).sort((a, b) => b.stamp.localeCompare(a.stamp));
    const favs = stamped.filter((r) => r.p?.favourite === true || String(r.p?.favourite) === "true").slice(0, 3);
    const cps = stamped.filter((r) => tagStrings(r.p).includes("Commonplace")).slice(0, 3);
    const favCard = card(colMain, "favourites", "Favourites");
    linkLabel(favCard, "Jinome/Introns/Indeces/Favourites");
    const cpCard = card(colMain, "commonplace", "Commonplace");
    linkLabel(cpCard, "Jinome/Introns/Indeces/Commonplace");
    panel("favourites", () => {
        if (!favs.length) { empty(favCard, "Nothing carries favourite: true yet."); return; }
        stories(favCard.body, favs);
    });
    panel("commonplace", () => {
        if (!cps.length) { empty(cpCard, "No note is tagged Commonplace yet."); return; }
        stories(cpCard.body, cps);
    });
}
if (LAYOUT !== "cards") {
    // Splash and off-lead: the two most urgent items, by the same order the Today tab uses.
    try {
        const seen = new Set();
        const byDate = (a, b) => String(a.due ?? a.sch).localeCompare(String(b.due ?? b.sch));
        const lead = [...[...overdue].sort(byDate), ...[...todayItems].sort(byDate), ...[...dueThisWeek].sort(byDate)]
            .filter((r) => !seen.has(r.path) && seen.add(r.path)).slice(0, 2);
        if (lead.length) {
            const box = document.createElement("section"); box.className = "jd-splash";
            lead.forEach((r, i) => {
                const a = box.createEl("article", { cls: "jd-splash__item" + (i ? " is-offlead" : "") });
                const kicker = [...(r.pids ?? []), ...asArray(r.p?.status).map(String)].join(" · ");
                if (kicker) a.createDiv({ cls: "jd-splash__kicker", text: kicker });
                const h = a.createEl("a", { cls: "jd-splash__hl", text: titleOf(r), attr: { role: "button", tabindex: "0" } });
                const fire = (ev) => { ev.preventDefault(); goto(r.path); };
                h.addEventListener("click", fire);
                h.addEventListener("keydown", (ev) => { if (ev.key === "Enter" || ev.key === " ") fire(ev); });
                const when = r.due ?? r.sch;
                const late = when ? lateMark(when) : "";
                a.createDiv({ cls: "jd-splash__by", text: [when ? (r.due ? "due " : "scheduled ") + fmtDay(when) : null, late || null].filter(Boolean).join(" · ") });
                const ex = a.createEl("p", { cls: "jd-splash__ex" });
                excerptOf(r.path).then((t) => { if (t) ex.textContent = t; else ex.remove(); });
            });
            colMain.insertBefore(box, colMain.firstChild);
        }
    } catch (e) { /* no splash is a valid state */ }
    // Index box: the navigation list carries the count behind each label.
    try {
        const isT = (r, t) => asArray(r.p?.type).map(String).includes(t);
        const counts = {
            "Papers": rows.filter((r) => isT(r, "Paper")).length,
            "Projects": projects.length,
            "Favourites": rows.filter((r) => r.p?.favourite === true || String(r.p?.favourite) === "true").length,
            "Commonplace": rows.filter((r) => tagStrings(r.p).includes("Commonplace")).length,
        };
        navCard.body.querySelectorAll(".jd-nav__item").forEach((a) => {
            const label = a.querySelector(".jd-nav__label")?.textContent?.trim();
            const n = counts[label];
            if (Number.isFinite(n) && n > 0) a.createEl("span", { cls: "jd-nav__count", text: n.toLocaleString("en-US") });
        });
    } catch (e) { }
    // Briefs: the review pipeline by stage — the parts behind the ticker's single "waiting" sum.
    const revCard = card(LAYOUT === "broadsheet" ? colRight : colLeft, "reviews", "Reviews");
    panel("reviews", () => {
        const STAGES = ["📚Not started", "✏Draft", "📖In progress", "📗Done", "📜Final", "💀Not today"];
        const reviews = rows.filter((r) => asArray(r.p?.type).map(String).includes("Review"));
        if (!reviews.length) { empty(revCard, "No note carries type: Review."); return; }
        const list = revCard.body.createEl("ul", { cls: "jd-briefs" });
        for (const st of STAGES) {
            const n = reviews.filter((r) => asArray(r.p?.status).map(String).some((s) => s.replace(/\s+/g, "") === st.replace(/\s+/g, ""))).length;
            const li = list.createEl("li");
            li.createSpan({ cls: "jd-briefs__k", text: st });
            li.createSpan({ cls: "jd-briefs__n", text: String(n) });
        }
        const other = reviews.length - STAGES.reduce((s, st) => s + reviews.filter((r) => asArray(r.p?.status).map(String).some((x) => x.replace(/\s+/g, "") === st.replace(/\s+/g, ""))).length, 0);
        if (other > 0) { const li = list.createEl("li"); li.createSpan({ cls: "jd-briefs__k", text: "other" }); li.createSpan({ cls: "jd-briefs__n", text: String(other) }); }
    });
}
panel("recent", () => {
    /*
     * Created, never modified. Modification time is unknowable in this vault —
     * 1,993 files share one maintenance-batch mtime and 213 have ctime > mtime
     * — so a "recently modified" list would be fiction. The zk stamp in the
     * filename is real, and it is already in every note.
     */
    if (!recent.length) {
        empty(recentCard, "No zk timestamps yet. Mod+Shift+G stamps a filename.");
        return;
    }

    if (LAYOUT === "broadsheet") {
        stories(recentCard.body, recent.slice(0, 3));
        return;
    }
    table(recentCard.body, ["Note", "Created"],
        recent.map((r) => [link(r), fmtDay(r.zk)]));
});
