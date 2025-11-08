<template>
  <v-btn
    block
    size="large"
    :color="game.color || 'primary'"
    @click="navigateToGame"
  >
    <v-icon v-if="game.icon" start>
      {{ game.icon }}
    </v-icon>
    <span v-else-if="game.emoji" class="me-2 game-emoji">{{ game.emoji }}</span>
    {{ game.name }}
    <v-chip
      v-if="game.difficulty"
      size="x-small"
      class="ml-2"
      :color="getDifficultyColor(game.difficulty)"
    >
      {{ getDifficultyLabel(game.difficulty) }}
    </v-chip>
  </v-btn>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router';
import type { GameDefinition } from '../types/gameRegistry';

const props = defineProps<{
  game: GameDefinition;
}>();

const router = useRouter();

const navigateToGame = () => {
  router.push(props.game.route);
};

const getDifficultyColor = (difficulty: number): string => {
  const colors = ['green', 'light-green', 'orange', 'deep-orange', 'red'];
  return colors[difficulty - 1] || 'grey';
};

const getDifficultyLabel = (difficulty: number): string => {
  const labels = ['Easy', 'Medium', 'Hard', 'Expert', 'Extreme'];
  return labels[difficulty - 1] || '';
};
</script>

<style scoped>
.game-emoji {
  font-size: 1.2em;
  vertical-align: middle;
}
</style>
