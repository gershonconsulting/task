// health.gershon.ai — Cloudflare Pages advanced-mode worker (_worker.js).
// Build: replace __DATA__ with data.json, __PW_HASH__ with sha256('gershon-health-v1'+setupCode),
// __SIGN_KEY__ with 32 random hex bytes, __MATRIX_SECRET__ with the client-platform-matrix secret.
// Changing SIGN_KEY only forces a re-login — accounts live in AUTH_KV.
// Since 2026-11-02 the weekly Client Platform Matrix report is a feature of this app:
//   /matrix               signed-in page, live data
//   /api/matrix-report    POST {secret, dry?, testTo?} — builds the email; the task project's
//                         client-platform-matrix edge function supplies data and relays the send.
//   Fired every Monday 13:00 UTC by pg_cron job "client-platform-matrix-weekly" (task project).
const DATA = __DATA__;

// Renders the Gershon Health dashboard from DATA. Shared by the worker and the
// static preview, so the live page and the artifact can never drift apart.
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

const CSS = `
:root{color-scheme:light;
--brand:#FE1B04;--text:#1d1d1f;--muted:#6e6e73;--faint:#a1a1a6;--border:#e5e7eb;--bg:#f5f5f7;--card:#fff;
--crit:#cc1016;--crit-bg:#fdecec;--warn:#b76b00;--warn-bg:#fdf3e1;--ok:#057642;--ok-bg:#e8f5ee;--info:#0a66c2;--info-bg:#e8f1fb;--grey:#8e8e93}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--text);font:14px/1.55 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased}
.top{height:56px;display:flex;align-items:center;gap:10px;padding:0 24px;background:var(--card);border-bottom:1px solid var(--border);position:sticky;top:0;z-index:5}
.logo{width:26px;height:26px;border-radius:7px;background:var(--brand);color:#fff;display:grid;place-items:center;font-weight:700;font-size:14px}
.top b{font-size:15px}.top .sp{flex:1}.top span.when{color:var(--muted);font-size:13px}
.top a{color:var(--muted);font-size:13px;text-decoration:none;margin-left:14px}
.tabs{display:flex;gap:4px;margin-left:18px}
.tabs a{margin:0;padding:6px 12px;border-radius:8px;color:var(--muted);font-weight:600}
.tabs a.on{background:var(--bg);color:var(--text)}
main{max-width:1320px;margin:0 auto;padding:30px 20px 64px}
h1{font-size:28px;line-height:1.2;letter-spacing:-.02em;margin:0 0 8px;font-weight:700;max-width:30ch}
.lede{margin:0;color:var(--muted);font-size:15px;max-width:80ch}
h2{font-size:16px;margin:30px 0 4px;letter-spacing:-.01em;scroll-margin-top:70px}
.sub{color:var(--muted);font-size:13px;margin:0 0 14px}
.cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px;margin-top:22px}
.c{background:var(--card);border:1px solid var(--border);border-radius:12px;padding:15px 17px}
.c .l{font-size:11.5px;font-weight:600;color:var(--muted);text-transform:uppercase;letter-spacing:.05em}
.c .v{font-size:25px;font-weight:700;margin-top:5px;letter-spacing:-.02em;font-variant-numeric:tabular-nums}
.c .s{font-size:12px;color:var(--muted);margin-top:3px}
.v.crit{color:var(--crit)}.v.warn{color:var(--warn)}.v.ok{color:var(--ok)}
.tablewrap{background:var(--card);border:1px solid var(--border);border-radius:12px;overflow-x:auto}
table{width:100%;border-collapse:collapse;font-size:13px;min-width:980px;font-variant-numeric:tabular-nums}
thead th{background:var(--bg);padding:11px 10px;text-align:left;font-weight:600;color:var(--text);border-bottom:1px solid var(--border);font-size:12px;vertical-align:bottom}
thead th .m{display:block;font-weight:500;color:var(--muted);font-size:11px;margin-top:2px;text-transform:none;letter-spacing:0}
thead th.who{min-width:210px}
thead th.n{text-align:center}
tbody td{padding:11px 10px;border-bottom:1px solid var(--border);text-align:left;vertical-align:middle}
tbody td.n{text-align:center}
tbody tr:last-child td{border-bottom:none}
.no{display:inline-block;font-weight:700;font-size:11.5px;color:#fff;background:var(--brand);border-radius:5px;padding:2px 7px;margin-right:8px;vertical-align:1px}
.cn{font-weight:600;font-size:14px}.cp{color:var(--muted);font-size:12px}
.cell{display:inline-flex;align-items:flex-start;gap:8px;text-align:left}
.d{width:13px;height:13px;border-radius:50%;flex:none;margin-top:3px}
.d.ok{background:var(--ok);box-shadow:0 0 0 3px var(--ok-bg)}
.d.warn{background:var(--warn);box-shadow:0 0 0 3px var(--warn-bg)}
.d.bad{background:var(--crit);box-shadow:0 0 0 3px var(--crit-bg)}
.d.grey{background:repeating-linear-gradient(45deg,var(--grey) 0 2px,transparent 2px 4px)}
.t{font-size:13px;color:var(--text);font-weight:600;white-space:nowrap;display:block}
.t2{font-size:11.5px;color:var(--muted);display:block;max-width:190px}
.nil{color:var(--faint)}
.list{background:var(--card);border:1px solid var(--border);border-radius:12px;padding:4px 18px}
.row{display:flex;gap:14px;padding:13px 0;align-items:flex-start}
.row+.row{border-top:1px solid var(--border)}
.pill{flex:none;font-size:11px;font-weight:700;border-radius:5px;padding:2px 8px;margin-top:2px}
.pill.up{background:var(--ok-bg);color:var(--ok)}
.pill.down{background:var(--crit-bg);color:var(--crit)}
.pill.same{background:var(--bg);color:var(--muted)}
.pill.warn{background:var(--warn-bg);color:var(--warn)}
.row p{margin:0}.row b{font-weight:600}
.row small{display:block;color:var(--muted);font-size:12.5px;margin-top:2px}
.foot{color:var(--muted);font-size:12.5px;margin-top:26px;max-width:80ch;line-height:1.8}
.sw{display:inline-block;width:10px;height:10px;border-radius:50%;vertical-align:-1px;margin-right:4px}
.latest{display:inline-block;font-size:11px;font-weight:700;color:var(--ok);background:var(--ok-bg);border-radius:5px;padding:1px 6px;margin-top:3px}
.latest.unk{color:var(--muted);background:var(--bg)}
tr.grp td{background:#fff5f4;font-weight:700;color:var(--text);padding:9px 10px}
tr.grp td span{font-weight:500;color:var(--muted);font-size:12px;margin-left:6px}
.livetag{display:block;font-size:10px;font-weight:700;color:var(--ok);letter-spacing:.04em;margin-top:2px}
.livetag.rec{color:var(--muted)}
.chip{display:inline-block;border:1px solid var(--border);background:var(--card);border-radius:12px;padding:3px 10px;margin:0 6px 6px 0;font-size:12px}
@media(max-width:620px){main{padding:20px 16px 48px}.top{padding:0 16px}h1{font-size:22px}.tabs{display:none}}
`;

const DOT = { red: "bad", orange: "warn", green: "ok", grey: "grey" };

function topBar(active, whenText, signOut) {
const tab = (key, href, label) => `<a class="${active === key ? "on" : ""}" href="${href}">${label}</a>`;
const tabs = active === "matrix"
? `${tab("", "/#clients", "Clients")}${tab("", "/#extensions", "Extensions")}${tab("", "/#nexashare", "NexaShare")}${tab("matrix", "/matrix", "Platform matrix")}`
: `${tab("clients", "#clients", "Clients")}${tab("", "#extensions", "Extensions")}${tab("", "#nexashare", "NexaShare")}${tab("", "#changes", "Changes")}${tab("", "/matrix", "Platform matrix")}`;
return `<header class="top"><div class="logo">G</div><b>Gershon Health</b><nav class="tabs">${tabs}</nav><span class="sp"></span><span class="when">${esc(whenText)}</span>${signOut ? '<a href="/logout">Sign out</a>' : ""}</header>`;
}

function dashboardBody(D, { signOut = true } = {}) {
const when = new Date(D.as_of + "T12:00:00Z").toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
const P = (k) => D.people[k] || {};
const label = (k) => P(k).company || P(k).person || k;
const nameTag = (k, extra) => {
const p = P(k);
const num = p.no ? `<span class="no">${p.no}</span>` : "";
const sub = [p.company ? p.person : null, extra].filter(Boolean).join(" · ");
return `${num}<span class="cn">${esc(label(k))}</span>${sub ? `<div class="cp">${esc(sub)}</div>` : ""}`;
};

const kpis = (D.kpis || []).map((k) =>
`<div class="c"><div class="l">${esc(k.l)}</div><div class="v ${esc(k.cls || "")}">${esc(k.v)}</div><div class="s">${esc(k.s)}</div></div>`).join("");

const cell = (c) => {
if (!c || c[0] === "none") return `<td><span class="nil">—</span></td>`;
return `<td><span class="cell"><span class="d ${DOT[c[0]] || "grey"}"></span><span><span class="t">${esc(c[1])}</span>${c[2] ? `<span class="t2">${esc(c[2])}</span>` : ""}</span></span></td>`;
};
const platforms = (D.platforms || []).map((p) => (typeof p === "string" ? { name: p } : p));
const head = platforms.map((p) => `<th>${esc(p.name)}${p.metric ? `<span class="m">${esc(p.metric)}</span>` : ""}</th>`).join("");
const clientRows = (D.clients || []).map((c) =>
`<tr><td class="who">${nameTag(c.k)}</td>${platforms.map((_, i) => cell(c.cells[i])).join("")}</tr>`).join("");

const nex = (D.nexashare || []).map((n) =>
`<tr><td class="who">${nameTag(n.k)}</td>
<td><span class="cell"><span class="d ${esc(n.cls)}"></span><span class="t">${esc(n.pct)}</span></span></td>
<td class="n"><b>${n.confirmed}</b></td><td class="n">${n.failed}</td><td class="n">${n.companies ?? "—"}</td><td class="n">${n.persons ?? "—"}</td></tr>`).join("");

const X = D.extensions || { apps: [], rows: [] };
const extHead = X.apps.map((a) => `<th>${esc(a.name)}<span class="latest ${a.latest === "—" ? "unk" : ""}">${a.latest === "—" ? "not tracked" : "latest " + esc(a.latest)}</span></th>`).join("");
const extRows = X.rows.map((r) => `<tr><td class="who">${nameTag(r.k)}</td>${X.apps.map((_, i) => cell(r.cells[i])).join("")}</tr>`).join("");

const changes = (D.changes || []).map((c) =>
`<div class="row"><span class="pill ${esc(c.pill)}">${esc(c.label)}</span><p><b>${esc(c.title)}</b><small>${esc(c.detail)}</small></p></div>`).join("");

const newp = (D.newplatforms || []).map((p) =>
`<div class="row"><span class="pill ${p.status === "ok" ? "up" : "warn"}">${p.status === "ok" ? "Checkable" : "Not yet"}</span><p><b>${esc(p.name)}</b><small>${esc(p.note)}</small></p></div>`).join("");

const blind = (D.blind || []).map((b) =>
`<div class="row"><span class="pill same">Blind</span><p><b>${esc(b.name)}</b><small>${esc(b.why)}</small></p></div>`).join("");

return `
${topBar("clients", when + " · read live", signOut)}
<main>
<h1>${esc(D.headline?.h1 || "Client platform health")}</h1>
<p class="lede">${esc(D.headline?.lede || "")}</p>
<div class="cards">${kpis}</div>

<h2 id="clients">Every client, every platform</h2>
<p class="sub">Each column measures what that platform is for. A dash means no account on that platform.</p>
<div class="tablewrap"><table>
<thead><tr><th class="who">Client</th>${head}</tr></thead>
<tbody>${clientRows}</tbody></table></div>

<h2 id="extensions">Extensions — is everyone on the latest?</h2>
<p class="sub">Installed version per person against the latest release. Green = latest, orange = one behind, red = two or more behind, striped = the extension does not report its version.</p>
<div class="tablewrap"><table>
<thead><tr><th class="who">Client</th>${extHead}</tr></thead>
<tbody>${extRows}</tbody></table></div>
<p class="sub" style="margin-top:10px">${esc(X.note || "")}</p>

<h2 id="nexashare">NexaShare, measured properly</h2>
<p class="sub">Confirmed reposts as a share of real attempts over 30 days, and how many distinct companies and people were reposted.</p>
<div class="tablewrap"><table>
<thead><tr><th class="who">Client</th><th>Success</th><th class="n">Confirmed</th><th class="n">Failed</th><th class="n">Companies</th><th class="n">People</th></tr></thead>
<tbody>${nex}</tbody></table></div>
<p class="sub" style="margin-top:10px">${esc(D.nexashare_note || "")}</p>

<h2 id="changes">What changed</h2>
<p class="sub">Only things that actually moved.</p>
<div class="list">${changes}</div>

<h2>Monitoring coverage</h2>
<p class="sub">Whether each platform can be checked without a person opening it.</p>
<div class="list">${newp}${blind}</div>

<p class="foot">
<span class="sw" style="background:var(--ok)"></span>Meeting the objective ·
<span class="sw" style="background:var(--warn)"></span>Running but late or incomplete ·
<span class="sw" style="background:var(--crit)"></span>Switched on and not delivering.<br>
${esc(D.no_account || "")}
</p>
</main>`;
}

function page(title, body) {
return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>${esc(title)}</title><style>${CSS}</style></head><body>${body}</body></html>`;
}

// --- Client Platform Matrix (weekly report, owned by health.gershon.ai) ---
const MATRIX_FN = "https://ggudrgzqleunhaiegyce.supabase.co/functions/v1/client-platform-matrix";
const MATRIX_SECRET = "__MATRIX_SECRET__";
const MATRIX_URL = "https://health.gershon.ai/matrix";

async function matrixData() {
const ctl = new AbortController();
const t = setTimeout(() => ctl.abort(), 25000);
try {
const r = await fetch(MATRIX_FN, { method: "POST", signal: ctl.signal, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ secret: MATRIX_SECRET, format: "json" }) });
const j = await r.json().catch(() => null);
if (!r.ok || !j || !j.ok) throw new Error("matrix source " + r.status + (j && j.error ? " " + j.error : ""));
return j;
} finally { clearTimeout(t); }
}

// A matrix cell: ok true = on the platform, false = not on it, null = platform not connected yet.
const mState = (c) => (c.ok === null ? "grey" : c.ok ? (c.warn ? "warn" : "ok") : "bad");
const mLabel = (c) => (c.ok === null ? "Not connected" : c.ok ? "On" : "Not on");

function matrixGroups(M) {
const groups = [];
for (const r of M.clients) {
let g = groups[groups.length - 1];
if (!g || g.company !== r.company) { g = { company: r.company, flexi: r.flexi_id, rows: [] }; groups.push(g); }
g.rows.push(r);
}
return groups;
}

function matrixSummary(M) {
const people = M.clients.length;
const full = M.full && M.full.length ? ` ${M.full.join(" and ")} ${M.full.length > 1 ? "are" : "is"} on all of them.` : "";
return `${M.companies} clients, ${people} people across ${M.columns.length} platforms.${full}`;
}

function matrixFooter(M) {
const parts = [`Live at send time: ${M.live.join(", ") || "none"}${M.radar_error ? ` (Radar failed: ${M.radar_error})` : ""}.`];
if (M.manual.length) parts.push(`Last recorded: ${M.manual.join("; ")}.`);
if (M.pending.length) parts.push(`Not connected yet: ${M.pending.join(", ")}.`);
return parts.join(" ");
}

function matrixBody(M, { signOut = true } = {}) {
const when = new Date(M.generated_at).toLocaleString("en-US", { timeZone: "America/New_York", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) + " ET · read live";
const head = M.columns.map((c) => `<th class="n">${esc(c.label)}<span class="livetag ${c.live ? "" : "rec"}">${c.live ? "LIVE" : c.pending ? "NOT CONNECTED" : "RECORDED"}</span></th>`).join("");
const cell = (c) => `<td><span class="cell"><span class="d ${mState(c)}"></span><span><span class="t">${mLabel(c)}</span>${c.note ? `<span class="t2">${esc(c.note)}</span>` : ""}</span></span></td>`;
const rows = matrixGroups(M).map((g) =>
`<tr class="grp"><td colspan="${M.columns.length + 1}">${esc(g.company)}${g.flexi ? `<span>${esc(g.flexi)}</span>` : ""}</td></tr>` +
g.rows.map((r) => `<tr><td class="who"><span class="cn">${esc(r.person)}</span><div class="cp">${esc((r.emails || []).join(" · "))}</div></td>${r.cells.map(cell).join("")}</tr>`).join("")).join("");
const chips = (M.social_only || []).map((x) => `<span class="chip">${esc(x)}</span>`).join("");
return `
${topBar("matrix", when, signOut)}
<main>
<h1>Client Platform Matrix</h1>
<p class="lede">${esc(matrixSummary(M))} The same table is emailed to report@gershonconsulting.com every Monday at 9:00 ET.</p>
<h2>Who is on which platform</h2>
<p class="sub">Green = on the platform, orange = on it but the note needs a look, red = not on it, striped = that platform's live feed is not connected yet.</p>
<div class="tablewrap"><table>
<thead><tr><th class="who">Client / person</th>${head}</tr></thead>
<tbody>${rows}</tbody></table></div>
${chips ? `<h2>Other companies tracked in Social</h2><p class="sub">Not clients, listed for reference.</p><div>${chips}</div>` : ""}
<p class="foot">${esc(matrixFooter(M))}</p>
</main>`;
}

function matrixErrorBody(err, { signOut = true } = {}) {
return `${topBar("matrix", "source unreachable", signOut)}<main><h1>Client Platform Matrix</h1><p class="lede">The live data source did not answer: ${esc(err)}. Reload in a minute; the Monday email retries on its own schedule.</p></main>`;
}

// Email version: inline styles only (mail clients ignore <style> and CSS variables).
function matrixEmail(M) {
const C = { brand: "#FE1B04", text: "#1d1d1f", muted: "#6e6e73", border: "#e5e7eb", bg: "#f5f5f7", ok: "#057642", okbg: "#e8f5ee", warn: "#b76b00", warnbg: "#fdf3e1", crit: "#cc1016", critbg: "#fdecec", grey: "#8e8e93", greybg: "#eeeef0" };
const font = `-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif`;
const badge = (c) => {
const s = mState(c);
const [fg, bg, sym] = s === "ok" ? [C.ok, C.okbg, "&#10003;"] : s === "warn" ? [C.warn, C.warnbg, "&#10003;"] : s === "bad" ? [C.crit, C.critbg, "&#10007;"] : [C.grey, C.greybg, "&ndash;"];
const note = c.note ? `<div style="font-size:10px;color:${s === "warn" ? C.warn : C.muted};margin-top:3px;white-space:nowrap">${esc(c.note)}</div>` : "";
return `<td style="padding:8px 4px;border-bottom:1px solid ${C.border};text-align:center;vertical-align:top"><span style="display:inline-block;width:22px;height:22px;line-height:22px;border-radius:11px;background:${bg};color:${fg};font-weight:700;font-size:13px">${sym}</span>${note}</td>`;
};
const head = `<tr><th style="padding:9px 6px;border-bottom:2px solid ${C.border};font-size:11px;text-align:left;color:${C.text};background:${C.bg}">Client / person</th>${M.columns.map((c) =>
`<th style="padding:9px 4px;border-bottom:2px solid ${C.border};font-size:11px;text-align:center;color:${C.text};background:${C.bg}">${esc(c.label)}<div style="font-size:9px;font-weight:700;color:${c.live ? C.ok : C.muted}">${c.live ? "LIVE" : c.pending ? "NOT CONNECTED" : "RECORDED"}</div></th>`).join("")}</tr>`;
const body = matrixGroups(M).map((g) =>
`<tr><td colspan="${M.columns.length + 1}" style="padding:9px 6px;background:#fff5f4;font-weight:700;color:${C.text}">${esc(g.company)} <span style="font-weight:400;font-size:11px;color:${C.muted}">${esc(g.flexi || "")}</span></td></tr>` +
g.rows.map((r) => `<tr><td style="padding:8px 6px;border-bottom:1px solid ${C.border};vertical-align:top"><div style="font-weight:600">${esc(r.person)}</div><div style="font-size:10px;color:${C.muted}">${esc((r.emails || []).join(" · "))}</div></td>${r.cells.map(badge).join("")}</tr>`).join("")).join("");
const chips = (M.social_only || []).map((x) => `<span style="display:inline-block;border:1px solid ${C.border};border-radius:12px;padding:3px 10px;margin:0 6px 6px 0;font-size:12px">${esc(x)}</span>`).join("");
return `<!doctype html><html><body style="margin:0;background:${C.bg};font-family:${font};color:${C.text}">
<div style="max-width:920px;margin:0 auto;padding:20px 10px">
<div style="background:#fff;border:1px solid ${C.border};border-radius:12px;overflow:hidden">
<div style="padding:14px 18px;border-bottom:1px solid ${C.border}"><span style="display:inline-block;width:24px;height:24px;line-height:24px;text-align:center;border-radius:7px;background:${C.brand};color:#fff;font-weight:700;font-size:13px;vertical-align:middle">G</span> <b style="font-size:14px;vertical-align:middle">Gershon Health</b></div>
<div style="padding:18px;overflow-x:auto">
<div style="font-size:22px;font-weight:700;letter-spacing:-.02em">Client Platform Matrix · ${esc(M.period)}</div>
<p style="color:${C.muted};margin:6px 0 16px;font-size:13px">${esc(matrixSummary(M))} <a href="${MATRIX_URL}" style="color:${C.brand};font-weight:600">Open it on health.gershon.ai</a></p>
<table style="border-collapse:collapse;width:100%;font-size:13px;color:${C.text}">${head}${body}</table>
${chips ? `<div style="font-weight:700;margin:20px 0 6px">Other companies tracked in Social</div>${chips}` : ""}
<p style="color:${C.muted};font-size:11px;margin:18px 0 0;line-height:1.6">${esc(matrixFooter(M))} Sent every Monday by health.gershon.ai.</p>
</div></div></div></body></html>`;
}

// --- auth + routing shell (unchanged behaviour from the live build) ---
const PW_HASH = "__PW_HASH__";
const PW_SALT = "gershon-health-v1";
const SIGN_KEY = "__SIGN_KEY__";
const COOKIE = "gh_session";
const SESSION_DAYS = 30;

const enc = new TextEncoder();
const hex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
async function sha256(s) { return hex(await crypto.subtle.digest("SHA-256", enc.encode(s))); }
async function hmac(s) {
const key = await crypto.subtle.importKey("raw", enc.encode(SIGN_KEY), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
return hex(await crypto.subtle.sign("HMAC", key, enc.encode(s)));
}
function safeEq(a, b) { if (a.length !== b.length) return false; let r = 0; for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i); return r === 0; }
async function makeToken() { const exp = Date.now() + SESSION_DAYS * 864e5; return exp + "." + (await hmac(String(exp))); }
async function validToken(t) {
if (!t) return false; const [exp, sig] = t.split(".");
if (!exp || !sig || Number(exp) < Date.now()) return false;
return safeEq(sig, await hmac(exp));
}
function getCookie(req, name) {
const c = req.headers.get("Cookie") || ""; const m = c.match(new RegExp("(?:^|; )" + name + "=([^;]*)"));
return m ? decodeURIComponent(m[1]) : null;
}
const SEC = { "Content-Type": "text/html; charset=utf-8", "X-Frame-Options": "DENY", "Referrer-Policy": "no-referrer", "X-Robots-Tag": "noindex, nofollow", "Cache-Control": "no-store" };
const JSONH = { "Content-Type": "application/json", "Cache-Control": "no-store" };

const LOGIN_CSS = `.login{max-width:360px;margin:12vh auto;background:var(--card);border:1px solid var(--border);border-radius:12px;padding:28px}
.login h1{font-size:18px;margin:12px 0 4px}.login p{color:var(--muted);margin:0 0 16px}
.login input{width:100%;padding:10px 12px;border:1px solid var(--border);border-radius:8px;font:inherit;margin-bottom:12px}
.login button{width:100%;padding:10px;border:0;border-radius:8px;background:var(--brand);color:#fff;font-weight:600;cursor:pointer}
.err{color:var(--crit);font-size:13px;margin-bottom:10px}`;

function shellPage(title, body) {
return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>${esc(title)}</title><style>${CSS}${LOGIN_CSS}</style></head><body>${body}</body></html>`;
}
function loginPage(error) {
return shellPage("Gershon Health — Sign in", `<form class="login" method="post" action="/login"><div class="logo">G</div><h1>Gershon Health</h1><p>Client platform health</p>${error ? `<div class="err">${esc(error)}</div>` : ""}<input type="email" name="email" placeholder="Email" required autocomplete="username"><input type="password" name="password" placeholder="Password" required autocomplete="current-password"><button type="submit">Sign in</button></form>`);
}
function setupPage(error) {
return shellPage("Gershon Health — Create account", `<form class="login" method="post" action="/setup"><div class="logo">G</div><h1>Create your account</h1><p>First visit: choose the email and password you will sign in with.</p>${error ? `<div class="err">${esc(error)}</div>` : ""}<input type="text" name="code" placeholder="Setup code" required autocomplete="off"><input type="email" name="email" placeholder="Email" required autocomplete="username"><input type="password" name="password" placeholder="Choose a password (10+ characters)" required minlength="10" autocomplete="new-password"><button type="submit">Create account</button></form>`);
}
async function pbkdf2(pw, saltHex) {
const key = await crypto.subtle.importKey("raw", enc.encode(pw), "PBKDF2", false, ["deriveBits"]);
const salt = Uint8Array.from(saltHex.match(/../g).map((h) => parseInt(h, 16)));
return hex(await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt, iterations: 100000 }, key, 256));
}
async function getUsers(env) {
if (!env || !env.AUTH_KV) return null;
try { return JSON.parse((await env.AUTH_KV.get("users")) || "[]"); } catch { return []; }
}

// Weekly report endpoint — called by pg_cron, not by people. Secret-protected.
async function matrixReport(req) {
if (req.method !== "POST") return new Response(JSON.stringify({ ok: false, error: "POST only" }), { status: 405, headers: JSONH });
let b = {};
try { b = await req.json(); } catch { /* empty */ }
if (typeof b.secret !== "string" || !safeEq(b.secret, MATRIX_SECRET)) return new Response(JSON.stringify({ ok: false, error: "unauthorized" }), { status: 401, headers: JSONH });
if (b.testTo && !/^[^@\s]+@gershonconsulting\.com$/i.test(String(b.testTo))) return new Response(JSON.stringify({ ok: false, error: "testTo must be an @gershonconsulting.com address" }), { status: 400, headers: JSONH });
let M;
try { M = await matrixData(); } catch (e) { return new Response(JSON.stringify({ ok: false, error: String(e) }), { status: 502, headers: JSONH }); }
const html = matrixEmail(M);
if (b.dry) return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } });
const r = await fetch(MATRIX_FN, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ secret: MATRIX_SECRET, subject: `Client Platform Matrix · ${M.period}`, html, testTo: b.testTo || undefined }) });
const out = await r.json().catch(() => ({ ok: false, error: "relay " + r.status }));
return new Response(JSON.stringify({ ...out, source: "health.gershon.ai", people: M.clients.length, platforms: M.columns.length }), { status: out.ok ? 200 : 502, headers: JSONH });
}

export default {
async fetch(req, env) {
const url = new URL(req.url);
if (url.hostname === "health.gershoncrm.com") return Response.redirect("https://health.gershon.ai" + url.pathname + url.search, 301);
if (url.pathname === "/api/matrix-report") return matrixReport(req);
const users = await getUsers(env);
if (url.pathname === "/api/health") {
return new Response(JSON.stringify({ ok: true, service: "gershon-health", data_as_of: DATA.as_of, auth_storage: users !== null, accounts: users ? users.length : 0, features: ["dashboard", "matrix", "matrix-report"] }), { headers: JSONH });
}
if (url.pathname === "/robots.txt") return new Response("User-agent: *\nDisallow: /\n");
const signedIn = async () => { const t = await makeToken(); return new Response(null, { status: 303, headers: { Location: "/", "Set-Cookie": `${COOKIE}=${t}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${SESSION_DAYS * 86400}` } }); };
const setupOpen = users !== null && users.length === 0;
if (url.pathname === "/setup") {
if (!setupOpen) return new Response(null, { status: 303, headers: { Location: "/" } });
if (req.method !== "POST") return new Response(setupPage(), { headers: SEC });
const f = await req.formData();
const code = String(f.get("code") || "").trim(), email = String(f.get("email") || "").trim().toLowerCase(), pw = String(f.get("password") || "");
if (!safeEq(await sha256(PW_SALT + code), PW_HASH)) return new Response(setupPage("Wrong setup code."), { status: 401, headers: SEC });
if (pw.length < 10 || !email.includes("@")) return new Response(setupPage("Use a valid email and a password of 10+ characters."), { status: 400, headers: SEC });
const salt = hex(crypto.getRandomValues(new Uint8Array(16)));
await env.AUTH_KV.put("users", JSON.stringify([{ email, salt, hash: await pbkdf2(pw, salt), created: new Date().toISOString() }]));
return signedIn();
}
if (url.pathname === "/login" && req.method === "POST") {
const form = await req.formData();
const email = String(form.get("email") || "").trim().toLowerCase(), pw = String(form.get("password") || "");
if (users && users.length) {
const u = users.find((x) => x.email === email);
if (u && safeEq(await pbkdf2(pw, u.salt), u.hash)) return signedIn();
} else if (safeEq(await sha256(PW_SALT + pw), PW_HASH)) {
return signedIn();
}
return new Response(loginPage("Wrong email or password."), { status: 401, headers: SEC });
}
if (url.pathname === "/logout") {
return new Response(null, { status: 303, headers: { Location: "/", "Set-Cookie": `${COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0` } });
}
const authed = await validToken(getCookie(req, COOKIE));
if (!authed) {
if (setupOpen) return new Response(null, { status: 303, headers: { Location: "/setup" } });
return new Response(loginPage(), { status: 401, headers: SEC });
}
if (url.pathname === "/api/data") return new Response(JSON.stringify(DATA), { headers: JSONH });
if (url.pathname === "/api/matrix") {
try { return new Response(JSON.stringify(await matrixData()), { headers: JSONH }); }
catch (e) { return new Response(JSON.stringify({ ok: false, error: String(e) }), { status: 502, headers: JSONH }); }
}
if (url.pathname === "/matrix") {
try { return new Response(page("Client Platform Matrix — Gershon Health", matrixBody(await matrixData())), { headers: SEC }); }
catch (e) { return new Response(page("Client Platform Matrix — Gershon Health", matrixErrorBody(String(e))), { status: 502, headers: SEC }); }
}
return new Response(page("Gershon Health", dashboardBody(DATA)), { headers: SEC });
},
};
