const audioCtx = new AudioContext();
const gainNode = audioCtx.createGain();
gainNode.gain.setValueAtTime(1, audioCtx.currentTime);
gainNode.connect(audioCtx.destination);

const rampUp = new Float32Array(10);
const rampDown = new Float32Array(10);
function createFadeRamps() {
    for (let i = 0; i < 10; i++) {
        rampUp[i] = Math.pow(i / 9, 3) * volume.value;
        rampDown[rampUp.length - i - 1] = Math.pow(i / 9, 3) * volume.value;
    }
}
const fadeIn = () => gainNode.gain.setValueCurveAtTime(rampUp, audioCtx.currentTime, 0.01);
const fadeOut = () => gainNode.gain.setValueCurveAtTime(rampDown, audioCtx.currentTime, 0.01);

watch(volume, () => {
    gainNode.gain.setValueAtTime(volume.value, audioCtx.currentTime);
    createFadeRamps();
});

let syncPoints = null;
let activePeaksIdx = 0;
let prevPeaksIdx = null;
let selectedIndices = null;
let peaksInstances = [];
let idxArray = [];
let selectedMeasureData = [];
let selectedFeatureLists = reactive({});
let startTimes = [];
let endTimes = [];
