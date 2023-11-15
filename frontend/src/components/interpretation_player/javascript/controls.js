import { onKeyStroke } from '@vueuse/core';
import { useModulesVisible } from '../../../globalStores';
import { pinia } from '../../../piniaInstance';
import { activePeaksIdx, goToMeasure, measureCount, peaksInstances, playPause, rewind, selectPeaks } from './player';
import { currentMeasure, isPlaying, regionLengths, regionToSave } from './variables';

const modulesVisible = useModulesVisible(pinia);

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
                if (newMeasure < measureCount) goToMeasure(newMeasure);
            }
        },
        { eventName: 'keyup' }
    );

    onKeyStroke(
        'a',
        (e) => {
            if (modulesVisible.interpretationPlayer) {
                zoomAlign();
            }
        },
        { eventName: 'keyup' }
    );

    onKeyStroke('m', (e) => {
        if (modulesVisible.interpretationPlayer) toggleMeasures();
    });

    onKeyStroke('Escape', (e) => {
        if (modulesVisible.interpretationPlayer) {
            // if (regionSelected) {
            //     regionObjects.selected.fill(false);
            // }
            // regionOverlay.value.fill(false);
            if (isPlaying.value) playPause();
            peaksInstances.forEach((peaksInstance, i) => {
                peaksInstance.segments.removeAll();
                regionLengths.value[i] = 0;
                const view = peaksInstance.views.getView('zoomview');
                view.setZoom({ seconds: 'auto' });
            });
            regionToSave.value = false;
        }
    });
}

export { addControls };
