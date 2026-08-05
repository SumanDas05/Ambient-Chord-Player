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

synth.volume.value = -8;

const filter = new Tone.Filter({
  frequency: 800,
  type: "lowpass"
});

const reverb = new Tone.Reverb({
  decay: 4,
  wet: 0.4
}).toDestination();

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

const instrumentNames = Object.keys(instrumentPresets);
let currentInstrumentIndex = 0;

const instrumentButtons = document.querySelectorAll(".instrument-btn");

function selectInstrument(instrumentName) {
  synth.set(instrumentPresets[instrumentName]);

  instrumentButtons.forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.instrument === instrumentName);
  });

  currentInstrumentIndex = instrumentNames.indexOf(instrumentName);

  console.log("Instrument switched to: " + instrumentName);
}

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
// 3. Transpose — shifts ALL chords up/down by semitones
// ---------------------------------------------------

let transposeAmount = 0;

const transposeDisplay = document.getElementById("transpose-display");
const transposeUpButton = document.getElementById("transpose-up");
const transposeDownButton = document.getElementById("transpose-down");

// Takes an array of note names (e.g. ["C4","E4","G4"]) and returns a NEW
// array with each note shifted by transposeAmount semitones.
function getTransposedNotes(notes) {
  return notes.map((note) => {
    return Tone.Frequency(note).transpose(transposeAmount).toNote();
  });
}

function updateTransposeDisplay() {
  const sign = transposeAmount > 0 ? "+" : "";
  transposeDisplay.textContent = "Key: " + sign + transposeAmount;
}

// ---------------------------------------------------
// 4. Chord toggle logic (only ONE chord plays at a time)
// ---------------------------------------------------

const chordButtons = document.querySelectorAll(".chord-btn");
let currentlyPlayingButton = null;

// Remembers the EXACT transposed notes currently sounding, so we can 
// reliably release/update them later — even after transpose changes.
let currentlyPlayingNotes = null;

function stopChord(button) {
  synth.triggerRelease(currentlyPlayingNotes);
  button.classList.remove("active");
  console.log(button.textContent + " chord stopped.");
  currentlyPlayingNotes = null;
}

function startChord(button) {
  const originalNotes = button.dataset.notes.split(",");
  const notes = getTransposedNotes(originalNotes);
  synth.triggerAttack(notes);
  button.classList.add("active");
  currentlyPlayingButton = button;
  currentlyPlayingNotes = notes;
  console.log(button.textContent + " chord started (transposed: " + notes.join(", ") + ")");
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
// 5. Transpose buttons — also live-updates a playing chord
// ---------------------------------------------------

// Re-pitches the currently playing chord (if any) to match the new 
// transpose amount, without needing to stop and manually restart it.
function retriggerCurrentChordIfPlaying() {
  if (currentlyPlayingButton === null) return; // nothing playing, nothing to do

  synth.triggerRelease(currentlyPlayingNotes);

  const originalNotes = currentlyPlayingButton.dataset.notes.split(",");
  const newNotes = getTransposedNotes(originalNotes);
  synth.triggerAttack(newNotes);

  currentlyPlayingNotes = newNotes;
}

transposeUpButton.addEventListener("click", () => {
  transposeAmount++;
  updateTransposeDisplay();
  retriggerCurrentChordIfPlaying();
  console.log("Transpose set to: " + transposeAmount);
});

transposeDownButton.addEventListener("click", () => {
  transposeAmount--;
  updateTransposeDisplay();
  retriggerCurrentChordIfPlaying();
  console.log("Transpose set to: " + transposeAmount);
});

// ---------------------------------------------------
// 6. Keyboard support (chords + Spacebar instrument cycling)
// ---------------------------------------------------

const keysPhysicallyDown = new Set();

window.addEventListener("keydown", (event) => {
  const key = event.key.toLowerCase();

  if (keysPhysicallyDown.has(key)) return;
  keysPhysicallyDown.add(key);

  if (key === " ") {
    event.preventDefault();
    selectNextInstrument();
    return;
  }

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
// 7. Volume slider
// ---------------------------------------------------

const volumeSlider = document.getElementById("volume-slider");

volumeSlider.addEventListener("input", () => {
  const newVolume = Number(volumeSlider.value);
  synth.volume.value = newVolume;
  console.log("Volume set to: " + newVolume + " dB");
});