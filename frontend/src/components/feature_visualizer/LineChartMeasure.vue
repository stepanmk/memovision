<script setup>
import { use } from 'echarts/core';
import { CanvasRenderer } from 'echarts/renderers';
import { LineChart } from 'echarts/charts';
import {
    TitleComponent,
    TooltipComponent,
    LegendComponent,
    GridComponent,
    MarkLineComponent,
} from 'echarts/components';
import VChart from 'vue-echarts';
import { ref, computed } from 'vue';

use([CanvasRenderer, LineChart, TitleComponent, TooltipComponent, LegendComponent, GridComponent, MarkLineComponent]);

const props = defineProps({
    featureName: String,
    startMeasureIdx: Number,
    endMeasureIdx: Number,
    yMin: Number,
    yMax: Number,
    data: Object,
    colors: Array,
    visible: Array,
    fpm: Number,
});

let data = [];
for (let i = 0; i < props.data[0].featDataMeasure.length; i++) {
    data.push('');
}
let count = 1;
for (let i = 0; i < props.data[0].featDataMeasure.length; i += props.fpm) {
    data[i] = count;
    count++;
}

const compAxis = computed(() => {
    const axis = {
        min: props.startMeasureIdx * props.fpm,
        max: props.endMeasureIdx * props.fpm,
        data: data,
        alignTicks: true,
        // show: false,
        type: 'category',
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
            color: 'black',
            interval: 0,
        },
    };
    return axis;
});

const compSeries = computed(() => {
    let series = [];
    props.data.forEach((featObject, i) => {
        if (props.visible[i]) {
            series.push({
                type: 'line',
                showSymbol: false,
                lineStyle: {
                    width: 1.5,
                    color: props.colors[i],
                },
                data: featObject.featDataMeasure,
            });
        }
    });
    return series;
});

// const markLinePos = computed(() => {
//     return [{ name: 'cursor', xAxis: Math.floor((props.data.length - 1) * props.position) }];
// });

// watch(props.position, () => {
//     console.log(props.position);
// });

const option = ref({
    // textStyle: {
    //     fontFamily: 'Inter',
    // },
    title: {
        text: props.featureName + ' (measure)',
        left: 'center',
        textStyle: {
            fontSize: 13,
            color: 'black',
        },
    },
    animation: false,
    xAxis: compAxis,
    yAxis: {
        min: props.yMin,
        max: props.yMax,
        axisLine: {
            onZero: true,
        },
        axisLabel: {
            color: 'black',
        },
    },
    series: compSeries,

    grid: {
        left: 30,
        right: 0,
        top: 20,
        bottom: 20,
    },
});
</script>

<template>
    <v-chart class="chart" :option="option" :autoresize="true" :update-options="{ notMerge: true }" />
</template>

<style scoped></style>
