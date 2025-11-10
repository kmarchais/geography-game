<template>
  <div class="stats-chart-container">
    <svg
      :width="size"
      :height="size"
      :viewBox="`0 0 ${size} ${size}`"
      class="pie-chart"
      @mouseleave="hoveredSegment = null"
    >
      <!-- Pie segments -->
      <g
        v-for="(segment, index) in segments"
        :key="segment.label"
      >
        <path
          :d="segment.path"
          :fill="segment.color"
          :class="['pie-segment', { 'hovered': hoveredSegment === index }]"
          @mouseenter="hoveredSegment = index"
        />
      </g>
    </svg>

    <!-- Tooltip -->
    <div
      v-if="hoveredSegment !== null"
      class="chart-tooltip"
    >
      <div class="tooltip-header">
        {{ segments[hoveredSegment].label }}
        <span class="tooltip-count">{{ segments[hoveredSegment].count }}/{{ totalRounds }}</span>
      </div>
      <div
        v-if="segments[hoveredSegment].territories.length > 0"
        class="tooltip-territories"
      >
        <div
          v-for="territory in segments[hoveredSegment].territories"
          :key="territory"
          class="territory-item"
        >
          {{ territory }}
        </div>
      </div>
      <div
        v-else
        class="tooltip-empty"
      >
        None
      </div>
    </div>

    <!-- Legend -->
    <div class="chart-legend">
      <div
        v-for="(segment, index) in segments"
        :key="segment.label"
        class="legend-item"
        @mouseenter="hoveredSegment = index"
        @mouseleave="hoveredSegment = null"
      >
        <div
          class="legend-color"
          :style="{ backgroundColor: segment.color }"
        />
        <span class="legend-label">{{ segment.label }}</span>
        <span class="legend-value">{{ segment.count }}/{{ totalRounds }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';

interface GameStats {
  foundOnAttempt1: number;
  foundOnAttempt2: number;
  foundOnAttempt3: number;
  failed: number;
  skipped: number;
  territoriesAttempt1: string[];
  territoriesAttempt2: string[];
  territoriesAttempt3: string[];
  territoriesFailed: string[];
  territoriesSkipped: string[];
}

const props = defineProps<{
  stats: GameStats;
  totalRounds: number;
  size?: number;
}>();

const size = props.size || 200;
const radius = size / 2 - 10;
const centerX = size / 2;
const centerY = size / 2;

const hoveredSegment = ref<number | null>(null);

// Define segments with colors
const segments = computed(() => {
  const data = [
    {
      label: '1st try',
      count: props.stats.foundOnAttempt1,
      territories: props.stats.territoriesAttempt1,
      color: '#2ecc71', // Green
    },
    {
      label: '2nd try',
      count: props.stats.foundOnAttempt2,
      territories: props.stats.territoriesAttempt2,
      color: '#f1c40f', // Yellow
    },
    {
      label: '3rd try',
      count: props.stats.foundOnAttempt3,
      territories: props.stats.territoriesAttempt3,
      color: '#e67e22', // Orange
    },
    {
      label: 'Failed',
      count: props.stats.failed,
      territories: props.stats.territoriesFailed,
      color: '#e74c3c', // Red
    },
    {
      label: 'Skipped',
      count: props.stats.skipped,
      territories: props.stats.territoriesSkipped,
      color: '#95a5a6', // Gray
    },
  ];

  // Calculate total
  const total = data.reduce((sum, item) => sum + item.count, 0);

  if (total === 0) {
    return [];
  }

  // Calculate angles
  let currentAngle = -90; // Start at top
  return data
    .filter(item => item.count > 0) // Only include non-zero segments
    .map(item => {
      const angle = (item.count / total) * 360;
      const startAngle = currentAngle;
      const endAngle = currentAngle + angle;

      // Convert angles to radians
      const startRad = (startAngle * Math.PI) / 180;
      const endRad = (endAngle * Math.PI) / 180;

      // Calculate arc path
      const x1 = centerX + radius * Math.cos(startRad);
      const y1 = centerY + radius * Math.sin(startRad);
      const x2 = centerX + radius * Math.cos(endRad);
      const y2 = centerY + radius * Math.sin(endRad);

      const largeArc = angle > 180 ? 1 : 0;

      const path = [
        `M ${centerX} ${centerY}`,
        `L ${x1} ${y1}`,
        `A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}`,
        'Z',
      ].join(' ');

      currentAngle = endAngle;

      return {
        ...item,
        path,
      };
    });
});
</script>

<style scoped>
.stats-chart-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
  padding: 15px;
  background: var(--header-bg);
  border-radius: 8px;
  position: relative;
}

.pie-chart {
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1));
}

.pie-segment {
  cursor: pointer;
  transition: opacity 0.2s ease, transform 0.2s ease;
  transform-origin: center;
}

.pie-segment:hover {
  opacity: 0.9;
}

.pie-segment.hovered {
  opacity: 0.85;
  filter: brightness(1.1);
}

.chart-tooltip {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: rgba(0, 0, 0, 0.9);
  color: white;
  padding: 12px 16px;
  border-radius: 8px;
  min-width: 200px;
  max-width: 300px;
  max-height: 300px;
  pointer-events: none;
  z-index: 10;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.tooltip-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: 700;
  font-size: 1rem;
  margin-bottom: 8px;
  padding-bottom: 8px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.2);
}

.tooltip-count {
  background: rgba(255, 255, 255, 0.2);
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 0.9rem;
}

.tooltip-territories {
  max-height: 220px;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: rgba(255, 255, 255, 0.3) transparent;
}

.tooltip-territories::-webkit-scrollbar {
  width: 6px;
}

.tooltip-territories::-webkit-scrollbar-track {
  background: transparent;
}

.tooltip-territories::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.3);
  border-radius: 3px;
}

.tooltip-territories::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.5);
}

.territory-item {
  padding: 4px 0;
  font-size: 0.85rem;
  opacity: 0.9;
}

.tooltip-empty {
  font-style: italic;
  opacity: 0.6;
  text-align: center;
  padding: 4px 0;
}

.chart-legend {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 8px;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.legend-item:hover {
  background: rgba(0, 0, 0, 0.05);
}

[data-theme="dark"] .legend-item:hover {
  background: rgba(255, 255, 255, 0.05);
}

.legend-color {
  width: 16px;
  height: 16px;
  border-radius: 3px;
  flex-shrink: 0;
}

.legend-label {
  flex: 1;
  color: var(--text-color);
  font-size: 0.9rem;
}

.legend-value {
  color: var(--text-color);
  font-weight: 700;
  font-size: 0.9rem;
}
</style>
