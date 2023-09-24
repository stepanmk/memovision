<script setup>

import TrackListTrack  from './TrackListTrack.vue'
import TrackListButton from './TrackListButton.vue';

import { useComponentsVisible, useTracksFromDb, useAnalysisState} from '../../globalStores'
import { Icon } from '@iconify/vue';
import { onMounted, ref, computed } from 'vue';


// pinia stores
const componentsVisible = useComponentsVisible();
const tracksFromDb = useTracksFromDb();
const analysisState = useAnalysisState();


// already synchronized tracks
const syncedTracks = computed(() => {
    return tracksFromDb.trackObjects.filter(obj => obj.sync);
})


// function for filename shortening
function truncateFileName(filename)
{
    const len = filename.length;
    const numCharacters = 16;
    let shortFilename = null;
    if (len > numCharacters){
        shortFilename = filename.substring(0, numCharacters) + '...';
    }
    else{
        shortFilename = filename;
    }
    return shortFilename;
}


function setSelectionMode(){
    analysisState.batchAnalysis = !analysisState.batchAnalysis;
    analysisState.individualAnalysis = !analysisState.individualAnalysis;
    if(analysisState.individualAnalysis)
    {
        tracksFromDb.selected.splice(0);
        analysisState.multiSelectActive = false;
    }
    else{
        analysisState.multiSelectActive = true;
    }
}


</script>


<template>

    <!-- tracklist start -->
    <div id="tracklist" class="h-[calc(100vh-8rem)] mt-24 z-10 mr-7 w-[16rem]">

        <div id="tracklist-divider" class="w-[calc(100%)] h-full
        dark:border-gray-700 dark:bg-gray-800 border rounded-md">

            <div id="tracklist-top" class="h-20 w-full flex flex-col items-center justify-center">
                <TrackListButton 
                :active="analysisState.multiSelectActive"
                :expanded="true"
                :enabled="analysisState.multiSelectEnabled"
                icon-type="bx:select-multiple"
                name="Multi select"
                @click="analysisState.multiSelectEnabled ? setSelectionMode() : null"/>
            </div>

            <div id="tracklist-content" class="w-full h-[calc(100%-5rem)] pt-5 pb-5 flex flex-col items-center gap-1 ">
                <div v-for="(obj, i) in tracksFromDb.trackObjects" :id="`track-side-${i}`" :key="obj.filename" class="w-full">
                    <TrackListTrack :track-name="truncateFileName(obj.filename)"
                    :name-visible="componentsVisible.tracklist"
                    :year="obj.year"
                    :performer="obj.performer"
                    :selected="tracksFromDb.selected[i]"
                    :reference="obj.reference"
                    :id="i"/>
                </div>
            </div>
        </div>
        
    </div>
    <!-- tracklist end -->

</template>


<style scoped>

#tracklist{
    top: 0;
    right: 0;
    position: absolute;

    display: flex;
    flex-direction: row;
    align-items: center;
    transition: width 350ms;
}

#tracklist-content{
    overflow-y: auto;
    overflow-x: hidden;

}

#tracklist-button{
    display: flex;
    align-items: center;
    justify-content: center;
    flex-direction: row;
}

.selected-button{
    background-color: #164e63;
}

</style>