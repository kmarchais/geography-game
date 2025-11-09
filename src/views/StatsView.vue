<template>
  <v-container class="stats-view">
    <v-row>
      <v-col cols="12">
        <h1 class="text-h3 mb-4">
          📊 Your Stats
        </h1>
      </v-col>
    </v-row>

    <!-- Not Logged In State -->
    <v-row v-if="!authStore.isLoggedIn">
      <v-col cols="12">
        <v-alert
          type="info"
          variant="tonal"
        >
          <p class="text-h6 mb-2">
            Sign in to track your stats!
          </p>
          <p>Log in with Google to start tracking your game performance, see your personal bests, and monitor your progress over time.</p>
        </v-alert>
      </v-col>
    </v-row>

    <!-- Logged In Stats Display -->
    <template v-else>
      <!-- No Stats Yet -->
      <v-row v-if="statsStore.totalGamesPlayed === 0">
        <v-col cols="12">
          <v-alert
            type="info"
            variant="tonal"
          >
            <p class="text-h6 mb-2">
              No games played yet!
            </p>
            <p>Play some games to start tracking your stats and see your progress.</p>
          </v-alert>
        </v-col>
      </v-row>

      <!-- Stats Display -->
      <template v-else>
        <!-- Overview Cards -->
        <v-row>
          <v-col
            cols="12"
            md="3"
          >
            <v-card>
              <v-card-text>
                <div class="text-h6 text-grey">
                  Total Games
                </div>
                <div class="text-h3 mt-2">
                  {{ statsStore.totalGamesPlayed }}
                </div>
              </v-card-text>
            </v-card>
          </v-col>
          <v-col
            cols="12"
            md="3"
          >
            <v-card>
              <v-card-text>
                <div class="text-h6 text-grey">
                  Average Score
                </div>
                <div class="text-h3 mt-2">
                  {{ statsStore.averageScore }}
                </div>
              </v-card-text>
            </v-card>
          </v-col>
          <v-col
            cols="12"
            md="3"
          >
            <v-card>
              <v-card-text>
                <div class="text-h6 text-grey">
                  Games Completed
                </div>
                <div class="text-h3 mt-2">
                  {{ statsStore.gamesCompleted }}
                </div>
              </v-card-text>
            </v-card>
          </v-col>
          <v-col
            cols="12"
            md="3"
          >
            <v-card>
              <v-card-text>
                <div class="text-h6 text-grey">
                  Total Time
                </div>
                <div class="text-h3 mt-2">
                  {{ formatTotalTime(statsStore.stats.totalTimeSeconds) }}
                </div>
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>

        <!-- Top Games -->
        <v-row class="mt-4">
          <v-col cols="12">
            <v-card>
              <v-card-title>🎮 Most Played Games</v-card-title>
              <v-card-text>
                <v-list v-if="statsStore.topGames.length > 0">
                  <v-list-item
                    v-for="game in statsStore.topGames"
                    :key="game.gameId"
                  >
                    <v-list-item-title>{{ game.gameName }}</v-list-item-title>
                    <v-list-item-subtitle>
                      Played {{ game.timesPlayed }} times · Best: {{ game.bestScore }} · Avg: {{ game.averageScore }}
                    </v-list-item-subtitle>
                  </v-list-item>
                </v-list>
                <p
                  v-else
                  class="text-grey"
                >
                  No games played yet
                </p>
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>

        <!-- Best Performances -->
        <v-row class="mt-4">
          <v-col cols="12">
            <v-card>
              <v-card-title>🏆 Best Performances</v-card-title>
              <v-card-text>
                <v-list v-if="statsStore.bestPerformances.length > 0">
                  <v-list-item
                    v-for="game in statsStore.bestPerformances"
                    :key="game.gameId"
                  >
                    <v-list-item-title>{{ game.gameName }}</v-list-item-title>
                    <v-list-item-subtitle>
                      Best Score: {{ game.bestScore }} · Best Time: {{ formatTime(game.bestTime) }} · Accuracy: {{ game.highestAccuracy }}%
                    </v-list-item-subtitle>
                  </v-list-item>
                </v-list>
                <p
                  v-else
                  class="text-grey"
                >
                  No performances recorded yet
                </p>
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>

        <!-- Recent Games -->
        <v-row class="mt-4">
          <v-col cols="12">
            <v-card>
              <v-card-title>📅 Recent Games</v-card-title>
              <v-card-text>
                <v-list v-if="statsStore.recentGames.length > 0">
                  <v-list-item
                    v-for="(game, index) in statsStore.recentGames.slice(0, 10)"
                    :key="index"
                  >
                    <v-list-item-title>{{ game.gameName }}</v-list-item-title>
                    <v-list-item-subtitle>
                      Score: {{ game.score }}/{{ game.totalRounds }} ·
                      Time: {{ formatTime(game.timeInSeconds) }} ·
                      Accuracy: {{ game.accuracy }}% ·
                      {{ formatDate(game.timestamp) }}
                    </v-list-item-subtitle>
                  </v-list-item>
                </v-list>
                <p
                  v-else
                  class="text-grey"
                >
                  No recent games
                </p>
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>

        <!-- Actions -->
        <v-row class="mt-4">
          <v-col cols="12">
            <v-card>
              <v-card-title>⚙️ Manage Stats</v-card-title>
              <v-card-text>
                <v-btn
                  color="primary"
                  variant="outlined"
                  class="mr-2"
                  @click="exportStats"
                >
                  Export Stats
                </v-btn>
                <v-btn
                  color="warning"
                  variant="outlined"
                  @click="confirmReset = true"
                >
                  Reset Stats
                </v-btn>
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>
      </template>
    </template>

    <!-- Reset Confirmation Dialog -->
    <v-dialog
      v-model="confirmReset"
      max-width="500"
    >
      <v-card>
        <v-card-title>Reset All Stats?</v-card-title>
        <v-card-text>
          This will permanently delete all your game statistics, including scores, times, and history.
          This action cannot be undone.
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn
            variant="text"
            @click="confirmReset = false"
          >
            Cancel
          </v-btn>
          <v-btn
            color="error"
            @click="resetStats"
          >
            Reset All Stats
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Export Success Snackbar -->
    <v-snackbar
      v-model="showExportSuccess"
      color="success"
      timeout="3000"
    >
      Stats exported to clipboard!
    </v-snackbar>
  </v-container>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useStatsStore } from '../stores/stats';
import { useAuthStore } from '../stores/auth';

const statsStore = useStatsStore();
const authStore = useAuthStore();

const confirmReset = ref(false);
const showExportSuccess = ref(false);

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function formatTotalTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

function formatDate(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return 'Today';
  } else if (diffDays === 1) {
    return 'Yesterday';
  } else if (diffDays < 7) {
    return `${diffDays} days ago`;
  } else {
    return date.toLocaleDateString();
  }
}

function exportStats() {
  const json = statsStore.exportStats();
  navigator.clipboard.writeText(json);
  showExportSuccess.value = true;
}

function resetStats() {
  statsStore.resetStats();
  confirmReset.value = false;
}
</script>

<style scoped>
.stats-view {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}
</style>
