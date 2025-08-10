"use client";

import { useState, useRef, useEffect, KeyboardEvent } from 'react';

interface TerminalLine {
  id: string; // use UUID to avoid duplicate key warnings
  type: 'input' | 'output' | 'system';
  text: string;
  animating?: boolean;
}

const WELCOME = `Welcome to the interactive resume terminal. Type /help to see available commands.`;

interface DevTerminalProps {
  projects?: { title: string; description: string; tech?: string[] }[];
  onOpenProject?: (index: number) => void;
  className?: string;
}

const COMMANDS: Record<string, string> = {
  '/help': `Available commands:\n/help - show this help\n/about - summary\n/projects - list featured projects\n/open <n> - open project by number\n/skills - show core skills\n/experience - show work experience\n/contact - contact info\n/theme dark|light - switch theme (visual)\n/clear - clear the screen`,
  '/contact': `Contact:\nEmail: your.email@example.com\nGitHub: github.com/yourhandle\nLinkedIn: linkedin.com/in/yourhandle`,
  '/about': `Full-stack developer focused on building performant, accessible web applications with modern tooling.`
};

// Data snapshots (could be passed via props for reuse)
const PROJECTS = [
  { title: 'Netflix Portfolio', desc: 'Netflix-style portfolio (Next.js, Tailwind, Framer Motion)' },
  { title: 'E-Commerce Platform', desc: 'Full-stack commerce app (React, Node.js, Stripe)' },
  { title: 'Task Management App', desc: 'Real-time collaboration (Vue, WebSockets, PostgreSQL)' },
  { title: 'AI Chat Bot', desc: 'NLP powered assistant (Python, OpenAI API)' },
];

const SKILLS = {
  Frontend: ['React/Next.js', 'TypeScript', 'Tailwind', 'Accessibility'],
  Backend: ['Node.js', 'Python', 'PostgreSQL', 'MongoDB'],
  DevOps: ['Docker', 'CI/CD', 'AWS/Vercel'],
};

const EXPERIENCE = [
  { role: 'Senior Full Stack Developer', company: 'TechCorp Inc.', period: '2023 - Present' },
  { role: 'Frontend Developer', company: 'StartupXYZ', period: '2021 - 2023' },
  { role: 'Junior Developer', company: 'WebSolutions Ltd.', period: '2020 - 2021' },
];

export default function DevTerminal({ projects = [], onOpenProject, className = '' }: DevTerminalProps) {
  const [lines, setLines] = useState<TerminalLine[]>([{
    id: 'init',
    type: 'system',
    text: WELCOME,
  }]);
  const [current, setCurrent] = useState('');
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number | null>(null);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const animatingRef = useRef(false);
  const linesRef = useRef<TerminalLine[]>([]);
  linesRef.current = lines;

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [lines]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const genId = () => (typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `id-${Date.now()}-${Math.random().toString(16).slice(2)}`);

  const pushLine = (type: TerminalLine['type'], text: string) => {
    const newLine: TerminalLine = { id: genId(), type, text };
    setLines(prev => [...prev, newLine]);
  };

  // animated output (word-by-word for terminal feel per user request)
  const pushAnimatedLine = (text: string): Promise<void> => {
    return new Promise(resolve => {
      const words = text.split(/(\s+)/); // keep spaces
      const thisId = genId();
      setLines(prev => [...prev, { id: thisId, type: 'output', text: '', animating: true }]);
      animatingRef.current = true;
      let i = 0;
      const speed = 90; // ms per word (including spaces)
      const step = () => {
        i += 1;
        setLines(prev => prev.map(l => l.id === thisId ? { ...l, text: words.slice(0, i).join('') } : l));
        if (i < words.length) {
          setTimeout(step, speed);
        } else {
          setLines(prev => prev.map(l => l.id === thisId ? { ...l, animating: false } : l));
          animatingRef.current = false;
          resolve();
        }
      };
      if (!text.length) { resolve(); return; }
      setTimeout(step, speed);
    });
  };

  const handleCommand = async (raw: string) => {
    const cmd = raw.trim();
    if (!cmd) return;
  pushLine('input', `$ ${cmd}`);

    if (cmd === '/clear') {
      setLines([]);
      return;
    }

    if (cmd === '/projects') {
      const list = projects.length
        ? projects.map((p, i) => `${i + 1}. ${p.title} - ${p.description}`)
        : PROJECTS.map((p, i) => `${i + 1}. ${p.title} - ${p.desc}`);
      for (const line of list) { // sequential animation
        await pushAnimatedLine(line);
      }
      return;
    }

    if (cmd.startsWith('/open ')) {
      const num = parseInt(cmd.split(' ')[1], 10);
      if (!isNaN(num) && num > 0) {
        const idx = num - 1;
        const data = projects[idx] || PROJECTS[idx];
        if (data) {
          await pushAnimatedLine(`Opening project ${num}: ${data.title}`);
          onOpenProject?.(idx);
        } else {
          await pushAnimatedLine(`Project ${num} not found.`);
        }
      } else {
        await pushAnimatedLine('Usage: /open <project-number>. List with /projects');
      }
      return;
    }

    if (cmd === '/skills') {
      for (const [k,v] of Object.entries(SKILLS)) {
        await pushAnimatedLine(`${k}: ${v.join(', ')}`);
      }
      return;
    }

    if (cmd === '/experience') {
      for (const e of EXPERIENCE) {
        await pushAnimatedLine(`${e.role} @ ${e.company} (${e.period})`);
      }
      return;
    }

  if (cmd.startsWith('/theme ')) {
      const value = cmd.split(' ')[1];
      if (value === 'dark' || value === 'light') {
        setTheme(value);
    await pushAnimatedLine(`Theme set to ${value}`);
      } else {
    await pushAnimatedLine('Usage: /theme dark|light');
      }
      return;
    }

  if (COMMANDS[cmd]) { await pushAnimatedLine(COMMANDS[cmd]); return; }

  await pushAnimatedLine(`Unknown command: ${cmd}. Type /help`);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleCommand(current);
      if (current.trim()) {
        setHistory(h => [current, ...h]);
        setHistoryIndex(null);
      }
      setCurrent('');
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHistoryIndex(i => {
        const next = i === null ? 0 : Math.min(i + 1, history.length - 1);
        setCurrent(history[next] || '');
        return next;
      });
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHistoryIndex(i => {
        if (i === null) return null;
        const next = i - 1;
        if (next < 0) {
          setCurrent('');
          return null;
        }
        setCurrent(history[next] || '');
        return next;
      });
    }
  };

  const themeClasses = theme === 'dark'
    ? 'bg-black/60 border-blue-500/30'
    : 'bg-gray-100 text-gray-900 border-gray-400';

  return (
  <div className={`${themeClasses} rounded-lg flex flex-col overflow-hidden`} style={{ minHeight: '100vh', height: '100%', maxHeight: '100vh' }}>
      <div className="px-3 py-2 text-xs font-mono flex items-center gap-2 bg-gradient-to-r from-blue-900/40 to-cyan-900/20 border-b border-blue-500/20">
        <span className="text-green-400">●</span>
        <span className="text-yellow-400">●</span>
        <span className="text-red-400">●</span>
        <span className="text-blue-300 ml-2">dev-terminal by vidant ({theme})</span>
      </div>
  <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto p-4 pb-32 space-y-2 font-mono text-[13px] leading-relaxed relative">
        <div>
          {lines.map(line => (
            <div key={line.id} className={
              line.type === 'system' ? 'text-blue-300' : line.type === 'input' ? 'text-green-400' : 'text-gray-200 whitespace-pre-wrap'
            }>
              {line.text}
              {line.animating && line.type === 'output' && (
                <span className="inline-block w-2 h-4 bg-blue-300/60 ml-0.5 animate-pulse" />
              )}
            </div>
          ))}
        </div>
  <div className="sticky bottom-0 left-0 w-full bg-black pt-2 pb-2 flex items-center gap-2 text-sm" style={{ zIndex: 10 }}>
          <span className="text-green-400 select-none">$</span>
          <input
            ref={inputRef}
            value={current}
            onChange={e => setCurrent(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Type a command... (/help)"
            className="bg-transparent flex-1 outline-none text-gray-100 placeholder-gray-600"
            aria-label="Terminal input"
            autoComplete="off"
            spellCheck={false}
          />
        </div>
      </div>
    </div>
  );
}
