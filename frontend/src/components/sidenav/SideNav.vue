<script setup>

import { useComponentsVisible, useModulesVisible } from '../../globalStores';
import SideNavButton from './SideNavButton.vue';


// pinia stores
const componentsVisible = useComponentsVisible();
const modulesVisible = useModulesVisible();

// select active module
function selectModule(moduleName)
{
    modulesVisible.hideAllModules();
    modulesVisible[moduleName] = true;
}

</script>


<template>

    <!-- sidenav start -->
    <div id="sidenav" class="absolute top-16 p-5 flex flex-col gap-3">
        
        <SideNavButton name="Track manager" icon-type="carbon:document-audio" width="22"
        :expanded="componentsVisible.sidenav"
        :active="modulesVisible.trackManager"
        @click="selectModule('trackManager')"></SideNavButton>

        <SideNavButton name="Region selector" icon-type="mdi:timer-music-outline" width="25"
        :expanded="componentsVisible.sidenav"
        :active="modulesVisible.regionSelector"
        @click="selectModule('regionSelector')"></SideNavButton>

        <SideNavButton name="Interpretation player" icon-type="material-symbols:play-circle-outline" width="25"
        :expanded="componentsVisible.sidenav"
        :active="modulesVisible.interpretationPlayer"
        @click="selectModule('interpretationPlayer')"></SideNavButton>

        <SideNavButton name="Feature visualizer" icon-type="icon-park-solid:analysis" width="21"
        :expanded="componentsVisible.sidenav"
        :active="modulesVisible.featureVisualizer"
        @click="selectModule('featureVisualizer')"></SideNavButton>

    </div>
    <!-- sidenav end -->

</template>