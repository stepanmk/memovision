<script setup>
import { use } from "echarts/core";
import { CanvasRenderer } from "echarts/renderers";
import { LineChart } from "echarts/charts";
import { useFeatFromDb, useModulesVisible, useTracksFromDb } from '../../globalStores'
import {LegendComponent, 
    GridComponent, 
    ToolboxComponent, 
    TitleComponent, 
    TooltipComponent, 
    DataZoomSliderComponent, 
    DataZoomInsideComponent, 
    MarkLineComponent } 
from "echarts/components";

import VChart, { THEME_KEY } from 'vue-echarts';
import { ref, computed, reactive, watch } from 'vue';

const props = defineProps(
    {
        onZero: Boolean,
        padEnd: Boolean,
        
        xMin: Number,
        xMax: Number,
        
        xMax: Number,
        yMax: Number,
        
        xAxisName: String,
        yAxisName: String,

        fps: Number,
        interval: Number,
        featName: String,
        title: String
    }
)

use([
    CanvasRenderer,
    TitleComponent,
    TooltipComponent,
    ToolboxComponent,
    LegendComponent,
    GridComponent,
    LineChart,
    DataZoomSliderComponent,
    DataZoomInsideComponent,
    MarkLineComponent
]);

const featFromDb = useFeatFromDb();
const tracksFromDb = useTracksFromDb();

const compSeries = computed(() => {
    let series = [];
    for (let i = 0; i < tracksFromDb.trackObjects.length; i++)
    {
        if (tracksFromDb.selected[i])
        {
            
            series.push({
                type: 'line',
                name: featFromDb.featObjects[i].filename,
                data: featFromDb.featObjects[i][props.featName],
                showSymbol: false,
                symbol: 'circle'
            })
        }
        else {
            series.push({
                type: 'line',
                name: featFromDb.featObjects[i].filename,
                data: []
            })
        }
    }

    // for (let i = 0; i < featFromDb.featObjects[0][props.featName].length; i++)
    // {
    //     if (i % props.fps === 0)
    //     {
    //         series.push({
    //         type:'line',
    //         markLine: {
    //              data: [{xAxis: i}],
    //              symbolSize: 1,
    //              label: {
    //                 show: false,
    //             },
    //             lineStyle: {
    //                 type: 'dotted',
    //                 color: 'black',
    //             }
    //         }})
    //     }
    // }

    // series.push({
    //     type:'line',
    //     markLine: {
    //         data: [{xAxis: position.value}],
    //         symbolSize: 1,
    //         label: {
    //         show: false,
    //     },
    //     lineStyle: {
    //         type: 'normal',
    //         color: 'purple',
    //     }
    // }})
    return series;
})

function getTimeString(seconds, start, end)
{
    return new Date(seconds * 1000).toISOString().slice(start, end);
}

const compAxis = computed(() => {
    let data = []
    let idx = tracksFromDb.selected.indexOf(true);
    if(idx !== -1)
    {
        let lengthSec = tracksFromDb.trackObjects[idx].length_sec;
        for (let i = 0; i < featFromDb.featObjects[idx][props.featName].length; i++)
        {
            let perc = i / (featFromDb.featObjects[idx][props.featName].length - 1);
            data.push(getTimeString((lengthSec * perc).toFixed(2), 14, 22));
        }
        if (props.padEnd) data.push('');
    }
    return data;
})


const compLegend = computed(() => {
    let legend = [];
    for (let i = 0; i < tracksFromDb.trackObjects.length; i++)
    {
        if (tracksFromDb.selected[i])
        {
            legend.push(tracksFromDb.trackObjects[i].filename)
        }
    }
    return legend
})


const option = reactive({
    textStyle: {
        fontFamily: 'sans-serif',
    },
    tooltip: {
        trigger: 'axis',
        transitionDuration: 0,
        valueFormatter: (value) => value.toFixed(2) + ' ' + props.yAxisName,
        textStyle: {
            fontSize: 13,
            fontWeight: 'normal'
        },
        extraCssText: 'box-shadow: 0 0 3px rgba(0, 0, 0, 0.3);'
    },
    legend: {
        data: compLegend,
        type: 'scroll',
        textStyle: {
            fontSize: 13
        }
    },
    xAxis: {
        min: props.xMin,
        max: props.xMax,
        data: compAxis.value,
        name: props.xAxisName,
        type: 'category',
        axisLine: {
            onZero: props.onZero
        },
        axisTick: {
            alignWithLabel: true
        },
        axisLabel: {
            // interval: 40,
        },
    },
    yAxis: {
        min: props.yMin,
        max: props.yMax,
        name: props.yAxisName,
        axisLine: {
            onZero: props.onZero
        },
        // type: 'log'
    },
    series: compSeries,
    
    animation: false,
    grid: {
        left: 100,
        right: 100,
    },

    // dataZoom: [
    //     {
    //         id: 'dataZoomX',
    //         type: 'slider',
    //         xAxisIndex: [0],
    //         filterMode: 'empty'
    //     },
    // ]
});

watch(tracksFromDb.selected, (newValue, oldValue) => {
    let idx = tracksFromDb.selected.indexOf(true);
    if(idx !== -1)
    {
        let data = []
        let lengthSec = tracksFromDb.trackObjects[idx].length_sec;
        for (let i = 0; i < featFromDb.featObjects[idx][props.featName].length; i++)
        {
            let perc = i / (featFromDb.featObjects[idx][props.featName].length - 1);
            data.push(getTimeString((lengthSec * perc).toFixed(2), 14, 22));
        }
        option.xAxis.data = data;
    }
    else
    {
        option.xAxis.data = [];
    }
})

</script>

<template>
    <div class="w-full flex flex-col items-center">
        <!-- <button class="btn btn-blue" @click="updateRef()">push</button> -->
        <span class="font-semibold">{{title}}</span>
        <v-chart class="h-[20rem] mt-5 bg-red" :option="option" :autoresize="true" :update-options="{notMerge: true}"/>
    </div>
</template>

<style scoped>
</style>