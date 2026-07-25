"use client";

import {
  ArrowRight,
  AudioLines,
  Check,
  CircleUserRound,
  FileText,
  GitPullRequest,
  Headphones,
  ListMusic,
  Mic2,
  Music2,
  Pause,
  Play,
  Search,
  SlidersHorizontal,
  Sparkles,
  Timer,
  Upload,
  WandSparkles,
  X,
  Zap,
} from "lucide-react";
import { ChangeEvent, useMemo, useRef, useState } from "react";

type Tool = {
  title: string;
  description: string;
  category: string;
  icon: "timer" | "track" | "rhythm" | "ear";
  uses: string;
  tint: string;
  author: string;
  featured?: boolean;
};

const tools: Tool[] = [
  {
    title: "Accent Shift Metronome",
    description: "Move the accent through each beat to strengthen your internal pulse.",
    category: "Metronome",
    icon: "timer",
    uses: "2.4k",
    tint: "peach",
    author: "Maya R.",
    featured: true,
  },
  {
    title: "Slow-Down Looper",
    description: "Loop any tricky section and gradually bring it back to tempo.",
    category: "Play-along",
    icon: "track",
    uses: "1.8k",
    tint: "lavender",
    author: "Theo W.",
    featured: true,
  },
  {
    title: "Subdivision Trainer",
    description: "Hear and tap eighths, triplets, and sixteenths against a steady beat.",
    category: "Rhythm",
    icon: "rhythm",
    uses: "1.3k",
    tint: "blue",
    author: "Jamie L.",
    featured: true,
  },
  {
    title: "Interval Echo",
    description: "Listen, sing back, and identify intervals across your instrument.",
    category: "Ear training",
    icon: "ear",
    uses: "956",
    tint: "mint",
    author: "Noor A.",
  },
  {
    title: "Scale Sprint",
    description: "Build clean, even scales with adaptive tempo steps and rest cycles.",
    category: "Technique",
    icon: "timer",
    uses: "842",
    tint: "yellow",
    author: "Chris P.",
  },
  {
    title: "Chord Change Coach",
    description: "Practice difficult chord pairs inside a supportive backing groove.",
    category: "Play-along",
    icon: "track",
    uses: "731",
    tint: "pink",
    author: "Avery S.",
  },
];

const categories = ["All tools", "Metronome", "Play-along", "Rhythm", "Ear training", "Technique"];

function ToolIcon({ type }: { type: Tool["icon"] }) {
  if (type === "timer") return <Timer size={23} strokeWidth={1.9} />;
  if (type === "track") return <Headphones size={23} strokeWidth={1.9} />;
  if (type === "rhythm") return <AudioLines size={23} strokeWidth={1.9} />;
  return <Mic2 size={23} strokeWidth={1.9} />;
}

function ToolCard({ tool }: { tool: Tool }) {
  const [playing, setPlaying] = useState(false);
  return (
    <article className="tool-card">
      <div className={`tool-visual ${tool.tint}`}>
        <div className="wave-mark">
          <span /><span /><span /><span /><span />
        </div>
        <button
          className="round-play"
          aria-label={`${playing ? "Pause" : "Preview"} ${tool.title}`}
          onClick={() => setPlaying(!playing)}
        >
          {playing ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" />}
        </button>
      </div>
      <div className="tool-body">
        <div className="tool-category">
          <ToolIcon type={tool.icon} />
          <span>{tool.category}</span>
        </div>
        <h3>{tool.title}</h3>
        <p>{tool.description}</p>
        <div className="tool-meta">
          <span>by {tool.author}</span>
          <span><Zap size={13} fill="currentColor" /> {tool.uses} uses</span>
        </div>
      </div>
    </article>
  );
}

export default function Home() {
  const [activeCategory, setActiveCategory] = useState("All tools");
  const [query, setQuery] = useState("");
  const [transcript, setTranscript] = useState("");
  const [fileName, setFileName] = useState("");
  const [mode, setMode] = useState<"suggest" | "describe">("suggest");
  const [prompt, setPrompt] = useState("");
  const [step, setStep] = useState<"input" | "analyzing" | "suggestions">("input");
  const [notice, setNotice] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);

  const filteredTools = useMemo(() => {
    const normalized = query.toLowerCase();
    return tools.filter((tool) => {
      const matchesCategory = activeCategory === "All tools" || tool.category === activeCategory;
      const matchesSearch = `${tool.title} ${tool.description} ${tool.category}`.toLowerCase().includes(normalized);
      return matchesCategory && matchesSearch;
    });
  }, [activeCategory, query]);

  async function readFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    if (file.type.startsWith("text") || /\.(txt|md|srt|vtt)$/i.test(file.name)) {
      setTranscript(await file.text());
    } else {
      setTranscript("Audio lesson attached. Transcription will begin when the AI service is connected.");
    }
  }

  function buildTool() {
    if (!transcript.trim() && !prompt.trim()) {
      setNotice("Add a transcript or describe what you want to practice first.");
      return;
    }
    setNotice("");
    setStep("analyzing");
    window.setTimeout(() => setStep("suggestions"), 1100);
  }

  return (
    <main>
      <header className="site-header">
        <a className="brand" href="#top" aria-label="Practice Lab home">
          <span className="brand-mark"><Music2 size={21} /></span>
          <span>Practice <b>Lab</b></span>
        </a>
        <nav aria-label="Primary navigation">
          <a href="#discover">Discover</a>
          <a href="#how">How it works</a>
          <a href="#create">Build a tool</a>
        </nav>
        <div className="header-actions">
          <button className="icon-button" aria-label="Search tools" onClick={() => document.querySelector<HTMLInputElement>("#tool-search")?.focus()}>
            <Search size={20} />
          </button>
          <button className="avatar" aria-label="Open profile menu"><CircleUserRound size={22} /></button>
        </div>
      </header>

      <section className="hero" id="top">
        <div className="eyebrow"><Sparkles size={15} /> Practice what your lesson actually taught</div>
        <h1>Turn your lesson into<br /><em>your next breakthrough.</em></h1>
        <p className="hero-copy">Upload a lesson transcript. Practice Lab finds what matters and builds a personalized, interactive tool to help it stick.</p>
        <div className="hero-actions">
          <a className="button primary" href="#create">Build from my lesson <ArrowRight size={18} /></a>
          <a className="button secondary" href="#discover"><Play size={16} fill="currentColor" /> Explore community tools</a>
        </div>
        <div className="trust-row">
          <span className="faces"><i>J</i><i>M</i><i>A</i><i>T</i></span>
          <span><b>1,200+ musicians</b> are practicing smarter</span>
          <span className="stars">★★★★★</span>
        </div>
        <div className="hero-orbit orbit-one"><Music2 size={19} /></div>
        <div className="hero-orbit orbit-two"><AudioLines size={19} /></div>
        <div className="hero-orbit orbit-three"><Timer size={18} /></div>
      </section>

      <section className="builder-section" id="create">
        <div className="section-intro narrow">
          <span className="kicker">YOUR PRACTICE WORKSHOP</span>
          <h2>What did you work on today?</h2>
          <p>Bring in your lesson notes and let the AI turn the teaching moment into something you can practice with.</p>
        </div>

        <div className="builder-card">
          <div className="builder-tabs" role="tablist" aria-label="Tool creation mode">
            <button className={mode === "suggest" ? "active" : ""} onClick={() => setMode("suggest")} role="tab">
              <WandSparkles size={18} /> Suggest a tool
            </button>
            <button className={mode === "describe" ? "active" : ""} onClick={() => setMode("describe")} role="tab">
              <SlidersHorizontal size={18} /> Describe my own
            </button>
          </div>

          {step === "input" && (
            <div className="builder-content">
              <div className="step-label"><span>1</span> Add your lesson</div>
              <div className="input-grid">
                <button className={`upload-zone ${fileName ? "has-file" : ""}`} onClick={() => fileInput.current?.click()}>
                  <input ref={fileInput} hidden type="file" accept=".txt,.md,.srt,.vtt,.pdf,audio/*" onChange={readFile} />
                  {fileName ? <Check size={26} /> : <Upload size={26} />}
                  <b>{fileName || "Upload a transcript or recording"}</b>
                  <small>{fileName ? "Ready to analyze" : "TXT, VTT, PDF, MP3, M4A · up to 25 MB"}</small>
                </button>
                <div className="paste-panel">
                  <label htmlFor="transcript">Or paste your transcript</label>
                  <textarea id="transcript" value={transcript} onChange={(e) => setTranscript(e.target.value)} placeholder="Teacher: Let’s focus on keeping your right hand relaxed when the tempo increases..." />
                  <span>{transcript.length.toLocaleString()} characters</span>
                </div>
              </div>
              {mode === "describe" && (
                <div className="describe-field">
                  <label htmlFor="tool-prompt">What kind of tool should we build?</label>
                  <input id="tool-prompt" value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="A metronome that drops out every four bars..." />
                </div>
              )}
              {notice && <p className="form-notice">{notice}</p>}
              <button className="button primary analyze-button" onClick={buildTool}>
                <Sparkles size={18} /> {mode === "suggest" ? "Analyze my lesson" : "Build my practice tool"}
              </button>
              <p className="privacy-note"><Check size={13} /> Your lesson stays private. Only the finished tool is shared if you publish it.</p>
            </div>
          )}

          {step === "analyzing" && (
            <div className="analysis-state">
              <div className="analysis-pulse"><AudioLines size={32} /></div>
              <h3>Listening for the teaching moments…</h3>
              <p>Finding goals, friction points, and the best way to practice them.</p>
              <div className="progress-track"><span /></div>
            </div>
          )}

          {step === "suggestions" && (
            <div className="suggestion-state">
              <div className="suggestion-top">
                <div>
                  <span className="suggestion-label"><Sparkles size={14} /> AI recommendation</span>
                  <h3>Pulse Fade Trainer</h3>
                  <p>A metronome that gradually removes clicks, helping you hold a steady internal pulse as the tempo rises.</p>
                </div>
                <button className="close-button" aria-label="Start over" onClick={() => setStep("input")}><X size={20} /></button>
              </div>
              <div className="practice-preview">
                <div className="tempo-display"><strong>84</strong><span>BPM</span></div>
                <input aria-label="Tempo" type="range" min="50" max="160" defaultValue="84" />
                <button aria-label="Play practice tool"><Play size={20} fill="currentColor" /></button>
                <div className="preview-copy"><b>4 bars on · 2 bars silent</b><small>Difficulty rises after three clean rounds</small></div>
              </div>
              <div className="why-list">
                <span><Check size={15} /> Targets the timing drift mentioned in your lesson</span>
                <span><Check size={15} /> Starts below your current working tempo</span>
              </div>
              <div className="suggestion-actions">
                <button className="button secondary" onClick={() => setStep("input")}>Adjust idea</button>
                <button className="button primary" onClick={() => setNotice("Your tool is ready for the AI and GitHub services to be connected.")}>Build this tool <ArrowRight size={17} /></button>
              </div>
              {notice && <p className="success-notice">{notice}</p>}
            </div>
          )}
        </div>
      </section>

      <section className="how-section" id="how">
        <div className="section-intro">
          <span className="kicker">FROM LESSON TO REHEARSAL</span>
          <h2>Built for the way musicians learn</h2>
        </div>
        <div className="steps">
          <div><span className="step-icon coral"><FileText /></span><small>01</small><h3>Bring your lesson</h3><p>Upload a transcript, recording, or simply paste your notes.</p></div>
          <div><span className="step-icon purple"><Sparkles /></span><small>02</small><h3>Find the focus</h3><p>AI surfaces the key advice, challenge, and musical goal.</p></div>
          <div><span className="step-icon blue"><WandSparkles /></span><small>03</small><h3>Build your tool</h3><p>Get a focused practice experience you can use right away.</p></div>
          <div><span className="step-icon green"><GitPullRequest /></span><small>04</small><h3>Share the progress</h3><p>Publish it to the library so other musicians can benefit.</p></div>
        </div>
      </section>

      <section className="discover-section" id="discover">
        <div className="discover-heading">
          <div>
            <span className="kicker">MADE BY MUSICIANS, FOR MUSICIANS</span>
            <h2>Find your next practice tool</h2>
          </div>
          <a href="#library">View all tools <ArrowRight size={17} /></a>
        </div>
        <div className="library-controls" id="library">
          <div className="category-row">
            {categories.map((category) => (
              <button key={category} className={activeCategory === category ? "active" : ""} onClick={() => setActiveCategory(category)}>
                {category}
              </button>
            ))}
          </div>
          <label className="search-field" htmlFor="tool-search">
            <Search size={17} />
            <input id="tool-search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search tools" />
          </label>
        </div>
        <div className="tool-grid">
          {filteredTools.map((tool) => <ToolCard key={tool.title} tool={tool} />)}
        </div>
        {filteredTools.length === 0 && <div className="empty-state"><ListMusic size={28} /><b>No tools match that search yet.</b><span>Try another category or a broader phrase.</span></div>}
      </section>

      <section className="cta-section">
        <div>
          <span className="kicker">YOUR LESSON IS FULL OF POSSIBILITIES</span>
          <h2>Ready to practice what matters?</h2>
          <p>Turn today’s insight into tomorrow’s muscle memory.</p>
        </div>
        <a className="button light" href="#create">Build your first tool <ArrowRight size={18} /></a>
      </section>

      <footer>
        <a className="brand" href="#top"><span className="brand-mark"><Music2 size={20} /></span><span>Practice <b>Lab</b></span></a>
        <p>Personal practice tools, built from real teaching moments.</p>
        <div><a href="#discover">Discover</a><a href="#how">How it works</a><a href="#create">Build a tool</a></div>
        <small>© 2026 Practice Lab · Made with care for musicians everywhere.</small>
      </footer>
    </main>
  );
}
