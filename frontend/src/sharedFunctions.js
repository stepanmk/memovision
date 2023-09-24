import { 
    useTracksFromDb, 
    useAudioStore,
    useModulesVisible,
    useComponentsVisible, 
    useMeasureData, 
    useUserInfo 

} from './globalStores'
import { api } from './axiosInstance'
import { pinia } from './piniaInstance'

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
        }
    };
    if (responseType !== undefined)
    {
        axiosConfig.responseType = responseType;
    }
    return axiosConfig;
}

function resetAllStores() {
    const tracksFromDb = useTracksFromDb(pinia);
    const userInfo = useUserInfo(pinia);
    const audioStore = useAudioStore(pinia);
    const modulesVisible = useModulesVisible(pinia);
    const componentsVisible = useComponentsVisible(pinia);
    const measureData = useMeasureData(pinia);

    tracksFromDb.$reset();
    audioStore.$reset();
    modulesVisible.$reset();
    componentsVisible.$reset();
    measureData.$reset();
}

function darkMode() {
    const userInfo = useUserInfo(pinia);
    if (userInfo.darkModeEnabled) 
    {
        document.documentElement.classList.remove('dark')
        userInfo.darkModeEnabled = false;
    } 
    else 
    {
        document.documentElement.classList.add('dark')
        userInfo.darkModeEnabled = true;
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
    }
    else {
        shortFilename = filename;
    }
    return shortFilename;
}

function getTimeString(seconds) {
    if (seconds < 3600)
    {
        return new Date(seconds * 1000).toISOString().slice(14, 19);
    }
    else
    {
        return new Date(seconds * 1000).toISOString().slice(11, 19);
    }
}

export {
    getSessions,
    getCookie,
    getSecureConfig,
    resetAllStores,
    darkMode,
    disableDarkMode,
    truncateFilename,
    getTimeString
}