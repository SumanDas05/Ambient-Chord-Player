// ===================================================
// AMBIENT CHORD PLAYER — script.js
// ===================================================

// ---------------------------------------------------
// 1. Synth setup (base sound engine)
// ---------------------------------------------------

const synth = new Tone.PolySynth(Tone.Synth, {
  oscillator: { type: "sine" },
  envelope: { attack: 1.5, decay: 0.3, sustain: 0.9, release: 3 }
});

synth.volume.value = -8; // slightly quieter, easier to sing over

// Low-pass filter: cuts harsh high frequencies for a warmer, rounder tone
const filter = new Tone.Filter({
  frequency: 800,
  type: "lowpass"
});

// Reverb: adds a sense of space
const reverb = new Tone.Reverb({
  decay: 4,
  wet: 0.4
}).toDestination();

// Signal chain: synth -> filter -> reverb -> speakers
synth.chain(filter, reverb);

// ---------------------------------------------------
// 2. Instrument presets ("tones") — like voices on a keyboard
// ---------------------------------------------------

const instrumentPresets = {
  pad: {
    oscillator: { type: "sine" },
    envelope: { attack: 1.5, decay: 0.3, sustain: 0.9, release: 3 }
  },
  piano: {
    oscillator: { type: "triangle" },
    envelope: { attack: 0.02, decay: 0.3, sustain: 0.3, release: 1.2 }
  },
  pluck: {
    oscillator: { type: "square" },
    envelope: { attack: 0.01, decay: 0.5, sustain: 0.1, release: 0.8 }
  },
  strings: {
    oscillator: { type: "sawtooth" },
    envelope: { attack: 0.8, decay: 0.4, sustain: 0.8, release: 2 }
  }
};

// List of instrument names, in order, so we can "step through" them with Spacebar
const instrumentNames = Object.keys(instrumentPresets);

// Tracks which instrument is currently selected (by position in the list)
let currentInstrumentIndex = 0; // starts at "pad"

const instrumentButtons = document.querySelectorAll(".instrument-btn");

// Switches the synth to a given instrument preset, and updates UI + tracking
function selectInstrument(instrumentName) {
  synth.set(instrumentPresets[instrumentName]);

  instrumentButtons.forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.instrument === instrumentName);
  });

  currentInstrumentIndex = instrumentNames.indexOf(instrumentName);

  console.log("Instrument switched to: " + instrumentName);
}

// Moves to the next instrument in the list, wrapping back to the start at the end
function selectNextInstrument() {
  currentInstrumentIndex = (currentInstrumentIndex + 1) % instrumentNames.length;
  selectInstrument(instrumentNames[currentInstrumentIndex]);
}

instrumentButtons.forEach((button) => {
  button.addEventListener("click", () => {
    selectInstrument(button.dataset.instrument);
  });
});

// ---------------------------------------------------
// 3. Chord toggle logic (only ONE chord plays at a time)
// ---------------------------------------------------

const chordButtons = document.querySelectorAll(".chord-btn");

let currentlyPlayingButton = null;

function stopChord(button) {
  const notes = button.dataset.notes.split(",");
  synth.triggerRelease(notes);
  button.classList.remove("active");
  console.log(button.textContent + " chord stopped.");
}

function startChord(button) {
  const notes = button.dataset.notes.split(",");
  synth.triggerAttack(notes);
  button.classList.add("active");
  currentlyPlayingButton = button;
  console.log(button.textContent + " chord started.");
}

function toggleChord(button) {
  Tone.start();

  if (currentlyPlayingButton === button) {
    stopChord(button);
    currentlyPlayingButton = null;
  } else {
    if (currentlyPlayingButton !== null) {
      stopChord(currentlyPlayingButton);
    }
    startChord(button);
  }
}

chordButtons.forEach((button) => {
  button.addEventListener("click", () => {
    toggleChord(button);
  });
});

// ---------------------------------------------------
// 4. Keyboard support (chords + Spacebar instrument cycling)
// ---------------------------------------------------

const keysPhysicallyDown = new Set();

window.addEventListener("keydown", (event) => {
  const key = event.key.toLowerCase();

  if (keysPhysicallyDown.has(key)) return; // ignore repeats while held
  keysPhysicallyDown.add(key);

  // Spacebar -> cycle to next instrument
  if (key === " ") {
    event.preventDefault(); // stop page from scrolling on Space
    selectNextInstrument();
    return;
  }

  // Otherwise, check if the key matches a chord button
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
// ---------------------------------------------------
// 5. Stop All button
// ---------------------------------------------------

const stopAllButton = document.getElementById("stop-all-btn");

stopAllButton.addEventListener("click", () => {
  // If a chord is currently playing, stop just that one properly
  // (updates its "active" styling and clears our tracking variable)
  if (currentlyPlayingButton !== null) {
    stopChord(currentlyPlayingButton);
    currentlyPlayingButton = null;
  }

  // releaseAll() is a safety net built into Tone.PolySynth — it immediately
  // silences EVERY note currently sounding, even ones we might have lost
  // track of due to an edge case (e.g., a missed keyup event). Good for a 
  // reliable "panic button."
  synth.releaseAll();

  console.log("All sounds stopped.");
});

// ---------------------------------------------------
// 6. Volume slider
// ---------------------------------------------------

const volumeSlider = document.getElementById("volume-slider");

// "input" fires continuously WHILE the user drags the slider (not just 
// when they let go), so the volume updates live and feels responsive.
volumeSlider.addEventListener("input", () => {
  // Slider values come in as text by default; Number() converts it 
  // to an actual number so Tone.js can use it correctly.
  const newVolume = Number(volumeSlider.value);
  synth.volume.value = newVolume;
  console.log("Volume set to: " + newVolume + " dB");
});