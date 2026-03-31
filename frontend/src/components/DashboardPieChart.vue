<template>
  <ChartJSVue type="doughnut" :data="pieData" :options="pieOptions" style="max-width:340px;max-height:340px;margin:auto;" />
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { Chart as ChartJSVue } from 'vue-chartjs';
import {
  Chart,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  DoughnutController
} from 'chart.js';

Chart.register(Title, Tooltip, Legend, ArcElement, DoughnutController);

const props = defineProps<{
  labels: string[];
  values: number[];
  colors?: string[];
}>();

const pieData = computed(() => ({
  labels: props.labels,
  datasets: [
    {
      data: props.values,
      backgroundColor: props.colors || [
        '#2563eb', '#22c55e', '#f59e42', '#ef4444', '#a21caf', '#0ea5e9', '#fbbf24', '#64748b'
      ],
      borderWidth: 2,
      borderColor: '#fff',
      hoverOffset: 8
    }
  ]
}));

const pieOptions = {
  responsive: true,
  plugins: {
    legend: {
      position: 'bottom' as const,
      labels: {
        color: '#0f172a',
        font: { size: 14, weight: 'bold' as const },
        padding: 18
      }
    },
    tooltip: {
      callbacks: {
        label: function(context: any) {
          const label = context.label || '';
          const value = context.parsed;
          return `${label}: ${value}`;
        }
      }
    }
  }
};
</script>
