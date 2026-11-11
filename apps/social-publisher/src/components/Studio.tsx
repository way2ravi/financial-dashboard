"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { ArrowDownToLine, ArrowRight, Check, ChevronRight, CircleHelp, Clock3, ExternalLink, FileText, Globe2, LayoutDashboard, Link2, Plus, Radio, Search, Settings2, ShieldCheck, Sparkles, Trash2, TrendingUp, Zap } from "lucide-react";
import { createDraft, initialState, isStudioState, platforms, sampleStories, type Draft, type Platform, type StudioState } from "../lib/studio";
import { signOut } from "../app/login/actions";

const storageKey = "way2investing-social-v1";
let cachedRaw: string | null | undefined;
let cachedState = initialState;
const listeners = new Set<() => void>();
function readState() {
  let raw: string | null;
  try { raw = localStorage.getItem(storageKey); } catch { return cachedState; }
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    try { const parsed: unknown = raw ? JSON.parse(raw) : null; cachedState = isStudioState(parsed) ? parsed : initialState; } catch { cachedState = initialState; }
  }
  return cachedState;
}
function subscribe(listener: () => void) {
  listeners.add(listener);
  window.addEventListener("storage", listener);
  return () => { listeners.delete(listener); window.removeEventListener("storage", listener); };
}
const tabs = [
  { name: "Overview", icon: LayoutDashboard }, { name: "Content inbox", icon: Radio },
  { name: "Draft queue", icon: FileText }, { name: "Automation", icon: Zap },
  { name: "Channels", icon: Link2 }, { name: "Setup", icon: Settings2 },
] as const;
type Tab = typeof tabs[number]["name"];

export function Studio() {
  const state = useSyncExternalStore(subscribe, readState, () => initialState);
  const [tab, setTab] = useState<Tab>("Overview");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("All content");
  const [notice, setNotice] = useState("");
  const [editing, setEditing] = useState<Draft | null>(null);
  const [preview, setPreview] = useState<Platform>("facebook");
  useEffect(() => {
    if (!notice) return;
    const timeout = setTimeout(() => setNotice(""), 7000);
    return () => clearTimeout(timeout);
  }, [notice]);
  useEffect(() => {
    if (!editing) return;
    const handler = (event: KeyboardEvent) => { if (event.key === "Escape") setEditing(null); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [editing]);

  function save(next: StudioState) {
    try {
      localStorage.setItem(storageKey, JSON.stringify(next));
      for (const listener of listeners) listener();
      return true;
    } catch { setNotice("Browser storage is unavailable or full. Your changes were not saved. Export existing drafts before clearing storage."); return false; }
  }
  function addDraft(storyId: string) {
    const existing = state.drafts.find((d) => d.storyId === storyId);
    if (existing) { setEditing(existing); setNotice("This story already has a draft. Opened it for editing."); return; }
    const story = sampleStories.find((s) => s.id === storyId);
    if (!story) return;
    const draft = createDraft(story, state.rules);
    if (save({ ...state, drafts: [draft, ...state.drafts] })) { setEditing(draft); setNotice("Sample draft created. Nothing has been published."); }
  }
  function blankDraft() {
    setEditing({ id: crypto.randomUUID(), title: "", text: "", platforms: ["facebook", "x", "threads"], status: "Draft", createdAt: new Date().toISOString(), scheduledAt: null });
  }
  function saveDraft() {
    if (!editing) return;
    if (!editing.title.trim() || !editing.text.trim() || !editing.platforms.length) { setNotice("Add a title, post text, and at least one channel."); return; }
    if (editing.scheduledAt && (!Number.isFinite(Date.parse(editing.scheduledAt)) || Date.parse(editing.scheduledAt) <= Date.now())) { setNotice("Choose a future date and time, or clear the planned time."); return; }
    // Any edit invalidates the previous approval.
    const next = { ...editing, status: "Draft" as const };
    if (save({ ...state, drafts: [next, ...state.drafts.filter((d) => d.id !== next.id)] })) { setEditing(null); setNotice("Draft saved in this browser. No social accounts are connected."); }
  }
  function exportDrafts() {
    const url = URL.createObjectURL(new Blob([JSON.stringify(state, null, 2)], { type: "application/json" }));
    const link = document.createElement("a"); link.href = url; link.download = "way2investing-social-drafts.json"; link.click(); URL.revokeObjectURL(url);
  }
  const stories = sampleStories.filter((s) => (filter === "All content" || filter === s.kind) && `${s.title} ${s.ticker}`.toLowerCase().includes(query.toLowerCase()));
  const approved = state.drafts.filter((d) => d.status === "Approved").length;

  return <div className="studio">
    <aside className="sidebar">
      <a className="brand" href="/" aria-label="Way2Investing Social Studio home"><span className="brand-icon"><TrendingUp size={25} /></span><span>way2investing<span className="brand-sub">SOCIAL STUDIO</span></span></a>
      <div className="workspace"><span className="workspace-avatar">W</span><div><strong>Way2Investing</strong><small>Publishing workspace</small></div><ChevronRight size={16} /></div>
      <div className="nav-label">WORKSPACE</div>
      <nav aria-label="Main navigation">{tabs.map(({ name, icon: Icon }) => <button key={name} className={tab === name ? "nav-item active" : "nav-item"} onClick={() => setTab(name)}><Icon size={19} /><span>{name}</span>{name === "Draft queue" && state.drafts.length > 0 && <span className="count">{state.drafts.length}</span>}</button>)}</nav>
      <div className="sidebar-bottom"><div className="setup-box"><span className="setup-icon"><Sparkles size={18} /></span><strong>Your publishing engine,<br />all in one place.</strong><p>Connect your channels to start sharing market stories.</p><button onClick={() => setTab("Setup")}>Complete setup <ArrowRight size={15} /></button></div><button className="help" onClick={() => setTab("Setup")}><CircleHelp size={18} /> Help & setup</button><div className="profile"><span className="profile-avatar">W2</span><div><strong>Way2Investing</strong><small>Local workspace</small></div><span className="status-dot" /></div></div>
    </aside>

    <div className="main-shell"><header className="topbar"><div><span className="breadcrumb">Workspace</span><ChevronRight size={14} /><strong>{tab}</strong></div><div><span className="mode"><span />Preview mode</span><button className="icon-button" aria-label="Open setup" onClick={() => setTab("Setup")}><Settings2 size={19} /></button><form action={signOut}><button className="sign-out" type="submit">Sign out</button></form><span className="top-avatar">W</span></div></header>
      <main>
        <div className="page-heading"><div><div className="eyebrow">WAY2INVESTING SOCIAL</div><h1>{tab === "Overview" ? "Your market. Your voice." : tab}</h1><p>{tab === "Overview" ? "Turn market-moving moments into stories worth sharing." : tab === "Content inbox" ? "Find the story. Add your perspective. Reach your audience." : tab === "Draft queue" ? "A clear view of everything you’re preparing to share." : tab === "Automation" ? "Design the rules behind your publishing workflow." : tab === "Channels" ? "One workspace for every part of your audience." : "Get your publishing workspace ready for production."}</p></div><button className="primary" onClick={blankDraft}><Plus size={17} /> Create post</button></div>

        <div className="preview-banner"><span className="banner-icon"><ShieldCheck size={19} /></span><div><strong>You’re in a local preview workspace.</strong><span> Sample stories · browser-only drafts · live publishing is not connected.</span></div><button onClick={() => setTab("Setup")}>View setup <ArrowRight size={15} /></button></div>

        {tab === "Overview" && <>
          <section className="stats" aria-label="Workspace statistics">{[
            { label: "Content to explore", value: sampleStories.length, note: "Sample stories in your inbox", icon: Radio, tone: "blue" },
            { label: "In your draft queue", value: state.drafts.length, note: "Ready for your editorial touch", icon: FileText, tone: "purple" },
            { label: "Approved locally", value: approved, note: "Awaiting connected channels", icon: Check, tone: "green" },
            { label: "Connected channels", value: "0 / 5", note: "Connect your first account", icon: Link2, tone: "orange" },
          ].map(({ label, value, note, icon: Icon, tone }) => <article className="stat" key={label}><div className="stat-top">{label}<span className={`stat-icon ${tone}`}><Icon size={18} /></span></div><strong className="stat-value">{value}</strong><p>{note}</p></article>)}</section>
          <section className="channels-strip"><div><span className="section-kicker">YOUR DISTRIBUTION NETWORK</span><h2>Be where your audience is.</h2></div><div className="channel-icons">{platforms.map((p) => <button key={p.id} onClick={() => setTab("Channels")} title={`${p.name}: not connected`}><span className="platform-mark" style={{ background: p.color }}>{p.mark}</span><span>{p.name}</span><span className="offline-dot" /></button>)}</div><button className="text-link" onClick={() => setTab("Channels")}>Manage <ArrowRight size={15} /></button></section>
        </>}

        {(tab === "Overview" || tab === "Content inbox") && <div className="content-grid"><section className="panel inbox"><div className="section-heading"><div><h2>Content inbox <span className="pill">{sampleStories.length}</span></h2><p>Your next story starts here.</p></div><span className="sample-label">SAMPLE FEED</span></div><div className="filters"><div className="filter-tabs">{["All content", "Earnings", "Breaking news", "Market recap"].map((item) => <button key={item} className={filter === item ? "selected" : ""} onClick={() => setFilter(item)}>{item}</button>)}</div><label className="search"><Search size={16} /><input aria-label="Search stories" placeholder="Search stories" value={query} onChange={(e) => setQuery(e.target.value)} /></label></div><div className="stories">{stories.length === 0 && <div className="empty">No stories match your search.</div>}{stories.map((story) => <article className="story" key={story.id}><div className={`story-symbol ${story.kind === "Earnings" ? "earnings-symbol" : story.kind === "Breaking news" ? "news-symbol" : "recap-symbol"}`}>{story.kind === "Earnings" ? <TrendingUp size={24} /> : story.kind === "Breaking news" ? <Zap size={24} /> : <Globe2 size={24} />}</div><div className="story-body"><div className="story-meta"><span className={`category ${story.kind === "Earnings" ? "earnings" : story.kind === "Breaking news" ? "news" : "recap"}`}>{story.kind}</span><span>{story.ticker}</span><span>·</span><span>{story.time}</span></div><h3>{story.title}</h3><p>{story.summary}</p><div className="story-footer"><span>{story.source}</span><button onClick={() => addDraft(story.id)}><Sparkles size={14} /> Create draft <ArrowRight size={14} /></button></div></div></article>)}</div><div className="panel-footer"><ShieldCheck size={14} /> Sample data is fictional. Connect a verified feed for real market stories.</div></section>
          <aside className="right-column"><section className="workflow-card"><div className="workflow-glow" /><span className="workflow-tag"><Zap size={13} /> THE WORKFLOW</span><h2>From market signal<br />to social story.</h2><p>One thoughtful process.<br />Every channel, covered.</p><div className="workflow-steps">{[{ title: "Discover", detail: "Earnings, headlines & market moves", icon: Radio }, { title: "Make it yours", detail: "Draft, adapt & review your story", icon: Sparkles }, { title: "Share everywhere", detail: "Publish through connected accounts", icon: Globe2 }].map(({ title, detail, icon: Icon }, i) => <div className="workflow-step" key={title}><span><Icon size={18} /></span><div><strong>{title}</strong><small>{detail}</small></div><b>0{i + 1}</b></div>)}</div><button onClick={() => setTab("Automation")}>Explore automation <ArrowRight size={16} /></button></section><section className="panel next-up"><span className="section-kicker">NEXT ON YOUR LIST</span><h2>Make your first connection</h2><p>Bring your social accounts into one workspace to unlock publishing.</p><button className="secondary" onClick={() => setTab("Channels")}><Link2 size={15} /> Set up channels</button></section></aside></div>}

        {tab === "Draft queue" && <section className="panel"><div className="section-heading"><div><h2>Editorial queue <span className="pill">{state.drafts.length}</span></h2><p>Approval here is local only. Planned times do not trigger posting.</p></div><button className="secondary" onClick={exportDrafts}><ArrowDownToLine size={15} /> Export drafts</button></div>{!state.drafts.length && <div className="empty"><FileText size={32} /><h3>A little space for your next big story.</h3><p>Create a post or turn a sample story into your first draft.</p><button className="primary" onClick={() => setTab("Content inbox")}>Explore inbox <ArrowRight size={15} /></button></div>}{state.drafts.map((draft) => <article className="draft-row" key={draft.id}><div><span className={`category ${draft.status === "Approved" ? "earnings" : "recap"}`}>{draft.status}</span><h3>{draft.title}</h3><p>{draft.platforms.map((id) => platforms.find((p) => p.id === id)?.name).join(" · ")}</p>{draft.scheduledAt && <small className="planned"><Clock3 size={12} /> Planned: {new Date(draft.scheduledAt).toLocaleString()} (no automatic delivery)</small>}</div><div className="draft-actions"><button className="secondary" onClick={() => { setEditing(draft); setPreview(draft.platforms[0]); }}>Edit</button><button className="secondary" disabled={draft.status === "Approved"} onClick={() => { if (save({ ...state, drafts: state.drafts.map((d) => d.id === draft.id ? { ...d, status: "Approved" } : d) })) setNotice("Approved locally. Live publishing is blocked until the backend and channels are connected."); }}><Check size={14} /> Approve</button><button className="icon-button danger" aria-label={`Delete ${draft.title}`} onClick={() => { if (confirm(`Delete “${draft.title}”?`)) save({ ...state, drafts: state.drafts.filter((d) => d.id !== draft.id) }); }}><Trash2 size={16} /></button></div></article>)}</section>}

        {tab === "Automation" && <><div className="section-intro"><h2>Let the right stories find you.</h2><p>These rules configure the sample draft workflow. Background ingestion and automatic posting are not running.</p></div><div className="rule-grid">{state.rules.map((rule) => <article className="panel rule" key={rule.id}><div className="rule-top"><span className="stat-icon purple"><Zap size={19} /></span><button role="switch" aria-checked={rule.enabled} aria-label={`Enable ${rule.name} for draft creation`} className={`toggle ${rule.enabled ? "on" : ""}`} onClick={() => save({ ...state, rules: state.rules.map((r) => r.id === rule.id ? { ...r, enabled: !r.enabled } : r) })}><span /></button></div><span className="section-kicker">{rule.kind}</span><h2>{rule.name}</h2><p>{rule.description}</p><div className="rule-channels">{platforms.map((p) => <button key={p.id} title={p.name} aria-label={`${rule.name}: ${p.name}`} aria-pressed={rule.platforms.includes(p.id)} className={rule.platforms.includes(p.id) ? "chosen" : ""} onClick={() => save({ ...state, rules: state.rules.map((r) => r.id === rule.id ? { ...r, platforms: r.platforms.includes(p.id) ? r.platforms.filter((id) => id !== p.id) : [...r.platforms, p.id] } : r) })}>{p.mark}</button>)}</div><div className="rule-note"><ShieldCheck size={14} /> Draft creation only · review required</div></article>)}</div></>}

        {tab === "Channels" && <div className="platform-grid">{platforms.map((p) => <article key={p.id} className="panel platform-card"><div className="platform-top"><span className="platform-mark large" style={{ background: p.color }}>{p.mark}</span><span className="connection-status">Not connected</span></div><h2>{p.name}</h2><strong className="format">{p.format}</strong><p>{p.requirement}</p><a className="secondary" href={p.docs} target="_blank" rel="noreferrer">Developer setup <ExternalLink size={14} /></a><small>OAuth connection is not implemented yet.</small></article>)}</div>}

        {tab === "Setup" && <div className="setup-grid"><section className="panel setup-panel"><span className="section-kicker">PRODUCTION ROADMAP</span><h2>A home for your social publishing.</h2><p>Target domain: <strong>sm.way2investing.com</strong></p>{[
          { title: "1. Hosting & domain", body: "Deploy this standalone Next.js app with apps/social-publisher as the project root. Add sm.way2investing.com in the hosting dashboard and apply the exact DNS records supplied there." },
          { title: "2. Identity & database", body: "Shared-password sign-in is enabled. Add individual staff accounts, workspace roles, durable drafts, encrypted account credentials, and a publishing audit trail. This preview uses browser storage only." },
          { title: "3. Social account connections", body: "Register Meta, Google, and X developer applications. Configure OAuth callbacks and request the permissions needed for each platform. Never paste access tokens into post content." },
          { title: "4. Verified market feeds", body: "Connect licensed earnings and news sources. The existing financial dashboard has earnings and company-news services that can feed the publisher through a secured server integration." },
          { title: "5. Background publishing", body: "Add a durable job queue with per-platform delivery status, duplicate prevention, retry limits, token refresh, and manual reconciliation for uncertain deliveries." },
          { title: "6. Media & launch", body: "Generate image cards for visual channels and rendered video for YouTube. Test with your accounts, then enable automatic posting rules after review." },
        ].map(({ title, body }) => <div className="setup-step" key={title}><span className="pending-circle" /><div><h3>{title}</h3><p>{body}</p></div></div>)}</section><aside className="panel launch-check"><ShieldCheck size={28} /><h2>What works today</h2><ul><li>Sample content inbox</li><li>Draft creation and editing</li><li>Per-channel content previews</li><li>Local approval and planning</li><li>Draft rule configuration</li><li>JSON export of your workspace</li></ul><p>Live ingestion, OAuth, media rendering, background jobs, and publishing are pending. Nothing is posted by this preview.</p><button className="secondary" onClick={exportDrafts}><ArrowDownToLine size={15} /> Export workspace</button></aside></div>}
        <footer className="footer"><span>© {new Date().getFullYear()} Way2Investing · Social Studio</span><span><ShieldCheck size={13} /> Built for a thoughtful publishing workflow</span></footer>
      </main>
    </div>
    {notice && <div className="toast" role="status">{notice}<button aria-label="Dismiss notification" onClick={() => setNotice("")}>×</button></div>}
    {editing && <div className="modal-backdrop"><section className="composer" role="dialog" aria-modal="true" aria-labelledby="composer-title"><div className="composer-heading"><div><span className="section-kicker">YOUR EDITORIAL DESK</span><h2 id="composer-title">Craft your next story</h2></div><button className="icon-button" onClick={() => setEditing(null)} aria-label="Close editor">×</button></div><div className="composer-columns"><div className="composer-form"><label>Internal title<input autoFocus value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} placeholder="Give this story a title" /></label><fieldset><legend>Destination channels</legend><div className="destination-options">{platforms.map((p) => <button key={p.id} aria-pressed={editing.platforms.includes(p.id)} className={editing.platforms.includes(p.id) ? "selected" : ""} onClick={() => setEditing({ ...editing, platforms: editing.platforms.includes(p.id) ? editing.platforms.filter((id) => id !== p.id) : [...editing.platforms, p.id] })}>{p.mark} {p.name}</button>)}</div></fieldset><label>Post content<textarea rows={10} value={editing.text} onChange={(e) => setEditing({ ...editing, text: e.target.value })} placeholder="Tell the story. Add a verified source link." /></label><span className="character-count">{editing.text.length} characters · channel validation comes with API integration</span><label>Planned time (optional, your local timezone)<input type="datetime-local" value={editing.scheduledAt ?? ""} onChange={(e) => setEditing({ ...editing, scheduledAt: e.target.value || null })} /></label><p className="form-note">Planning is stored with the draft. It does not schedule a background post.</p></div><aside className="composer-preview"><label>Channel preview<select value={preview} onChange={(e) => setPreview(e.target.value as Platform)}>{platforms.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label><div className="post-preview"><div className="preview-account"><span className="profile-avatar">W2</span><div><strong>Way2Investing</strong><small>Preview · {platforms.find((p) => p.id === preview)?.name}</small></div></div><p>{editing.text || "Your story will appear here as you write."}</p>{["instagram", "youtube"].includes(preview) && <div className="media-placeholder"><FileText size={26} /><strong>{preview === "youtube" ? "Video asset required" : "Image or video required"}</strong><span>Media generation and upload are not connected.</span></div>}<div className="preview-watermark">Approximate preview · not a live post</div></div><div className="preview-advice"><ShieldCheck size={17} /><p>Check the source, reporting period, and every figure before approving market content.</p></div></aside></div><div className="composer-actions"><span><Clock3 size={14} /> Saved in this browser only</span><button className="secondary" onClick={() => setEditing(null)}>Cancel</button><button className="primary" onClick={saveDraft}>Save draft <ArrowRight size={15} /></button></div></section></div>}
  </div>;
}
