import { useFeatureLists, useMeasureData } from '../../../globalStores';
import { pinia } from '../../../piniaInstance';
import { labelSelectors, selectedFeatureLists, selectedLabel, trackLabels } from './variables';

const featureLists = useFeatureLists(pinia);
const measureData = useMeasureData(pinia);

function setFeatureLists() {
    selectedFeatureLists['dynamicsTime'] = [];
    selectedFeatureLists['dynamicsTimeVisible'] = [];
    selectedFeatureLists['dynamicsMeasure'] = [];
    selectedFeatureLists['dynamicsMeasureVisible'] = [];
    selectedFeatureLists['rhythmTime'] = [];
    selectedFeatureLists['rhythmTimeVisible'] = [];
    selectedFeatureLists['rhythmMeasure'] = [];
    selectedFeatureLists['rhythmMeasureVisible'] = [];
    featureLists.dynamicsMetadata.forEach((feat) => {
        if (featureLists.dynamicsTime.includes(feat.id)) {
            selectedFeatureLists['dynamicsTime'].push({ ...feat });
            selectedFeatureLists['dynamicsTimeVisible'].push(false);
        }
        if (featureLists.dynamicsMeasure.includes(feat.id)) {
            selectedFeatureLists['dynamicsMeasure'].push({ ...feat });
            selectedFeatureLists['dynamicsTimeVisible'].push(false);
        }
    });
    featureLists.rhythmMetadata.forEach((feat) => {
        if (featureLists.rhythmTime.includes(feat.id)) {
            selectedFeatureLists['rhythmTime'].push({ ...feat });
            selectedFeatureLists['rhythmTimeVisible'].push(false);
        }
        if (featureLists.rhythmMeasure.includes(feat.id)) {
            selectedFeatureLists['rhythmMeasure'].push({ ...feat });
            selectedFeatureLists['rhythmMeasureVisible'].push(false);
        }
    });
}

function selectRelevanceLabel(idx) {
    if (labelSelectors.value[idx]) {
        trackLabels.value.splice(0);
        labelSelectors.value.fill(false);
        selectedLabel.value = '';
    } else {
        trackLabels.value.fill(false);
        labelSelectors.value.fill(false);
        labelSelectors.value[idx] = true;
        trackLabels.value = measureData.relevance['duration']['custom'][idx].labels.slice();
        selectedLabel.value = measureData.relevance['duration']['custom'][idx].labelName;
    }
}

export { selectRelevanceLabel, setFeatureLists };
