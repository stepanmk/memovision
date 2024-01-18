<script setup>
import { useMenuButtonsDisable, useModulesVisible, useTracksFromDb } from '../../globalStores';
import { pinia } from '../../piniaInstance';
import SideNavButton from './SideNavButton.vue';

// pinia stores
const modulesVisible = useModulesVisible(pinia);
const menuButtonsDisable = useMenuButtonsDisable(pinia);
const tracksFromDb = useTracksFromDb(pinia);

// select active module
function selectModule(moduleName) {
    modulesVisible.hideAllModules();
    modulesVisible[moduleName] = true;
}
</script>

<template>
    <!-- sidenav start -->
    <div id="sidenav" class="absolute top-16 flex flex-col gap-3 p-5">
        <SideNavButton
            name="Track manager"
            icon-type="carbon:document-audio"
            width="22"
            :active="modulesVisible.trackManager"
            :disabled="!menuButtonsDisable.trackManager"
            @click="!menuButtonsDisable.trackManager ? selectModule('trackManager') : null"></SideNavButton>

        <SideNavButton
            name="Region selector"
            icon-type="mdi:timer-music-outline"
            width="25"
            :active="modulesVisible.regionSelector"
            :disabled="!menuButtonsDisable.regionSelector && tracksFromDb.allTracksHaveMeasures"
            @click="
                !menuButtonsDisable.regionSelector && tracksFromDb.allTracksHaveMeasures
                    ? selectModule('regionSelector')
                    : null
            "></SideNavButton>

        <SideNavButton
            name="Interpretation player"
            icon-type="material-symbols:play-circle-outline"
            width="25"
            :active="modulesVisible.interpretationPlayer"
            :disabled="!menuButtonsDisable.interpretationPlayer && tracksFromDb.allTracksHaveMeasures"
            @click="
                !menuButtonsDisable.interpretationPlayer && tracksFromDb.allTracksHaveMeasures
                    ? selectModule('interpretationPlayer')
                    : null
            "></SideNavButton>

        <SideNavButton
            name="Feature visualizer"
            icon-type="icon-park-solid:analysis"
            width="21"
            :active="modulesVisible.featureVisualizer"
            :disabled="!menuButtonsDisable.featureVisualizer && tracksFromDb.allTracksHaveMeasures"
            @click="
                !menuButtonsDisable.featureVisualizer && tracksFromDb.allTracksHaveMeasures
                    ? selectModule('featureVisualizer')
                    : null
            "></SideNavButton>
    </div>
    <!-- sidenav end -->
</template>
