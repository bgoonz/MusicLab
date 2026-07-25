ALTER TABLE `practice_tools` ADD `manifest_json` text;--> statement-breakpoint
ALTER TABLE `practice_tools` ADD `author_name` text;--> statement-breakpoint
INSERT OR IGNORE INTO `practice_tools`
(`id`, `slug`, `title`, `description`, `category`, `source_path`, `manifest_json`,
 `author_id`, `author_name`, `status`, `use_count`, `created_at`, `published_at`)
SELECT
  'c-g-am-f-chord-change-drill-ms0mbhky',
  'c-g-am-f-chord-change-drill-ms0mbhky',
  'C–G–Am–F Chord Change Drill',
  'Practice four steady beats per chord at 72 BPM, with extra focus on the G-to-Am transition.',
  'Metronome',
  'generated-tools/c-g-am-f-chord-change-drill-ms0mbhky.json',
  '{"title":"C–G–Am–F Chord Change Drill","description":"Practice four steady beats per chord at 72 BPM, with extra focus on the G-to-Am transition.","category":"Metronome","why":["A metronome keeps the four-beat chord structure steady.","The fixed starting tempo supports clean repetitions before speeding up.","The repeated progression isolates the rushed G-to-Am change."],"instructions":"Set your metronome to 72 BPM. Play C for 4 beats, G for 4, Am for 4, and F for 4, then repeat. Count aloud and prepare the next chord during beat 4 without rushing. Complete 3 clean repetitions; only then raise the tempo by 4 BPM. If you stumble, return to 72 BPM.","configuration":{"type":"metronome","bpm":72,"minBpm":72,"maxBpm":100,"beatsPerBar":4,"activeBars":4,"silentBars":0,"sessionSeconds":600,"rootNote":"C","waveform":"triangle","intervalSemitones":1,"pattern":[1,0,0,0,1,0,0,0,1,0,0,0,1,0,0,0]},"id":"c-g-am-f-chord-change-drill-ms0mbhky","slug":"c-g-am-f-chord-change-drill-ms0mbhky","version":1}',
  `user_id`,
  CASE WHEN instr(`user_id`, '@') > 1 THEN substr(`user_id`, 1, instr(`user_id`, '@') - 1) ELSE 'Practice Lab musician' END,
  'published',
  0,
  `created_at`,
  `created_at`
FROM `github_publications`
WHERE `tool_id` = 'c-g-am-f-chord-change-drill-ms0mbhky'
ORDER BY `created_at` DESC
LIMIT 1;
