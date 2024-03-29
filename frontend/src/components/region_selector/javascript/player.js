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

import { getStartMeasure, getTimeString } from '../../../sharedFunctions';

import {
    amplitudeZoom,
    currentMeasure,
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
    view.setZoom({ seconds: tracksFromDb.refTrack.length_sec });
}

const resizeObserver = new ResizeObserver(debouncedFit);

function destroyPeaks() {
    resizeObserver.disconnect();
    peaksInstance.destroy();
    peaksInstance = null;
    maxRMS.value = [-60, -60];
    currentRMS.value = [-60, -60];
    currentTime.value = '00:00.00';
    currentMeasure.value = -1;
    volume.value = 0.0;
    metronomeVolume.value = -6.0;
}

async function initPeaks() {
    let ctx = new AudioContext();
    let metronomeAudioBuffer = await ctx.decodeAudioData(await audioStore.metronomeClick.arrayBuffer());
    const player = {
        externalPlayer: new Tone.Player(
            URL.createObjectURL(audioStore.getAudio(tracksFromDb.refTrack.filename))
        ).toDestination(),
        metronome: new Tone.Player(metronomeAudioBuffer).toDestination(),
        meter: new Tone.Meter({ channels: 2, smoothing: 0.8 }),
        eventEmitter: null,
        init: function (eventEmitter) {
            this.eventEmitter = eventEmitter;
            this.externalPlayer.sync();
            this.externalPlayer.start(0);
            this.externalPlayer.fadeIn = 0.01;
            this.externalPlayer.fadeOut = 0.01;
            this.externalPlayer.volume.value = volume.value;
            this.metronome.volume.value = metronomeVolume.value;
            this.meterInterval = setInterval(() => {
                currentRMS.value = this.meter.getValue();
            }, 40);
            this.meterIntervalMax = setInterval(() => {
                const currValue = this.meter.getValue();
                if (currValue[0] > maxRMS.value[0]) maxRMS.value[0] = currValue[0];
                if (currValue[1] > maxRMS.value[1]) maxRMS.value[1] = currValue[1];
            }, 250);
            Tone.Transport.scheduleRepeat(() => {
                const time = this.getCurrentTime();
                eventEmitter.emit('player.timeupdate', time);
                if (time >= this.getDuration()) {
                    Tone.Transport.stop();
                }
            }, 0.05);
            this.volumeWatcher = watch(volume, () => {
                if (volume.value > -30) {
                    peaksInstance.player._adapter.externalPlayer.volume.value = volume.value;
                } else {
                    peaksInstance.player._adapter.externalPlayer.volume.value = -Infinity;
                }
            });
            this.metronomeWatcher = watch(metronomeVolume, () => {
                if (metronomeVolume.value > -30) {
                    this.metronome.volume.value = metronomeVolume.value;
                } else {
                    this.metronome.volume.value = -Infinity;
                }
            });
            return Promise.resolve();
        },

        destroy: function () {
            Tone.Transport.stop();
            Tone.Transport.cancel();
            this.externalPlayer.dispose();
            this.metronome.dispose();
            clearInterval(this.meterInterval);
            clearInterval(this.meterIntervalMax);
            this.meter.dispose();
            this.externalPlayer = null;
            this.eventEmitter = null;
            this.volumeWatcher();
            this.metronomeWatcher();
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

    const zoomviewContainer = document.getElementById('zoomview-container');
    const overviewContainer = document.getElementById('overview-container');
    let seconds = tracksFromDb.refTrack.length_sec;

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
            highlightColor: 'black',
            highlightOpacity: 0.2,
            highlightOffset: 5,
            playheadColor: 'red',
            fontFamily: 'Inter',
        },
        segmentOptions: {
            overlay: true,
            overlayOffset: 0,
            overlayOpacity: 0.2,
            overlayCornerRadius: 0,
        },
        dataUri: {
            arraybuffer: URL.createObjectURL(audioStore.getWaveformData(tracksFromDb.refTrack.filename)),
        },
        player: player,
        showAxisLabels: true,
        emitCueEvents: true,
        fontSize: 12,
        zoomLevels: [1024],
    };

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
            currentMeasure.value = getStartMeasure(time + 0.005) - 2;
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
        measuresVisible.value = false;
        const view = peaksInstance.views.getView('zoomview');
        zoomviewContainer.addEventListener('wheel', (event) => {
            if (event.deltaY < 0) {
                if (seconds > 10) seconds -= 5;
                view.setZoom({ seconds: seconds });
            } else {
                if (seconds < tracksFromDb.refTrack.length_sec) seconds += 5;
                view.setZoom({ seconds: seconds });
            }
        });
        view.setZoom({ seconds: seconds });
        resizeObserver.observe(zoomviewContainer);
        setTimeout(() => {
            menuButtonsDisable.stopLoading();
        }, 200);
    });
}

async function goToMeasure(measureIdx) {
    const idx = tracksFromDb.getIdx(tracksFromDb.refTrack.filename);
    const seekTime = measureData.selectedMeasures[idx][measureIdx + 1];
    peaksInstance.player.seek(seekTime);
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
    const selectedRegion = peaksInstance.segments.getSegment('selectedRegion');
    if (selectedRegion) {
        if (playing.value) peaksInstance.player.playSegment(selectedRegion, true);
    } else {
        peaksInstance.player.seek(0);
    }
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

export {
    destroyPeaks,
    goToMeasure,
    initPeaks,
    peaksInstance,
    playPause,
    rewind,
    toggleLooping,
    toggleMeasures,
    toggleMetronome,
};
