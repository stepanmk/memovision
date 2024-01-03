import { onKeyStroke } from '@vueuse/core';
import { useModulesVisible } from '../../../globalStores';
import { pinia } from '../../../piniaInstance';
import { activePeaksIdx, canSwitch, peaksInstances, playPause, rewind, selectPeaks, toggleMeasures } from './player';
import { hideAllRegions } from './regions';
import { endMeasureIdx, isPlaying, regionLengths, regionToSave, startMeasureIdx, trackTimes } from './variables';

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
                if (switchIdx >= 0 && canSwitch) selectPeaks(switchIdx, true);
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
                if (switchIdx < peaksInstances.length && canSwitch) selectPeaks(switchIdx, true);
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
                peaksInstance.player.seek(trackTimes.value[i]);
                view.setZoom({ seconds: 'auto' });
            });
            startMeasureIdx.value = -1;
            endMeasureIdx.value = -1;
            regionToSave.value = false;
            hideAllRegions();
        }
    });
}

export { addControls };
