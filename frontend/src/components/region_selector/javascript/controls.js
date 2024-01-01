import { onKeyStroke } from '@vueuse/core';
import { useMeasureData, useModulesVisible } from '../../../globalStores';
import { pinia } from '../../../piniaInstance';
import { peaksInstance, playPause, rewind, toggleMeasures, toggleMetronome } from './player';
import { cancelRegionAdding } from './regions';
import { playing } from './variables';

const modulesVisible = useModulesVisible(pinia);
const measureData = useMeasureData(pinia);

function addControls() {
    onKeyStroke(' ', (e) => {
        e.preventDefault();
        if (modulesVisible.regionSelector) playPause();
    });

    onKeyStroke('Home', (e) => {
        if (modulesVisible.regionSelector) rewind();
    });

    onKeyStroke('m', (e) => {
        if (modulesVisible.regionSelector) toggleMeasures();
    });

    onKeyStroke('t', (e) => {
        if (modulesVisible.regionSelector) toggleMetronome();
    });

    onKeyStroke('Escape', (e) => {
        if (modulesVisible.regionSelector) {
            if (playing.value) playPause();
            cancelRegionAdding();
            const view = peaksInstance.views.getView('zoomview');
            view.setZoom({ seconds: 'auto' });
        }
    });
}

export { addControls };
