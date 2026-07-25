"use client";

import { Headphones, Play, RotateCcw } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { StarterExerciseKind } from "../lib/starter-catalog";

const NOTES = ["C", "D", "E", "F", "G", "A", "B"];
const CHROMATIC = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const INTERVALS = [
  { name: "minor 2nd", semitones: 1 },
  { name: "major 2nd", semitones: 2 },
  { name: "minor 3rd", semitones: 3 },
  { name: "major 3rd", semitones: 4 },
  { name: "perfect 4th", semitones: 5 },
  { name: "perfect 5th", semitones: 7 },
  { name: "octave", semitones: 12 },
];
const CHORDS = [
  { name: "major", offsets: [0, 4, 7] },
  { name: "minor", offsets: [0, 3, 7] },
  { name: "diminished", offsets: [0, 3, 6] },
  { name: "dominant 7th", offsets: [0, 4, 7, 10] },
  { name: "major 7th", offsets: [0, 4, 7, 11] },
];
const SCALES = [
  { name: "major", offsets: [0, 2, 4, 5, 7, 9, 11, 12] },
  { name: "natural minor", offsets: [0, 2, 3, 5, 7, 8, 10, 12] },
  { name: "major pentatonic", offsets: [0, 2, 4, 7, 9, 12] },
  { name: "minor pentatonic", offsets: [0, 3, 5, 7, 10, 12] },
];
const STRINGS = [
  { name: "Low E", midi: 40 },
  { name: "A", midi: 45 },
  { name: "D", midi: 50 },
  { name: "G", midi: 55 },
  { name: "B", midi: 59 },
  { name: "High E", midi: 64 },
];

function noteName(midi: number) {
  return CHROMATIC[(midi % 12 + 12) % 12];
}

export function StarterExercisePlayer({ kind }: { kind: StarterExerciseKind }) {
  const [question, setQuestion] = useState(0);
  const [score, setScore] = useState({ correct: 0, total: 0 });
  const [feedback, setFeedback] = useState("");
  const synthRef = useRef<{ dispose: () => void } | null>(null);

  const exercise = useMemo(() => {
    const rootMidi = 60 + (question % 7);
    if (kind === "staff-notes") {
      const answer = NOTES[question % NOTES.length];
      return { answer, choices: NOTES, prompt: "Name the note on the staff", rootMidi };
    }
    if (kind === "keyboard-notes") {
      const answer = NOTES[(question * 3 + 2) % NOTES.length];
      return { answer, choices: NOTES, prompt: `Press ${answer} on the keyboard`, rootMidi };
    }
    if (kind === "fretboard-notes") {
      const string = STRINGS[question % STRINGS.length];
      const fret = (question * 5 + 3) % 12;
      const answer = noteName(string.midi + fret);
      return { answer, choices: CHROMATIC, prompt: `${string.name} string · fret ${fret}`, rootMidi };
    }
    if (kind === "interval-ear") {
      const item = INTERVALS[question % INTERVALS.length];
      return { answer: item.name, choices: INTERVALS.map((value) => value.name), prompt: "Identify the ascending interval", rootMidi, offsets: [0, item.semitones] };
    }
    if (kind === "chord-ear") {
      const item = CHORDS[question % CHORDS.length];
      return { answer: item.name, choices: CHORDS.map((value) => value.name), prompt: "Identify the chord quality", rootMidi, offsets: item.offsets };
    }
    const item = SCALES[question % SCALES.length];
    return { answer: item.name, choices: SCALES.map((value) => value.name), prompt: "Identify the scale", rootMidi, offsets: item.offsets };
  }, [kind, question]);

  async function playAudio() {
    const Tone = await import("tone");
    await Tone.start();
    const offsets = exercise.offsets ?? [0];
    if (kind === "chord-ear") {
      const synth = new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: "triangle8" },
        envelope: { attack: 0.02, decay: 0.2, sustain: 0.28, release: 0.8 },
        volume: -12,
      }).toDestination();
      synthRef.current = synth;
      synth.triggerAttackRelease(offsets.map((offset) => Tone.Frequency(exercise.rootMidi + offset, "midi").toNote()), "2n");
      window.setTimeout(() => synth.dispose(), 1500);
      return;
    }
    const synth = new Tone.Synth({
      oscillator: { type: "triangle8" },
      envelope: { attack: 0.015, decay: 0.15, sustain: 0.25, release: 0.45 },
      volume: -10,
    }).toDestination();
    synthRef.current = synth;
    offsets.forEach((offset, index) => {
      synth.triggerAttackRelease(Tone.Frequency(exercise.rootMidi + offset, "midi").toNote(), "8n", Tone.now() + index * 0.42);
    });
    window.setTimeout(() => synth.dispose(), Math.max(1000, offsets.length * 430 + 500));
  }

  function answer(choice: string) {
    if (feedback) return;
    const correct = choice === exercise.answer;
    setScore((current) => ({ correct: current.correct + (correct ? 1 : 0), total: current.total + 1 }));
    setFeedback(correct ? "Correct — nice work." : `The answer is ${exercise.answer}.`);
  }

  function next() {
    setQuestion((value) => value + 1);
    setFeedback("");
  }

  function reset() {
    setQuestion(0);
    setScore({ correct: 0, total: 0 });
    setFeedback("");
  }

  const audioExercise = kind === "interval-ear" || kind === "chord-ear" || kind === "scale-ear";

  return (
    <section className="starter-exercise" aria-label="Interactive music exercise">
      <div className="exercise-status">
        <span>Question {score.total + 1}</span>
        <b>{score.correct} / {score.total} correct</b>
        <button onClick={reset}><RotateCcw size={14} /> Reset</button>
      </div>
      <div className="exercise-prompt">
        {audioExercise ? <Headphones size={30} /> : <span className="exercise-clef">𝄞</span>}
        <h3>{exercise.prompt}</h3>
        {kind === "staff-notes" && (
          <div className="mini-staff" aria-label={`A note for the user to identify`}>
            {Array.from({ length: 5 }, (_, index) => <i key={index} />)}
            <b style={{ bottom: `${16 + (question % 7) * 6}px` }}>●</b>
          </div>
        )}
        {kind === "fretboard-notes" && <div className="fret-marker"><span /><span /><span /><b>●</b><span /><span /></div>}
        {audioExercise && <button className="listen-button" onClick={() => void playAudio()}><Play size={17} fill="currentColor" /> Hear it</button>}
      </div>
      <div className={`exercise-choices ${kind === "keyboard-notes" ? "piano-choices" : ""}`}>
        {exercise.choices.map((choice) => (
          <button key={choice} disabled={!!feedback} onClick={() => answer(choice)}>{choice}</button>
        ))}
      </div>
      {feedback && (
        <div className={`exercise-feedback ${feedback.startsWith("Correct") ? "correct" : ""}`}>
          <span>{feedback}</span><button onClick={next}>Next question</button>
        </div>
      )}
    </section>
  );
}
