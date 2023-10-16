<script setup>
import { use } from 'echarts/core';
import { CanvasRenderer } from 'echarts/renderers';
import { PieChart, LineChart } from 'echarts/charts';
import {
    TitleComponent,
    TooltipComponent,
    LegendComponent,
    GridComponent,
    MarkLineComponent,
} from 'echarts/components';
import VChart, { THEME_KEY } from 'vue-echarts';
import { ref, provide, computed, watch } from 'vue';

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

// provide(THEME_KEY, 'dark');

const props = defineProps({
    showAxis: Boolean,
    start: Number,
    end: Number,
    lengthSec: Number,
    yMin: Number,
    yMax: Number,
    data: Array,
    color: String,
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
    // if (true) data.push('');
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
                color: 'black',
            },
        },
        // axisLabel: {
        //     interval: 10,
        // },
    };
    return axis;
});

// const markLinePos = computed(() => {
//     return [{ name: 'cursor', xAxis: Math.floor((props.data.length - 1) * props.position) }];
// });

// watch(props.position, () => {
//     console.log(props.position);
// });

const option = ref({
    textStyle: {
        // fontFamily: 'Inter',
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
    series: [
        {
            type: 'line',
            showSymbol: false,
            lineStyle: {
                width: 1,
                color: props.color,
            },
            // markLine: {
            //     data: markLinePos,
            //     symbol: 'none',
            //     lineStyle: {
            //         type: 'solid',
            //         color: 'red',
            //     },
            //     label: {
            //         show: false,
            //     },
            // },
            data: props.data,
        },
    ],

    grid: {
        left: 30,
        right: 0,
        top: 20,
        bottom: 20,
    },
});
</script>

<template>
    <v-chart class="chart" :option="option" autoresize />
    <!-- <div>{{ position }}</div> -->
</template>

<style scoped></style>
