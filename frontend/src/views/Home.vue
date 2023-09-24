<script setup>
import TrackManager from '../components/track_manager/TrackManager.vue'
import RegionSelector from '../components/region_selector/RegionSelector.vue'
import FeatureVisualizer from '../components/feature_visualizer/FeatureVisualizer.vue'
import InterpretationPlayer from '../components/interpretation_player/InterpretationPlayer.vue'


import TopNav from '../components/TopNav.vue'
import SideNav from '../components/sidenav/SideNav.vue'
// import TrackList from '../components/tracklist/TrackList.vue'

</script>


<template>

<div id="home-layout" class="min-h-screen">
    
    <TopNav/>
    
    <div id="main-container" class="h-[calc(100vh-4rem)] flex">
        
        <SideNav/>
        <!-- <TrackList/> -->
        
        <div id="module-container" class="w-full p-5 ml-0 flex flex-col items-center bg-white text-black dark:bg-gray-900 overflow-y-auto">
         
            <TrackManager/>
            <RegionSelector/>
            <InterpretationPlayer/>
            <FeatureVisualizer/>
        
        </div>
    
    </div>

</div>

</template>