<template>
  <ChartJSVue type="bar" :data="chartData" :options="chartOptions" style="max-height:320px;" />
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { Chart as ChartJSVue } from 'vue-chartjs';
import {
  Chart,
  Title,
  Tooltip,
  Legend,
  LineElement,
  BarElement,
  CategoryScale,
  LinearScale,
  PointElement,
  BarController,
  LineController
} from 'chart.js';

Chart.register(
  Title,
  Tooltip,
  Legend,
  LineElement,
  BarElement,
  CategoryScale,
  LinearScale,
  PointElement,
  BarController,
  LineController
);

const props = defineProps<{
  labels: string[];
  etapasPlanificadas: number[];
  etapasCumplidas: number[];
  alertas: number[];
}>();

const chartData = computed(() => {
  // Asegurar que alertas siempre tenga longitud igual a labels y nunca undefined
  const alertas = props.labels.map((_, i) => props.alertas?.[i] ?? 0);
  const etapasPlanificadas = props.labels.map((_, i) => props.etapasPlanificadas?.[i] ?? 0);
  const etapasCumplidas = props.labels.map((_, i) => props.etapasCumplidas?.[i] ?? 0);
  const datasets = [];
  if (etapasPlanificadas.some(v => v > 0)) {
    datasets.push({
      type: "bar" as const,
      label: 'Etapas planificadas',
      data: etapasPlanificadas,
      backgroundColor: 'rgba(59, 130, 246, 0.5)',
      borderRadius: 6,
      yAxisID: 'y',
      datalabels: { color: '#2563eb', anchor: 'end', align: 'top' }
    });
  }
  if (etapasCumplidas.some(v => v > 0)) {
    datasets.push({
      type: "line" as const,
      label: 'Etapas cumplidas',
      data: etapasCumplidas,
      borderColor: '#22c55e',
      backgroundColor: 'rgba(34, 197, 94, 0.2)',
      fill: false,
      tension: 0.3,
      pointRadius: 4,
      pointBackgroundColor: '#22c55e',
      yAxisID: 'y',
      datalabels: { color: '#22c55e', anchor: 'end', align: 'top' }
    });
  }
  if (alertas.some(v => v > 0)) {
    datasets.push({
      type: "bar" as const,
      label: 'Alertas',
      data: alertas,
      backgroundColor: 'rgba(239, 68, 68, 0.5)',
      borderRadius: 6,
      yAxisID: 'y1',
      datalabels: { color: '#dc2626', anchor: 'end', align: 'top' }
    });
  }
  return {
    labels: props.labels,
    datasets
  };
});


const chartOptions = {
  responsive: true,
  plugins: {
    legend: {
      position: 'top' as const,
      labels: {
        font: { weight: 'bold' as const, size: 13 },
        color: '#0f172a',
        padding: 18
      }
    },
    tooltip: {
      enabled: true,
      callbacks: {
        label: function(context: any) {
          const label = context.dataset.label || '';
          return `${label}: ${context.parsed.y ?? context.parsed}`;
        }
      }
    }
  },
  scales: {
    y: {
      beginAtZero: true,
      title: { display: true, text: 'Etapas planificadas/cumplidas' },
      ticks: { color: '#2563eb', font: { weight: 'bold' as const } }
    },
    y1: {
      beginAtZero: true,
      position: 'right' as const,
      grid: { drawOnChartArea: false },
      title: { display: true, text: 'Alertas registradas' },
      ticks: { color: '#dc2626', font: { weight: 'bold' as const } }
    }
  }
};
</script>
