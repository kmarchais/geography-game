<template>
  <v-card variant="outlined" class="mb-4">
    <v-card-title :class="['text-h6 py-3 px-4', categoryConfig.bgClass]">
      <v-icon start :color="categoryConfig.iconColor">
        {{ categoryConfig.icon }}
      </v-icon>
      {{ categoryConfig.title }}
    </v-card-title>
    <v-card-text class="pt-4">
      <v-row dense>
        <v-col
          v-for="game in games"
          :key="game.id"
          cols="12"
          :md="categoryConfig.cols"
          sm="6"
        >
          <GameButton :game="game" />
        </v-col>
      </v-row>
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import GameButton from './GameButton.vue';
import type { GameDefinition } from '../types/gameRegistry';

const props = defineProps<{
  category: string;
  games: GameDefinition[];
}>();

interface CategoryConfig {
  title: string;
  icon: string;
  iconColor: string;
  bgClass: string;
  cols: number;
}

const categoryConfigs: Record<string, CategoryConfig> = {
  countries: {
    title: 'Country Maps',
    icon: 'mdi-earth',
    iconColor: 'blue',
    bgClass: 'bg-blue-lighten-5',
    cols: 6,
  },
  divisions: {
    title: 'Administrative Divisions',
    icon: 'mdi-map-marker-radius',
    iconColor: 'green',
    bgClass: 'bg-green-lighten-5',
    cols: 6,
  },
  cities: {
    title: 'City Districts',
    icon: 'mdi-city',
    iconColor: 'orange',
    bgClass: 'bg-orange-lighten-5',
    cols: 4,
  },
  capitals: {
    title: 'Capitals',
    icon: 'mdi-office-building-marker',
    iconColor: 'purple',
    bgClass: 'bg-purple-lighten-5',
    cols: 6,
  },
  flags: {
    title: 'Flags',
    icon: 'mdi-flag',
    iconColor: 'red',
    bgClass: 'bg-red-lighten-5',
    cols: 6,
  },
};

const categoryConfig = computed<CategoryConfig>(() => {
  return categoryConfigs[props.category] || {
    title: props.category.charAt(0).toUpperCase() + props.category.slice(1),
    icon: 'mdi-map',
    iconColor: 'grey',
    bgClass: 'bg-grey-lighten-5',
    cols: 6,
  };
});
</script>

<style scoped>
.v-card-title {
  font-weight: 600;
}
</style>
