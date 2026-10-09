// ===================================================
// EFFECTS STUDIO — effects.js
// Builds the effects chain and connects the UI controls.
// Must be loaded AFTER Tone.js and BEFORE script.js.
// ===================================================

// ---------------------------------------------------
// 1. Create the effects (each one is an audio "node")
// ---------------------------------------------------

// effectsBus is the single entry point of our effects chain. Anything that
// should get effects (the chord synth now, other sounds later) connects here.
const effectsBus = new Tone.Gain(1);

// Chorus makes the sound richer by mixing in slightly detuned, delayed copies.
// It has an internal LFO that must be started with .start(), or it does nothing.
const chorus = new Tone.Chorus({
  frequency: 1.5,  // speed of the wobble (Hz)
  delayTime: 3.5,  // base delay in milliseconds
  depth: 0.7,      // how strong the wobble is (0 to 1)
  wet: 0           // starts disabled (0 = none of the effect is heard)
}).start();

// Feedback delay is an echo that repeats and fades.
const delay = new Tone.FeedbackDelay({
  delayTime: 0.3,  // seconds between echoes
  feedback: 0.3,   // how much of each echo feeds back into the next
  maxDelay: 1,     // the longest delay time we allow (seconds)
  wet: 0           // starts disabled
});

// Reverb simulates a room. Same settings as your original sound.
const reverb = new Tone.Reverb({
  decay: 4,
  wet: 0.4
});

// Master volume sits at the END of the chain, so it controls everything.
const masterVolume = new Tone.Volume(-8);

// ---------------------------------------------------
// 2. Connect them in order: bus → chorus → delay → reverb → master → speakers
// ---------------------------------------------------
// chain() connects each node to the next, once. Only masterVolume connects to
// the speakers, so there are no duplicate connections.
effectsBus.chain(chorus, delay, reverb, masterVolume, Tone.Destination);

// ---------------------------------------------------
// 3. Enable/disable logic
// ---------------------------------------------------
// "wet" is how much of the effect is mixed in. 0 = off, 1 = fully effected.
// To switch an effect off we set wet to 0 instead of disconnecting it.
// Disconnecting and reconnecting nodes is how duplicate connections and
// clicks happen, and wet = 0 is silent and safe.
// We remember each effect's slider amount, so toggling off and on restores it.
const effectSettings = {
  reverb: { node: reverb, enabled: true,  amount: 0.4 },
  delay:  { node: delay,  enabled: false, amount: 0.3 },
  chorus: { node: chorus, enabled: false, amount: 0.5 }
};

function applyWet(name) {
  const effect = effectSettings[name];
  effect.node.wet.value = effect.enabled ? effect.amount : 0;
}

function setupToggle(name) {
  const checkbox = document.getElementById(name + "-toggle");
  const card = document.getElementById(name + "-card");

  // Set the starting look to match the starting state
  checkbox.checked = effectSettings[name].enabled;
  card.classList.toggle("effect-off", !effectSettings[name].enabled);

  checkbox.addEventListener("change", () => {
    effectSettings[name].enabled = checkbox.checked;
    card.classList.toggle("effect-off", !checkbox.checked);
    applyWet(name);
    console.log(name + (checkbox.checked ? " enabled" : " disabled"));
  });
}

setupToggle("reverb");
setupToggle("delay");
setupToggle("chorus");

// ---------------------------------------------------
// 4. Slider helper (avoids repeating the same code 8 times)
// ---------------------------------------------------
// id:       the slider's id in the HTML (its label text is "<id>-value")
// apply:    function that receives the slider's number and updates the audio
// format:   function that turns that number into display text
// applyOn:  "input" updates audio while dragging; "change" only on release
function bindSlider(id, apply, format, applyOn = "input") {
  const slider = document.getElementById(id);
  const display = document.getElementById(id + "-value");

  slider.addEventListener("input", () => {
    display.textContent = format(Number(slider.value));
    if (applyOn === "input") apply(Number(slider.value));
  });

  if (applyOn === "change") {
    slider.addEventListener("change", () => apply(Number(slider.value)));
  }
}

const asPercent = (v) => v + "%";

// ---------------------------------------------------
// 5. Connect every slider to its effect parameter
// ---------------------------------------------------

// Reverb
bindSlider("reverb-amount", (v) => {
  effectSettings.reverb.amount = v / 100;
  applyWet("reverb");
}, asPercent);

// Changing reverb decay makes Tone.js rebuild the room sound, which is
// heavy work. So we apply it only when the slider is released ("change").
bindSlider("reverb-decay", (v) => {
  reverb.decay = v;
}, (v) => v + " s", "change");

// Delay
bindSlider("delay-amount", (v) => {
  effectSettings.delay.amount = v / 100;
  applyWet("delay");
}, asPercent);

bindSlider("delay-time", (v) => {
  delay.delayTime.value = v;
}, (v) => v.toFixed(2) + " s");

bindSlider("delay-feedback", (v) => {
  delay.feedback.value = v / 100;
}, asPercent);

// Chorus
bindSlider("chorus-amount", (v) => {
  effectSettings.chorus.amount = v / 100;
  applyWet("chorus");
}, asPercent);

bindSlider("chorus-speed", (v) => {
  chorus.frequency.value = v;
}, (v) => v + " Hz");

bindSlider("chorus-depth", (v) => {
  chorus.depth = v / 100;
}, asPercent);