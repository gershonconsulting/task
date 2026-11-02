// client-platform-matrix edge function (task project) — DATA ENGINE for health.gershon.ai.
// Since 2026-11-02 the Client Platform Matrix report is a feature of health.gershon.ai:
// health.gershon.ai/api/matrix-report builds the email and the /matrix page; this function
// supplies the live data (it holds the per-app secrets) and relays the send through Resend.
// Columns come from table client_platform_columns (add a row to add a platform — no redeploy).
//   source = 'live'    -> read at send time (Radar via radar project RPC client_platform_stats, or the column's endpoint)
//   source = 'manual'  -> last recorded value (legacy boolean columns or cells jsonb)
//   source = 'pending' -> live feed not connected yet; shown grey unless a value is in cells jsonb
// POST body: { secret, format?: "json" }                         -> structured data for health.gershon.ai
//            { secret, html, subject, testTo? }                  -> send health.gershon.ai's email (relay)
//            { secret, dry?: true, testTo? }                     -> legacy self-built email (kept as fallback)

const SB_URL = Deno.env.get("SUPABASE_URL")!;
const SB_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const CRON_SECRET = "cpm_3bf7bdc1b4f4786443748448";
const RADAR_URL = "https://pkzeeqehwmtnqxdpdesl.supabase.co";
const TO = ["report@gershonconsulting.com"];
const FROM = "GC Client Matrix <reports@gershon.ai>";
const FROM_HEALTH = "GC Health <reports@gershon.ai>";
const REPLY_TO = "olivier@gershonconsulting.com";
const BOARD_URL = "https://health.gershon.ai/matrix";
const LEGACY = new Set(["social", "linalysis", "nexashare", "pulse"]);

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
type Cell = { ok: boolean | null; note?: string; warn?: boolean };
const warnRe = /never|no scan|0 collected|red/;
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

async function sendMail(to: string[], subject: string, html: string, from: string) {
  const key = await cfg("resend_api_key");
  if (!key) return json({ ok: false, error: "no resend key" });
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to, reply_to: REPLY_TO, subject, html }),
  });
  const out = await r.json().catch(() => ({}));
  if (!r.ok) return json({ ok: false, error: "resend " + r.status, out });
  return json({ ok: true, id: (out as any).id, to });
}

Deno.serve(async (req) => {
  let body: any = {};
  try { body = await req.json(); } catch (_) { /* empty */ }
  if (body?.secret !== CRON_SECRET) return json({ ok: false, error: "unauthorized" }, 401);

  // Relay: health.gershon.ai built the email; this function only sends it.
  if (typeof body.html === "string" && typeof body.subject === "string") {
    const to = body.testTo ? [String(body.testTo)] : TO;
    return sendMail(to, body.subject.slice(0, 200), body.html, FROM_HEALTH);
  }

  try {
    const cols: any[] = await rest("client_platform_columns?active=eq.true&select=*&order=sort.asc");
    const rows: any[] = await rest("client_platform_matrix?select=*&order=sort.asc");

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
    let socialOthers: string[] | null = null;
    await Promise.all(cols.filter((c) => c.endpoint).map(async (c) => {
      try {
        const ctl = new AbortController();
        const t = setTimeout(() => ctl.abort(), 15000);
        const r = await fetch(c.endpoint, { method: "POST", signal: ctl.signal, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ secret: mSecret, people }) });
        clearTimeout(t);
        const j = await r.json().catch(() => null);
        if (!r.ok || !j?.ok || !Array.isArray(j.results)) throw new Error(`${r.status}`);
        liveBy[c.key] = new Map(j.results.map((x: any) => [String(x.key), x]));
        if (c.key === "social" && Array.isArray(j.others)) socialOthers = j.others;
      } catch (e) { liveErr[c.key] = String(e); }
    }));

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
      const stale = liveErr[col.key] ? " (recorded)" : "";
      const c = (r.cells || {})[col.key];
      if (c && typeof c.ok === "boolean") return { ...cellOf(c.ok, (c.note || "") + stale), warn: !!stale || warnRe.test(c.note || "") };
      if (LEGACY.has(col.key)) return { ...cellOf(!!r[col.key], (r[col.key + "_note"] || "") + stale), warn: !!stale };
      return { ok: null };
    };

    const clients = rows.filter((r) => r.section === "client").map((r) => ({ ...r, cellsOut: cols.map((c) => cellFor(r, c)) }));
    const socialOnly: string[] = socialOthers ?? rows.filter((r) => r.section === "social_only").map((r) => r.company);

    const period = weekLabel();
    const companies = [...new Set(clients.map((r) => r.company))];
    const full = companies.filter((co) => cols.every((_, i) => clients.some((r) => r.company === co && r.cellsOut[i].ok === true)));
    const isLive = (c: any) => (c.key === "radar" && !radarErr) || !!liveBy[c.key];
    const live = cols.filter(isLive).map((c) => c.label);
    const asOfCol = (k: string) => rows.reduce((m: string, r: any) => { const d = r.cells?.[k]?.as_of || r.manual_as_of || ""; return d > m ? d : m; }, "");
    const manual = cols.filter((c) => !isLive(c) && c.source !== "pending").map((c) => `${c.label} as of ${asOfCol(c.key)}` + (liveErr[c.key] ? " (live feed failed)" : ""));
    const pending = cols.filter((c) => c.source === "pending").map((c) => c.label);

    if (body.format === "json") {
      return json({
        ok: true,
        generated_at: new Date().toISOString(),
        period,
        columns: cols.map((c) => ({ key: c.key, label: c.label, live: isLive(c), pending: c.source === "pending" })),
        clients: clients.map((r) => ({ company: r.company, flexi_id: r.flexi_id || null, person: r.person, emails: r.emails || [], cells: r.cellsOut })),
        companies: companies.length,
        full,
        social_only: socialOnly,
        live,
        manual,
        pending,
        radar_error: radarErr || null,
        live_errors: liveErr,
      });
    }

    const head = `<tr>${[{ label: "Client / person" }, ...cols].map((h: any, i: number) =>
      `<th style="padding:8px 4px;border-bottom:2px solid #dfe5ee;font-size:11px;text-align:${i ? "center" : "left"};color:#152033">${esc(h.label)}${h.key && isLive(h) ? '<div style="font-size:9px;color:#138a4b;font-weight:600">LIVE</div>' : ""}</th>`).join("")}</tr>`;
    let rowsHtml = "", last = "";
    for (const r of clients) {
      if (r.company !== last) {
        rowsHtml += `<tr><td colspan="${cols.length + 1}" style="padding:8px 6px;background:#fdf2f2;font-weight:800;color:#a8281f">${esc(r.company)} <span style="font-weight:400;font-size:11px;color:#5d6b80">${esc(r.flexi_id || "")}</span></td></tr>`;
        last = r.company;
      }
      rowsHtml += `<tr><td style="padding:8px 6px;border-bottom:1px solid #dfe5ee"><div style="font-weight:600">${esc(r.person)}</div><div style="font-size:10px;color:#5d6b80">${esc((r.emails || []).join(" · "))}</div></td>${r.cellsOut.map(mark).join("")}</tr>`;
    }
    const chips = (xs: string[]) => xs.map((x) => `<span style="display:inline-block;border:1px solid #dfe5ee;border-radius:12px;padding:3px 10px;margin:0 6px 6px 0;font-size:12px">${esc(x)}</span>`).join("");

    const html = `<!doctype html><html><body style="margin:0;background:#f5f7fa;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif">
<div style="max-width:900px;margin:0 auto;padding:20px 10px">
<div style="background:#fff;border:1px solid #dfe5ee;border-radius:12px;padding:18px;overflow-x:auto">
<div style="font-size:22px;font-weight:800;color:#152033">Client Platform Matrix · ${esc(period)}</div>
<p style="color:#5d6b80;margin:6px 0 14px;font-size:13px">${companies.length} clients, ${clients.length} people across ${cols.length} platforms.${full.length ? ` <b style="color:#152033">${full.map(esc).join(" and ")}</b> ${full.length > 1 ? "are" : "is"} on all of them.` : ""} <a href="${BOARD_URL}" style="color:#CC3333">Open the live board</a></p>
<table style="border-collapse:collapse;width:100%;font-size:13px;color:#152033">${head}${rowsHtml}</table>
${socialOnly.length ? `<div style="font-weight:800;margin:20px 0 6px">Other companies tracked in Social</div>${chips(socialOnly)}` : ""}
<p style="color:#8a96a8;font-size:11px;margin:18px 0 0;line-height:1.5">Live at send time: ${esc(live.join(", ") || "none")}${radarErr ? " (Radar failed: " + esc(radarErr) + ")" : ""}. Last recorded: ${esc(manual.join("; ") || "none")}${pending.length ? ". Not connected yet (shown as &ndash;): " + esc(pending.join(", ")) : ""}. Fallback copy sent by the task database.</p>
</div></div></body></html>`;

    if (body.dry) return new Response(html, { headers: { "Content-Type": "text/html" } });
    const to = body.testTo ? [body.testTo] : TO;
    return sendMail(to, `Client Platform Matrix · ${period}`, html, FROM);
  } catch (e) {
    return json({ ok: false, error: String(e) }, 200);
  }
});
