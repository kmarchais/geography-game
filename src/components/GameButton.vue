<template>
  <v-tooltip
    location="top"
    :text="game.name"
  >
    <template #activator="{ props: tooltipProps }">
      <v-btn
        v-bind="tooltipProps"
        block
        size="large"
        :color="game.color || 'primary'"
        class="game-button"
        @click="navigateToGame"
      >
        <div class="d-flex align-center w-100">
          <!-- For divisions and cities, prioritize emoji (flag) over icon -->
          <span
            v-if="showEmoji"
            class="me-2 game-emoji flex-shrink-0"
          >{{ displayEmoji }}</span>
          <v-icon
            v-else-if="game.icon"
            start
            class="flex-shrink-0"
          >
            {{ game.icon }}
          </v-icon>

          <span class="game-name text-truncate">{{ displayName }}</span>

          <!-- Entity count badge - integrated into button -->
          <div
            v-if="game.difficulty && entityCount"
            class="entity-badge"
            :class="`badge-difficulty-${game.difficulty}`"
          >
            {{ entityCount }}
          </div>
        </div>
      </v-btn>
    </template>
  </v-tooltip>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import type { GameDefinition } from '../types/gameRegistry';

const props = defineProps<{
  game: GameDefinition;
}>();

const router = useRouter();

/**
 * Get country flag emoji for cities based on city name
 */
const cityCountryFlag = computed(() => {
  if (props.game.category !== 'cities') {return null;}

  const name = props.game.name;
  if (name.includes('Paris') || name.includes('Bordeaux')) {return '🇫🇷';}
  if (name.includes('London')) {return '🇬🇧';}
  if (name.includes('Barcelona')) {return '🇪🇸';}

  return null;
});

/**
 * Get optimized display name based on game category
 */
const displayName = computed(() => {
  const name = props.game.name;
  const category = props.game.category;

  // For countries: simplify continent names
  if (category === 'countries') {
    return name
      .replace(/\s+Countries$/i, '')
      .replace(/^European$/i, 'Europe')
      .replace(/^African$/i, 'Africa')
      .replace(/^Asian$/i, 'Asia')
      .replace(/^North American$/i, 'North America')
      .replace(/^South American$/i, 'South America')
      .replace(/^Oceanian$/i, 'Oceania');
  }

  // For divisions: if there's an emoji, remove country name prefix
  if (category === 'divisions' && props.game.emoji) {
    return name
      .replace(/^US\s+/, '')
      .replace(/^Canadian\s+/, '')
      .replace(/^Spanish\s+/, '')
      .replace(/^German\s+/, '')
      .replace(/^Italian\s+/, '')
      .replace(/^Brazilian\s+/, '')
      .replace(/^Australian\s+/, '')
      .replace(/^Chinese\s+/, '')
      .replace(/^Belgian\s+/, '')
      .replace(/^Dutch\s+/, '')
      .replace(/^UK\s+/, '')
      .replace(/^Russian\s+/, '')
      .replace(/^Ukrainian\s+/, '');
  }

  // For cities: simplify long names
  if (category === 'cities') {
    return name
      .replace(/\s+Area\s+/, ' ')  // "Bordeaux Area Quartiers" → "Bordeaux Quartiers"
      .replace(/Quartiers Administratifs/, 'Quartiers Admin.')
      .replace(/Quartiers d'Usage/, 'Quartiers Usage');
  }

  // For other categories, return as is
  return name;
});

/**
 * Show emoji - for divisions (country flags) and cities (country flags)
 */
const showEmoji = computed(() => {
  // For divisions, use the game's emoji (country flag)
  if (props.game.category === 'divisions' && props.game.emoji) {
    return true;
  }

  // For cities, use the detected country flag
  if (props.game.category === 'cities' && cityCountryFlag.value) {
    return true;
  }

  return false;
});

/**
 * Get the emoji to display
 */
const displayEmoji = computed(() => {
  if (props.game.category === 'cities') {
    return cityCountryFlag.value;
  }
  return props.game.emoji;
});

/**
 * Get entity count for display
 */
const entityCount = computed(() => {
  return props.game.config?.totalRounds || null;
});

const navigateToGame = () => {
  router.push(props.game.route);
};

const getDifficultyColor = (difficulty: number): string => {
  const colors = ['green', 'light-green', 'orange', 'deep-orange', 'red'];
  return colors[difficulty - 1] || 'grey';
};
</script>

<style scoped>
.game-emoji {
  font-size: 1.2em;
  vertical-align: middle;

  /* Use Twemoji font for proper flag emoji rendering */
  font-family: Twemoji Country Flags, Apple Color emoji, Segoe UI emoji,
    Segoe UI Symbol, Noto Color emoji, EmojiOne Color, Android emoji, sans-serif;
}

.game-button {
  text-transform: none !important;
  overflow: hidden;
}

.game-button :deep(.v-btn__content) {
  width: 100%;
  overflow: hidden;
}

.game-name {
  flex: 1 1 auto;
  min-width: 0; /* Required for text-truncate to work in flexbox */
  text-align: left;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* Entity count badge - clean, modern design */
.entity-badge {
  margin-left: auto;
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 16px;
  font-weight: 700;
  color: white;
  min-width: 40px;
  text-align: center;
  flex-shrink: 0;
  opacity: 0.95;
}

/* Difficulty color variations - solid colors for clean look */
.badge-difficulty-1 {
  background-color: #4caf50;
}

.badge-difficulty-2 {
  background-color: #8bc34a;
}

.badge-difficulty-3 {
  background-color: #ff9800;
}

.badge-difficulty-4 {
  background-color: #ff5722;
}

.badge-difficulty-5 {
  background-color: #d32f2f;
}
</style>
