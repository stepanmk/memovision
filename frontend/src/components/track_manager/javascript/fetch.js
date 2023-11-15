import { api } from '../../../axiosInstance';
import { useAudioStore, useMeasureData, useRegionData, useTracksFromDb, useUserInfo } from '../../../globalStores';
import { pinia } from '../../../piniaInstance';
import { getSecureConfig } from '../../../sharedFunctions';

/* pinia stores */

const tracksFromDb = useTracksFromDb(pinia);
const userInfo = useUserInfo(pinia);
const audioStore = useAudioStore(pinia);
const measureData = useMeasureData(pinia);
const regionData = useRegionData(pinia);

/*   actual fetch functions 

    getTrackData – get objects with information about the tracks
    getAudioData – fetches a blob with the audio data for a single track
    getMetronomeClick – fetches the metronome audio clip
    getMeasureData – fetches measure data for all uploaded tracks
    downloadMeasures – downloads transferred measure annotations

*/

async function getTrackData() {
    const res = await api.get('/get-tracks', getSecureConfig());
    tracksFromDb.$reset();
    tracksFromDb.trackObjects = res.data.info;
    tracksFromDb.selected = new Array(tracksFromDb.trackObjects).fill(false);
    tracksFromDb.sortByName();
}

async function getAudioData(filename) {
    const audioRes = await api.get(`/get-audio/${filename}`, getSecureConfig('blob'));
    const waveformRes = await api.get(`/get-waveform-data/${filename}`, getSecureConfig('blob'));
    audioStore.audioObjects.push({
        filename: filename,
        audio: audioRes.data,
        waveformData: waveformRes.data,
    });
    audioStore.sortByName();
}

async function getMetronomeClick() {
    const res = await api.get('/get-metronome-click', getSecureConfig('blob'));
    audioStore.metronomeClick = res.data;
}

async function getMeasureData() {
    const res = await api.get('/get-measure-data', getSecureConfig());
    measureData.measureObjects = res.data.measureData;
    measureData.sortByName();
}

async function downloadMeasures() {
    const res = await api.get('/download-measures', getSecureConfig('blob'));
    const url = URL.createObjectURL(res.data);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${userInfo.selectedSession}_measures.zip`;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
}

async function getRegionData() {
    const res = await api.get('/get-all-regions', getSecureConfig());
    regionData.selectedRegions = res.data.regions;
    regionData.selected = new Array(res.data.regions.length).fill(false);
    regionData.timeSignatures = res.data.timeSignatures;
    regionData.timeSignaturesSelected = new Array(res.data.timeSignatures.length).fill(false);
    const diffRes = await api.get('/get-diff-regions', getSecureConfig());
    regionData.diffRegions = diffRes.data.diffRegions;
    regionData.diffRegionsSelected = new Array(diffRes.data.diffRegions.length).fill(false);
}

export { downloadMeasures, getAudioData, getMeasureData, getMetronomeClick, getRegionData, getTrackData };
