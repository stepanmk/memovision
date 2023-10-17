<script setup>
import UplotVue from 'uplot-vue';

let data = [
    [1546300800, 1546387200], // x-values (timestamps)
    [35, 71], // y-values (series 1)
];

let options = {
    title: 'My Chart',
    id: 'chart1',
    class: 'my-chart',
    width: 800,
    height: 600,
    series: [
        {},
        {
            // initial toggled state (optional)
            show: true,

            spanGaps: false,

            // series style
            stroke: 'red',
            width: 1,
            fill: 'rgba(255, 0, 0, 0.3)',
            dash: [10, 5],
        },
    ],
};
</script>

<template>
    <UplotVue :data="data" :options="options" />
</template>
