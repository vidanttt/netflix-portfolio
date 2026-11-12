"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";

/* ════════════════════════════════════════════════════
   DevTerminal — interactive "about me" shell
   Every answer below comes from this portfolio itself: the creator page copy,
   the stats on it, the contact details already used on the site, and the
   stack that is actually installed in this repo.
   ════════════════════════════════════════════════════ */

interface ProjectEntry {
  title: string;
  description: string;
  stack?: string[];
  href?: string;
}

interface DevTerminalProps {
  projects?: ProjectEntry[];
  onOpenProject?: (index: number) => void;
  className?: string;
}

type Block =
  | { id: string; kind: "input"; text: string }
  | { id: string; kind: "node"; node: ReactNode }
  | { id: string; kind: "ai"; question: string };

/** one message of the conversation with the assistant (the format /api/ask takes) */
type Turn = { role: "user" | "model"; text: string };
const MEMORY = 8; // messages of earlier conversation sent along with a question

const PROMPT_USER = "vidant";
const PROMPT_HOST = "creative-dev";

/* ── Real data ───────────────────────────────────────────────────────── */
const PROFILE = {
  name: "Vidant Sharma",
  role: "Creative Developer",
  also: "Video Editor & Motion Designer",
  stats: [
    { value: "1K+", label: "projects delivered" },
    { value: "70M+", label: "total views" },
    { value: "5+", label: "years editing" },
  ],
};

const DEFAULT_PROJECTS: ProjectEntry[] = [
  {
    title: "Creator Portfolio",
    description: "Motion-led showreel site with a 3D statue you can orbit, a cylindrical video carousel and GSAP choreography.",
    stack: ["Next.js", "GSAP", "Three.js", "Lenis"],
    href: "/creator",
  },
  {
    title: "Bored",
    description: "Movie, TV and anime discovery with category browsing, watchlist, continue-watching and a liquid-glass UI.",
    stack: ["Next.js", "TMDB", "Clerk", "MongoDB"],
    href: "/Bored",
  },
  {
    title: "Dev Terminal + 3D Lanyard",
    description: "This page: a physics-driven ID badge (Rapier) beside an interactive resume shell.",
    stack: ["React Three Fiber", "Rapier", "TypeScript"],
    href: "/developer",
  },
];

const SKILLS: { group: string; items: string[] }[] = [
  { group: "Creative dev", items: ["React", "Next.js", "TypeScript", "Tailwind", "GSAP", "Framer Motion", "Three.js", "React Three Fiber", "Lenis"] },
  { group: "Backend", items: ["Next.js API routes", "MongoDB / Mongoose", "Clerk auth", "TMDB API"] },
  { group: "Video + motion", items: ["Premiere Pro", "After Effects", "DaVinci Resolve", "Final Cut Pro", "CapCut", "Audition"] },
  { group: "Design", items: ["Photoshop", "Illustrator", "Blender"] },
];

const CREATORS = ["BACHU", "Peach", "Elite Shot", "Dynamo Gaming", "S4sh", "Inferno Playz", "Vibhors Verse"];

const CONTACT = [
  { label: "email", value: "vidantforeal@gmail.com", href: "mailto:vidantforeal@gmail.com" },
  { label: "github", value: "github.com/vidanttt", href: "https://github.com/vidanttt" },
  { label: "linkedin", value: "linkedin.com/in/vidaant", href: "https://www.linkedin.com/in/vidaant" },
  { label: "instagram", value: "@180hrtz_", href: "https://www.instagram.com/180hrtz_" },
];

const COMMAND_LIST: { cmd: string; hint: string }[] = [
  { cmd: "about", hint: "who I am" },
  { cmd: "projects", hint: "things I've built" },
  { cmd: "skills", hint: "tools and stack" },
  { cmd: "experience", hint: "numbers and clients" },
  { cmd: "contact", hint: "get in touch" },
  { cmd: "neofetch", hint: "system card" },
  { cmd: "theme dark|light", hint: "switch look" },
  { cmd: "clear", hint: "clear the screen" },
  { cmd: "anything else", hint: "ask the AI assistant about Vidant" },
];

const QUICK = ["about", "projects", "skills", "experience", "contact"];

const uid = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;

/* ── Reusable output pieces ──────────────────────────────────────────── */
const Row = ({ children, delay = 0 }: { children: ReactNode; delay?: number }) => (
  <div className="dt-row" style={{ animationDelay: `${delay}ms` }}>
    {children}
  </div>
);

const Tag = ({ children }: { children: ReactNode }) => <span className="dt-tag">{children}</span>;

const Heading = ({ children }: { children: ReactNode }) => <div className="dt-heading">{children}</div>;

/* ── Streaming reveal ───────────────────────────────────────────────────
   Replies don't appear all at once: after a short "thinking" beat with a blinking
   cursor they are typed out token by token, the way a chat model streams text, while
   rows and tags appear in order. It works on the rendered DOM: every text node is
   emptied, then refilled a word at a time, and the elements around it are un-hidden
   the moment their first word arrives. Reduced-motion users get the text instantly. */
const THINK_MS = 260;
const TOKEN_MS = 22;
const TARGET_MS = 2400; // long answers speed up (several words per tick) to stay under this

function Streamed({
  children,
  register,
  onTick,
  onDone,
}: {
  children: ReactNode;
  register: (finish: (() => void) | null) => void;
  onTick: () => void;
  onDone: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const root = ref.current;
    if (!root) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      onDone();
      return;
    }

    // 1. gather text nodes and blank them
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const items: { node: Text; full: string; tokens: string[] }[] = [];
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      const full = n.nodeValue ?? "";
      if (!full.trim()) continue; // spacing-only nodes stay as they are
      items.push({ node: n as Text, full, tokens: full.split(/(\s+)/).filter(Boolean) });
    }
    const elements = Array.from(root.querySelectorAll<HTMLElement>("*"));
    items.forEach((it) => (it.node.nodeValue = ""));
    elements.forEach((el) => el.classList.add("dt-pending"));

    const caret = document.createElement("span");
    caret.className = "dt-caret";
    caret.setAttribute("aria-hidden", "true");
    root.insertBefore(caret, root.firstChild);

    const wordCount = items.reduce((a, it) => a + it.tokens.filter((t) => t.trim()).length, 0);
    const perTick = Math.max(1, Math.ceil(wordCount / (TARGET_MS / TOKEN_MS)));

    let ni = 0;
    let ti = 0;
    let timer: number | undefined;
    let finished = false;

    const unhideAncestors = (node: Node) => {
      for (let p = node.parentElement; p && p !== root; p = p.parentElement) p.classList.remove("dt-pending");
    };

    const finish = () => {
      if (finished) return;
      finished = true;
      window.clearTimeout(timer);
      items.forEach((it) => (it.node.nodeValue = it.full));
      elements.forEach((el) => el.classList.remove("dt-pending"));
      caret.remove();
      register(null);
      onTick();
      onDone();
    };
    register(finish);

    const step = () => {
      if (finished) return;
      let budget = perTick;
      let last = "";
      while (budget > 0 && ni < items.length) {
        const it = items[ni];
        if (ti === 0) unhideAncestors(it.node);
        const tok = it.tokens[ti];
        it.node.nodeValue = (it.node.nodeValue ?? "") + tok;
        if (tok.trim()) {
          budget--;
          last = tok;
        }
        ti++;
        if (ti >= it.tokens.length) {
          ni++;
          ti = 0;
        }
      }
      if (ni >= items.length) {
        finish();
        return;
      }
      // the cursor rides at the end of whatever was just typed
      const cur = items[ni];
      const anchor = ti === 0 ? items[Math.max(0, ni - 1)].node : cur.node;
      anchor.parentNode?.insertBefore(caret, anchor.nextSibling);
      onTick();
      const pause = /[.!?:]$/.test(last) ? 140 : /[,;]$/.test(last) ? 70 : 0;
      timer = window.setTimeout(step, TOKEN_MS + Math.random() * 14 + pause);
    };

    // brief "thinking" beat: just the blinking cursor, then the words start flowing
    timer = window.setTimeout(step, THINK_MS);

    return () => {
      // undo everything if we are torn down mid-stream (also keeps React StrictMode happy)
      if (!finished) {
        window.clearTimeout(timer);
        items.forEach((it) => (it.node.nodeValue = it.full));
        elements.forEach((el) => el.classList.remove("dt-pending"));
        caret.remove();
        register(null);
      }
    };
    // children are a fixed element created once per reply
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <div ref={ref}>{children}</div>;
}

/* ── AI reply ────────────────────────────────────────────────────────────
   Anything that isn't a command goes to the assistant (app/api/ask), whose answer streams in
   as plain text. A successful exchange is added to the conversation memory. */
function AiReply({
  question,
  memory,
  onTick,
  onDone,
}: {
  question: string;
  memory: { current: Turn[] };
  onTick: () => void;
  onDone: () => void;
}) {
  const [answer, setAnswer] = useState("");
  const [state, setState] = useState<"thinking" | "streaming" | "done" | "error">("thinking");
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return; // once, even when React runs effects twice in development
    started.current = true;
    (async () => {
      const messages: Turn[] = [...memory.current, { role: "user" as const, text: question }].slice(-(MEMORY + 1));
      let full = "";
      try {
        const res = await fetch("/api/ask", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages }),
        });
        if (res.body) {
          const reader = res.body.getReader();
          const decoder = new TextDecoder();
          for (;;) {
            const { done, value } = await reader.read();
            if (done) break;
            full += decoder.decode(value, { stream: true });
            setAnswer(full);
            setState("streaming");
            onTick();
          }
        }
        full = full.trim();
        if (res.ok && full) {
          memory.current = [...memory.current, { role: "user" as const, text: question }, { role: "model" as const, text: full }].slice(-MEMORY);
          setState("done");
        } else {
          setAnswer(full || "The assistant couldn't answer that. Try again.");
          setState("error");
        }
      } catch {
        setAnswer("The assistant couldn't be reached. Check your connection and try again.");
        setState("error");
      } finally {
        onDone();
        onTick();
      }
    })();
    // the question is fixed for this reply
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className={`dt-row dt-answer${state === "error" ? " dt-dim" : ""}`}>
      {state === "thinking" ? "" : answer}
      {(state === "thinking" || state === "streaming") && <span className="dt-caret" aria-hidden="true" />}
    </div>
  );
}

/* ── Component ───────────────────────────────────────────────────────── */
export default function DevTerminal({ projects, onOpenProject, className = "" }: DevTerminalProps) {
  const router = useRouter();
  const projectList = useMemo(() => (projects && projects.length ? (projects as ProjectEntry[]) : DEFAULT_PROJECTS), [projects]);

  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [current, setCurrent] = useState("");
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  // what the assistant remembers of this conversation
  const memory = useRef<Turn[]>([]);

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const bootedRef = useRef(false);
  const finishRef = useRef<(() => void) | null>(null);
  const finishNow = useCallback(() => finishRef.current?.(), []);
  const keepInView = useCallback(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, []);

  const push = useCallback((node: ReactNode) => {
    setBlocks((prev) => [...prev, { id: uid(), kind: "node", node }]);
  }, []);

  /* keep the newest output in view */
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [blocks]);

  /* ── command implementations ── */
  const out = useMemo(() => {
    const about = (): ReactNode => (
      <>
        <Row>
          <Heading>{PROFILE.name}</Heading>
        </Row>
        <Row delay={40}>
          <span className="dt-accent">{PROFILE.role}</span> <span className="dt-dim">/ {PROFILE.also}</span>
        </Row>
        <Row delay={90}>
          I build motion-led, interactive web experiences, and I edit video the same way: fast cuts, cinematic colour
          grades and storytelling that hits different. I work with creators, brands and studios to turn raw footage and
          raw ideas into polished experiences.
        </Row>
        <Row delay={140}>
          <span className="dt-dim">try:</span> <code>projects</code> · <code>skills</code> · <code>contact</code>
        </Row>
      </>
    );

    const projectsOut = (): ReactNode => (
      <>
        <Row>
          <Heading>Projects</Heading>
        </Row>
        {projectList.map((p, i) => (
          <Row key={p.title} delay={60 + i * 70}>
            <div className="dt-project">
              <span className="dt-index">{i + 1}</span>
              <div>
                <div className="dt-project-title">{p.title}</div>
                <div className="dt-dim">{p.description}</div>
                {p.stack && (
                  <div className="dt-tags">
                    {p.stack.map((s) => (
                      <Tag key={s}>{s}</Tag>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </Row>
        ))}
        <Row delay={60 + projectList.length * 70}>
          <span className="dt-dim">open one with</span> <code>open 1</code>
        </Row>
      </>
    );

    const skillsOut = (): ReactNode => (
      <>
        <Row>
          <Heading>Skills</Heading>
        </Row>
        {SKILLS.map((g, i) => (
          <Row key={g.group} delay={50 + i * 60}>
            <div className="dt-skill">
              <span className="dt-skill-group">{g.group}</span>
              <div className="dt-tags">
                {g.items.map((s) => (
                  <Tag key={s}>{s}</Tag>
                ))}
              </div>
            </div>
          </Row>
        ))}
      </>
    );

    const experienceOut = (): ReactNode => (
      <>
        <Row>
          <Heading>Experience</Heading>
        </Row>
        <Row delay={50}>
          <div className="dt-stats">
            {PROFILE.stats.map((s) => (
              <div key={s.label} className="dt-stat">
                <span className="dt-stat-value">{s.value}</span>
                <span className="dt-dim">{s.label}</span>
              </div>
            ))}
          </div>
        </Row>
        <Row delay={110}>
          <span className="dt-dim">worked with</span>
          <div className="dt-tags">
            {CREATORS.map((c) => (
              <Tag key={c}>{c}</Tag>
            ))}
          </div>
        </Row>
      </>
    );

    const contactOut = (): ReactNode => (
      <>
        <Row>
          <Heading>Contact</Heading>
        </Row>
        {CONTACT.map((c, i) => (
          <Row key={c.label} delay={40 + i * 45}>
            <span className="dt-key">{c.label}</span>
            <a className="dt-link" href={c.href} target={c.href.startsWith("mailto") ? undefined : "_blank"} rel="noopener noreferrer">
              {c.value}
            </a>
          </Row>
        ))}
      </>
    );

    const neofetch = (): ReactNode => (
      <div className="dt-fetch">
        <pre className="dt-ascii" aria-hidden="true">{`    /\\_______/\\
   /  o     o  \\
  (      ^      )
   \\   \\___/   /
    \`-._____.-'
     /|/ | \\|\\
      octocat`}</pre>
        <div>
          <Row>
            <span className="dt-accent">{PROMPT_USER}</span>@<span className="dt-accent">{PROMPT_HOST}</span>
          </Row>
          <Row delay={40}>
            <span className="dt-key">role</span>
            {PROFILE.role}
          </Row>
          <Row delay={80}>
            <span className="dt-key">also</span>
            {PROFILE.also}
          </Row>
          <Row delay={120}>
            <span className="dt-key">stack</span>
            Next.js · GSAP · Three.js
          </Row>
          <Row delay={160}>
            <span className="dt-key">editing</span>
            Premiere · After Effects · DaVinci
          </Row>
          <Row delay={200}>
            <span className="dt-key">shipped</span>
            1K+ projects · 70M+ views
          </Row>
        </div>
      </div>
    );

    const help = (): ReactNode => (
      <>
        <Row>
          <Heading>Commands</Heading>
        </Row>
        {COMMAND_LIST.map((c, i) => (
          <Row key={c.cmd} delay={30 + i * 35}>
            <code className="dt-cmd">{c.cmd}</code>
            <span className="dt-dim">{c.hint}</span>
          </Row>
        ))}
        <Row delay={30 + COMMAND_LIST.length * 35}>
          <span className="dt-dim">Tab completes · ↑ ↓ browse history · a leading / is optional</span>
        </Row>
      </>
    );

    return { about, projectsOut, skillsOut, experienceOut, contactOut, neofetch, help };
  }, [projectList]);

  /* ── run a command ── */
  const run = useCallback(
    (raw: string) => {
      const input = raw.trim();
      if (!input) return;
      finishNow(); // a newer command completes any reply still streaming
      setBlocks((prev) => [...prev, { id: uid(), kind: "input", text: input }]);
      setBusy(true);

      const [head, ...rest] = input.replace(/^\//, "").split(/\s+/);
      const name = head.toLowerCase();
      const arg = rest.join(" ");

      switch (name) {
        case "clear":
        case "cls":
          setBlocks([]);
          memory.current = [];
          setBusy(false);
          break;
        case "help":
        case "?":
          push(out.help());
          break;
        case "about":
        case "whoami":
          push(out.about());
          break;
        case "projects":
        case "work":
          push(out.projectsOut());
          break;
        case "skills":
        case "stack":
          push(out.skillsOut());
          break;
        case "experience":
        case "stats":
        case "exp":
          push(out.experienceOut());
          break;
        case "contact":
        case "socials":
          push(out.contactOut());
          break;
        case "neofetch":
        case "fetch":
          push(out.neofetch());
          break;
        case "open": {
          const n = parseInt(arg, 10);
          const p = projectList[n - 1];
          if (p && p.href && p.href === window.location.pathname) {
            push(
              <Row>
                You&apos;re already on <span className="dt-accent">{p.title}</span>.
              </Row>
            );
          } else if (!n || !p) {
            push(
              <Row>
                <span className="dt-error">usage:</span> open &lt;1-{projectList.length}&gt; <span className="dt-dim">(see</span> <code>projects</code>
                <span className="dt-dim">)</span>
              </Row>
            );
          } else {
            push(
              <Row>
                Opening <span className="dt-accent">{p.title}</span>…
              </Row>
            );
            if (onOpenProject) onOpenProject(n - 1);
            else if (p.href) setTimeout(() => router.push(p.href as string), 450);
          }
          break;
        }
        case "theme": {
          if (arg === "dark" || arg === "light") {
            setTheme(arg);
            push(
              <Row>
                theme → <span className="dt-accent">{arg}</span>
              </Row>
            );
          } else {
            push(
              <Row>
                <span className="dt-error">usage:</span> theme dark|light
              </Row>
            );
          }
          break;
        }
        case "sudo":
          push(
            <Row>
              <span className="dt-error">nice try.</span> <span className="dt-dim">this shell runs on good vibes only.</span>
            </Row>
          );
          break;
        default:
          // not a command: ask the AI assistant
          setBlocks((prev) => [...prev, { id: uid(), kind: "ai", question: input }]);
      }
    },
    [out, projectList, onOpenProject, push, router, finishNow]
  );

  /* ── boot sequence: a short, real "neofetch" on first paint ── */
  useEffect(() => {
    if (bootedRef.current) return;
    bootedRef.current = true;
    push(
      <>
        <Row>
          <span className="dt-dim">Last login: today on ttys001</span>
        </Row>
        <Row delay={60}>
          Welcome. Type <code>help</code>, tap a command below, or just ask me anything about Vidant.
        </Row>
      </>
    );
    setTimeout(() => push(out.neofetch()), 220);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── input handling ── */
  const complete = () => {
    const raw = current.replace(/^\//, "").toLowerCase();
    if (!raw) return;
    const names = ["help", "about", "whoami", "projects", "skills", "experience", "contact", "neofetch", "open ", "theme ", "clear"];
    const hit = names.find((n) => n.startsWith(raw));
    if (hit) setCurrent(hit);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "c" && e.ctrlKey) {
      e.preventDefault();
      finishNow(); // Ctrl+C: stop typing and show the rest immediately
    } else if (e.key === "Enter") {
      run(current);
      if (current.trim()) {
        setHistory((h) => [current, ...h]);
        setHistoryIndex(null);
      }
      setCurrent("");
    } else if (e.key === "Tab") {
      e.preventDefault();
      complete();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHistoryIndex((i) => {
        const next = i === null ? 0 : Math.min(i + 1, history.length - 1);
        setCurrent(history[next] ?? "");
        return history.length ? next : null;
      });
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setHistoryIndex((i) => {
        if (i === null) return null;
        const next = i - 1;
        if (next < 0) {
          setCurrent("");
          return null;
        }
        setCurrent(history[next] ?? "");
        return next;
      });
    } else if (e.key === "l" && e.ctrlKey) {
      e.preventDefault();
      setBlocks([]);
    }
  };

  return (
    <section
      className={`dt-window ${theme === "light" ? "dt-light" : ""} ${className}`}
      aria-label="Interactive terminal"
      onClick={() => inputRef.current?.focus()}
    >
      <header className="dt-bar">
        <span className="dt-lights" aria-hidden="true">
          <i style={{ background: "#ff5f57" }} />
          <i style={{ background: "#febc2e" }} />
          <i style={{ background: "#28c840" }} />
        </span>
        <span className="dt-title">
          {PROMPT_USER} — zsh — {PROMPT_HOST}
        </span>
        <span className="dt-title-right">80×24</span>
      </header>

      <div className="dt-body" ref={scrollRef} role="log" aria-live="polite">
        {blocks.map((b) =>
          b.kind === "input" ? (
            <div key={b.id} className="dt-input-echo">
              <span className="dt-prompt">
                <b>{PROMPT_USER}</b>
                <span className="dt-dim">@</span>
                <b>{PROMPT_HOST}</b> <span className="dt-dim">~</span> <span className="dt-sigil">%</span>
              </span>{" "}
              <span>{b.text}</span>
            </div>
          ) : b.kind === "ai" ? (
            <div key={b.id} className="dt-output">
              <AiReply question={b.question} memory={memory} onTick={keepInView} onDone={() => setBusy(false)} />
            </div>
          ) : (
            <div key={b.id} className="dt-output">
              <Streamed
                register={(f) => {
                  finishRef.current = f;
                }}
                onTick={keepInView}
                onDone={() => setBusy(false)}
              >
                {b.node}
              </Streamed>
            </div>
          )
        )}

        <label className="dt-input-line">
          <span className="dt-prompt">
            <b>{PROMPT_USER}</b>
            <span className="dt-dim">@</span>
            <b>{PROMPT_HOST}</b> <span className="dt-dim">~</span> <span className="dt-sigil">%</span>
          </span>
          <input
            ref={inputRef}
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder={blocks.length < 4 ? "type a command…" : ""}
            aria-label="Terminal input"
            autoComplete="off"
            autoCapitalize="off"
            spellCheck={false}
            autoFocus
          />
        </label>
      </div>

      <footer className="dt-quick" aria-label="Quick commands">
        {QUICK.map((q) => (
          <button
            key={q}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              run(q);
              inputRef.current?.focus();
            }}
          >
            {q}
          </button>
        ))}
      </footer>
    </section>
  );
}
