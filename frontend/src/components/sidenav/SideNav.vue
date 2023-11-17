<script setup>
import { useModulesVisible } from '../../globalStores';
import SideNavButton from './SideNavButton.vue';

// pinia stores
const modulesVisible = useModulesVisible();

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
            @click="selectModule('trackManager')"></SideNavButton>

        <SideNavButton
            name="Region selector"
            icon-type="mdi:timer-music-outline"
            width="25"
            :active="modulesVisible.regionSelector"
            @click="selectModule('regionSelector')"></SideNavButton>

        <SideNavButton
            name="Interpretation player"
            icon-type="material-symbols:play-circle-outline"
            width="25"
            :active="modulesVisible.interpretationPlayer"
            @click="selectModule('interpretationPlayer')"></SideNavButton>

        <SideNavButton
            name="Feature visualizer"
            icon-type="icon-park-solid:analysis"
            width="21"
            :active="modulesVisible.featureVisualizer"
            @click="selectModule('featureVisualizer')"></SideNavButton>
    </div>
    <!-- sidenav end -->
</template>
