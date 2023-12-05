import { useDebounceFn } from '@vueuse/core';
import Peaks from 'peaks.js';
import * as Tone from 'tone';
import { watch } from 'vue';
import {
    useAudioStore,
    useMeasureData,
    useMenuButtonsDisable,
    useRegionData,
    useTracksFromDb,
} from '../../../globalStores';
import { pinia } from '../../../piniaInstance';

import { createZoomLevels, getTimeString } from '../../../sharedFunctions';

import {
    amplitudeZoom,
    currentRMS,
    currentTime,
    loopingActive,
    maxRMS,
    measuresVisible,
    metronomeActive,
    metronomeVolume,
    peaksReady,
    performer,
    playing,
    refName,
    regionBeingAdded,
    volume,
    year,
} from './variables';

const tracksFromDb = useTracksFromDb(pinia);
const audioStore = useAudioStore(pinia);
const measureData = useMeasureData(pinia);
const regionData = useRegionData(pinia);
const menuButtonsDisable = useMenuButtonsDisable(pinia);

let peaksInstance = null;

const debouncedFit = useDebounceFn(() => {
    fit();
}, 200);

function fit() {
    const view = peaksInstance.views.getView('zoomview');
    const overview = peaksInstance.views.getView('overview');
    view.fitToContainer();
    overview.fitToContainer();
    view.setZoom({ seconds: 'auto' });
}

const resizeObserver = new ResizeObserver(debouncedFit);

function destroyPeaks() {
    resizeObserver.disconnect();
    peaksInstance.destroy();
    peaksInstance = null;
    maxRMS.value = -60;
    currentRMS.value = [-60, -60];
}

async function initPeaks() {
    const audioContext = Tone.context;
    const audio = audioStore.getAudio(tracksFromDb.refTrack.filename);
    const arrayBuffer = await audio.arrayBuffer();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

    const metronomeAudio = audioStore.metronomeClick;
    const metronomeArrayBuffer = await metronomeAudio.arrayBuffer();
    const metronomeAudioBuffer = await audioContext.decodeAudioData(metronomeArrayBuffer);

    const player = {
        externalPlayer: new Tone.Player(audioBuffer).toDestination(),
        metronome: new Tone.Player(metronomeAudioBuffer).toDestination(),
        meter: new Tone.Meter({ channels: 2, smoothing: 0.5 }),
        eventEmitter: null,
        init: function (eventEmitter) {
            this.eventEmitter = eventEmitter;
            this.externalPlayer.sync();
            this.externalPlayer.start();
            this.externalPlayer.fadeIn = 0.05;
            this.externalPlayer.fadeOut = 0.05;
            this.externalPlayer.volume.value = volume.value;
            this.metronome.volume.value = metronomeVolume.value;
            this.meterScheduleId = null;
            Tone.Transport.scheduleRepeat(() => {
                const time = this.getCurrentTime();
                eventEmitter.emit('player.timeupdate', time);
                if (time >= this.getDuration()) {
                    Tone.Transport.stop();
                }
            }, 0.05);
            // this.meterScheduleId = Tone.Transport.scheduleRepeat(() => {
            setInterval(() => {
                currentRMS.value = this.meter.getValue();
            }, 30);
            // }, 1 / 30);
            watch(volume, () => {
                if (volume.value > -30) {
                    this.externalPlayer.volume.value = volume.value;
                } else {
                    console.log('-inf dB');
                    this.externalPlayer.volume.value = -Infinity;
                }
            });
            watch(metronomeVolume, () => {
                if (metronomeVolume.value > -30) {
                    this.metronome.volume.value = metronomeVolume.value;
                } else {
                    console.log('-inf dB');
                    this.metronome.volume.value = -Infinity;
                }
            });
            return Promise.resolve();
        },

        destroy: function () {
            Tone.Transport.stop();
            Tone.Transport.cancel();
            this.externalPlayer.stop();
            this.externalPlayer.dispose();
            this.metronome.stop();
            this.metronome.dispose();
            this.externalPlayer = null;
            this.eventEmitter = null;
        },

        setSource: function (opts) {
            if (this.isPlaying()) {
                this.pause();
            }
            this.externalPlayer.buffer.set(opts.webAudio.audioBuffer);
            return Promise.resolve();
        },

        play: async function () {
            return Tone.start().then(() => {
                Tone.Transport.start();
                // this.externalPlayer.connect(this.peakMeter);
                this.externalPlayer.connect(this.meter);
                this.eventEmitter.emit('player.playing', this.getCurrentTime());
            });
        },

        playClick: function () {
            if (this.metronome.state === 'stopped' && metronomeActive.value) {
                this.metronome.start();
            }
        },

        pause: function () {
            // this.meter.disconnect();
            Tone.Transport.pause();
            this.eventEmitter.emit('player.pause', this.getCurrentTime());
        },

        isPlaying: function () {
            return Tone.Transport.state === 'started';
        },

        seek: function (time) {
            Tone.Transport.seconds = time;
            this.eventEmitter.emit('player.seeked', this.getCurrentTime());
            this.eventEmitter.emit('player.timeupdate', this.getCurrentTime());
        },

        isSeeking: function () {
            return false;
        },

        getCurrentTime: function () {
            return Tone.Transport.seconds;
        },

        getDuration: function () {
            return this.externalPlayer.buffer.duration;
        },
    };

    const waveformData = await audioStore.getWaveformData(tracksFromDb.refTrack.filename).arrayBuffer();
    const zoomviewContainer = document.getElementById('zoomview-container');
    const overviewContainer = document.getElementById('overview-container');
    const zoomLevels = createZoomLevels(zoomviewContainer.offsetWidth, tracksFromDb.refTrack.length_sec);

    const options = {
        zoomview: {
            container: zoomviewContainer,
            waveformColor: 'rgb(17 24 39)',
            axisLabelColor: 'rgb(17 24 39)',
            axisGridlineColor: 'rgb(17 24 39)',
            playheadColor: 'red',
            fontFamily: 'Inter',
        },
        overview: {
            container: overviewContainer,
            waveformColor: 'rgb(17 24 39)',
            axisLabelColor: 'rgb(17 24 39)',
            axisGridlineColor: 'rgb(17 24 39)',
            playheadColor: 'red',
            fontFamily: 'Inter',
        },
        segmentOptions: {
            overlay: true,
            overlayOffset: 0,
            overlayOpacity: 0.2,
            overlayCornerRadius: 0,
        },
        waveformData: {
            arraybuffer: waveformData,
        },
        player: player,
        showAxisLabels: true,
        emitCueEvents: true,
        fontSize: 12,
        zoomLevels: zoomLevels,
    };
    zoomviewContainer.addEventListener('mousewheel', (event) => {
        if (event.deltaY < 0) {
            peaksInstance.zoom.zoomIn();
        } else {
            peaksInstance.zoom.zoomOut();
        }
    });
    Peaks.init(options, (err, peaks) => {
        peaksInstance = peaks;
        peaksReady.value = true;
        refName.value = tracksFromDb.refTrack.filename;
        if (tracksFromDb.refTrack.performer) {
            performer.value = tracksFromDb.refTrack.performer;
        }
        if (tracksFromDb.refTrack.year) {
            year.value = tracksFromDb.refTrack.year;
        }
        peaksInstance.on('player.timeupdate', (time) => {
            currentTime.value = getTimeString(time, 14, 22);
        });
        peaksInstance.on('player.playing', () => {
            playing.value = true;
        });
        peaksInstance.on('player.pause', () => {
            playing.value = false;
        });
        peaksInstance.on('points.enter', (event) => {
            peaksInstance.player._adapter.playClick();
        });
        const zoomviewContainer = document.getElementById('zoomview-container');
        resizeObserver.observe(zoomviewContainer);
        measuresVisible.value = false;
        toggleMeasures();
        peaksInstance.zoom.setZoom(zoomLevels.length - 1);
        setTimeout(() => {
            menuButtonsDisable.stopLoading();
        }, 200);
    });
}

function toggleMeasures() {
    if (tracksFromDb.refTrack.gt_measures) {
        if (measuresVisible.value) {
            peaksInstance.points.removeAll();
            measuresVisible.value = false;
        } else {
            for (let i = 1; i < measureData.refTrack.gt_measures.length - 1; i++) {
                peaksInstance.points.add({
                    time: measureData.refTrack.gt_measures[i],
                    labelText: `${i}`,
                    editable: false,
                    color: 'rgb(0, 0, 200)',
                });
            }
            measuresVisible.value = true;
        }
    }
}

function playPause() {
    if (playing.value) {
        peaksInstance.player.pause();
    } else {
        if (regionData.selected.includes(true) || regionBeingAdded.value) {
            const segmentToPlay = peaksInstance.segments._segments[0];
            peaksInstance.player.playSegment(segmentToPlay, loopingActive.value);
        } else {
            peaksInstance.player.play();
        }
    }
}

function rewind() {
    peaksInstance.player.seek(0);
}

function toggleLooping() {
    loopingActive.value = !loopingActive.value;
}

function toggleMetronome() {
    metronomeActive.value = !metronomeActive.value;
}

watch(amplitudeZoom, () => {
    const view = peaksInstance.views.getView('zoomview');
    view.setAmplitudeScale(Number(amplitudeZoom.value));
});

export { destroyPeaks, initPeaks, peaksInstance, playPause, rewind, toggleLooping, toggleMeasures, toggleMetronome };
