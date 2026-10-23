const $ = (s, r = document) => r.querySelector(s);
const esc = (t) => String(t).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const KEY = "preppilot_state_v1";
let state = { fav: [], done: [], sessions: [] };
try { state = { ...state, ...JSON.parse(localStorage.getItem(KEY) || "{}") }; } catch (e) { /* use defaults */ }
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { toast("Browser storage is unavailable; progress won't be saved."); } };
function toast(msg) { const t = $("#toast"); t.textContent = msg; t.classList.add("show"); setTimeout(() => t.classList.remove("show"), 2200); }

// ---- Demo evaluator: rule-based, NOT a real AI model ----
function evaluate(q, answer) {
  const a = answer.toLowerCase();
  const words = answer.trim().split(/\s+/).filter(Boolean).length;
  const hits = q.kw.filter((k) => a.includes(k));
  const sentences = answer.split(/[.!?]/).filter((s) => s.trim().length > 10).length;
  const example = /(for example|e\.g\.|because|such as|for instance)/.test(a);
  const kwS = hits.length / q.kw.length, lenS = Math.min(words / 60, 1);
  const stS = (example ? 0.5 : 0) + (sentences >= 3 ? 0.5 : 0);
  let score = Math.round(100 * (0.5 * kwS + 0.3 * lenS + 0.2 * stS));
  if (words < 5) score = Math.min(score, 10);
  const strengths = [];
  if (hits.length) strengths.push(`Covers key concepts: ${hits.join(", ")}.`);
  if (example) strengths.push("Uses an example or reasoning to support the point.");
  if (words >= 40) strengths.push("Answer has good depth.");
  const tips = [];
  if (hits.length < q.kw.length) tips.push(`Mention missing concepts: ${q.kw.filter((k) => !hits.includes(k)).join(", ")}.`);
  if (words < 40) tips.push("Expand the answer to about 40–80 words.");
  if (!example) tips.push("Add a concrete example.");
  if (sentences < 3) tips.push("Structure it in at least three clear sentences.");
  return { score, strengths: strengths.length ? strengths : ["Attempted the question."], tips: tips.length ? tips : ["Great answer. Practice saying it aloud."] };
}
const li = (a, c) => `<ul>${a.map((x) => `<li class="${c}">${esc(x)}</li>`).join("")}</ul>`;
const DEMO = '<span class="tag demo">Demo evaluation · rule-based, not AI</span>';

// ---- Navigation ----
function show(v) {
  document.querySelectorAll(".view").forEach((s) => s.classList.toggle("hidden", s.id !== v));
  document.querySelectorAll("nav button").forEach((b) => b.classList.toggle("active", b.dataset.view === v));
  ({ home: () => window.scrollTo(0, 0), dashboard: renderDashboard, interview: renderSetup, bank: renderBank, evaluator: renderEvaluator })[v]();
}
document.querySelectorAll("nav button").forEach((b) => b.addEventListener("click", () => show(b.dataset.view)));
$("#reset").addEventListener("click", () => { if (confirm("Delete all saved progress on this browser?")) { state = { fav: [], done: [], sessions: [] }; save(); show("dashboard"); toast("Data reset."); } });

// ---- Dashboard ----
function streak() {
  const days = new Set(state.sessions.map((s) => s.date.slice(0, 10)));
  let n = 0; const d = new Date();
  while (days.has(d.toISOString().slice(0, 10))) { n++; d.setDate(d.getDate() - 1); }
  return n;
}
function renderDashboard() {
  const s = state.sessions, avg = s.length ? Math.round(s.reduce((t, x) => t + x.avg, 0) / s.length) : 0;
  const last = s.slice(-7);
  const chart = last.length ? `<svg viewBox="0 0 ${last.length * 50} 130" style="width:100%;max-height:170px">${last.map((x, i) => `<rect x="${i * 50 + 8}" y="${110 - x.avg}" width="34" height="${x.avg}" rx="6" fill="#7c5cff"/><text x="${i * 50 + 25}" y="${104 - x.avg}" font-size="11" text-anchor="middle" fill="#93a0c4">${x.avg}</text>`).join("")}</svg>` : `<div class="empty">Complete a mock interview to see your score trend.</div>`;
  const recent = s.slice(-5).reverse().map((x) => `<div class="row" style="align-items:center;padding:8px 0;border-top:1px solid var(--line)"><b>${esc(x.type)}</b><span class="lbl">${esc(x.diff)} · ${x.count} questions</span><span class="lbl">${new Date(x.date).toLocaleDateString()}</span><b>${x.avg}/100</b></div>`).join("");
  $("#dashboard").innerHTML = `<div class="hero"><h1>Practice Smarter. Interview Better. Get Hired.</h1><p>Run a mock interview, check your answers, and build a daily practice habit.</p><button class="btn" data-go="interview">Start a mock interview</button></div>
  <div class="grid"><div class="card"><div class="num">${s.length}</div><div class="lbl">Interviews completed</div></div><div class="card"><div class="num">${avg}</div><div class="lbl">Average score</div></div><div class="card"><div class="num">${state.done.length}</div><div class="lbl">Questions practiced</div></div><div class="card"><div class="num">${streak()}</div><div class="lbl">Day streak</div></div></div>
  <div class="card"><h2>Performance trend</h2>${chart}</div>
  <div class="card"><h2>Practice activity</h2>${heat()}</div>
  <div class="card"><h2>Recent sessions</h2>${recent || '<div class="empty">No sessions yet.</div>'}</div>`;
  $("[data-go]").addEventListener("click", () => show("interview"));
  countUp($("#dashboard"));
}

// ---- Mock interview ----
let iv = null;
const opts = (arr) => arr.map((o) => `<option>${o}</option>`).join("");
function renderSetup() {
  iv = null;
  $("#interview").innerHTML = `<h1>Mock Interview</h1><p class="sub">Answer one question at a time, then get a scored report.</p>
  <div class="card"><div class="row"><div><label>Interview type</label><select id="t">${opts(["Python", "JavaScript", "SQL", "HR", "Behavioral"])}</select></div>
  <div><label>Difficulty</label><select id="d">${opts(["Any", "Beginner", "Intermediate", "Advanced"])}</select></div>
  <div><label>Questions</label><select id="n">${opts(["3", "5"])}</select></div></div>
  <div class="actions"><button class="btn" id="go">Start interview</button></div></div>`;
  $("#go").addEventListener("click", () => {
    const t = $("#t").value, d = $("#d").value, n = +$("#n").value;
    const pool = QUESTIONS.filter((q) => q.cat === t && (d === "Any" || q.diff === d));
    if (!pool.length) return toast("No questions for that combination. Try difficulty: Any.");
    iv = { type: t, diff: d, qs: pool.sort(() => Math.random() - 0.5).slice(0, n), i: 0, ans: [] };
    renderQuestion();
  });
}
function renderQuestion() {
  const q = iv.qs[iv.i], last = iv.i === iv.qs.length - 1;
  $("#interview").innerHTML = `<h1>${esc(iv.type)} interview</h1><div class="bar"><i style="width:${((iv.i + 1) / iv.qs.length) * 100}%"></i></div>
  <div class="card"><span class="tag">Question ${iv.i + 1} of ${iv.qs.length}</span><span class="tag">${q.diff}</span><h2 style="margin-top:12px">${esc(q.q)}</h2>
  <textarea id="a" placeholder="Type your answer here…">${esc(iv.ans[iv.i] || "")}</textarea>
  <div class="actions"><button class="btn ghost" id="prev" ${iv.i ? "" : "disabled"}>Previous</button><button class="btn" id="next">${last ? "Submit interview" : "Save & next"}</button></div></div>`;
  const keep = () => (iv.ans[iv.i] = $("#a").value);
  $("#prev").addEventListener("click", () => { keep(); iv.i--; renderQuestion(); });
  $("#next").addEventListener("click", () => { keep(); if (last) return finishInterview(); iv.i++; renderQuestion(); });
}
function finishInterview() {
  if (!iv.analyzed) {
    iv.analyzed = true;
    $("#interview").innerHTML = '<div class="card center"><div class="spin"></div><h2>Analyzing your answers…</h2><p class="lbl">Running the demo scoring engine</p></div>';
    return setTimeout(finishInterview, 1400);
  }
  const items = iv.qs.map((q, i) => ({ q, r: evaluate(q, iv.ans[i] || "") }));
  const avg = Math.round(items.reduce((t, x) => t + x.r.score, 0) / items.length);
  state.sessions.push({ date: new Date().toISOString(), type: iv.type, diff: iv.diff, count: items.length, avg });
  items.forEach((x) => { if (x.r.score >= 50 && !state.done.includes(x.q.id)) state.done.push(x.q.id); });
  save();
  $("#interview").innerHTML = `<h1>Interview report</h1><p class="sub">${DEMO}</p><div class="card"><div class="score">${avg}/100</div><div class="lbl">Overall score · ${esc(iv.type)} · ${items.length} questions</div></div>` +
    items.map((x, i) => `<div class="card"><b>Q${i + 1}. ${esc(x.q.q)}</b><div class="score" style="font-size:26px">${x.r.score}/100</div><div class="bar"><i style="width:${x.r.score}%"></i></div><b>Strengths</b>${li(x.r.strengths, "good")}<b>Improve</b>${li(x.r.tips, "miss")}<details><summary>Sample answer</summary><p>${esc(x.q.ans)}</p></details></div>`).join("") +
    `<div class="actions"><button class="btn" id="again">New interview</button><button class="btn ghost" id="dash">Go to dashboard</button></div>`;
  $("#again").addEventListener("click", renderSetup); $("#dash").addEventListener("click", () => show("dashboard"));
  if (avg >= 80) confetti();
  toast("Interview saved.");
}

// ---- Question bank ----
const bankF = { text: "", cat: "All", diff: "All" };
function renderBank() {
  const cats = ["All", ...new Set(QUESTIONS.map((q) => q.cat))];
  $("#bank").innerHTML = `<h1>Question Bank</h1><p class="sub">${state.done.length} of ${QUESTIONS.length} practiced</p><div class="bar"><i style="width:${(state.done.length / QUESTIONS.length) * 100}%"></i></div>
  <div class="card row"><input id="s" placeholder="Search questions…" value="${esc(bankF.text)}"><select id="c">${opts(cats)}</select><select id="df">${opts(["All", "Beginner", "Intermediate", "Advanced"])}</select></div><div id="list"></div>`;
  $("#c").value = bankF.cat; $("#df").value = bankF.diff;
  const draw = () => {
    bankF.text = $("#s").value; bankF.cat = $("#c").value; bankF.diff = $("#df").value;
    const f = QUESTIONS.filter((q) => (bankF.cat === "All" || q.cat === bankF.cat) && (bankF.diff === "All" || q.diff === bankF.diff) && q.q.toLowerCase().includes(bankF.text.toLowerCase()));
    $("#list").innerHTML = f.length ? f.map((q) => `<div class="card pin" data-cat="${q.cat}"><span class="tag">${q.cat}</span><span class="tag">${q.diff}</span><b>${esc(q.q)}</b>
      <details><summary>Show answer & explanation</summary><p>${esc(q.ans)}</p><p class="lbl">Key concepts: ${q.kw.map(esc).join(", ")}</p></details>
      <div class="actions"><button class="btn red" data-f="${q.id}">${state.fav.includes(q.id) ? "♥ Saved" : "♡ Save"}</button><button class="btn ghost" data-d="${q.id}">${state.done.includes(q.id) ? "✓ Completed" : "Mark completed"}</button></div></div>`).join("") : '<div class="empty card">No questions match your filters.</div>';
  };
  ["s", "c", "df"].forEach((id) => $("#" + id).addEventListener("input", draw));
  $("#list").addEventListener("click", (e) => {
    const b = e.target.closest("button"); if (!b) return;
    const [k, arr] = b.dataset.f ? [+b.dataset.f, state.fav] : [+b.dataset.d, state.done];
    const i = arr.indexOf(k); i < 0 ? arr.push(k) : arr.splice(i, 1);
    save(); renderBank(); 
  });
  draw();
}

// ---- Answer evaluator ----
function renderEvaluator() {
  $("#evaluator").innerHTML = `<h1>Answer Evaluator</h1><p class="sub">Pick a question, write your answer, and get a score.</p>
  <div class="card"><label>Question</label><select id="q">${QUESTIONS.map((q) => `<option value="${q.id}">${esc(q.cat)} – ${esc(q.q)}</option>`).join("")}</select>
  <label>Your answer</label><textarea id="a" placeholder="Write your answer…"></textarea><div class="actions"><button class="btn" id="ev">Evaluate answer</button></div></div><div id="out"></div>`;
  $("#ev").addEventListener("click", () => {
    const ans = $("#a").value.trim(); if (!ans) return toast("Please write an answer first.");
    const q = QUESTIONS.find((x) => x.id === +$("#q").value), r = evaluate(q, ans);
    $("#out").innerHTML = `<div class="card">${DEMO}<div class="score">${r.score}/100</div><b>Strengths</b>${li(r.strengths, "good")}<b>Missing / improve</b>${li(r.tips, "miss")}<details open><summary>Stronger sample answer</summary><p>${esc(q.ans)}</p></details></div>`;
  });
}
show("home");
initHero();

function initHero() {
  const arc = $("#arc"), val = $("#gv"), ta = $("#hd"), cap = $("#gc"), q = QUESTIONS[0];
  const set = (n) => { arc.style.strokeDashoffset = 251.3 * (1 - n / 100); val.textContent = n; };
  setTimeout(() => { set(evaluate(q, q.ans).score); cap.textContent = "A sample answer scores this. Now try yours."; }, 400);
  ta.addEventListener("input", () => {
    const t = ta.value.trim();
    set(t ? evaluate(q, t).score : 0);
    cap.textContent = t ? "Your answer scores" : "Type to see your score";
  });
  document.querySelectorAll("[data-nav]").forEach((b) => b.addEventListener("click", () => {
    const t = b.dataset.nav;
    if (t[0] === "#") document.querySelector(t).scrollIntoView({ behavior: "smooth" }); else show(t);
  }));
}

// ---- Advanced UI helpers ----
const calm = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
function heat() {
  const c = {}; state.sessions.forEach((s) => { const k = s.date.slice(0, 10); c[k] = (c[k] || 0) + 1; });
  const cells = [];
  for (let i = 104; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i); const k = d.toISOString().slice(0, 10), n = c[k] || 0;
    cells.push(`<i class="h l${Math.min(n, 3)}" title="${k}: ${n} session${n === 1 ? "" : "s"}"></i>`);
  }
  return `<div class="heat">${cells.join("")}</div><p class="lbl">Last 15 weeks. Each square is a day you practiced.</p>`;
}
function countUp(root) {
  root.querySelectorAll(".num").forEach((el) => {
    const to = +el.textContent; if (!to || calm()) return;
    const t0 = performance.now();
    const step = (t) => { const p = Math.min((t - t0) / 800, 1); el.textContent = Math.round(to * (1 - Math.pow(1 - p, 3))); if (p < 1) requestAnimationFrame(step); };
    requestAnimationFrame(step);
  });
}
function confetti() {
  if (calm()) return;
  const c = document.createElement("canvas"); c.className = "confetti"; c.width = innerWidth; c.height = innerHeight; document.body.append(c);
  const x = c.getContext("2d"), cols = ["#7c5cff", "#22d3ee", "#ff5fa2", "#ffd23f"];
  const ps = Array.from({ length: 140 }, () => ({ x: Math.random() * c.width, y: -Math.random() * c.height / 2, vx: Math.random() * 4 - 2, vy: Math.random() * 4 + 3, s: Math.random() * 8 + 4, c: cols[(Math.random() * 4) | 0] }));
  const t0 = performance.now();
  (function f(t) { x.clearRect(0, 0, c.width, c.height); ps.forEach((p) => { p.x += p.vx; p.y += p.vy; x.fillStyle = p.c; x.fillRect(p.x, p.y, p.s, p.s * 0.6); }); if (t - t0 < 2200) requestAnimationFrame(f); else c.remove(); })(t0);
}
document.addEventListener("pointermove", (e) => {
  const el = e.target.closest && e.target.closest(".card,.pin"); if (!el) return;
  const r = el.getBoundingClientRect(); el.style.setProperty("--mx", e.clientX - r.left + "px"); el.style.setProperty("--my", e.clientY - r.top + "px");
});
function toggleTheme() {
  const t = document.documentElement.dataset.theme === "light" ? "dark" : "light";
  document.documentElement.dataset.theme = t; try { localStorage.setItem("pp_theme", t); } catch (e) { /* ignore */ }
}
try { document.documentElement.dataset.theme = localStorage.getItem("pp_theme") || "dark"; } catch (e) { document.documentElement.dataset.theme = "dark"; }
$("#theme").addEventListener("click", toggleTheme);
let ci = 0;
const CMDS = () => [
  { n: "Go to Home", f: () => show("home") }, { n: "Go to Dashboard", f: () => show("dashboard") },
  { n: "Start a mock interview", f: () => show("interview") }, { n: "Browse the question bank", f: () => show("bank") },
  { n: "Evaluate an answer", f: () => show("evaluator") }, { n: "Toggle light / dark theme", f: toggleTheme },
];
function drawCmd() {
  const q = $("#cmdin").value.toLowerCase(), l = CMDS().filter((c) => c.n.toLowerCase().includes(q));
  ci = Math.min(ci, Math.max(l.length - 1, 0));
  $("#cmdlist").innerHTML = l.map((c, i) => `<li class="${i === ci ? "on" : ""}" data-i="${i}">${c.n}</li>`).join("") || "<li>No matching command</li>";
  return l;
}
const openCmd = () => { $("#cmd").classList.remove("hidden"); $("#cmdin").value = ""; ci = 0; drawCmd(); $("#cmdin").focus(); };
const closeCmd = () => $("#cmd").classList.add("hidden");
const runCmd = (l) => { if (l[ci]) { closeCmd(); l[ci].f(); } };
$("#kbtn").addEventListener("click", openCmd);
$("#cmd").addEventListener("click", (e) => { if (e.target.id === "cmd") closeCmd(); const li = e.target.closest("li[data-i]"); if (li) { ci = +li.dataset.i; runCmd(drawCmd()); } });
$("#cmdin").addEventListener("input", () => { ci = 0; drawCmd(); });
$("#cmdin").addEventListener("keydown", (e) => {
  const l = drawCmd();
  if (e.key === "ArrowDown") { ci = (ci + 1) % l.length; drawCmd(); e.preventDefault(); }
  else if (e.key === "ArrowUp") { ci = (ci - 1 + l.length) % l.length; drawCmd(); e.preventDefault(); }
  else if (e.key === "Enter") runCmd(l);
});
document.addEventListener("keydown", (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") { e.preventDefault(); $("#cmd").classList.contains("hidden") ? openCmd() : closeCmd(); }
  else if (e.key === "Escape") closeCmd();
});
