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
// 5. Volume slider
// ---------------------------------------------------

const volumeSlider = document.getElementById("volume-slider");

volumeSlider.addEventListener("input", () => {
  const newVolume = Number(volumeSlider.value);
  synth.volume.value = newVolume;
  console.log("Volume set to: " + newVolume + " dB");
});