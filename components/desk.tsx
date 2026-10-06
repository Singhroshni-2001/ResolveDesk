"use client";
import { useEffect, useRef, useState } from "react";
import {
  ArrowUpRight,
  ArrowUp,
  ArrowRight,
  BookOpen,
  Check,
  ChevronRight,
  Clock,
  FileText,
  Headphones,
  LayoutDashboard,
  LifeBuoy,
  LogOut,
  MessageCircle,
  Plus,
  RotateCcw,
  Search,
  ShieldCheck,
  Sparkles,
  Ticket as TicketIcon,
  Upload,
  X,
  BarChart3,
  Menu,
  Command,
  Leaf,
} from "lucide-react";
import { api, supabase } from "@/lib/browser";
import {
  categories,
  ticketInput,
  Doc,
  examples,
  initialTickets,
  Message,
  policies,
  resolutionHours,
  savedAnswer,
  statuses,
  Ticket,
} from "@/lib/domain";
type View = "Overview" | "Support chat" | "Tickets" | "Knowledge" | "Analytics";
type Mode = "demo" | "live";
const nav = [
  { name: "Overview", icon: LayoutDashboard },
  { name: "Support chat", icon: MessageCircle },
  { name: "Tickets", icon: TicketIcon },
  { name: "Knowledge", icon: BookOpen },
  { name: "Analytics", icon: BarChart3 },
] as const;
const seedDocs: Doc[] = policies.map((p, i) => ({
  id: `doc-${i}`,
  name: p.title,
  status: "ready",
  created_at: "2026-10-01",
  chunk_count: 1,
}));
export default function Desk() {
  const [screen, setScreen] = useState<"home" | "desk" | "auth">("home");
  const [mode, setMode] = useState<Mode>("demo");
  const [view, setView] = useState<View>("Overview");
  const [persona, setPersona] = useState<"customer" | "agent">("agent");
  const [role, setRole] = useState("customer");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [signup, setSignup] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const [tickets, setTickets] = useState<Ticket[]>(initialTickets);
  const [docs, setDocs] = useState<Doc[]>(seedDocs);
  const [messages, setMessages] = useState<Message[]>([]);
  const [question, setQuestion] = useState("");
  const [selected, setSelected] = useState<Ticket | null>(null);
  const [filter, setFilter] = useState("All tickets");
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [menu, setMenu] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [source, setSource] = useState<number | null>(null);
  const [conversations, setConversations] = useState<
    { id: string; created_at: string }[]
  >([]);
  const conversation = useRef("");
  const requestId = useRef("");
  const lock = useRef(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const chatEnd = useRef<HTMLDivElement>(null);
  useEffect(() => {
    try {
      const raw = localStorage.getItem("resolvedesk-demo-v1");
      if (raw) {
        const data = JSON.parse(raw);
        if (
          Array.isArray(data) &&
          data.every(
            (t) =>
              typeof t.id === "string" &&
              statuses.includes(t.status) &&
              Array.isArray(t.replies),
          )
        )
          setTickets(data);
      }
    } catch {
      setNotice(
        "Local demo storage could not be read. Sample data has been restored.",
      );
    }
    const params = new URLSearchParams(location.search);
    if (params.get("demo") === "1") setScreen("desk");
  }, []);
  useEffect(() => {
    if (messages.length)
      chatEnd.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [messages, busy]);
  useEffect(() => {
    if (!notice) return;
    const id = setTimeout(() => setNotice(""), 5000);
    return () => clearTimeout(id);
  }, [notice]);
  function save(next: Ticket[]) {
    setTickets(next);
    if (mode === "demo")
      try {
        localStorage.setItem("resolvedesk-demo-v1", JSON.stringify(next));
      } catch {
        setNotice(
          "Browser storage is unavailable. Changes will last for this visit only.",
        );
      }
  }
  function navigate(next: View) {
    setView(next);
    setSelected(null);
    setMenu(false);
    setError("");
  }
  function demo() {
    if (busy || loading || lock.current) return;
    setQuestion("");
    setSearch("");
    setFilter("All tickets");
    conversation.current = "";
    setConversations([]);
    setMode("demo");
    setPersona("agent");
    setMessages([]);
    setDocs(seedDocs);
    setError("");
    setView("Overview");
    setSelected(null);
    let data = initialTickets();
    try {
      const stored = JSON.parse(
        localStorage.getItem("resolvedesk-demo-v1") || "null",
      );
      if (
        Array.isArray(stored) &&
        stored.every(
          (t) =>
            typeof t.id === "string" &&
            statuses.includes(t.status) &&
            Array.isArray(t.replies),
        )
      )
        data = stored;
    } catch {}
    setTickets(data);
    setScreen("desk");
    history.replaceState(null, "", "?demo=1");
  }
  async function refresh() {
    setLoading(true);
    try {
      const result = await api("workspace");
      setTickets(result.tickets);
      setSelected(current=>current?result.tickets.find((ticket:Ticket)=>ticket.id===current.id)||null:null);
      setDocs(result.documents);
      setRole(result.role);
      setUserEmail(result.email);
      setConversations(result.conversations || []);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }
  async function live() {
    if (busy || loading || lock.current) return;
    lock.current=true;
    setBusy(true);
    setQuestion("");
    setSearch("");
    setFilter("All tickets");
    setRole("customer");
    conversation.current = "";
    setConversations([]);
    setMode("live");
    setTickets([]);
    setDocs([]);
    setMessages([]);
    setSelected(null);
    setError("");
    history.replaceState(null, "", "/");
    try {
      const session = await supabase()?.auth.getSession();
      if (session?.data.session) {
        setScreen("desk");
        setView("Overview");
        await refresh();
      } else setScreen("auth");
    } catch(e){setError((e as Error).message);setScreen("auth");}
    finally{lock.current=false;setBusy(false);}
  }
  async function authenticate(event: React.FormEvent) {
    event.preventDefault();
    if (lock.current) return;
    const client = supabase();
    if (!client) {
      setError(
        "Live mode is not configured. Add the Supabase settings in .env.local. The demo is ready to explore.",
      );
      return;
    }
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      const { data, error } = signup
        ? await client.auth.signUp({ email, password })
        : await client.auth.signInWithPassword({ email, password });
      if (error) throw error;
      if (!data.session) {
        setNotice("Check your email to confirm your account, then sign in.");
        setSignup(false);
      } else {
        setScreen("desk");
        await refresh();
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  const isAgent =
    mode === "demo"
      ? persona === "agent"
      : role === "agent" || role === "admin";
  const visibleTickets =
    mode === "demo" && !isAgent
      ? tickets.filter((t) => t.customer === "Alex Morgan")
      : tickets;
  const filtered = visibleTickets.filter(
    (t) =>
      (filter === "All tickets" || t.status === filter) &&
      `${t.subject} ${t.id} ${t.customer || ""}`
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  const open = visibleTickets.filter((t) => t.status === "Open").length;
  const progress = visibleTickets.filter(
    (t) => t.status === "In progress",
  ).length;
  const resolved = visibleTickets.filter((t) => t.status === "Resolved").length;
  const hours = resolutionHours(visibleTickets);
  async function send(text = question) {
    if (!text.trim() || lock.current) return;
    lock.current = true;
    setQuestion("");
    setBusy(true);
    setError("");
    const id = crypto.randomUUID();
    setMessages((m) => [...m, { id, role: "user", content: text }]);
    try {
      let answer;
      if (mode === "demo") answer = savedAnswer(text);
      else {
        conversation.current ||= crypto.randomUUID();
        answer = await api("chat", {
          method: "POST",
          body: JSON.stringify({
            id,
            question: text,
            conversation_id: conversation.current,
          }),
        });
        setConversations((c) =>
          c.some((x) => x.id === conversation.current)
            ? c
            : [
                {
                  id: conversation.current,
                  created_at: new Date().toISOString(),
                },
                ...c,
              ],
        );
      }
      setMessages((m) => [
        ...m,
        { id: crypto.randomUUID(), role: "assistant", ...answer },
      ]);
    } catch (e) {
      setError((e as Error).message);
      setQuestion(text);
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  async function loadConversation(id: string) {
    if(lock.current)return;
    if (!id) {
      setMessages([]);
      conversation.current = "";
      return;
    }
    lock.current=true;
    setBusy(true);
    setError("");
    try {
      const result = await api("conversations?id=" + encodeURIComponent(id));
      setMessages(result.messages);
      conversation.current = id;
    } catch (e) {
      setError((e as Error).message);
    } finally {
      lock.current=false;
      setBusy(false);
    }
  }
  function newTicket() {
    requestId.current = crypto.randomUUID();
    setError("");
    setModal(true);
  }
  async function createTicket(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (lock.current) return;
    const form = new FormData(event.currentTarget);
    const input = {
      id: requestId.current,
      subject: String(form.get("subject")),
      description: String(form.get("description")),
      category: String(form.get("category")),
    };
    const validation = ticketInput.safeParse(input);
    if (!validation.success) {
      setError(
        "Please add a subject of at least 4 characters and a description of at least 10 characters.",
      );
      return;
    }
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      if (mode === "demo") {
        const ticket: Ticket = {
          ...input,
          created_at: new Date().toISOString(),
          resolved_at: null,
          status: "Open",
          customer: "Alex Morgan",
          replies: [],
        };
        save([ticket, ...tickets]);
        setSelected(ticket);
      } else {
        const result = await api("tickets", {
          method: "POST",
          body: JSON.stringify(input),
        });
        await refresh();
        setSelected({ ...result.ticket, replies: [] });
      }
      setModal(false);
      setView("Tickets");
      setNotice("Ticket created. Your support team can take it from here.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  async function changeStatus(status: Ticket["status"]) {
    if (!selected || lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      if (mode === "demo") {
        const updated = {
          ...selected,
          status,
          resolved_at: status === "Resolved" ? new Date().toISOString() : null,
        };
        save(tickets.map((t) => (t.id === updated.id ? updated : t)));
        setSelected(updated);
      } else {
        const result = await api(`tickets/${selected.id}`, {
          method: "PATCH",
          body: JSON.stringify({ status }),
        });
        setSelected({ ...selected, ...result.ticket });
        await refresh();
      }
      setNotice(`Ticket marked ${status.toLowerCase()}.`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  async function reply(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected || lock.current) return;
    const form = event.currentTarget;
    const body = String(new FormData(form).get("body")).trim();
    if (!body) return;
    lock.current = true;
    setBusy(true);
    setError("");
    requestId.current ||= crypto.randomUUID();
    try {
      const item = {
        id: requestId.current,
        body,
        created_at: new Date().toISOString(),
        author: isAgent
          ? "Support agent"
          : mode === "demo"
            ? "Alex Morgan"
            : userEmail,
      };
      if (mode === "demo") {
        const updated = { ...selected, replies: [...selected.replies, item] };
        save(tickets.map((t) => (t.id === updated.id ? updated : t)));
        setSelected(updated);
      } else {
        const result = await api(`tickets/${selected.id}/replies`, {
          method: "POST",
          body: JSON.stringify(item),
        });
        setSelected({
          ...selected,
          replies: [
            ...selected.replies.filter((r) => r.id !== result.reply.id),
            result.reply,
          ],
        });
        await refresh();
      }
      requestId.current = "";
      form.reset();
      setNotice("Reply sent.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  async function upload(file?: File) {
    if (!file || lock.current) return;
    setError("");
    if (mode === "demo") {
      setNotice(
        "Uploads are available in live mode. Explore the three fictional policies below.",
      );
      return;
    }
    lock.current = true;
    setBusy(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const result = await api("documents", { method: "POST", body: form });
      await refresh();
      await processDoc(result.id);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      lock.current = false;
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }
  async function processDoc(id: string) {
    setBusy(true);
    setError("");
    try {
      let more = true;
      while (more) {
        const result = await api(`documents/${id}/process`, { method: "POST" });
        more = !result.done;
        await refresh();
      }
      setNotice("Document is ready for grounded answers.");
    } catch (e) {
      setError((e as Error).message);
      await refresh();
    } finally {
      setBusy(false);
    }
  }
  async function removeDoc(id: string) {
    setBusy(true);
    try {
      await api(`documents/${id}`, { method: "DELETE" });
      await refresh();
      setNotice("Document removed.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  function Badge({ status }: { status: string }) {
    return (
      <span className={`badge ${status.toLowerCase().replace(" ", "-")}`}>
        <span /> {status}
      </span>
    );
  }
  function TicketRows({ items }: { items: Ticket[] }) {
    return (
      <div className="ticket-table">
        <div className="table-head">
          <span>Ticket / customer</span>
          <span>Category</span>
          <span>Status</span>
          <span />
        </div>
        {items.map((t) => (
          <button
            className="ticket-row"
            key={t.id}
            onClick={() => {
              setSelected(t);
              setView("Tickets");
              requestId.current = "";
            }}
          >
            <div className="ticket-subject">
              <span className="ticket-icon">
                <TicketIcon size={18} />
              </span>
              <div>
                <strong>{t.subject}</strong>
                <small>
                  {t.id.startsWith("RD-")
                    ? t.id
                    : `RD-${t.id.slice(0, 6).toUpperCase()}`}{" "}
                  <i>·</i> {t.customer || "You"} <i>·</i>{" "}
                  {new Date(t.created_at).toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "short",
                  })}
                </small>
              </div>
            </div>
            <span className="category-cell">{t.category}</span>
            <Badge status={t.status} />
            <ChevronRight size={16} />
          </button>
        ))}
        {!items.length && (
          <div className="empty">
            <TicketIcon />
            <h3>All clear here</h3>
            <p>No tickets match this view.</p>
            <button className="button secondary" onClick={newTicket}>
              Create a ticket
            </button>
          </div>
        )}
      </div>
    );
  }
  return (
    <>
      {screen === "home" ? (
        <div className="landing">
          <header className="landing-nav">
            <a className="brand" href="/">
              <span className="brand-icon">
                <Command size={23} />
              </span>
              ResolveDesk<span className="brand-dot">.</span>
            </a>
            <span className="nav-note">A thoughtful way to support.</span>
            <button className="button secondary" onClick={live}>
              Sign in <ArrowUpRight size={16} />
            </button>
          </header>
          <main>
            <div className="hero">
              <div className="hero-copy">
                <span className="eyebrow">
                  <span className="live-dot" /> PEOPLE FIRST. AI ASSISTED.
                </span>
                <h1>
                  A little clarity.
                  <br />A lot of <em>care.</em>
                </h1>
                <p>
                  Good support feels human. Bring your conversations, knowledge,
                  and customer care together in one calm workspace.
                </p>
                <div className="hero-actions">
                  <button className="button primary large" onClick={demo}>
                    Try the interactive demo <ArrowRight size={18} />
                  </button>
                  <button className="text-button" onClick={live}>
                    Go to your workspace <ArrowUpRight size={16} />
                  </button>
                </div>
                <div className="hero-foot">
                  <ShieldCheck size={16} /> No sign-up needed <span>·</span>{" "}
                  Fictional data. Real interactions.
                </div>
              </div>
              <div className="hero-preview">
                <div className="preview-top">
                  <span className="brand-icon small">
                    <Command size={16} />
                  </span>
                  <strong>Your support, in a better place.</strong>
                  <span className="preview-dots">•••</span>
                </div>
                <div className="preview-question">
                  <span className="avatar lavender">AM</span>
                  <div>
                    Can I return an item I ordered last week?
                    <small>Alex · Just now</small>
                  </div>
                </div>
                <div className="preview-answer">
                  <div className="answer-label">
                    <Sparkles size={15} /> Resolve assistant{" "}
                    <span>SAVED DEMO ANSWER</span>
                  </div>
                  <p>
                    Of course. You have 30 days from delivery to return an
                    unused item in its original packaging.
                  </p>
                  <div className="source-chip">
                    <FileText size={14} /> Returns & refunds <span>↗</span>
                  </div>
                </div>
                <div className="preview-bottom">
                  <span>
                    <span className="live-dot" /> Grounded in your knowledge
                  </span>
                  <ShieldCheck size={17} />
                </div>
                <div className="floating-note">
                  <span className="check-circle">
                    <Check size={19} />
                  </span>
                  <div>
                    A clear answer.<small>A happier customer.</small>
                  </div>
                </div>
              </div>
            </div>
            <div className="feature-strip">
              {[
                {
                  icon: MessageCircle,
                  title: "Answers with receipts",
                  text: "Helpful responses, with sources you can open.",
                },
                {
                  icon: TicketIcon,
                  title: "Nothing falls through",
                  text: "A clear path from first question to resolution.",
                },
                {
                  icon: BookOpen,
                  title: "Your knowledge, connected",
                  text: "Turn your policies into practical support.",
                },
              ].map((f) => (
                <div key={f.title}>
                  <f.icon size={23} />
                  <h3>{f.title}</h3>
                  <p>{f.text}</p>
                </div>
              ))}
            </div>
          </main>
          <footer>
            <span>ResolveDesk · Built for the human on the other side.</span>
            <span>Next.js / Supabase / Gemini</span>
          </footer>
        </div>
      ) : screen === "auth" ? (
        <div className="auth-screen">
          <button
            className="brand plain"
            disabled={busy || loading}
            onClick={() => setScreen("home")}
          >
            <span className="brand-icon">
              <Command />
            </span>
            ResolveDesk.
          </button>
          <div className="auth-card">
            <span className="eyebrow">YOUR LIVE WORKSPACE</span>
            <h1>Welcome{signup ? " aboard" : " back"}.</h1>
            <p>Thoughtful support starts here.</p>
            {!supabase() ? (
              <div className="setup-note">
                <ShieldCheck />
                <h3>Live mode isn’t configured yet</h3>
                <p>
                  Connect your own Supabase project using the setup guide and
                  local environment file. Until then, the complete demo is
                  ready.
                </p>
                <button className="button primary" onClick={demo}>
                  Explore the demo <ArrowRight size={16} />
                </button>
              </div>
            ) : (
              <form onSubmit={authenticate}>
                <label>
                  Email
                  <input
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </label>
                <label>
                  Password
                  <input
                    type="password"
                    autoComplete={signup ? "new-password" : "current-password"}
                    minLength={8}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </label>
                <button disabled={busy} className="button primary">
                  {busy
                    ? "Please wait…"
                    : signup
                      ? "Create account"
                      : "Sign in"}
                </button>
                <button
                  type="button"
                  className="text-button"
                  onClick={() => setSignup(!signup)}
                >
                  {signup
                    ? "Already have an account? Sign in"
                    : "New here? Create an account"}
                </button>
              </form>
            )}
            <button className="text-button back-demo" onClick={demo}>
              Explore the demo instead <ArrowRight size={15} />
            </button>
          </div>
        </div>
      ) : (
        <div className="app-shell">
          <aside className={`sidebar ${menu ? "shown" : ""}`}>
            <button
              className="brand plain"
              disabled={busy || loading}
              onClick={() => setScreen("home")}
            >
              <span className="brand-icon">
                <Command size={23} />
              </span>
              ResolveDesk<span className="brand-dot">.</span>
            </button>
            <div className="workspace-label">
              <span className="workspace-avatar">N</span>
              <div>
                {mode === "demo" ? "Nova Store" : "My workspace"}
                <small>
                  {mode === "demo" ? "Demo workspace" : "Live workspace"}
                </small>
              </div>
              <span className="workspace-chevron">⌄</span>
            </div>
            <span className="section-label">WORKSPACE</span>
            <nav>
              {nav
                .filter(
                  (n) =>
                    isAgent || !["Knowledge", "Analytics"].includes(n.name),
                )
                .map((n) => (
                  <button
                    key={n.name}
                    className={view === n.name ? "active" : ""}
                    onClick={() => navigate(n.name)}
                  >
                    <n.icon size={19} />
                    {n.name}
                    {n.name === "Tickets" && (
                      <span className="nav-count">
                        {
                          visibleTickets.filter((t) => t.status !== "Resolved")
                            .length
                        }
                      </span>
                    )}
                  </button>
                ))}
            </nav>
            <div className="sidebar-bottom">
              <div className="sidebar-card">
                <span className="tiny-spark">
                  <Sparkles size={18} />
                </span>
                <strong>Meet your calmer workday.</strong>
                <p>
                  {mode === "demo"
                    ? "A safe space to explore. Everything here is fictional."
                    : "Knowledge-backed answers. Human care when it matters."}
                </p>
                <button onClick={() => navigate("Support chat")}>
                  Start a conversation <ArrowUpRight size={14} />
                </button>
              </div>
              {mode === "demo" && (
                <button
                  className="reset-button"
                  onClick={() => setResetOpen(true)}
                >
                  <RotateCcw size={16} /> Reset demo
                </button>
              )}
              <div className="profile">
                <span className="avatar">
                  {mode === "demo"
                    ? isAgent
                      ? "SC"
                      : "AM"
                    : userEmail.slice(0, 2).toUpperCase()}
                </span>
                <div>
                  <strong>
                    {mode === "demo"
                      ? isAgent
                        ? "Sam Carter"
                        : "Alex Morgan"
                      : userEmail}
                  </strong>
                  <small>{isAgent ? "Support agent" : "Customer"}</small>
                </div>
                {mode === "live" && (
                  <button
                    aria-label="Sign out"
                    disabled={busy || loading}
                    className="sign-out-button"
                    onClick={async () => {
                      if (lock.current) return;
                      lock.current = true;
                      setBusy(true);
                      setError("");
                      try {
                        const result = await supabase()?.auth.signOut({
                          scope: "local",
                        });
                        if (result?.error) throw result.error;
                        setMenu(false);
                        setSignup(false);
                        setEmail("");
                        setPassword("");
                        setUserEmail("");
                        setRole("customer");
                        setView("Overview");
                        setSelected(null);
                        setTickets([]);
                        setMessages([]);
                        setDocs([]);
                        setConversations([]);
                        conversation.current = "";
                        setScreen("auth");
                      } catch (e) {
                        setError((e as Error).message);
                      } finally {
                        lock.current = false;
                        setBusy(false);
                      }
                    }}
                  >
                    <LogOut size={17} />
                    <span>Sign out</span>
                  </button>
                )}
              </div>
            </div>
          </aside>
          <div className="main-shell">
            <header className="topbar">
              <div className="breadcrumb">
                <button
                  className="icon-button mobile-menu"
                  aria-label="Open navigation"
                  onClick={() => setMenu(!menu)}
                >
                  <Menu size={21} />
                </button>
                <span>Workspace</span>
                <ChevronRight size={14} />
                <strong>{view}</strong>
              </div>
              <div className="topbar-actions">
                {mode === "demo" && (
                  <select
                    aria-label="Demo perspective"
                    disabled={busy || loading}
                    value={persona}
                    onChange={(e) => {
                      setPersona(e.target.value as "agent" | "customer");
                      navigate("Overview");
                    }}
                  >
                    <option value="agent">Agent view</option>
                    <option value="customer">Customer view</option>
                  </select>
                )}
                <span className={`mode-pill ${mode}`}>
                  <span />
                  {mode === "demo" ? "Demo mode" : "Live mode"}
                </span>
                <button
                  className="icon-button"
                  aria-label="Return home"
                  disabled={busy || loading}
                  onClick={() => setScreen("home")}
                >
                  <LifeBuoy size={20} />
                </button>
              </div>
            </header>
            {mode === "demo" && (
              <div className="demo-banner">
                <span>
                  <Sparkles size={14} /> You’re exploring a demo. Fictional
                  data, saved answers, and changes saved only in this browser.
                </span>
                <button onClick={live}>
                  Go live <ArrowUpRight size={14} />
                </button>
              </div>
            )}
            <main className="workspace-main">
              {loading && (
                <div role="status" className="loading-bar">
                  Loading your workspace…
                </div>
              )}
              {view === "Overview" && (
                <>
                  <div className="page-heading">
                    <div>
                      <span className="eyebrow">
                        A LITTLE CLARITY FOR YOUR DAY
                      </span>
                      <h1>
                        {isAgent
                          ? mode === "demo"
                            ? "Good to see you, Sam"
                            : "Good to see you, " +
                              (userEmail.split("@")[0] || "there")
                          : "Your support, all together"}
                        <span className="wave">✳</span>
                      </h1>
                      <p>
                        {isAgent
                          ? "Let’s turn a few questions into a few happy customers."
                          : "Answers when you need them. A real person when it matters."}
                      </p>
                    </div>
                    <button className="button primary" onClick={newTicket}>
                      <Plus size={17} /> New ticket
                    </button>
                  </div>
                  <div className="stats-grid">
                    {[
                      {
                        label: "Open tickets",
                        value: open,
                        icon: TicketIcon,
                        note: "Ready for a helping hand",
                        color: "orange",
                      },
                      {
                        label: "In progress",
                        value: progress,
                        icon: Clock,
                        note: "A little closer to sorted",
                        color: "blue",
                      },
                      {
                        label: "Resolved",
                        value: resolved,
                        icon: Check,
                        note: "Questions put to rest",
                        color: "green",
                      },
                      {
                        label: "Avg. resolution",
                        value: hours === null ? "—" : `${hours.toFixed(1)}h`,
                        icon: BarChart3,
                        note:
                          mode === "demo"
                            ? "Based on sample timestamps"
                            : hours === null
                              ? "No resolved tickets yet"
                              : "From actual resolved tickets",
                        color: "purple",
                      },
                    ].map((s) => (
                      <div className="stat-card" key={s.label}>
                        <div>
                          <span>{s.label}</span>
                          <s.icon className={s.color} size={19} />
                        </div>
                        <strong>{s.value}</strong>
                        <small>{s.note}</small>
                      </div>
                    ))}
                  </div>
                  <div className="overview-columns">
                    <section className="assistant-feature">
                      <span className="feature-orb">
                        <Sparkles size={24} />
                      </span>
                      <span className="eyebrow">A HELPFUL FIRST STOP</span>
                      <h2>
                        Good answers.
                        <br />
                        Grounded in your knowledge.
                      </h2>
                      <p>
                        Find the right information, with the source right beside
                        it. A little less searching. A lot more clarity.
                      </p>
                      <button
                        className="button primary"
                        onClick={() => navigate("Support chat")}
                      >
                        Open support chat <ArrowUpRight size={16} />
                      </button>
                      <span className="feature-caption">
                        <ShieldCheck size={14} />
                        {mode === "demo"
                          ? "Saved answers · No live AI in demo"
                          : "Source citations · Powered by Gemini"}
                      </span>
                      <div className="decorative-rings" />
                    </section>
                    <section className="knowledge-summary">
                      <div className="panel-title">
                        <h2>Your knowledge corner</h2>
                        <BookOpen size={19} />
                      </div>
                      <p>The foundations of a helpful answer.</p>
                      {(mode === "demo" ? seedDocs : docs)
                        .slice(0, 3)
                        .map((d, i) => (
                          <button
                            className="mini-doc"
                            key={d.id}
                            onClick={() =>
                              mode === "demo"
                                ? setSource(i)
                                : navigate(
                                    isAgent ? "Knowledge" : "Support chat",
                                  )
                            }
                          >
                            <span className="doc-icon">
                              <FileText size={18} />
                            </span>
                            <div>
                              <strong>{d.name}</strong>
                              <small>
                                {mode === "demo"
                                  ? "Sample policy · 1 page"
                                  : d.status}
                              </small>
                            </div>
                            <ChevronRight size={15} />
                          </button>
                        ))}
                      {!docs.length && mode === "live" && (
                        <p className="empty-inline">
                          {isAgent
                            ? "Your team hasn’t added any documents yet."
                            : "Ask support chat a policy question and open its source citations."}
                        </p>
                      )}
                      <button
                        className="text-button"
                        onClick={() =>
                          navigate(isAgent ? "Knowledge" : "Support chat")
                        }
                      >
                        {isAgent ? "View knowledge base" : "Ask a question"}{" "}
                        <ArrowRight size={15} />
                      </button>
                    </section>
                  </div>
                  <section className="panel recent-tickets">
                    <div className="panel-title">
                      <div>
                        <h2>
                          {isAgent
                            ? "A little attention goes a long way"
                            : "Your recent tickets"}
                        </h2>
                        <p>
                          {isAgent
                            ? "Your latest conversations, in one place."
                            : "Keep track of every conversation."}
                        </p>
                      </div>
                      <button
                        className="text-button"
                        onClick={() => navigate("Tickets")}
                      >
                        View all tickets <ArrowRight size={15} />
                      </button>
                    </div>
                    <TicketRows items={visibleTickets.slice(0, 4)} />
                  </section>
                  <div className="workspace-footer">
                    <Leaf size={15} /> Thoughtful support. One conversation at a
                    time.
                    <span>
                      {mode === "demo"
                        ? "NOVA STORE · DEMO WORKSPACE"
                        : "YOUR LIVE WORKSPACE"}
                    </span>
                  </div>
                </>
              )}
              {view === "Support chat" && (
                <>
                  <div className="page-heading">
                    <div>
                      <span className="eyebrow">
                        LET’S FIGURE IT OUT, TOGETHER
                      </span>
                      <h1>A little help is here.</h1>
                      <p>
                        {mode === "demo"
                          ? "Explore saved answers from Nova Store’s fictional policies."
                          : "Answers grounded in your team’s published knowledge."}
                      </p>
                    </div>
                    <button className="button secondary" onClick={newTicket}>
                      <Plus size={16} /> Create ticket
                    </button>
                  </div>
                  <div className="chat-layout">
                    <section className="chat-panel">
                      <div className="chat-header">
                        <span className="assistant-avatar">
                          <Sparkles size={21} />
                        </span>
                        <div>
                          <strong>Resolve assistant</strong>
                          <small>
                            {mode === "demo"
                              ? "Saved demo answers · Not live AI"
                              : "Gemini · Answers with source excerpts"}
                          </small>
                        </div>
                        <button
                          className="icon-button"
                          aria-label="New conversation"
                          disabled={busy}
                          onClick={() => {
                            setMessages([]);
                            conversation.current = "";
                          }}
                        >
                          <Plus size={18} />
                        </button>
                      </div>
                      {mode === "live" && (
                        <div className="conversation-picker">
                          <label htmlFor="conversation-history">
                            Conversation history
                          </label>
                          <select
                            id="conversation-history"
                            value={conversation.current}
                            disabled={busy}
                            onChange={(e) => loadConversation(e.target.value)}
                          >
                            <option value="">New conversation</option>
                            {conversations.map((c) => (
                              <option key={c.id} value={c.id}>
                                {new Date(c.created_at).toLocaleString()}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                      <div className="chat-messages">
                        {!messages.length ? (
                          <div className="chat-welcome">
                            <span className="welcome-mark">
                              <Sparkles size={32} />
                            </span>
                            <h2>How can we make today easier?</h2>
                            <p>
                              From returns to delivery, let’s find a clear
                              answer.
                              <br />
                              You can always ask the support team for help.
                            </p>
                            <div className="example-questions">
                              {examples.map((q, i) => (
                                <button
                                  disabled={busy}
                                  key={q}
                                  onClick={() => send(q)}
                                >
                                  <span>0{i + 1}</span>
                                  {q}
                                  <ArrowUpRight size={16} />
                                </button>
                              ))}
                            </div>
                          </div>
                        ) : (
                          messages.map((m) => (
                            <div key={m.id} className={`message ${m.role}`}>
                              <span
                                className={`avatar ${m.role === "assistant" ? "assistant-avatar" : "lavender"}`}
                              >
                                {m.role === "assistant" ? (
                                  <Sparkles size={17} />
                                ) : (
                                  "You"
                                )}
                              </span>
                              <div>
                                <small>
                                  {m.role === "assistant"
                                    ? mode === "demo"
                                      ? "Resolve · Saved answer"
                                      : "Resolve · AI answer"
                                    : "You"}
                                </small>
                                <div className="message-content">
                                  {m.content}
                                </div>
                                {m.citations?.map((c, i) => (
                                  <details className="citation" key={i}>
                                    <summary>
                                      <FileText size={14} />[{i + 1}] {c.title}
                                      {c.page ? ` · Page ${c.page}` : ""}
                                      <ChevronRight size={14} />
                                    </summary>
                                    <p>{c.excerpt}</p>
                                  </details>
                                ))}
                              </div>
                            </div>
                          ))
                        )}
                        {busy && (
                          <div className="thinking" role="status">
                            Finding a little clarity…
                          </div>
                        )}
                        <div ref={chatEnd} />
                      </div>
                      <form
                        className="composer"
                        onSubmit={(e) => {
                          e.preventDefault();
                          send();
                        }}
                      >
                        <label className="sr-only" htmlFor="question">
                          Your support question
                        </label>
                        <input
                          id="question"
                          placeholder="Ask a question. We’re here to help."
                          value={question}
                          onChange={(e) => setQuestion(e.target.value)}
                          maxLength={1500}
                          disabled={busy}
                        />
                        <button
                          aria-label="Send question"
                          disabled={busy || question.trim().length < 2}
                        >
                          <ArrowUp size={21} />
                        </button>
                      </form>
                      <div className="composer-note">
                        <ShieldCheck size={12} />
                        {mode === "demo"
                          ? "Demo uses saved answers. No information is sent to an AI service."
                          : "AI can make mistakes. Check the sources; avoid sharing sensitive data."}
                      </div>
                    </section>
                    <aside className="chat-aside">
                      <span className="eyebrow">IN GOOD HANDS</span>
                      <h3>A source for every answer.</h3>
                      <p>
                        Open a citation to see the exact policy behind the
                        response.
                      </p>
                      <div className="aside-divider" />
                      <Headphones size={25} />
                      <h3>Some things need a human.</h3>
                      <p>
                        Create a ticket and your support team can pick up where
                        you left off.
                      </p>
                      <button className="button secondary" onClick={newTicket}>
                        Talk to support <ArrowUpRight size={15} />
                      </button>
                      <small>Nothing is submitted until you confirm.</small>
                      {messages.length > 0 && (
                        <>
                          <div className="aside-divider" />
                          <button
                            className="text-button"
                            onClick={() => {
                              setMessages([]);
                              conversation.current = "";
                            }}
                          >
                            Start a new conversation <Plus size={15} />
                          </button>
                        </>
                      )}
                    </aside>
                  </div>
                </>
              )}
              {view === "Tickets" && (
                <>
                  <div className="page-heading">
                    <div>
                      <span className="eyebrow">
                        EVERY CONVERSATION MATTERS
                      </span>
                      <h1>
                        {selected
                          ? "Let’s get this sorted."
                          : isAgent
                            ? "Your support inbox."
                            : "Your tickets."}
                      </h1>
                      <p>
                        {selected
                          ? "A clear history. A helpful next step."
                          : "Keep the conversation moving, from hello to happily resolved."}
                      </p>
                    </div>
                    <button className="button primary" onClick={newTicket}>
                      <Plus size={17} /> New ticket
                    </button>
                  </div>
                  {selected ? (
                    <section className="panel ticket-detail">
                      <button
                        className="text-button"
                        onClick={() => setSelected(null)}
                      >
                        ← Back to tickets
                      </button>
                      <div className="detail-heading">
                        <div>
                          <small>{selected.id}</small>
                          <h2>{selected.subject}</h2>
                          <p>
                            {selected.category} · {selected.customer || "You"} ·{" "}
                            {new Date(selected.created_at).toLocaleString()}
                          </p>
                        </div>
                        <Badge status={selected.status} />
                      </div>
                      <div className="original-message">
                        {selected.description}
                      </div>
                      {isAgent && (
                        <label className="status-select">
                          Ticket status
                          <select
                            disabled={busy}
                            value={selected.status}
                            onChange={(e) =>
                              changeStatus(e.target.value as Ticket["status"])
                            }
                          >
                            {statuses.map((s) => (
                              <option key={s}>{s}</option>
                            ))}
                          </select>
                        </label>
                      )}
                      <h3>
                        Conversation{" "}
                        <span className="muted">
                          ({selected.replies.length})
                        </span>
                      </h3>
                      {selected.replies.map((r) => (
                        <div className="reply" key={r.id}>
                          <span className="avatar">
                            <MessageCircle size={16} />
                          </span>
                          <div>
                            <strong>
                              {r.author || "Support conversation"}
                            </strong>
                            <small>
                              {new Date(r.created_at).toLocaleString()}
                            </small>
                            <p>{r.body}</p>
                          </div>
                        </div>
                      ))}
                      {!selected.replies.length && (
                        <p className="empty-inline">
                          No replies yet. Add a little more context below.
                        </p>
                      )}
                      <form onSubmit={reply} className="reply-form">
                        <label htmlFor="reply">Your reply</label>
                        <textarea
                          id="reply"
                          name="body"
                          placeholder="Write a helpful reply…"
                          minLength={1}
                          maxLength={4000}
                          required
                        />
                        <button className="button primary" disabled={busy}>
                          {busy ? "Sending…" : "Send reply"}
                          <ArrowUpRight size={16} />
                        </button>
                      </form>
                    </section>
                  ) : (
                    <section className="panel">
                      <div className="ticket-toolbar">
                        <div className="tabs">
                          {["All tickets", ...statuses].map((s) => (
                            <button
                              className={filter === s ? "active" : ""}
                              key={s}
                              onClick={() => setFilter(s)}
                            >
                              {s}
                            </button>
                          ))}
                        </div>
                        <label className="search">
                          <Search size={17} />
                          <input
                            aria-label="Search tickets"
                            placeholder="Search tickets…"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                          />
                        </label>
                      </div>
                      <TicketRows items={filtered} />
                      <div className="table-footer">
                        {filtered.length}{" "}
                        {filtered.length === 1
                          ? "conversation"
                          : "conversations"}{" "}
                        <span>
                          {mode === "demo"
                            ? "Fictional customers. A real workflow."
                            : "Only tickets you’re permitted to access."}
                        </span>
                      </div>
                    </section>
                  )}
                </>
              )}
              {view === "Knowledge" && isAgent && (
                <>
                  <div className="page-heading">
                    <div>
                      <span className="eyebrow">
                        GOOD SUPPORT STARTS WITH GOOD SOURCES
                      </span>
                      <h1>Your knowledge, connected.</h1>
                      <p>Give every answer a solid foundation.</p>
                    </div>
                    <button
                      disabled={busy}
                      className="button primary"
                      onClick={() => fileRef.current?.click()}
                    >
                      <Plus size={17} /> Add document
                    </button>
                  </div>
                  <input
                    type="file"
                    ref={fileRef}
                    className="sr-only"
                    accept=".txt,.md,.pdf"
                    onChange={(e) => upload(e.target.files?.[0])}
                  />
                  <button
                    className="upload-zone"
                    disabled={busy}
                    onClick={() => fileRef.current?.click()}
                  >
                    <span className="upload-icon">
                      <Upload size={25} />
                    </span>
                    <h3>
                      {busy
                        ? "Processing your document…"
                        : "A little knowledge goes a long way"}
                    </h3>
                    <p>
                      Choose a support policy, guide, or FAQ to get started.
                    </p>
                    <small>
                      TXT, Markdown, text-based PDF · Up to 1 MB / 20 pages /
                      24,000 characters
                    </small>
                    <span className="button secondary">
                      {mode === "demo"
                        ? "Explore upload · live mode required"
                        : "Choose a file"}{" "}
                      <ArrowUpRight size={15} />
                    </span>
                  </button>
                  <div className="section-heading">
                    <h2>
                      Source library <span>{docs.length}</span>
                    </h2>
                    <small>
                      {mode === "demo"
                        ? "Fictional policies · Saved demo sources"
                        : "Published sources are available to signed-in customers"}
                    </small>
                  </div>
                  <div className="document-grid">
                    {docs.map((d, i) => (
                      <article className="document-card" key={d.id}>
                        <div className="document-top">
                          <span className="doc-icon">
                            <FileText size={22} />
                          </span>
                          <Badge
                            status={
                              d.status === "ready"
                                ? "Ready"
                                : d.status === "failed"
                                  ? "Failed"
                                  : "Processing"
                            }
                          />
                        </div>
                        <h3>{d.name}</h3>
                        <p>
                          {mode === "demo"
                            ? policies[i]?.excerpt.slice(0, 100) + "…"
                            : `${d.chunk_count || 0} searchable passages`}
                        </p>
                        {d.error && <p className="error-inline">{d.error}</p>}
                        <div className="document-bottom">
                          <small>
                            {mode === "demo"
                              ? "Sample policy · 1 page"
                              : new Date(d.created_at).toLocaleDateString()}
                          </small>
                          {mode === "demo" ? (
                            <button
                              className="text-button"
                              onClick={() => setSource(i)}
                            >
                              Read policy <ArrowUpRight size={14} />
                            </button>
                          ) : (
                            <div className="doc-actions">
                              {d.status !== "ready" && (
                                <button
                                  disabled={busy}
                                  className="text-button"
                                  onClick={() => processDoc(d.id)}
                                >
                                  Resume / retry
                                </button>
                              )}
                              <button
                                disabled={busy}
                                className="text-button"
                                onClick={() => removeDoc(d.id)}
                              >
                                Remove
                              </button>
                            </div>
                          )}
                        </div>
                      </article>
                    ))}
                  </div>
                  <div className="info-note">
                    <ShieldCheck size={18} />
                    <p>
                      {mode === "demo"
                        ? "Demo policies stay in your browser. Sign in to upload and process your own knowledge."
                        : "Only agents can manage sources. Originals are private to agents; published excerpts can be retrieved by signed-in customers. Scanned PDFs are not supported."}
                    </p>
                  </div>
                </>
              )}
              {view === "Analytics" && isAgent && (
                <>
                  <div className="page-heading">
                    <div>
                      <span className="eyebrow">A CLEARER PICTURE</span>
                      <h1>Care you can measure.</h1>
                      <p>
                        {mode === "demo"
                          ? "Metrics calculated from your current demo tickets."
                          : "Ticket counts and resolution times from your most recent 500 tickets."}
                      </p>
                    </div>
                    <span className="period-pill">
                      {mode === "demo"
                        ? "All demo tickets"
                        : "Latest 500 tickets"}
                    </span>
                  </div>
                  <div className="stats-grid">
                    <div className="stat-card">
                      <span>Total tickets</span>
                      <strong>{tickets.length}</strong>
                      <small>Every support conversation</small>
                    </div>
                    <div className="stat-card">
                      <span>Resolution rate</span>
                      <strong>
                        {tickets.length
                          ? Math.round((resolved / tickets.length) * 100)
                          : 0}
                        %
                      </strong>
                      <small>Resolved / total tickets</small>
                    </div>
                    <div className="stat-card">
                      <span>Avg. resolution</span>
                      <strong>
                        {hours === null ? "—" : `${hours.toFixed(1)}h`}
                      </strong>
                      <small>{resolved} resolved ticket timestamps</small>
                    </div>
                    <div className="stat-card">
                      <span>Knowledge sources</span>
                      <strong>
                        {docs.filter((d) => d.status === "ready").length}
                      </strong>
                      <small>Ready to support an answer</small>
                    </div>
                  </div>
                  <div className="analytics-grid">
                    <section className="panel chart-panel">
                      <h2>Where conversations stand</h2>
                      <p>A snapshot of your support queue.</p>
                      {statuses.map((s, i) => {
                        const count = tickets.filter(
                          (t) => t.status === s,
                        ).length;
                        return (
                          <div className="bar-row" key={s}>
                            <div>
                              <Badge status={s} />
                              <strong>{count}</strong>
                            </div>
                            <div className="bar-track">
                              <span
                                style={{
                                  width: `${tickets.length ? (count / tickets.length) * 100 : 0}%`,
                                  background: ["#e6aa76", "#7e9fae", "#418776"][
                                    i
                                  ],
                                }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </section>
                    <section className="panel chart-panel">
                      <h2>What’s on customers’ minds</h2>
                      <p>Conversations by category.</p>
                      {categories.map((c) => {
                        const count = tickets.filter(
                          (t) => t.category === c,
                        ).length;
                        return (
                          <div className="category-bar" key={c}>
                            <span>{c}</span>
                            <div className="bar-track">
                              <span
                                style={{
                                  width: `${tickets.length ? (count / tickets.length) * 100 : 0}%`,
                                }}
                              />
                            </div>
                            <strong>{count}</strong>
                          </div>
                        );
                      })}
                    </section>
                  </div>
                  <div className="info-note">
                    <Clock size={18} />
                    <p>
                      {mode === "demo"
                        ? "These are sample-data metrics, not production performance claims. "
                        : ""}
                      Resolution time is measured from creation to the latest
                      resolution. Reopened tickets are excluded until resolved
                      again. No response-time or satisfaction data is invented.
                    </p>
                  </div>
                </>
              )}
            </main>
          </div>
        </div>
      )}
      {error && (
        <div className="error-toast" role="alert">
          <div>
            <strong>A little snag</strong>
            <p>{error}</p>
          </div>
          <button
            aria-label="Dismiss error"
            className="icon-button"
            onClick={() => setError("")}
          >
            <X size={18} />
          </button>
        </div>
      )}
      {notice && (
        <div className="toast" role="status">
          <Check size={18} />
          {notice}
          <button
            className="icon-button"
            aria-label="Dismiss notification"
            onClick={() => setNotice("")}
          >
            <X size={16} />
          </button>
        </div>
      )}
      {modal && (
        <Modal
          title="Let’s get you some help."
          close={() => {
            if (!busy) setModal(false);
          }}
        >
          <p className="modal-description">
            {mode === "demo"
              ? "This creates a fictional ticket in this browser."
              : "Your support team will receive this ticket."}{" "}
            Review the details, then confirm.
          </p>
          <form onSubmit={createTicket}>
            <label>
              Subject
              <input
                name="subject"
                placeholder="A short summary of what’s happening"
                minLength={4}
                maxLength={140}
                required
                autoFocus
              />
            </label>
            <label>
              Category
              <select name="category">
                {categories.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </label>
            <label>
              How can we help?
              <textarea
                name="description"
                placeholder="Include any details that will help us help you. Never include passwords or card numbers."
                minLength={10}
                maxLength={4000}
                required
              />
            </label>
            <div className="modal-actions">
              <button
                type="button"
                className="button secondary"
                onClick={() => setModal(false)}
                disabled={busy}
              >
                Cancel
              </button>
              <button className="button primary" disabled={busy}>
                {busy ? "Creating…" : "Confirm & create ticket"}
                <ArrowRight size={16} />
              </button>
            </div>
          </form>
        </Modal>
      )}
      {resetOpen && (
        <Modal title="A fresh start?" close={() => setResetOpen(false)}>
          <p className="modal-description">
            This removes your browser’s demo tickets and replies and restores
            the fictional sample data.
          </p>
          <div className="modal-actions">
            <button
              className="button secondary"
              onClick={() => setResetOpen(false)}
            >
              Keep exploring
            </button>
            <button
              className="button primary"
              onClick={() => {
                save(initialTickets());
                setMessages([]);
                setSelected(null);
                setResetOpen(false);
                setNotice("Demo reset. A fresh start awaits.");
              }}
            >
              Reset demo
            </button>
          </div>
        </Modal>
      )}
      {source !== null && (
        <Modal title={policies[source].title} close={() => setSource(null)}>
          <span className="eyebrow">
            NOVA STORE · FICTIONAL SAMPLE POLICY · PAGE 1
          </span>
          <p className="policy-text">{policies[source].excerpt}</p>
          <div className="info-note">
            <FileText size={18} />
            <p>
              This is the exact source used by the corresponding saved demo
              answer.
            </p>
          </div>
        </Modal>
      )}
    </>
  );
}
function Modal({
  title,
  close,
  children,
}: {
  title: string;
  close: () => void;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    d?.showModal();
    return () => d?.close();
  }, []);
  return (
    <dialog
      ref={ref}
      className="modal"
      aria-label={title}
      onCancel={(e) => {
        e.preventDefault();
        close();
      }}
    >
      <div className="modal-heading">
        <h2>{title}</h2>
        <button
          className="icon-button"
          aria-label="Close dialog"
          onClick={close}
        >
          <X size={20} />
        </button>
      </div>
      {children}
    </dialog>
  );
}
