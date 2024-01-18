import { useMeasureData } from '../../../globalStores';
import { pinia } from '../../../piniaInstance';
import {
    oneVsRestRelevance,
    relevantMeasures,
    relevantMeasuresSelected,
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
    selectRelevanceLabel(0, 'oneVsRest');
    selectRelevantMeasures();
    selectedRelevanceFeatureName.value = measureData.relevanceFeatures[0].name;
    measureData.relevanceFeaturesSelected[0] = true;
    oneVsRestRelevance.value[0] = true;
    trackLabels.value[0] = true;
    relevantMeasuresSelected.value = new Array(10).fill(false);
}

function selectRelevantMeasures() {
    const sortedRelevance = selectedRelevanceData.value.slice(0);
    sortedRelevance.sort((a, b) => a.relevance - b.relevance).reverse();
    relevantMeasures.value = sortedRelevance.slice(0, 10);
}

function selectRelevanceFeature(id, name, idx) {
    selectedRelevanceFeatureName.value = name;
    selectedRelevanceFeature.value = id;
    measureData.relevanceFeaturesSelected.fill(false);
    measureData.relevanceFeaturesSelected[idx] = true;
    relevantMeasuresSelected.value = new Array(10).fill(false);
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
    relevantMeasuresSelected.value = new Array(10).fill(false);
    if (type === 'oneVsRest') {
        oneVsRestRelevance.value[idx] = true;
        trackLabels.value[idx] = true;
        measureData.labelsSelected.fill(false);
    } else {
        trackLabels.value = measureData.relevance[selectedRelevanceFeature.value][type][idx].labels.slice();
        measureData.labelsSelected.fill(false);
        measureData.labelsSelected[idx] = true;
    }
    selectedRelevanceData.value =
        measureData.relevance[selectedRelevanceFeature.value][type][idx].measureRelevance.slice();
    selectedLabel.value = measureData.relevance[selectedRelevanceFeature.value][type][idx].labelName;
}

export { selectDefaultRelevanceFeature, selectRelevanceFeature, selectRelevanceLabel, selectRelevantMeasures };
