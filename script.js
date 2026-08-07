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
// ---------------------------------------------------
// 7. Sing to Play — microphone pitch detection
// ---------------------------------------------------

const micToggleButton = document.getElementById("mic-toggle-btn");
const pitchDisplay = document.getElementById("pitch-display");

let micStream = null;
let micAnalyser = null;
let pitchLoopId = null;

// Tracks the most recently detected note LETTER, and how many frames in a 
// row it's stayed the same — used to avoid switching chords too rapidly.
let lastDetectedLetter = null;
let stableFrameCount = 0;
const REQUIRED_STABLE_FRAMES = 8; // roughly ~130ms of steady singing before switching

// -----------------------------------------------------------------
// Pitch detection algorithm: autocorrelation
// This compares the audio wave against shifted copies of itself to 
// find how far it has to shift before it "lines up" again — that 
// shift distance tells us the pitch's wavelength, and from that, 
// its frequency.
// -----------------------------------------------------------------
function detectPitch(buffer, sampleRate) {
  const size = buffer.length;

  // First, check if there's even enough volume to be a real singing voice
  // (this is called RMS - root mean square - a measure of loudness)
  let rms = 0;
  for (let i = 0; i < size; i++) {
    rms += buffer[i] * buffer[i];
  }
  rms = Math.sqrt(rms / size);
  if (rms < 0.01) return -1; // too quiet — probably silence/background noise

  // Trim silence from the start/end of this audio chunk
  let start = 0;
  let end = size - 1;
  const threshold = 0.2;
  for (let i = 0; i < size / 2; i++) {
    if (Math.abs(buffer[i]) >= threshold) { start = i; break; }
  }
  for (let i = 1; i < size / 2; i++) {
    if (Math.abs(buffer[size - i]) >= threshold) { end = size - i; break; }
  }
  const trimmed = buffer.slice(start, end);
  const trimmedSize = trimmed.length;

  // Core autocorrelation: for each possible "shift" amount, measure how 
  // similar the wave is to itself at that shift
  const correlations = new Array(trimmedSize).fill(0);
  for (let shift = 0; shift < trimmedSize; shift++) {
    for (let i = 0; i < trimmedSize - shift; i++) {
      correlations[shift] += trimmed[i] * trimmed[i + shift];
    }
  }

  // Find the first dip, then the strongest peak after it — that peak's 
  // position is our best estimate of the pitch's wavelength (in samples)
  let d = 0;
  while (d < correlations.length - 1 && correlations[d] > correlations[d + 1]) d++;

  let bestShift = -1;
  let bestValue = -1;
  for (let i = d; i < trimmedSize; i++) {
    if (correlations[i] > bestValue) {
      bestValue = correlations[i];
      bestShift = i;
    }
  }

  if (bestShift <= 0) return -1; // couldn't find a clear pitch

  return sampleRate / bestShift; // convert wavelength -> frequency (Hz)
}

// -----------------------------------------------------------------
// Starts listening to the microphone
// -----------------------------------------------------------------
async function startListening() {
  try {
    micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
  } catch (err) {
    alert("Microphone access was blocked or unavailable. Please allow microphone permission and try again.");
    return;
  }

  await Tone.start(); // make sure the audio engine is running

  // We reuse Tone.js's existing audio context rather than creating a 
  // separate one, since Tone.js is already managing audio for our chords
  const audioContext = Tone.getContext().rawContext;
  const micSource = audioContext.createMediaStreamSource(micStream);

  micAnalyser = audioContext.createAnalyser();
  micAnalyser.fftSize = 2048; // how many audio samples we analyze per chunk

  // We connect the mic INTO the analyser only — NOT to the speakers. 
  // Connecting it further would cause your own voice to play back out 
  // loud, causing an echo/feedback loop.
  micSource.connect(micAnalyser);

  runPitchDetectionLoop();

  micToggleButton.textContent = "⏹ Stop Listening";
  micToggleButton.classList.add("active");
}

// -----------------------------------------------------------------
// Stops listening and releases the microphone
// -----------------------------------------------------------------
function stopListening() {
  if (pitchLoopId) cancelAnimationFrame(pitchLoopId);

  if (micStream) {
    // Stopping every audio "track" fully releases the mic (turns off 
    // the browser's mic indicator/light)
    micStream.getTracks().forEach((track) => track.stop());
  }

  micStream = null;
  pitchDisplay.textContent = "";
  micToggleButton.textContent = "🎤 Sing to Play";
  micToggleButton.classList.remove("active");
}

micToggleButton.addEventListener("click", () => {
  if (micStream) {
    stopListening();
  } else {
    startListening();
  }
});

// -----------------------------------------------------------------
// Runs continuously while listening: reads mic audio, detects pitch, 
// updates the display, and triggers a chord change when appropriate
// -----------------------------------------------------------------
function runPitchDetectionLoop() {
  const buffer = new Float32Array(micAnalyser.fftSize);
  micAnalyser.getFloatTimeDomainData(buffer);

  const sampleRate = Tone.getContext().rawContext.sampleRate;
  const frequency = detectPitch(buffer, sampleRate);

  if (frequency !== -1) {
    const noteName = Tone.Frequency(frequency).toNote(); // e.g. "G3", "C#4"
    const letter = noteName[0].toLowerCase(); // just the note letter

    pitchDisplay.textContent = "You're singing: " + noteName;
    handleDetectedLetter(letter);
  } else {
    pitchDisplay.textContent = "Listening...";
    lastDetectedLetter = null;
    stableFrameCount = 0;
  }

  // requestAnimationFrame schedules this function to run again on the 
  // next screen refresh (~60 times per second) — a smooth, efficient loop
  pitchLoopId = requestAnimationFrame(runPitchDetectionLoop);
}

// -----------------------------------------------------------------
// Only switches chords once the same note has been detected steadily 
// for several frames in a row — prevents nervous flickering between 
// chords due to natural pitch wobble in your voice
// -----------------------------------------------------------------
function handleDetectedLetter(letter) {
  if (letter === lastDetectedLetter) {
    stableFrameCount++;
  } else {
    lastDetectedLetter = letter;
    stableFrameCount = 0;
  }

  if (stableFrameCount === REQUIRED_STABLE_FRAMES) {
    playChordForLetter(letter);
  }
}

// -----------------------------------------------------------------
// Finds and plays the chord matching a detected note letter
// -----------------------------------------------------------------
function playChordForLetter(letter) {
  // Our 6 chords' root notes are C, A, F, G, D, E. There's no chord 
  // rooted on B (we skip the uncommon B diminished chord), so we 
  // redirect B toward Em, which contains B as one of its notes.
  const key = (letter === "b") ? "e" : letter;

  const matchedButton = Array.from(chordButtons).find(
    (btn) => btn.dataset.key === key
  );
  if (!matchedButton) return;

  if (currentlyPlayingButton === matchedButton) return; // already playing it

  if (currentlyPlayingButton !== null) {
    stopChord(currentlyPlayingButton);
  }
  startChord(matchedButton);
}