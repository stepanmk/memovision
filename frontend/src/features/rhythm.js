import { api } from '../axiosInstance';
import { useFeatureData, useFeatureLists, useMeasureData, useTracksFromDb } from '../globalStores';
import { pinia } from '../piniaInstance';
import { getSecureConfig } from '../sharedFunctions';

const tracksFromDb = useTracksFromDb(pinia);
const featureLists = useFeatureLists(pinia);
const featureData = useFeatureData(pinia);
const measureData = useMeasureData(pinia);

async function computeRhythm() {
    const featureList = featureLists.rhythmMetadata;
    for (let i = 0; i < featureList.length; i++) {
        let features = [];
        if (!featureList[i].computed) {
            tracksFromDb.trackObjects.forEach((track) => {
                features.push(api.put(`/${featureList[i].id}/${track.filename}`, {}, getSecureConfig()));
            });
            await Promise.all(features);
        }
    }
}

async function getRhythm() {
    const featureList = featureLists.rhythmMetadata;
    measureData.relevanceFeatures = [];
    for (let i = 0; i < featureList.length; i++) {
        const featureRes = await api.get(`/${featureList[i].id}/all`, getSecureConfig());
        featureData.rhythm[featureList[i].id] = featureRes.data.featureList;
        if (featureList[i].relevance) {
            measureData.relevance[`${featureList[i].id}`] = featureRes.data.relevance;
            measureData.relevanceFeatures.push({
                id: `${featureList[i].id}`,
                name: `${featureList[i].name}`,
            });
            measureData.relevanceFeaturesSelected.push(false);
        }
        featureLists.rhythmMetadata[i].computed = true;
    }
}

export { computeRhythm, getRhythm };
