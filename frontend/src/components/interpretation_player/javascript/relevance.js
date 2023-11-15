import { useMeasureData } from '../../../globalStores';
import { pinia } from '../../../piniaInstance';
import {
    oneVsRestRelevance,
    relevantMeasures,
    selectedIdx,
    selectedLabel,
    selectedRelevanceData,
    selectedRelevanceFeature,
    selectedRelevanceFeatureName,
    selectedType,
    trackLabels,
} from './variables';

const measureData = useMeasureData(pinia);

function selectDefaultRelevanceFeature() {
    selectRelevanceFeature(measureData.relevanceFeatures[0].id);
}

function selectRelevantMeasures() {
    let sortedRelevance = selectedRelevanceData.value.slice(0);
    sortedRelevance.sort((a, b) => a.relevance - b.relevance).reverse();
    relevantMeasures.value = sortedRelevance.slice(0, 10);
}

function selectRelevanceFeature(id, name) {
    selectedRelevanceFeatureName.value = name;
    selectedRelevanceFeature.value = id;
    if (selectedLabel.value !== '') {
        selectedRelevanceData.value =
            measureData.relevance[selectedRelevanceFeature.value][selectedType.value][
                selectedIdx.value
            ].measureRelevance.slice();
        selectedLabel.value =
            measureData.relevance[selectedRelevanceFeature.value][selectedType.value][selectedIdx.value].labelName;
    }
}

function selectRelevanceLabel(idx, type) {
    oneVsRestRelevance.value.fill(false);
    trackLabels.value.fill(false);
    selectedType.value = type;
    selectedIdx.value = idx;
    if (type === 'oneVsRest') {
        oneVsRestRelevance.value[idx] = true;
        trackLabels.value[idx] = true;
    } else {
        trackLabels.value = measureData.relevance[selectedRelevanceFeature.value][type][idx].labels.slice();
    }
    selectedRelevanceData.value =
        measureData.relevance[selectedRelevanceFeature.value][type][idx].measureRelevance.slice();
    selectedLabel.value = measureData.relevance[selectedRelevanceFeature.value][type][idx].labelName;
}

export { selectDefaultRelevanceFeature, selectRelevanceFeature, selectRelevanceLabel, selectRelevantMeasures };
