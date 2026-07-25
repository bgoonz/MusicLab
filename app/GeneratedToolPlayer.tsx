"use client";
/* eslint-disable react-hooks/exhaustive-deps */

import { Pause, Play, RotateCcw, Volume2 } from "lucide-react";
import { get as getChord } from "@tonaljs/chord";
import { useEffect, useRef, useState } from "react";
import { GeneratedToolSpec } from "../lib/tool-spec";

const NOTE_FREQUENCIES: Record<string, number> = {
  C: 261.63, "C#": 277.18, D: 293.66, "D#": 311.13, E: 329.63, F: 349.23,
  "F#": 369.99, G: 392, "G#": 415.3, A: 440, "A#": 466.16, B: 493.88,
};

export function GeneratedToolPlayer({
  tool,
  onBpmChange,
}: {
  tool: GeneratedToolSpec;
  onBpmChange: (bpm: number) => void;
}) {
  const config = tool.configuration;
  const [playing, setPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [remaining, setRemaining] = useState(config.sessionSeconds);
  const contextRef = useRef<AudioContext | null>(null);
  const timerRef = useRef<number | null>(null);
  const droneRef = useRef<{ oscillator: OscillatorNode; gain: GainNode } | null>(null);
  const chordSynthRef = useRef<{
    triggerAttackRelease: (notes: string[], duration: string) => void;
    dispose: () => void;
  } | null>(null);
  const positionRef = useRef(0);

  function context() {
    contextRef.current ??= new AudioContext();
    return contextRef.current;
  }

  function tone(frequency: number, duration = 0.06, volume = 0.16, waveform: OscillatorType = "sine") {
    const audio = context();
    const oscillator = audio.createOscillator();
    const gain = audio.createGain();
    oscillator.type = waveform;
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(volume, audio.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + duration);
    oscillator.connect(gain).connect(audio.destination);
    oscillator.start();
    oscillator.stop(audio.currentTime + duration);
  }

  function stopDrone() {
    const drone = droneRef.current;
    if (!drone) return;
    const now = context().currentTime;
    drone.gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.08);
    drone.oscillator.stop(now + 0.1);
    droneRef.current = null;
  }

  async function chordSynth() {
    if (chordSynthRef.current) return chordSynthRef.current;
    const Tone = await import("tone");
    await Tone.start();
    const synth = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: "triangle8" },
      envelope: { attack: 0.025, decay: 0.22, sustain: 0.24, release: 0.9 },
      volume: -13,
    }).toDestination();
    chordSynthRef.current = synth;
    return synth;
  }

  async function playChord(symbol: string) {
    const pitchClasses = getChord(symbol).notes;
    if (pitchClasses.length < 2) return;
    const notes = pitchClasses.slice(0, 6).map((note) => `${note}3`);
    const synth = await chordSynth();
    synth.triggerAttackRelease(notes, "2n");
  }

  async function toggle() {
    const audio = context();
    if (audio.state === "suspended") await audio.resume();
    if (config.chordProgression?.length) await chordSynth();
    setPlaying((current) => !current);
  }

  function reset() {
    setPlaying(false);
    setPosition(0);
    positionRef.current = 0;
    setRemaining(config.sessionSeconds);
  }

  // The audio graph is intentionally recreated when the generated configuration changes.
  useEffect(() => {
    if (!playing) {
      if (timerRef.current !== null) window.clearInterval(timerRef.current);
      timerRef.current = null;
      stopDrone();
      return;
    }

    if (config.type === "drone") {
      const audio = context();
      const oscillator = audio.createOscillator();
      const gain = audio.createGain();
      oscillator.type = config.waveform;
      oscillator.frequency.value = NOTE_FREQUENCIES[config.rootNote] ?? 440;
      gain.gain.setValueAtTime(0.0001, audio.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.12, audio.currentTime + 0.08);
      oscillator.connect(gain).connect(audio.destination);
      oscillator.start();
      droneRef.current = { oscillator, gain };
      return () => stopDrone();
    }

    const intervalMs = config.type === "timer" ? 1000 : 60_000 / config.bpm / (config.type === "rhythm" ? 4 : 1);
    const tick = () => {
      const current = positionRef.current;
      if (config.type === "timer") {
        setRemaining((value) => {
          if (value <= 1) {
            tone(880, 0.18, 0.2);
            setPlaying(false);
            return 0;
          }
          if (value % 10 === 0) tone(660, 0.05, 0.08);
          return value - 1;
        });
      } else if (config.type === "interval") {
        const root = NOTE_FREQUENCIES[config.rootNote] ?? 440;
        tone(current % 2 === 0 ? root : root * 2 ** (config.intervalSemitones / 12), 0.45, 0.14, config.waveform);
      } else if (config.type === "rhythm") {
        const hit = config.pattern[current % 16];
        if (hit) tone(hit === 2 ? 1120 : 760, 0.045, hit === 2 ? 0.2 : 0.12, "square");
      } else {
        const cycleBars = config.activeBars + config.silentBars;
        const beat = current % config.beatsPerBar;
        const bar = Math.floor(current / config.beatsPerBar) % cycleBars;
        if (bar < config.activeBars) {
          tone(beat === 0 ? 1080 : 720, 0.045, beat === 0 ? 0.2 : 0.12, "square");
          const chords = config.chordProgression ?? [];
          const chordEveryBars = config.chordEveryBars ?? 1;
          if (beat === 0 && bar % chordEveryBars === 0 && chords.length) {
            const chordIndex = Math.floor(bar / chordEveryBars) % chords.length;
            void playChord(chords[chordIndex]);
          }
        }
      }
      const max = config.type === "rhythm" ? 16 : config.type === "interval" ? 2 : (config.activeBars + config.silentBars) * config.beatsPerBar;
      positionRef.current = (current + 1) % Math.max(1, max);
      setPosition(positionRef.current);
    };
    tick();
    timerRef.current = window.setInterval(tick, intervalMs);
    return () => {
      if (timerRef.current !== null) window.clearInterval(timerRef.current);
      timerRef.current = null;
    };
  }, [playing, config]);

  // Audio nodes and timers are browser resources that must be released on unmount.
  useEffect(() => () => {
    if (timerRef.current !== null) window.clearInterval(timerRef.current);
    stopDrone();
    chordSynthRef.current?.dispose();
    chordSynthRef.current = null;
    void contextRef.current?.close();
  }, []);

  const beat = position % config.beatsPerBar;
  const bar = Math.floor(position / config.beatsPerBar) % Math.max(1, config.activeBars + config.silentBars);
  const isSilent = config.type === "metronome" && bar >= config.activeBars;
  const chords = config.chordProgression ?? [];
  const chordEveryBars = config.chordEveryBars ?? 1;
  const currentChordIndex = chords.length ? Math.floor(bar / chordEveryBars) % chords.length : -1;

  return (
    <section className="generated-player" aria-label={`${tool.title} test player`}>
      <div className="player-toolbar">
        <button className="player-play" onClick={() => void toggle()} aria-label={playing ? "Pause tool" : "Start tool"}>
          {playing ? <Pause size={22} fill="currentColor" /> : <Play size={22} fill="currentColor" />}
        </button>
        <div>
          <b>{playing ? "Tool running" : "Ready to test"}</b>
          <span>
            {config.type === "timer" && `${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, "0")} remaining`}
            {config.type === "drone" && `${config.rootNote} drone · ${config.waveform} tone`}
            {config.type === "interval" && `${config.rootNote} + ${config.intervalSemitones} semitones`}
            {config.type === "rhythm" && `Step ${position + 1} of 16`}
            {config.type === "metronome" && `Bar ${bar + 1} · Beat ${beat + 1} · ${isSilent ? "hold the pulse" : chords[currentChordIndex] ? chords[currentChordIndex] : "clicks on"}`}
          </span>
        </div>
        <button className="player-reset" onClick={reset} aria-label="Reset tool"><RotateCcw size={17} /> Reset</button>
      </div>

      {config.type !== "timer" && config.type !== "drone" && (
        <div className="tempo-control">
          <label htmlFor="generated-tempo"><strong>{config.bpm}</strong><span>BPM</span></label>
          <input
            id="generated-tempo"
            aria-label="Tempo"
            type="range"
            min={config.minBpm}
            max={config.maxBpm}
            value={config.bpm}
            onChange={(event) => onBpmChange(Number(event.target.value))}
          />
        </div>
      )}

      {config.type === "rhythm" && (
        <div className="pattern-grid" aria-label="Rhythm pattern">
          {config.pattern.map((hit, index) => <span key={index} className={`${hit ? "hit" : ""} ${hit === 2 ? "accent" : ""} ${position === index ? "current" : ""}`}>{index + 1}</span>)}
        </div>
      )}
      {config.type === "metronome" && (
        <>
          {chords.length > 0 && (
            <div className="chord-strip" aria-label="Chord progression">
              {chords.map((chord, index) => (
                <span key={`${chord}-${index}`} className={currentChordIndex === index && !isSilent ? "current" : ""}>{chord}</span>
              ))}
            </div>
          )}
          <div className="bar-grid" aria-label="Active and silent bars">
            {Array.from({ length: config.activeBars + config.silentBars }, (_, index) => (
              <span key={index} className={`${index >= config.activeBars ? "silent" : ""} ${bar === index ? "current" : ""}`}>
                {index >= config.activeBars ? "silent" : `bar ${index + 1}`}
              </span>
            ))}
          </div>
        </>
      )}
      {config.type === "drone" && <div className={`drone-orb ${playing ? "playing" : ""}`}><Volume2 size={30} /><strong>{config.rootNote}</strong></div>}
      <p className="player-instructions">{tool.instructions}</p>
    </section>
  );
}
