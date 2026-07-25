export type StarterExerciseKind =
  | "staff-notes"
  | "keyboard-notes"
  | "fretboard-notes"
  | "interval-ear"
  | "chord-ear"
  | "scale-ear";

export const STARTER_TOOLS = [
  {
    id: "starter-staff-note-sprint",
    title: "Staff Note Sprint",
    description: "Read notes on a compact staff and build fast pitch-name recognition.",
    category: "Sight-reading",
    starterKind: "staff-notes",
    searchTerms: "treble clef notation reading sheet music identify pitch notes staff",
  },
  {
    id: "starter-keyboard-note-finder",
    title: "Keyboard Note Finder",
    description: "Match requested note names to keys on a one-octave keyboard.",
    category: "Theory",
    starterKind: "keyboard-notes",
    searchTerms: "piano keys keyboard identify notes pitch location",
  },
  {
    id: "starter-fretboard-note-finder",
    title: "Fretboard Note Finder",
    description: "Identify notes from string-and-fret positions across the guitar neck.",
    category: "Theory",
    starterKind: "fretboard-notes",
    searchTerms: "guitar bass fret neck strings note identification memorize",
  },
  {
    id: "starter-interval-sound-lab",
    title: "Interval Sound Lab",
    description: "Hear ascending intervals and identify their musical distance.",
    category: "Ear training",
    starterKind: "interval-ear",
    searchTerms: "ear training recognize identify interval pitch distance singing",
  },
  {
    id: "starter-chord-quality-lab",
    title: "Chord Quality Lab",
    description: "Compare major, minor, diminished, dominant, and major-seventh chords by ear.",
    category: "Ear training",
    starterKind: "chord-ear",
    searchTerms: "ear training recognize identify chord harmony quality major minor seventh",
  },
  {
    id: "starter-scale-sound-lab",
    title: "Scale Sound Lab",
    description: "Distinguish major, minor, and pentatonic scale colors by listening.",
    category: "Ear training",
    starterKind: "scale-ear",
    searchTerms: "ear training recognize identify scales modes major minor pentatonic",
  },
] as const satisfies ReadonlyArray<{
  id: string;
  title: string;
  description: string;
  category: string;
  starterKind: StarterExerciseKind;
  searchTerms: string;
}>;
