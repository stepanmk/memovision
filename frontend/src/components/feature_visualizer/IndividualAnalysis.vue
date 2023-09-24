<script setup>
import AbsoluteLineChart from './AbsoluteLineChart.vue';
import { reactive} from 'vue';


const featVisible = reactive({
    loudness: false,
    rms: false,
})


function toggleFeatVisible(featName)
{
    featVisible[featName] = !featVisible[featName];
    console.log(featVisible[featName]);
}

</script>

<template>
    <div id="feat-selection" class="w-full h-[3rem] border-b flex flex-row items-center justify-centers px-5 gap-2">
        <button class="btn btn-gray" @click="toggleFeatVisible('loudness')"
        :class="{'bg-cyan-700 dark:bg-cyan-700 text-white': featVisible.loudness}">
        Loudness
        </button>
        <button class="btn btn-gray" @click="toggleFeatVisible('rms')"
        :class="{'bg-cyan-700 dark:bg-cyan-700 text-white': featVisible.rms}">
        RMS
        </button>
        <!-- <button class="btn btn-gray" @click="toggleFeatVisible('measureDurations')"
        :class="{'bg-cyan-700 dark:bg-cyan-700 text-white': featVisible.measureDurations}">
        Measure Durations
        </button>
        <button class="btn btn-gray" @click="toggleFeatVisible('measureTempo')"
        :class="{'bg-cyan-700 dark:bg-cyan-700 text-white': featVisible.measureTempo}">
        Measure Tempo
        </button> -->
    </div>
    
    <div id="plot-container" class="w-full h-[calc(100%-6rem)] overflow-y-scroll p-5"> 
        <AbsoluteLineChart
        v-if="featVisible.loudness" 
        :on-zero="false"
        :title="'Loudness'"
        :x-min="0"
        :x-axis-name="'seconds'"
        :y-axis-name="'LUFS'"
        :feat-name="'loudness_data'"/>
        
        <AbsoluteLineChart 
        v-if="featVisible.rms"
        :on-zero="false"
        :pad-end="false"
        :title="'RMS'"
        :x-min="0"
        :x-axis-name="'seconds'"
        :y-axis-name="'[–]'"
        :feat-name="'rms_data'"/>
        
    </div>
</template>

<style scoped>

</style>