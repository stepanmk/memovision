<script setup>
import { useAnalysisState, useTracksFromDb } from '../../globalStores';


// pinia store for tracks from database
const tracksFromDb = useTracksFromDb();


const props = defineProps({
    id: Number,
    selected: Boolean,
    reference: Boolean,
    nameVisible: Boolean,
    trackName: String,
    year: String,
    performer: String
})


// select track or tracks for analysis depending on the analysis type
function trackSelect()
{
    const analysisState = useAnalysisState();

    if(analysisState.batchAnalysis)
    {
        tracksFromDb.selected[props.id] = !tracksFromDb.selected[props.id];
    }
    else
    {
        tracksFromDb.selected[props.id] = !tracksFromDb.selected[props.id];
        tracksFromDb.selected.forEach((arrayValue, i) => {
            if (i !== props.id) tracksFromDb.selected[i] = false;
        });
    }
}


</script>

<template>

    <div class="py-2 px-4 rounded-md text-sm bg-neutral-200 h-7 flex ml-5 mr-5 items-center 
    justify-between cursor-pointer select-none hover:bg-neutral-400 hover:text-white"
    @click="trackSelect()"
    :class="{'bg-neutral-500 text-white': tracksFromDb.selected[id]}">
        <div class="flex items-center justify-between">
            <Transition>
                <span>{{trackName}}</span>
            </Transition>
        </div>
        <Transition>
            <span v-if="props.reference" class="flex items-center justify-center bg-violet-800 rounded-md text-white px-2">Ref.</span>
        </Transition>
    </div>

</template>


<style scoped>
.v-enter-active{
    transition: opacity 400ms;
    transition-delay: 300ms;
    transition-property: opacity;
}
.v-leave-active {
    transition: opacity 50ms;
}

.v-enter-from,
.v-leave-to {
    opacity: 0;
}

</style>