<script setup>
// import ecStat from 'echarts-stat';
import { LineChart } from 'echarts/charts';
import { GridComponent, TitleComponent, TooltipComponent } from 'echarts/components';
import { use } from 'echarts/core';
import { CanvasRenderer } from 'echarts/renderers';
import { computed, ref } from 'vue';
import VChart from 'vue-echarts';
import { useUserInfo } from '../../../globalStores';
import { pinia } from '../../../piniaInstance';

use([CanvasRenderer, LineChart, TitleComponent, TooltipComponent, GridComponent]);

const props = defineProps({
    colors: Array,
    currentMeasure: Number,
    data: Object,
    endMeasureIdx: Number,
    featureName: String,
    fpm: Number,
    labelNames: String,
    startMeasureIdx: Number,
    labels: Array,
    trackObjects: Array,
    units: String,
    visible: Array,
    yMax: [Number, String],
    yMin: [Number, String],
});

const userInfo = useUserInfo(pinia);

let data = [];
for (let i = 0; i < props.data[0].featDataMeasure.length; i++) {
    data.push('');
}
let count = 1;
for (let i = 0; i < props.data[0].featDataMeasure.length; i += props.fpm) {
    data[i] = count;
    count++;
}

const indicatorWidth = computed(() => {
    const numMeasures = props.endMeasureIdx - props.startMeasureIdx;
    const featureContent = document.getElementById('feature-content');
    return (featureContent.scrollWidth - 45) / (numMeasures + 1);
});

const compAxis = computed(() => {
    let end = props.endMeasureIdx * props.fpm;
    const numMeasures = props.endMeasureIdx - props.startMeasureIdx;
    if (props.fpm > 1) end = (props.endMeasureIdx + 1) * props.fpm;
    const axis = {
        min: props.startMeasureIdx * props.fpm,
        max: end,
        data: data,
        alignTicks: true,
        type: 'category',
        boundaryGap: props.fpm === 1 ? true : false,
        axisLine: {
            onZero: false,
        },
        splitLine: {
            show: true,
            interval: props.fpm - 1,
        },
        axisTick: {
            interval: props.fpm - 1,
        },
        axisLabel: {
            show: true,
            // color: 'black',
            interval: numMeasures > 60 ? 6 : 0,
        },
    };
    return axis;
});

const compSeries = computed(() => {
    let series = [];
    if (props.labelNames) {
        let labelOneAvg = [];
        let labelTwoAvg = [];
        const labelNames = props.labelNames.split('_');
        props.data.forEach((featObject, i) => {
            if (props.visible[i]) {
                const name = props.trackObjects[i].performer
                    ? props.trackObjects[i].performer + '; ' + props.trackObjects[i].year
                    : props.trackObjects[i].filename;
                series.push({
                    name: name,
                    type: 'line',
                    color: props.colors[i % 10],
                    showSymbol: false,
                    lineStyle: {
                        width: 2,
                    },
                    data: featObject.featDataMeasure,
                });
            }
            if (i === 0) {
                labelOneAvg = new Array(featObject.featDataMeasure.length).fill(0.0);
                labelTwoAvg = new Array(featObject.featDataMeasure.length).fill(0.0);
            }
            if (!props.labels[i]) {
                featObject.featDataMeasure.forEach((value, idx) => {
                    labelOneAvg[idx] += value;
                });
            } else {
                featObject.featDataMeasure.forEach((value, idx) => {
                    labelTwoAvg[idx] += value;
                });
            }
        });
        for (let i = 0; i < labelOneAvg.length; i++) {
            labelOneAvg[i] = labelOneAvg[i] / props.labels.filter((label) => label === false).length;
            labelTwoAvg[i] = labelTwoAvg[i] / props.labels.filter((label) => label === true).length;
        }
        series.push({
            name: labelNames[0] + ' (mean)',
            type: 'line',
            color: 'red',
            showSymbol: false,
            lineStyle: {
                width: 2,
            },
            data: labelOneAvg,
        });
        series.push({
            name: labelNames[1] + ' (mean)',
            type: 'line',
            color: 'blue',
            showSymbol: false,
            lineStyle: {
                width: 2,
            },
            data: labelTwoAvg,
        });
    } else {
        props.data.forEach((featObject, i) => {
            if (props.visible[i]) {
                const name = props.trackObjects[i].performer
                    ? props.trackObjects[i].performer + '; ' + props.trackObjects[i].year
                    : props.trackObjects[i].filename;
                series.push({
                    name: name,
                    type: 'line',
                    color: props.colors[i % 10],
                    showSymbol: false,
                    lineStyle: {
                        width: 2,
                    },
                    data: featObject.featDataMeasure,
                });
            }
        });
    }
    return series;
});

const compYAxis = computed(() => {
    const axis = {
        min: props.yMin,
        max: props.yMax,
        name: props.units,
        nameLocation: 'middle',
        nameGap: 30,
        axisLine: {
            onZero: true,
        },
        axisLabel: {
            // color: 'black',
        },
    };
    return axis;
});

const option = ref({
    textStyle: {
        fontFamily: 'Inter',
    },
    // color: compColors,
    title: {
        text: props.featureName + ' (measure)',
        left: 'center',
        textStyle: {
            fontSize: 13,
            // color: 'black',
        },
    },
    animation: false,
    xAxis: compAxis,
    yAxis: compYAxis,
    series: compSeries,
    grid: {
        left: 45,
        right: 0,
        top: 30,
        bottom: 20,
    },
    tooltip: {
        trigger: 'axis',
        extraCssText: 'z-index: 150;',
        transitionDuration: 0,
        valueFormatter: (value) => value.toFixed(2) + ' ' + props.units,
        textStyle: {
            fontSize: 13,
            fontWeight: 'normal',
        },
    },
    backgroundColor: 'transparent',
});
</script>

<template>
    <div class="relative">
        <v-chart
            class="chart z-50"
            :option="option"
            :autoresize="true"
            :update-options="{ notMerge: true }"
            :theme="userInfo.chartsTheme" />
        <div
            class="absolute top-[30px] h-[calc(100%-50px)] bg-red-600 bg-opacity-10"
            :class="{ hidden: currentMeasure < 0 }"
            :style="{
                width: `${indicatorWidth}px`,
                marginLeft: `${(currentMeasure - startMeasureIdx) * indicatorWidth + 45}px`,
            }"></div>
    </div>
</template>

<style scoped></style>
