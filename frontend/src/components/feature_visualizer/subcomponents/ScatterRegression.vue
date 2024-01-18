<script setup>
import ecStat from 'echarts-stat';
import { LineChart, ScatterChart } from 'echarts/charts';
import {
    GridComponent,
    LegendComponent,
    MarkLineComponent,
    TitleComponent,
    TooltipComponent,
} from 'echarts/components';
import { use } from 'echarts/core';
import { CanvasRenderer } from 'echarts/renderers';
import { computed, ref } from 'vue';
import VChart from 'vue-echarts';
import { useUserInfo } from '../../../globalStores';
import { pinia } from '../../../piniaInstance';
import { getTimeString } from '../../../sharedFunctions';

use([
    CanvasRenderer,
    LineChart,
    ScatterChart,
    TitleComponent,
    TooltipComponent,
    LegendComponent,
    GridComponent,
    MarkLineComponent,
]);

const props = defineProps({
    trackObjects: Array,
    timeSelections: Array,
    visible: Array,
    colors: Array,
    labels: Array,
    labelNames: String,
});

const userInfo = useUserInfo(pinia);

const compSeries = computed(() => {
    let series = [];
    let allData = [];
    let dataClassOne = [];
    let dataClassTwo = [];
    if (props.labelNames) {
        props.trackObjects.forEach((track, i) => {
            if (track.year && props.visible[i]) {
                series.push({
                    type: 'scatter',
                    name: track.performer ? track.performer + '; ' + track.year : track.filename + '; ' + track.year,
                    data: [[Number(track.year), props.timeSelections[i]]],
                    color: props.labels[i] === false ? 'red' : 'blue',
                    showSymbol: false,
                });
                allData.push([Number(track.year), props.timeSelections[i]]);
                if (props.labels[i]) {
                    dataClassTwo.push([Number(track.year), props.timeSelections[i]]);
                } else {
                    dataClassOne.push([Number(track.year), props.timeSelections[i]]);
                }
            }
        });
        const labelNames = props.labelNames.split('_');
        const regOne = ecStat.regression('linear', dataClassOne);
        const regTwo = ecStat.regression('linear', dataClassTwo);
        series.push({
            data: regOne.points,
            type: 'line',
            color: 'red',
            symbol: 'none',
            name: labelNames[0],
        });
        series.push({
            data: regTwo.points,
            type: 'line',
            color: 'blue',
            symbol: 'none',
            name: labelNames[1],
        });
    } else {
        props.trackObjects.forEach((track, i) => {
            if (track.year && props.visible[i]) {
                series.push({
                    type: 'scatter',
                    name: track.performer ? track.performer + '; ' + track.year : track.filename + '; ' + track.year,
                    data: [[Number(track.year), props.timeSelections[i]]],
                    color: 'gray',
                    showSymbol: false,
                });
                allData.push([Number(track.year), props.timeSelections[i]]);
            }
        });
    }
    const regAll = ecStat.regression('linear', allData);
    series.push({
        data: regAll.points,
        type: 'line',
        color: 'gray',
        symbol: 'none',
        name: 'All recordings',
    });
    if (props.labelNames) {
    }
    return series;
});

const compLegendData = computed(() => {
    let data = [];
    data.push({ name: 'All recordings' });
    if (props.labelNames) {
        const labelNames = props.labelNames.split('_');
        data.push({ name: labelNames[0] });
        data.push({ name: labelNames[1] });
    }
    return data;
});

const option = ref({
    textStyle: {
        fontFamily: 'Inter',
        fontSize: 13,
        // color: 'black',
    },
    animation: false,
    xAxis: {
        axisLabel: {
            formatter: (v) => v,
        },
        min: (value) => value.min - 2,
        max: (value) => value.max + 2,
        type: 'value',
        name: 'Year',
        nameTextStyle: {
            verticalAlign: 'top',
            padding: [15, 0, 0, 0],
        },
        nameLocation: 'center',
    },
    yAxis: {
        min: (value) => value.min - 1,
        max: (value) => value.max + 1,
        axisLabel: {
            formatter: (v) => getTimeString(v, 14, 22),
        },
        name: 'Duration',
        nameTextStyle: {
            verticalAlign: 'bottom',
            padding: [15, 0, 0, 0],
        },
    },
    series: compSeries,
    grid: {
        left: 65,
        right: 65,
        top: 30,
        bottom: 45,
    },
    tooltip: {
        trigger: 'axis',
        animation: false,
        transitionDuration: 0,
        formatter: (params) => {
            let outString = '';
            params.forEach((param) => {
                if (param.componentSubType === 'scatter') {
                    outString += `${param.seriesName}<br/> Duration: ${getTimeString(
                        param.value[1].toFixed(2),
                        14,
                        22
                    )}<br/>`;
                }
            });
            return outString;
        },
        textStyle: {
            fontSize: 13,
            fontWeight: 'normal',
            // color: 'black',
        },
    },
    legend: {
        orient: 'horizontal',
        top: 'top',
        data: compLegendData,
    },
    backgroundColor: 'transparent',
});
</script>

<template>
    <v-chart
        class="chart"
        :option="option"
        :autoresize="true"
        :update-options="{ notMerge: true }"
        :theme="userInfo.chartsTheme" />
</template>

<style scoped></style>
