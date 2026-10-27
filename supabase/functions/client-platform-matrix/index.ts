// task.gershoncrm.com — client-platform-matrix edge function.
// Weekly report (Mondays 13:00 UTC = 9:00 ET): which client / person is on which Gershon platform.
// Columns come from table client_platform_columns (add a row to add a platform — no redeploy).
//   endpoint set       -> live: POST {secret, people} to the app's /api/matrix-stats at send time
//                         (shared contract, see README.md next to this file)
//   key = 'radar'      -> live: radar project RPC client_platform_stats
//   source = 'manual'  -> last recorded value (cells jsonb, then legacy boolean columns)
//   source = 'pending' -> live feed not connected yet; shown grey unless a value is in cells jsonb
// When a live feed fails, the column falls back to the last recorded value and says so.
// After a real (non-dry) send, every live value is written back into cells jsonb with
// as_of = today, so the fallback is never older than one week.
// Every column gets a "source + freshness" line under the table.
// Fired by pg_cron job "client-platform-matrix-weekly".
// POST body: { secret, dry?: true (returns HTML, no send, no write-back), testTo?: "x@y" }
//
// v5 (2026-10-27): source + freshness footer per column, live write-back, as_of from feeds,
// stale-manual warning (> 14 days). Source of truth for this function is now this repo.

const SB_URL = Deno.env.get("SUPABASE_URL")!;
const SB_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const CRON_SECRET = "cpm_3bf7bdc1b4f4786443748448";
const RADAR_URL = "https://pkzeeqehwmtnqxdpdesl.supabase.co";
const TO = ["report@gershonconsulting.com"];
const FROM = "GC Client Matrix <reports@gershon.ai>";
const REPLY_TO = "olivier@gershonconsulting.com";
const BOARD_URL = "https://claude.ai/artifact/DDt25fD7PZWRb354e4hMPY";
const LEGACY = new Set(["social", "linalysis", "nexashare", "pulse"]);
const STALE_DAYS = 14;

const H = { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` };
const json = (o: unknown, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { "Content-Type": "application/json" } });
async function rest(path: string) {
  const r = await fetch(`${SB_URL}/rest/v1/${path}`, { headers: H });
  if (!r.ok) throw new Error(path + " " + r.status);
  return r.json();
}
async function cfg(key: string) {
  const b = await rest(`cc_health_config?key=eq.${encodeURIComponent(key)}&select=value&limit=1`);
  return b.length ? b[0].value as string : null;
}
const esc = (s: unknown) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));
const lc = (s: string) => (s || "").toLowerCase().trim();
const today = () => new Date().toISOString().slice(0, 10);
const daysSince = (ymd: string) => ymd ? Math.floor((Date.now() - Date.parse(ymd.slice(0, 10) + "T00:00:00Z")) / 86400000) : null;
const hostOf = (u: string) => { try { return new URL(u).host; } catch (_) { return u; } };
type Cell = { ok: boolean | null; note?: string; warn?: boolean };
const warnRe = /never|no scan|no sync|0 collected|red|idle/;
const cellOf = (ok: boolean, note?: string | null): Cell => ({ ok, note: note || undefined, warn: warnRe.test(note || "") });

function mark(c: Cell) {
  const td = (inner: string) => `<td style="padding:8px 4px;border-bottom:1px solid #dfe5ee;text-align:center">${inner}</td>`;
  const note = c.note ? `<div style="font-size:10px;color:${c.warn ? "#9a6a00" : "#5d6b80"};margin-top:2px;white-space:nowrap">${esc(c.note)}</div>` : "";
  if (c.ok === null) return td(`<span style="display:inline-block;width:22px;height:22px;line-height:22px;border-radius:11px;background:#eef1f5;color:#9aa5b5;font-weight:700;font-size:13px">&ndash;</span>${note}`);
  const bg = c.ok ? "#e3f5ea" : "#fbe7e5", fg = c.ok ? "#138a4b" : "#c4352b";
  return td(`<span style="display:inline-block;width:22px;height:22px;line-height:22px;border-radius:11px;background:${bg};color:${fg};font-weight:700;font-size:13px">${c.ok ? "&#10003;" : "&#10007;"}</span>${note}`);
}

function weekLabel() {
  const ny = new Date(new Date().toLocaleString("en-US", { timeZone: "America/New_York" }));
  ny.setDate(ny.getDate() - ((ny.getDay() + 6) % 7));
  return "week of " + ny.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

Deno.serve(async (req) => {
  let body: any = {};
  try { body = await req.json(); } catch (_) { /* empty */ }
  if (body?.secret !== CRON_SECRET) return json({ ok: false, error: "unauthorized" }, 401);

  try {
    const cols: any[] = await rest("client_platform_columns?active=eq.true&select=*&order=sort.asc");
    const rows: any[] = await rest("client_platform_matrix?select=*&order=sort.asc");
    const sentAt = new Date();

    let radar: any[] = [];
    let radarErr = "";
    try {
      const anon = await cfg("radar_anon_key");
      const sec = await cfg("radar_stats_secret");
      const r = await fetch(`${RADAR_URL}/rest/v1/rpc/client_platform_stats`, {
        method: "POST",
        headers: { apikey: anon!, Authorization: `Bearer ${anon}`, "Content-Type": "application/json" },
        body: JSON.stringify({ p_secret: sec }),
      });
      if (!r.ok) throw new Error("radar " + r.status);
      radar = await r.json();
    } catch (e) { radarErr = String(e); }
    const radarBy = new Map(radar.map((u: any) => [lc(u.email), u]));

    // Live per-app feeds: POST {secret, people} to each column's endpoint.
    const mSecret = await cfg("matrix_stats_secret");
    const people = rows.filter((r) => r.section === "client").map((r) => ({ key: String(r.id), company: r.company, emails: r.emails || [] }));
    const liveBy: Record<string, Map<string, any>> = {};
    const liveErr: Record<string, string> = {};
    const liveAsOf: Record<string, string> = {};
    let socialOthers: string[] | null = null;
    await Promise.all(cols.filter((c) => c.endpoint).map(async (c) => {
      try {
        const ctl = new AbortController();
        const t = setTimeout(() => ctl.abort(), 15000);
        const r = await fetch(c.endpoint, { method: "POST", signal: ctl.signal, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ secret: mSecret, people }) });
        clearTimeout(t);
        const j = await r.json().catch(() => null);
        if (!r.ok || !j?.ok || !Array.isArray(j.results)) throw new Error(`HTTP ${r.status}`);
        liveBy[c.key] = new Map(j.results.map((x: any) => [String(x.key), x]));
        liveAsOf[c.key] = typeof j.as_of === "string" ? j.as_of : sentAt.toISOString();
        if (c.key === "social" && Array.isArray(j.others)) socialOthers = j.others;
      } catch (e) { liveErr[c.key] = String(e).replace(/^Error: /, "").slice(0, 60); }
    }));

    const isLive = (c: any) => (c.key === "radar" && !radarErr) || !!liveBy[c.key];

    const recorded = (r: any, col: any): Cell | null => {
      const c = (r.cells || {})[col.key];
      if (c && typeof c.ok === "boolean") return cellOf(c.ok, c.note);
      if (LEGACY.has(col.key)) return cellOf(!!r[col.key], r[col.key + "_note"]);
      return null;
    };

    const cellFor = (r: any, col: any): Cell => {
      if (liveBy[col.key]) {
        const x = liveBy[col.key].get(String(r.id));
        return x ? cellOf(!!x.ok, x.note) : { ok: false };
      }
      if (col.key === "radar") {
        if (radarErr) return { ok: false, note: "Radar unreachable", warn: true };
        const ru = (r.emails || []).map(lc).map((e: string) => radarBy.get(e)).find(Boolean);
        if (!ru) return { ok: false };
        return Number(ru.targets) > 0 ? { ok: true, note: `${Number(ru.targets).toLocaleString("en-US")} profiles` } : { ok: true, note: "0 collected", warn: true };
      }
      const rec = recorded(r, col);
      if (!rec) return { ok: null };
      // A failed live feed falls back to the last recorded value, flagged.
      return liveErr[col.key] ? { ...rec, note: (rec.note ? rec.note + " " : "") + "(recorded)", warn: true } : rec;
    };

    const clients = rows.filter((r) => r.section === "client").map((r) => ({ ...r, cellsOut: cols.map((c) => cellFor(r, c)) }));
    const socialOnly: string[] = socialOthers ?? rows.filter((r) => r.section === "social_only").map((r) => r.company);

    // ---- source + freshness, one line per column -------------------------------------
    const asOfCol = (k: string) => rows.reduce((m: string, r: any) => {
      const d = r.cells?.[k]?.as_of || (LEGACY.has(k) ? r.manual_as_of : "") || "";
      return d > m ? d : m;
    }, "");
    const sendTime = sentAt.toISOString().slice(0, 16).replace("T", " ") + " UTC";
    const sourceLine = (c: any): { label: string; text: string; tone: "live" | "manual" | "stale" | "none" } => {
      if (c.key === "radar") {
        return radarErr
          ? { label: c.label, text: `Live feed failed (${radarErr}); no recorded fallback`, tone: "stale" }
          : { label: c.label, text: `Live · Radar Supabase RPC client_platform_stats · read ${sendTime}`, tone: "live" };
      }
      if (liveBy[c.key]) {
        const at = liveAsOf[c.key].slice(0, 16).replace("T", " ") + " UTC";
        return { label: c.label, text: `Live · ${hostOf(c.endpoint)}/api/matrix-stats · read ${at}`, tone: "live" };
      }
      const asOf = asOfCol(c.key);
      const age = daysSince(asOf);
      if (!asOf) return { label: c.label, text: c.endpoint ? `Live feed failed (${liveErr[c.key] || "no answer"}); nothing recorded yet` : "Not connected yet; nothing recorded", tone: "none" };
      const ageTxt = age === null ? "" : age === 0 ? " (today)" : ` (${age} day${age === 1 ? "" : "s"} old)`;
      const stale = age !== null && age > STALE_DAYS;
      if (c.endpoint) return { label: c.label, text: `Live feed failed (${liveErr[c.key] || "no answer"}) · showing last recorded ${asOf}${ageTxt}`, tone: "stale" };
      return { label: c.label, text: `Manual · last recorded ${asOf}${ageTxt}${stale ? " — stale" : ""}`, tone: stale ? "stale" : "manual" };
    };
    const sources = cols.map(sourceLine);
    const toneColor = { live: "#138a4b", manual: "#5d6b80", stale: "#9a6a00", none: "#9aa5b5" };

    const period = weekLabel();
    const companies = [...new Set(clients.map((r) => r.company))];
    const full = companies.filter((co) => cols.every((_, i) => clients.some((r) => r.company === co && r.cellsOut[i].ok === true)));
    const liveCount = cols.filter(isLive).length;

    const head = `<tr>${[{ label: "Client / person" }, ...cols].map((h: any, i: number) =>
      `<th style="padding:8px 4px;border-bottom:2px solid #dfe5ee;font-size:11px;text-align:${i ? "center" : "left"};color:#152033">${esc(h.label)}${h.key ? (isLive(h) ? '<div style="font-size:9px;color:#138a4b;font-weight:600">LIVE</div>' : '<div style="font-size:9px;color:#9aa5b5;font-weight:600">RECORDED</div>') : ""}</th>`).join("")}</tr>`;
    let rowsHtml = "", last = "";
    for (const r of clients) {
      if (r.company !== last) {
        rowsHtml += `<tr><td colspan="${cols.length + 1}" style="padding:8px 6px;background:#fdf2f2;font-weight:800;color:#a8281f">${esc(r.company)} <span style="font-weight:400;font-size:11px;color:#5d6b80">${esc(r.flexi_id || "")}</span></td></tr>`;
        last = r.company;
      }
      rowsHtml += `<tr><td style="padding:8px 6px;border-bottom:1px solid #dfe5ee"><div style="font-weight:600">${esc(r.person)}</div><div style="font-size:10px;color:#5d6b80">${esc((r.emails || []).join(" · "))}</div></td>${r.cellsOut.map(mark).join("")}</tr>`;
    }
    const chips = (xs: string[]) => xs.map((x) => `<span style="display:inline-block;border:1px solid #dfe5ee;border-radius:12px;padding:3px 10px;margin:0 6px 6px 0;font-size:12px">${esc(x)}</span>`).join("");
    const sourcesHtml = `<div style="font-weight:800;margin:20px 0 6px;color:#152033;font-size:13px">Source and freshness</div>
<table style="border-collapse:collapse;width:100%;font-size:11px">${sources.map((s) =>
      `<tr><td style="padding:3px 8px 3px 0;font-weight:700;color:#152033;white-space:nowrap;vertical-align:top">${esc(s.label)}</td><td style="padding:3px 0;color:${toneColor[s.tone]}">${esc(s.text)}</td></tr>`).join("")}</table>`;

    const html = `<!doctype html><html><body style="margin:0;background:#f5f7fa;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif">
<div style="max-width:900px;margin:0 auto;padding:20px 10px">
<div style="background:#fff;border:1px solid #dfe5ee;border-radius:12px;padding:18px;overflow-x:auto">
<div style="font-size:22px;font-weight:800;color:#152033">Client Platform Matrix · ${esc(period)}</div>
<p style="color:#5d6b80;margin:6px 0 14px;font-size:13px">${companies.length} clients, ${clients.length} people across ${cols.length} platforms (${liveCount} live).${full.length ? ` <b style="color:#152033">${full.map(esc).join(" and ")}</b> ${full.length > 1 ? "are" : "is"} on all of them.` : ""} <a href="${BOARD_URL}" style="color:#CC3333">Open the live board</a></p>
<table style="border-collapse:collapse;width:100%;font-size:13px;color:#152033">${head}${rowsHtml}</table>
${sourcesHtml}
${socialOnly.length ? `<div style="font-weight:800;margin:20px 0 6px">Other companies tracked in Social</div>${chips(socialOnly)}` : ""}
<p style="color:#8a96a8;font-size:11px;margin:18px 0 0;line-height:1.5">Sent every Monday by task.gershoncrm.com.</p>
</div></div></body></html>`;

    if (body.dry) return new Response(html, { headers: { "Content-Type": "text/html" } });

    const key = await cfg("resend_api_key");
    if (!key) return json({ ok: false, error: "no resend key" });
    const to = body.testTo ? [body.testTo] : TO;
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: FROM, to, reply_to: REPLY_TO, subject: `Client Platform Matrix · ${period}`, html }),
    });
    const out = await r.json().catch(() => ({}));
    if (!r.ok) return json({ ok: false, error: "resend " + r.status, out });

    // Write live values back into cells so next week's fallback is at most 7 days old.
    // Only on a real weekly send (not dry, not testTo). Failures here never fail the send.
    let writeBack = 0;
    if (!body.testTo) {
      const liveKeys = Object.keys(liveBy);
      await Promise.all(clients.map(async (row) => {
        if (!liveKeys.length) return;
        const cells = { ...(row.cells || {}) };
        for (const k of liveKeys) {
          const x = liveBy[k].get(String(row.id));
          if (x) cells[k] = { ok: !!x.ok, note: x.note || null, as_of: today(), source: "live" };
        }
        try {
          const w = await fetch(`${SB_URL}/rest/v1/client_platform_matrix?id=eq.${row.id}`, {
            method: "PATCH",
            headers: { ...H, "Content-Type": "application/json", Prefer: "return=minimal" },
            body: JSON.stringify({ cells }),
          });
          if (w.ok) writeBack++;
        } catch (_) { /* ignore */ }
      }));
    }
    return json({ ok: true, id: out.id, to, people: clients.length, platforms: cols.length, live: cols.filter(isLive).map((c) => c.key), failed: liveErr, radar: radarErr || radar.length, writeBack });
  } catch (e) {
    return json({ ok: false, error: String(e) }, 200);
  }
});
