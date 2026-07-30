// ===================================================
// AMBIENT CHORD PLAYER — script.js
// ===================================================

// ---------------------------------------------------
// 1. Synth setup (soft, ambient pad-style sound)
// ---------------------------------------------------

// PolySynth lets us play multiple notes together (a chord).
// We configure the oscillator and envelope to sound soft and sustained,
// rather than sharp and percussive.
const synth = new Tone.PolySynth(Tone.Synth, {
  oscillator: {
    type: "sine" // smooth, gentle waveform — no harsh edges
  },
  envelope: {
    attack: 1.5,   // slow swell-in (seconds)
    decay: 0.3,    // brief settle after the swell
    sustain: 0.9,  // stays strong and steady while sustained
    release: 3     // slow, gentle fade-out when stopped
  }
});

// Lower overall volume (in decibels) — makes it easier to sing over
synth.volume.value = -8;

// Low-pass filter: cuts harsh high frequencies for a warmer, rounder tone
const filter = new Tone.Filter({
  frequency: 800,
  type: "lowpass"
});

// Reverb: adds a sense of space, like playing in a large, ambient room
const reverb = new Tone.Reverb({
  decay: 4,   // length of the reverb "tail"
  wet: 0.4    // how much reverb is mixed in (0 = none, 1 = fully wet)
}).toDestination();

// Signal chain: synth -> filter -> reverb -> speakers
synth.chain(filter, reverb);

// ---------------------------------------------------
// 2. Chord toggle logic (only ONE chord plays at a time)
// ---------------------------------------------------

// Grabs every button with class "chord-btn" from the page
const chordButtons = document.querySelectorAll(".chord-btn");

// Tracks which single button is currently playing (or null if none)
let currentlyPlayingButton = null;

// Stops the chord on a given button, with a smooth fade-out
function stopChord(button) {
  const notes = button.dataset.notes.split(",");
  synth.triggerRelease(notes);
  button.classList.remove("active");
  console.log(button.textContent + " chord stopped.");
}

// Starts the chord on a given button, and lets it sustain indefinitely
function startChord(button) {
  const notes = button.dataset.notes.split(",");
  synth.triggerAttack(notes);
  button.classList.add("active");
  currentlyPlayingButton = button;
  console.log(button.textContent + " chord started.");
}

// Decides whether to start, stop, or switch chords based on current state
function toggleChord(button) {
  Tone.start(); // unlocks audio (required after a user gesture)

  if (currentlyPlayingButton === button) {
    // Clicking the SAME chord that's already playing -> stop it
    stopChord(button);
    currentlyPlayingButton = null;

  } else {
    // Clicking a DIFFERENT chord -> stop the old one first, then start the new one
    if (currentlyPlayingButton !== null) {
      stopChord(currentlyPlayingButton);
    }
    startChord(button);
  }
}

// ---------------------------------------------------
// 3. Mouse click support
// ---------------------------------------------------

chordButtons.forEach((button) => {
  button.addEventListener("click", () => {
    toggleChord(button);
  });
});

// ---------------------------------------------------
// 4. Keyboard support
// ---------------------------------------------------

// Tracks which keys are physically held down right now, so holding a key
// doesn't repeatedly re-toggle the chord (keyboards auto-repeat keydown
// events while a key is held).
const keysPhysicallyDown = new Set();

window.addEventListener("keydown", (event) => {
  const key = event.key.toLowerCase();

  if (keysPhysicallyDown.has(key)) return; // ignore repeats while held
  keysPhysicallyDown.add(key);

  chordButtons.forEach((button) => {
    if (button.dataset.key === key) {
      toggleChord(button);
    }
  });
});

window.addEventListener("keyup", (event) => {
  const key = event.key.toLowerCase();
  keysPhysicallyDown.delete(key);
});