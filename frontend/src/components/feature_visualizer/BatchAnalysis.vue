<script setup>
import MeasureLineChart from './MeasureLineChart.vue';
import { reactive} from 'vue';


const featVisible = reactive({
    measureLoudness: false,
    measureRms: false,
    measureDurations:false,
    measureTempo: false
})


function toggleFeatVisible(featName)
{
    featVisible[featName] = !featVisible[featName];
}

</script>

<template>
    <div id="feat-selection" class="w-full h-[3rem] border-b flex flex-row items-center justify-centers px-5 gap-2">
        <button class="btn btn-gray" @click="toggleFeatVisible('measureLoudness')"
        :class="{'bg-cyan-700 dark:bg-cyan-700 text-white': featVisible.measureLoudness}">
        Measure Loudness
        </button>
        <button class="btn btn-gray" @click="toggleFeatVisible('measureRms')"
        :class="{'bg-cyan-700 dark:bg-cyan-700 text-white': featVisible.measureRms}">
        Measure RMS
        </button>
        <button class="btn btn-gray" @click="toggleFeatVisible('measureDurations')"
        :class="{'bg-cyan-700 dark:bg-cyan-700 text-white': featVisible.measureDurations}">
        Measure Durations
        </button>
        <button class="btn btn-gray" @click="toggleFeatVisible('measureTempo')"
        :class="{'bg-cyan-700 dark:bg-cyan-700 text-white': featVisible.measureTempo}">
        Measure Tempo
        </button>
    </div>
    
    <div id="plot-container" class="w-full h-[calc(100%-6rem)] overflow-y-scroll p-5"> 
        <MeasureLineChart
        v-if="featVisible.measureLoudness" 
        :on-zero="false"
        :title="'Measure Loudness'"
        :x-min="0"
        :fps="20"
        :interval="39"
        :x-axis-name="'Measures'"
        :y-axis-name="'LUFS'"
        :feat-name="'measure_loudness_data'"/>
        
        <MeasureLineChart 
        v-if="featVisible.measureRms"
        :on-zero="false"
        :pad-end="false"
        :title="'Measure RMS'"
        :x-min="0"
        :fps="20"
        :interval="39"
        :x-axis-name="'Measures'"
        :y-axis-name="'[–]'"
        :feat-name="'measure_rms_data'"/>
        
        <MeasureLineChart 
        v-if="featVisible.measureDurations"
        :on-zero="false"
        :title="'Measure Durations'"
        :x-min="0"
        :fps="1"
        :interval="1"
        :x-axis-name="'Measures'"
        :y-axis-name="'seconds'"
        :feat-name="'measure_durations_data'"/>

        <MeasureLineChart 
        v-if="featVisible.measureTempo"
        :on-zero="false"
        :title="'Measure Tempo'"
        :x-min="0"
        :fps="1"
        :interval="1"
        :x-axis-name="'Measures'"
        :y-axis-name="'BPM'"
        :feat-name="'measure_tempo_data'"/>
        
    </div>
</template>

<style scoped>

</style>