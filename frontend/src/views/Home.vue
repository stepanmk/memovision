<script setup>
import FeatureVisualizer from '../components/feature_visualizer/FeatureVisualizer.vue';
import InterpretationPlayer from '../components/interpretation_player/InterpretationPlayer.vue';
import RegionSelector from '../components/region_selector/RegionSelector.vue';
import TrackManager from '../components/track_manager/TrackManager.vue';

import SideNav from '../components/navs/SideNav.vue';
import TopNav from '../components/navs/TopNav.vue';

window.addEventListener(
    'keydown',
    function (event) {
        if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].indexOf(event.code) > -1) {
            event.preventDefault();
        }
    },
    false
);
</script>

<template>
    <div id="home-layout" class="min-h-screen">
        <TopNav />
        <div id="main-container" class="flex h-[calc(100vh-4rem)]">
            <SideNav />
            <div
                id="module-container"
                class="ml-0 flex w-full flex-col items-center overflow-y-auto bg-white p-5 text-black dark:bg-gray-900">
                <TrackManager />
                <RegionSelector />
                <InterpretationPlayer />
                <FeatureVisualizer />
            </div>
        </div>
    </div>
</template>
