import { useMeasureData, useRegionData, useTracksFromDb } from '../../../globalStores';
import { pinia } from '../../../piniaInstance';
import { activePeaksIdx, endTimes, peaksInstances, playPause, setCursorPos, startTimes } from './player';
import { endMeasureIdx, isPlaying, startMeasureIdx, timeSelections } from './variables';

const tracksFromDb = useTracksFromDb(pinia);
const measureData = useMeasureData(pinia);
const regionData = useRegionData(pinia);

function hideAllRegions() {
    peaksInstances.forEach((peaksInstance, idx) => {
        startTimes[idx] = 0;
        endTimes[idx] = tracksFromDb.syncTracks[idx].length_sec;
        timeSelections.value[idx] = tracksFromDb.syncTracks[idx].length_sec;
        peaksInstance.segments.removeAll();
    });
    regionData.selected.fill(false);
}

function zoomOut() {
    peaksInstances.forEach((peaksInstance, idx) => {
        const view = peaksInstance.views.getView('zoomview');
        view.setZoom({ seconds: tracksFromDb.syncTracks[idx].length_sec + 0.01 });
        setCursorPos(idx, 0);
    });
    startMeasureIdx.value = -1;
    endMeasureIdx.value = -1;
}

async function zoomOnMeasureSelection(startMeasure, endMeasure, regionIdx) {
    if (isPlaying.value) await playPause();
    if (regionIdx !== undefined) {
        if (regionData.selected[regionIdx]) {
            hideAllRegions();
            zoomOut();
            return;
        }
    }
    hideAllRegions();
    regionData.selected[regionIdx] = true;
    startMeasureIdx.value = startMeasure;
    endMeasureIdx.value = endMeasure;
    if (startMeasure === -1) {
        zoomOut();
        return;
    }
    peaksInstances[activePeaksIdx].player.seek(measureData.selectedMeasures[activePeaksIdx][startMeasure + 1]);
    for (let i = 0; i < peaksInstances.length; i++) {
        const view = peaksInstances[i].views.getView('zoomview');
        startTimes[i] = measureData.selectedMeasures[i][startMeasure + 1];
        endTimes[i] = measureData.selectedMeasures[i][endMeasure + 2];
        timeSelections.value[i] = endTimes[i] - startTimes[i];
        setCursorPos(i, measureData.selectedMeasures[i][startMeasure + 1]);
        view.setZoom({
            seconds:
                measureData.selectedMeasures[i][endMeasure + 2] - measureData.selectedMeasures[i][startMeasure + 1],
        });
        view.setStartTime(measureData.selectedMeasures[i][startMeasure + 1]);
        view.enableAutoScroll(false);
        peaksInstances[i].segments.add({
            color: 'grey',
            borderColor: 'grey',
            startTime: measureData.selectedMeasures[i][startMeasure + 1],
            endTime: measureData.selectedMeasures[i][endMeasure + 2],
            id: 'selectedRegion',
        });
    }
}

export { zoomOnMeasureSelection };