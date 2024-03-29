import { api } from './axiosInstance';
import {
    useAudioStore,
    useMeasureData,
    useModulesVisible,
    useRegionData,
    useTracksFromDb,
    useUserInfo,
} from './globalStores';
import { pinia } from './piniaInstance';

const measureData = useMeasureData(pinia);
const tracksFromDb = useTracksFromDb(pinia);
const userInfo = useUserInfo(pinia);

async function getSessions() {
    const res = await api.get('/get-sessions', getSecureConfig());
    return res.data.sessions;
}

function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
}

function getSecureConfig(responseType) {
    const axiosConfig = {
        headers: {
            'X-CSRF-TOKEN': getCookie('csrf_access_token'),
        },
    };
    if (responseType !== undefined) {
        axiosConfig.responseType = responseType;
    }
    return axiosConfig;
}

function resetAllStores() {
    const tracksFromDb = useTracksFromDb(pinia);
    // const userInfo = useUserInfo(pinia);
    const audioStore = useAudioStore(pinia);
    const modulesVisible = useModulesVisible(pinia);
    const measureData = useMeasureData(pinia);
    const regionData = useRegionData(pinia);

    tracksFromDb.$reset();
    // userInfo.$reset();
    audioStore.$reset();
    modulesVisible.$reset();
    measureData.$reset();
    regionData.$reset();
}

function darkMode() {
    if (userInfo.darkModeEnabled) {
        document.documentElement.classList.remove('dark');
        userInfo.darkModeEnabled = false;
        userInfo.chartsTheme = 'default';
    } else {
        document.documentElement.classList.add('dark');
        userInfo.darkModeEnabled = true;
        userInfo.chartsTheme = 'dark';
    }
}

function disableDarkMode() {
    document.documentElement.classList.remove('dark');
}

function truncateFilename(filename, numChars) {
    let shortFilename = null;
    const len = filename.length;
    if (len > numChars) {
        shortFilename = filename.substring(0, numChars) + '...';
    } else {
        shortFilename = filename;
    }
    return shortFilename;
}

async function availableSpace() {
    const res = await api.get('/available-space', getSecureConfig());
    userInfo.availableSpace = res.data.availableSpace;
    userInfo.occupiedSpace = res.data.occupiedSpace;
    userInfo.occupiedPerc = res.data.occupiedPerc;
}

function createZoomLevels(zoomviewWidth, trackLengthSec) {
    const maxZoom = Math.pow(2, Math.floor(Math.log2((trackLengthSec * 44100) / zoomviewWidth)));
    let zoomLevels = [];
    for (let i = 64; i < maxZoom; i += 300) {
        zoomLevels.push(i);
    }
    zoomLevels.push('auto');
    return zoomLevels;
}

function getStartMeasure(start) {
    const closestStart = measureData.refTrack.gt_measures.reduce((prev, curr) =>
        Math.abs(curr - start) < Math.abs(prev - start) ? curr : prev
    );
    let closestStartIdx = measureData.refTrack.gt_measures.indexOf(closestStart);
    if (measureData.refTrack.gt_measures[closestStartIdx] < start) {
        closestStartIdx = closestStartIdx + 1;
    }
    return closestStartIdx;
}

function getEndMeasure(end) {
    const closestEnd = measureData.refTrack.gt_measures.reduce((prev, curr) =>
        Math.abs(curr - end) < Math.abs(prev - end) ? curr : prev
    );
    let closestEndIdx = measureData.refTrack.gt_measures.indexOf(closestEnd);
    if (measureData.refTrack.gt_measures[closestEndIdx] > end) {
        closestEndIdx = closestEndIdx - 1;
    }
    return closestEndIdx;
}

function getTimeString(seconds, start, end) {
    return new Date(seconds * 1000).toISOString().substring(start, end);
}

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function findClosestTimeIdx(peaksIdx, time) {
    const closestTime = tracksFromDb.syncPoints[peaksIdx].reduce((prev, curr) =>
        Math.abs(curr - time) < Math.abs(prev - time) ? curr : prev
    );
    return tracksFromDb.syncPoints[peaksIdx].indexOf(closestTime);
}

export {
    availableSpace,
    createZoomLevels,
    darkMode,
    disableDarkMode,
    findClosestTimeIdx,
    getCookie,
    getEndMeasure,
    getSecureConfig,
    getSessions,
    getStartMeasure,
    getTimeString,
    resetAllStores,
    sleep,
    truncateFilename,
};
