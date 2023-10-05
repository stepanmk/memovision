import { getSecureConfig } from '../sharedFunctions';
import {
    useTracksFromDb,
    useFeatureLists,
    useFeatureData,
    useMeasureData,
} from '../globalStores';
import { pinia } from '../piniaInstance';
import { api } from '../axiosInstance';

const tracksFromDb = useTracksFromDb(pinia);
const featureLists = useFeatureLists(pinia);
const featureData = useFeatureData(pinia);
const measureData = useMeasureData(pinia);

async function computeDynamics() {
    const featureList = featureLists.dynamics;
    for (let i = 0; i < featureList.length; i++) {
        let features = [];
        tracksFromDb.trackObjects.forEach((track) => {
            features.push(
                api.put(
                    `/${featureList[i].id}/${track.filename}`,
                    {},
                    getSecureConfig()
                )
            );
        });
        await Promise.all(features);
    }
}

async function getDynamics() {
    const featureList = featureLists.dynamics;
    for (let i = 0; i < featureList.length; i++) {
        const featureRes = await api.get(
            `/${featureList[i].id}/all`,
            getSecureConfig()
        );
        featureData.dynamics[featureList[i].id] = featureRes.data.featureList;
        if (featureList[i].relevance) {
            measureData.relevance[`${featureList[i].id}`] =
                featureRes.data.relevance;
            measureData.relevanceFeatures.push({
                id: `${featureList[i].id}`,
                name: `${featureList[i].name}`,
            });
        }
        featureLists.dynamics[i].computed = true;
    }
}

export { computeDynamics, getDynamics };
