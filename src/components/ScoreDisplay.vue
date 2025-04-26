<template>
    <div class="score-display-container">
      <div class="score-header">
        <h2>Game Statistics</h2>
      </div>
      <div class="score-content">
        <div class="score-row">
          <div class="score-label">Total Score:</div>
          <div class="score-value">{{ score }} points</div>
        </div>
        <div class="score-row">
          <div class="score-label">Average Distance:</div>
          <div class="score-value">{{ averageDistance }} km</div>
        </div>
        <div class="score-row">
          <div class="score-label">Best Guess:</div>
          <div class="score-value">{{ bestGuess.distance }} km ({{ bestGuess.capital }})</div>
        </div>
        <div class="score-row">
          <div class="score-label">Time:</div>
          <div class="score-value">{{ formattedTime }}</div>
        </div>
      </div>
      <div class="guess-history">
        <h3>Guess History</h3>
        <div class="guess-list">
          <div v-for="(guess, index) in guessHistory" :key="index" class="guess-item">
            <div class="guess-capital">{{ guess.capital }}</div>
            <div class="guess-distance" :class="getDistanceClass(guess.distance)">
              {{ guess.distance }} km
            </div>
            <div class="guess-points">+{{ guess.points }} pts</div>
          </div>
        </div>
      </div>
      <button class="new-game-btn" @click="onPlayAgain">Play Again</button>
    </div>
  </template>

  <script setup lang="ts">
  import { computed } from 'vue';

  const props = defineProps<{
    score: number;
    formattedTime: string;
    guessHistory: Array<{
      capital: string;
      country: string;
      distance: string;
      points: number;
    }>;
  }>();

  const emit = defineEmits<{
    (e: 'playAgain'): void;
  }>();

  const averageDistance = computed(() => {
    if (props.guessHistory.length === 0) return "N/A";

    const totalDistance = props.guessHistory.reduce((sum, guess) => {
      return sum + parseFloat(guess.distance);
    }, 0);

    return `${Math.round(totalDistance / props.guessHistory.length)}`;
  });

  const bestGuess = computed(() => {
    if (props.guessHistory.length === 0) {
      return { capital: "None", distance: "N/A" };
    }

    let best = props.guessHistory[0];

    props.guessHistory.forEach(guess => {
      if (parseFloat(guess.distance) < parseFloat(best.distance)) {
        best = guess;
      }
    });

    return {
      capital: best.capital,
      distance: best.distance
    };
  });

  const getDistanceClass = (distance: string) => {
    const dist = parseFloat(distance);
    if (dist < 50) return "excellent";
    if (dist < 200) return "good";
    if (dist < 500) return "fair";
    return "poor";
  };

  const onPlayAgain = () => {
    emit('playAgain');
  };
  </script>

  <style scoped>
  .score-display-container {
    background-color: var(--header-bg);
    border-radius: 10px;
    padding: 20px;
    width: 100%;
    max-width: 500px;
    box-shadow: 0 4px 10px rgb(0 0 0 / 20%);
  }

  .score-header h2 {
    color: var(--text-color);
    text-align: center;
    margin-top: 0;
    margin-bottom: 20px;
    font-size: 1.5rem;
  }

  .score-content {
    margin-bottom: 20px;
  }

  .score-row {
    display: flex;
    justify-content: space-between;
    margin-bottom: 10px;
    padding-bottom: 10px;
    border-bottom: 1px solid rgb(128 128 128 / 20%);
  }

  .score-label {
    font-weight: 700;
    color: var(--text-color);
  }

  .score-value {
    color: var(--text-color);
  }

  .guess-history h3 {
    color: var(--text-color);
    font-size: 1.2rem;
    margin-bottom: 10px;
  }

  .guess-list {
    max-height: 300px;
    overflow-y: auto;
    margin-bottom: 20px;
    padding-right: 5px;
  }

  .guess-item {
    display: flex;
    justify-content: space-between;
    padding: 8px 10px;
    margin-bottom: 5px;
    background-color: rgb(128 128 128 / 10%);
    border-radius: 5px;
  }

  .guess-capital {
    font-weight: 700;
    color: var(--text-color);
  }

  .guess-distance {
    padding: 2px 8px;
    border-radius: 10px;
    font-size: 0.9rem;
  }

  .guess-distance.excellent {
    background-color: #2ecc71;
    color: white;
  }

  .guess-distance.good {
    background-color: #f1c40f;
    color: #333;
  }

  .guess-distance.fair {
    background-color: #e67e22;
    color: white;
  }

  .guess-distance.poor {
    background-color: #e74c3c;
    color: white;
  }

  .guess-points {
    font-weight: 700;
    color: #2ecc71;
  }

  .new-game-btn {
    display: block;
    width: 100%;
    padding: 12px;
    background-color: #4a90e2;
    color: white;
    border: none;
    border-radius: 5px;
    font-size: 1.1rem;
    cursor: pointer;
    transition: background-color 0.2s;
  }

  .new-game-btn:hover {
    background-color: #357abd;
  }
  </style>
