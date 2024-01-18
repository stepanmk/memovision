import { onKeyStroke } from '@vueuse/core';
import { useMeasureData, useModulesVisible } from '../../../globalStores';
import { pinia } from '../../../piniaInstance';
import { activePeaksIdx, canSwitch, peaksInstances, playPause, rewind, selectPeaks, toggleMeasures } from './player';
import { hideAllRegions } from './regions';
import { endMeasureIdx, isPlaying, startMeasureIdx, trackTimes } from './variables';

const modulesVisible = useModulesVisible(pinia);
const measureData = useMeasureData(pinia);

function addControls() {
    onKeyStroke(' ', (e) => {
        e.preventDefault();
        if (modulesVisible.featureVisualizer) playPause();
    });

    onKeyStroke('Home', (e) => {
        if (modulesVisible.featureVisualizer) rewind();
    });

    onKeyStroke(
        'ArrowUp',
        (e) => {
            e.preventDefault();
            if (modulesVisible.featureVisualizer) {
                const switchIdx = activePeaksIdx - 1;
                if (switchIdx >= 0 && canSwitch) selectPeaks(switchIdx, true);
            }
        },
        { eventName: 'keyup' }
    );

    onKeyStroke(
        'ArrowDown',
        (e) => {
            e.preventDefault();
            if (modulesVisible.featureVisualizer) {
                const switchIdx = activePeaksIdx + 1;
                if (switchIdx < peaksInstances.length && canSwitch) selectPeaks(switchIdx, true);
            }
        },
        { eventName: 'keyup' }
    );

    onKeyStroke('m', (e) => {
        if (modulesVisible.featureVisualizer) toggleMeasures();
    });

    onKeyStroke('Escape', (e) => {
        if (modulesVisible.featureVisualizer) {
            if (isPlaying.value) playPause();
            peaksInstances.forEach((peaksInstance, i) => {
                peaksInstance.segments.removeAll();
                const view = peaksInstance.views.getView('zoomview');
                peaksInstance.player.seek(trackTimes.value[i]);
                view.setZoom({ seconds: 'auto' });
            });
            startMeasureIdx.value = 0;
            endMeasureIdx.value = measureData.measureCount - 1;
            hideAllRegions();
        }
    });
}

export { addControls };
