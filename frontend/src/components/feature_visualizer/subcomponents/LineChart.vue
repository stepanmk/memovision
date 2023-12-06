<script setup>
import { LineChart, PieChart } from 'echarts/charts';
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

use([
    CanvasRenderer,
    PieChart,
    LineChart,
    TitleComponent,
    TooltipComponent,
    LegendComponent,
    GridComponent,
    MarkLineComponent,
]);

const userInfo = useUserInfo(pinia);

const props = defineProps({
    showAxis: Boolean,
    units: String,
    start: Number,
    end: Number,
    lengthSec: Number,
    yMin: [Number, String],
    yMax: [Number, String],
    data: Array,
    color: String,
    featureName: String,
});

let data = [];
let count = 1;
for (let i = 0; i < props.data.length; i++) {
    if (i % 10 === 0) {
        data.push(count);
        count += 1;
    } else {
        data.push('');
    }
}

const compAxis = computed(() => {
    const axis = {
        min: Math.round((props.start / props.lengthSec) * props.data.length),
        max: Math.round((props.end / props.lengthSec) * props.data.length),
        data: data,
        show: false,
        type: 'category',
        axisLine: {
            onZero: false,
        },
        axisTick: {
            alignWithLabel: true,
            lineStyle: {
                // color: 'black',
            },
        },
    };
    return axis;
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
    animation: false,
    title: {
        text: props.featureName,
        left: 'center',
        textStyle: {
            fontSize: 13,
            // color: 'black',
        },
    },
    xAxis: compAxis,
    yAxis: compYAxis,
    series: [
        {
            type: 'line',
            showSymbol: false,
            lineStyle: {
                width: 1.5,
                color: props.color,
            },
            data: props.data,
        },
    ],

    grid: {
        left: 45,
        right: 0,
        top: 30,
        bottom: 20,
    },
    backgroundColor: 'transparent',
});
</script>

<template>
    <v-chart
        class="chart"
        :option="option"
        autoresize
        :update-options="{ notMerge: true }"
        :theme="userInfo.chartsTheme" />
</template>

<style scoped></style>
