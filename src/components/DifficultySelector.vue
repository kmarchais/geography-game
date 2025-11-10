<template>
  <v-card class="difficulty-selector">
    <v-card-title class="text-h5 pa-4">
      <v-icon class="mr-2">mdi-speedometer</v-icon>
      Select Difficulty
    </v-card-title>

    <v-card-text class="pa-4">
      <v-container>
        <v-row>
          <v-col
            v-for="mode in difficultyModes"
            :key="mode"
            cols="12"
            md="4"
          >
            <v-card
              :color="isSelected(mode) ? config(mode).color : undefined"
              :variant="isSelected(mode) ? 'tonal' : 'outlined'"
              class="difficulty-card"
              hover
              @click="selectDifficulty(mode)"
            >
              <v-card-text class="text-center pa-4">
                <v-icon
                  :color="config(mode).color"
                  size="48"
                  class="mb-2"
                >
                  {{ config(mode).icon }}
                </v-icon>

                <h3 class="text-h6 mb-2">
                  {{ config(mode).label }}
                </h3>

                <p class="text-body-2 mb-3">
                  {{ config(mode).description }}
                </p>

                <v-divider class="my-2" />

                <div class="text-caption">
                  <div class="mb-1">
                    <v-icon size="small" class="mr-1">mdi-clock-outline</v-icon>
                    <span v-if="config(mode).timedMode">
                      {{ config(mode).timePerRound }}s per round
                    </span>
                    <span v-else>No time limit</span>
                  </div>

                  <div>
                    <v-icon size="small" class="mr-1">mdi-star-outline</v-icon>
                    <span>{{ scoreMultiplierText(mode) }}</span>
                  </div>
                </div>

                <v-btn
                  v-if="isSelected(mode)"
                  :color="config(mode).color"
                  variant="flat"
                  class="mt-3"
                  size="small"
                  prepend-icon="mdi-check"
                >
                  Selected
                </v-btn>
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>

        <!-- Practice Mode (optional toggle) -->
        <v-row v-if="showPracticeMode" class="mt-2">
          <v-col cols="12">
            <v-card
              :color="isSelected('practice') ? PRACTICE_MODE_CONFIG.color : undefined"
              :variant="isSelected('practice') ? 'tonal' : 'outlined'"
              class="difficulty-card"
              hover
              @click="selectPracticeMode"
            >
              <v-card-text class="d-flex align-center pa-4">
                <v-icon
                  :color="PRACTICE_MODE_CONFIG.color"
                  size="32"
                  class="mr-3"
                >
                  {{ PRACTICE_MODE_CONFIG.icon }}
                </v-icon>

                <div class="flex-grow-1">
                  <h4 class="text-subtitle-1 mb-1">
                    {{ PRACTICE_MODE_CONFIG.label }}
                  </h4>
                  <p class="text-caption mb-0">
                    {{ PRACTICE_MODE_CONFIG.description }}
                  </p>
                </div>

                <v-chip
                  v-if="isSelected('practice')"
                  :color="PRACTICE_MODE_CONFIG.color"
                  variant="flat"
                  size="small"
                  prepend-icon="mdi-check"
                >
                  Selected
                </v-chip>
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>
      </v-container>
    </v-card-text>

    <v-card-actions class="pa-4">
      <v-spacer />
      <v-btn
        variant="text"
        @click="$emit('cancel')"
      >
        Cancel
      </v-btn>
      <v-btn
        :color="selectedDifficulty ? config(selectedDifficulty as DifficultyMode).color : 'primary'"
        :disabled="!selectedDifficulty"
        variant="flat"
        @click="confirmSelection"
      >
        Start Game
      </v-btn>
    </v-card-actions>
  </v-card>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { DifficultyMode } from '../types/difficulty'
import {
  getAllDifficultyModes,
  getDifficultyConfig,
  PRACTICE_MODE_CONFIG,
} from '../types/difficulty'

interface Props {
  showPracticeMode?: boolean
  defaultDifficulty?: DifficultyMode
}

interface Emits {
  (e: 'select', difficulty: DifficultyMode): void
  (e: 'cancel'): void
}

const props = withDefaults(defineProps<Props>(), {
  showPracticeMode: false,
  defaultDifficulty: 'medium',
})

const emit = defineEmits<Emits>()

const difficultyModes = getAllDifficultyModes()
const selectedDifficulty = ref<DifficultyMode | 'practice' | null>(props.defaultDifficulty)

function config(mode: DifficultyMode) {
  return getDifficultyConfig(mode)
}

function isSelected(mode: DifficultyMode | 'practice') {
  return selectedDifficulty.value === mode
}

function selectDifficulty(mode: DifficultyMode) {
  selectedDifficulty.value = mode
}

function selectPracticeMode() {
  selectedDifficulty.value = 'practice'
}

function scoreMultiplierText(mode: DifficultyMode): string {
  const multiplier = config(mode).scoreMultiplier
  if (multiplier === 1.0) {
    return 'Standard scoring'
  } else if (multiplier < 1.0) {
    return `${(multiplier * 100)}% score`
  } else {
    return `${(multiplier * 100)}% score bonus`
  }
}

function confirmSelection() {
  if (selectedDifficulty.value && selectedDifficulty.value !== 'practice') {
    emit('select', selectedDifficulty.value as DifficultyMode)
  }
  // Note: Practice mode handling would need special logic if we add it
}
</script>

<style scoped>
.difficulty-selector {
  max-width: 900px;
  margin: 0 auto;
}

.difficulty-card {
  transition: all 0.2s ease;
  cursor: pointer;
  height: 100%;
}

.difficulty-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}
</style>
