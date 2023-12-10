import { onKeyStroke } from '@vueuse/core';
import { useMeasureData, useModulesVisible } from '../../../globalStores';
import { pinia } from '../../../piniaInstance';
import { activePeaksIdx, goToMeasure, peaksInstances, playPause, rewind, selectPeaks, toggleMeasures } from './player';
import { currentMeasure, endMeasureIdx, isPlaying, regionLengths, regionToSave, startMeasureIdx } from './variables';

const modulesVisible = useModulesVisible(pinia);
const measureData = useMeasureData(pinia);

function addControls() {
    onKeyStroke(' ', (e) => {
        e.preventDefault();
        if (modulesVisible.interpretationPlayer) playPause();
    });

    onKeyStroke('Home', (e) => {
        if (modulesVisible.interpretationPlayer) rewind();
    });

    onKeyStroke(
        'ArrowUp',
        (e) => {
            e.preventDefault();
            if (modulesVisible.interpretationPlayer) {
                const switchIdx = activePeaksIdx - 1;
                if (switchIdx >= 0) selectPeaks(switchIdx);
            }
        },
        { eventName: 'keyup' }
    );

    onKeyStroke(
        'ArrowDown',
        (e) => {
            e.preventDefault();
            if (modulesVisible.interpretationPlayer) {
                const switchIdx = activePeaksIdx + 1;
                if (switchIdx < peaksInstances.length) selectPeaks(switchIdx);
            }
        },
        { eventName: 'keyup' }
    );

    onKeyStroke(
        'ArrowLeft',
        (e) => {
            if (modulesVisible.interpretationPlayer) {
                const newMeasure = currentMeasure.value - 1;
                if (newMeasure > -1) goToMeasure(newMeasure);
            }
        },
        { eventName: 'keyup' }
    );

    onKeyStroke(
        'ArrowRight',
        (e) => {
            if (modulesVisible.interpretationPlayer) {
                const newMeasure = currentMeasure.value + 1;
                if (newMeasure < measureData.measureCount) goToMeasure(newMeasure);
            }
        },
        { eventName: 'keyup' }
    );

    onKeyStroke('m', (e) => {
        if (modulesVisible.interpretationPlayer) toggleMeasures();
    });

    onKeyStroke('Escape', (e) => {
        if (modulesVisible.interpretationPlayer) {
            if (isPlaying.value) playPause();
            peaksInstances.forEach((peaksInstance, i) => {
                peaksInstance.segments.removeAll();
                regionLengths.value[i] = 0;
                const view = peaksInstance.views.getView('zoomview');
                view.setZoom({ seconds: 'auto' });
            });
            startMeasureIdx.value = -1;
            endMeasureIdx.value = -1;
            regionToSave.value = false;
        }
    });
}

export { addControls };
