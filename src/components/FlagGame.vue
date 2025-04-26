<template>
  <div class="flag-game">
    <div
      v-if="loading"
      class="loading-container"
    >
      <div class="spinner" />
      <p>Loading flags...</p>
    </div>

    <div
      v-else-if="error"
      class="error-container"
    >
      <p>{{ error }}</p>
      <button
        class="primary-button"
        @click="initGame"
      >
        Try Again
      </button>
    </div>

    <div
      v-else-if="!gameEnded"
      class="game-container"
    >
      <div
        v-if="!gameStarted"
        class="difficulty-selector"
      >
        <h2>Select Difficulty</h2>
        <div class="difficulty-buttons">
          <button
            :class="{ active: difficulty === 'easy' }"
            @click="setDifficulty('easy')"
          >
            Easy
          </button>
          <button
            :class="{ active: difficulty === 'medium' }"
            @click="setDifficulty('medium')"
          >
            Medium
          </button>
          <button
            :class="{ active: difficulty === 'hard' }"
            @click="setDifficulty('hard')"
          >
            Hard
          </button>
        </div>
        <div class="difficulty-info">
          <div v-if="difficulty === 'easy'">
            Population: ≥ 50 million
          </div>
          <div v-else-if="difficulty === 'medium'">
            Population: 5–50 million
          </div>
          <div v-else>
            Population: 5 million-200k
          </div>
        </div>

        <div class="rounds-selector">
          <h3>Number of Rounds</h3>
          <div class="rounds-buttons">
            <button
              :class="{ active: totalRounds === 5 }"
              @click="setRounds(5)"
            >
              5
            </button>
            <button
              :class="{ active: totalRounds === 10 }"
              @click="setRounds(10)"
            >
              10
            </button>
            <button
              :class="{ active: totalRounds === 15 }"
              @click="setRounds(15)"
            >
              15
            </button>
            <button
              :class="{ active: totalRounds === 20 }"
              @click="setRounds(20)"
            >
              20
            </button>
          </div>
        </div>

        <button
          class="primary-button"
          @click="startGame"
        >
          Start Game
        </button>
      </div>

      <template v-else>
        <div class="game-stats">
          <div class="stat">
            <span class="stat-label">Score</span>
            <span class="stat-value">{{ score }} / {{ totalRounds }}</span>
          </div>
          <div class="stat">
            <span class="stat-label">Round</span>
            <span class="stat-value">{{ currentRound }} / {{ totalRounds }}</span>
          </div>
          <div class="stat">
            <span class="stat-label">Time</span>
            <span class="stat-value">{{ formatTime(timer) }}</span>
          </div>
        </div>

        <div
          class="flag-container"
          :class="{ 'reveal-animation': showAnswer }"
        >
          <div class="flag-wrapper">
            <img
              v-if="currentCountry"
              :src="currentCountry.flag"
              :alt="`Flag of ${currentCountry.name}`"
              class="flag-img"
              @error="handleImageError"
            >
          </div>
          <div
            v-if="hintVisible"
            class="hint-box"
          >
            <p>Hint: {{ currentHint }}</p>
          </div>
        </div>

        <form
          class="guess-form"
          @submit.prevent="onGuess"
        >
          <div class="input-container">
            <input
              ref="guessInput"
              v-model="guess"
              :placeholder="hintVisible ? 'Enter country name...' : 'Type the country name'"
              autocomplete="off"
              :disabled="showAnswer"
            >
            <div class="actions">
              <button
                type="button"
                class="hint-button"
                :disabled="hintsUsed >= maxHints || showAnswer"
                @click="showHint"
              >
                Hint ({{ maxHints - hintsUsed }} left)
              </button>
              <button
                type="submit"
                class="guess-button"
                :disabled="showAnswer"
              >
                Guess
              </button>
            </div>
          </div>
        </form>

        <div
          v-if="feedback"
          class="feedback"
          :class="feedbackType"
        >
          {{ feedback }}
          <div
            v-if="showAnswer"
            class="correct-answer"
          >
            The correct answer is <strong>{{ currentCountry?.name }}</strong>
            <div
              v-if="currentCountry"
              class="country-info"
            >
              Population: {{ formatPopulation(currentCountry?.population) }}
            </div>
          </div>
        </div>

        <div
          v-if="showAnswer"
          class="next-button-container"
        >
          <button
            class="primary-button"
            @click="nextRound"
          >
            Next Flag
          </button>
        </div>
      </template>
    </div>

    <div
      v-else
      class="game-over"
    >
      <h2>Game Over!</h2>
      <div class="results">
        <div class="result-item">
          <span class="result-label">Final Score</span>
          <span class="result-value">{{ score }} / {{ totalRounds }}</span>
        </div>
        <div class="result-item">
          <span class="result-label">Accuracy</span>
          <span class="result-value">{{ Math.round((score / totalRounds) * 100) }}%</span>
        </div>
        <div class="result-item">
          <span class="result-label">Total Time</span>
          <span class="result-value">{{ formatTime(totalTime) }}</span>
        </div>
        <div class="result-item">
          <span class="result-label">Difficulty</span>
          <span class="result-value capitalize">{{ difficulty }}</span>
        </div>
      </div>

      <div class="session-recap">
        <h3>Session Recap</h3>
        <div class="recap-container">
          <div class="recap-column correct-column">
            <h4>Correct Answers ({{ correctAnswers.length }})</h4>
            <div class="country-list">
              <div
                v-for="(country, index) in correctAnswers"
                :key="`correct-${index}`"
                class="country-item"
              >
                <img
                  :src="country.flag"
                  :alt="`Flag of ${country.name}`"
                  class="mini-flag"
                >
                <span>{{ country.name }}</span>
                <small class="population-info">{{ formatPopulation(country.population) }}</small>
              </div>
              <div
                v-if="correctAnswers.length === 0"
                class="empty-list"
              >
                No correct answers
              </div>
            </div>
          </div>
          <div class="recap-column wrong-column">
            <h4>Wrong Answers ({{ wrongAnswers.length }})</h4>
            <div class="country-list">
              <div
                v-for="(country, index) in wrongAnswers"
                :key="`wrong-${index}`"
                class="country-item"
              >
                <img
                  :src="country.flag"
                  :alt="`Flag of ${country.name}`"
                  class="mini-flag"
                >
                <span>{{ country.name }}</span>
                <small class="population-info">{{ formatPopulation(country.population) }}</small>
              </div>
              <div
                v-if="wrongAnswers.length === 0"
                class="empty-list"
              >
                No wrong answers
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="action-buttons">
        <button
          class="primary-button"
          @click="resetGame"
        >
          Play Again
        </button>
        <button
          class="secondary-button"
          @click="shareSocial"
        >
          Share Score
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { ref, onMounted, onUnmounted } from "vue";

  interface Country {
    name: string;
    code: string;
    flag: string;
    continent?: string;
    capital?: string;
    population?: number;
    alternativeNames?: string[];
  }

  const countries = ref<Country[]>([]);
  const filteredCountries = ref<Country[]>([]);
  const loading = ref(true);
  const error = ref("");
  const guess = ref("");
  const score = ref(0);
  const currentRound = ref(0);
  const totalRounds = ref(10);
  const gameEnded = ref(false);
  const gameStarted = ref(false);
  const currentCountry = ref<Country | null>(null);
  const feedback = ref("");
  const feedbackType = ref("");
  const showAnswer = ref(false);
  const hintsUsed = ref(0);
  const maxHints = ref(3);
  const hintVisible = ref(false);
  const currentHint = ref("");
  const timer = ref(0);
  const timerInterval = ref<number | null>(null);
  const totalTime = ref(0);
  const wrongAnswers = ref<Country[]>([]);
  const correctAnswers = ref<Country[]>([]);
  const difficulty = ref("medium");
  const guessInput = ref<HTMLInputElement | null>(null);

  async function initGame() {
    loading.value = true;
    error.value = "";

    try {
      const res = await fetch("https://restcountries.com/v3.1/all");

      if (!res.ok) throw new Error("Network error");

      const data = await res.json();

      countries.value = enrichCountriesWithAlternativeNames(
        data
          .filter(
            (c: any) =>
              c.name &&
              c.name.common &&
              c.cca2 &&
              typeof c.cca2 === "string" &&
              c.cca2.length === 2
          )
          .map((c: any) => ({
            name: c.name.common,
            code: c.cca2,
            flag: `https://flagcdn.com/w320/${c.cca2.toLowerCase()}.png`,
            continent: c.region || "Unknown",
            capital: c.capital ? c.capital[0] : undefined,
            population: c.population
          }))
      );

      if (countries.value.length === 0) {
        throw new Error("No countries found in API response.");
      }

      setDifficulty(difficulty.value);
      resetGame();

    } catch (e: any) {
      error.value = "Failed to load country data. " + (e.message || "");
    } finally {
      loading.value = false;
    }
  }

  function setDifficulty(level: string) {
    difficulty.value = level;

    if (level === 'easy') {
      maxHints.value = 5;
    } else if (level === 'medium') {
      maxHints.value = 3;
    } else {
      maxHints.value = 2;
    }

    const easyThreshold = 50_000_000;
    const mediumThreshold = 5_000_000;
    const hardThreshold = 200_000;

    filteredCountries.value = countries.value.filter((country) => {
      if (!country.population) return false;
      if (level === 'easy') {
        return country.population >= easyThreshold;
      } else if (level === 'medium') {
        return (
          country.population >= mediumThreshold &&
          country.population < easyThreshold
        );
      } else {
        return country.population < mediumThreshold && country.population >= hardThreshold;
      }
    });

    if (filteredCountries.value.length < totalRounds.value * 2) {
      console.log("Not enough countries for selected difficulty, using all countries");
      filteredCountries.value = countries.value;
    }
  }

  function setRounds(rounds: number) {
    totalRounds.value = rounds;
  }

  function formatPopulation(population?: number): string {
    if (!population) return "Unknown";

    if (population >= 1_000_000) {
      return `${(population / 1_000_000).toFixed(2)} million`;
    } else if (population >= 1_000) {
      return `${(population / 1_000).toFixed(1)}k`;
    } else {
      return population.toString();
    }
  }

  function resetGame() {
    score.value = 0;
    currentRound.value = 0;
    gameEnded.value = false;
    gameStarted.value = false;
    wrongAnswers.value = [];
    correctAnswers.value = [];
    hintsUsed.value = 0;
    totalTime.value = 0;
    stopTimer();
  }

  function startGame() {
    gameStarted.value = true;
    nextRound();
  }

  function nextRound() {
    if (currentRound.value >= totalRounds.value) {
      endGame();
      return;
    }

    currentRound.value++;
    showAnswer.value = false;
    feedback.value = "";
    feedbackType.value = "";
    hintVisible.value = false;
    currentHint.value = "";
    guess.value = "";

    if (filteredCountries.value.length === 0) {
      filteredCountries.value = [...countries.value];
    }

    const randomIndex = Math.floor(Math.random() * filteredCountries.value.length);
    currentCountry.value = filteredCountries.value[randomIndex];

    filteredCountries.value = filteredCountries.value.filter((_, i) => i !== randomIndex);

    startTimer();

    setTimeout(() => {
      if (guessInput.value) {
        guessInput.value.focus();
      }
    }, 100);
  }

  function onGuess() {
    if (!guess.value.trim() || !currentCountry.value || showAnswer.value) return;

    const userGuess = guess.value.trim().toLowerCase();
    const correctAnswer = currentCountry.value.name.toLowerCase();

    if (isCorrectAnswer(userGuess, correctAnswer)) {
      handleCorrectAnswer();
    } else {
      handleIncorrectAnswer(userGuess);
    }

    guess.value = "";
  }

  function enrichCountriesWithAlternativeNames(countries: Country[]): Country[] {
    const alternativeNamesMap: Record<string, string[]> = {
      // North America
      "United States of America": ["United States", "USA", "US"],
      "United States": ["USA", "US"],
      // Europe
      "United Kingdom": ["UK", "Great Britain"],
      "Czechia": ["Czech Republic"],
      "Russia": ["Russian Federation"],
      "Netherlands": ["The Netherlands", "Holland"],
      "Ireland": ["Republic of Ireland", "Eire"],
      // Asia
      "China": ["PRC", "People's Republic of China"],
      "South Korea": ["Korea", "Republic of Korea"],
      "North Korea": ["DPRK", "Democratic People's Republic of Korea"],
      "Vietnam": ["Viet Nam"],
      "United Arab Emirates": ["UAE", "Emirates"],
      "Saudi Arabia": ["KSA", "Kingdom of Saudi Arabia"],
      // Africa
      "South Africa": ["RSA", "Republic of South Africa"],
      "Taiwan": ["Republic of China", "Chinese Taipei"],
      "Bosnia and Herzegovina": ["Bosnia"],
      "Vatican City": ["Holy See", "Vatican"],
      "Ivory Coast": ["Côte d'Ivoire"],
      "Democratic Republic of the Congo": ["DR Congo", "DRC"],
      "Republic of the Congo": ["Congo-Brazzaville", "Congo Republic"],
      "Eswatini": ["Swaziland"]
    };

    return countries.map(country => {
      if (alternativeNamesMap[country.name]) {
        return {
          ...country,
          alternativeNames: alternativeNamesMap[country.name]
        };
      }
      return country;
    });
  }

  function isCorrectAnswer(userGuess: string, correctAnswer: string): boolean {
    const normalizedGuess = userGuess.toLowerCase().trim();
    const normalizedAnswer = correctAnswer.toLowerCase().trim();

    if (normalizedGuess === normalizedAnswer) return true;

    if (currentCountry.value?.alternativeNames) {
      for (const altName of currentCountry.value.alternativeNames) {
        if (normalizedGuess === altName.toLowerCase().trim()) {
          return true;
        }
      }
    }

    const cleanGuess = normalizedGuess.replace(/^the\s+/i, '');
    const cleanAnswer = normalizedAnswer.replace(/^the\s+/i, '');

    if (cleanGuess === cleanAnswer) return true;

    if (currentCountry.value?.alternativeNames) {
      for (const altName of currentCountry.value.alternativeNames) {
        const cleanAltName = altName.toLowerCase().trim().replace(/^the\s+/i, '');
        if (cleanGuess === cleanAltName) {
          return true;
        }
      }
    }

    const similarityToOfficial = calculateSimilarity(cleanGuess, cleanAnswer);

    let maxSimilarity = similarityToOfficial;
    if (currentCountry.value?.alternativeNames) {
      for (const altName of currentCountry.value.alternativeNames) {
        const cleanAltName = altName.toLowerCase().trim().replace(/^the\s+/i, '');
        const similarity = calculateSimilarity(cleanGuess, cleanAltName);
        if (similarity > maxSimilarity) {
          maxSimilarity = similarity;
        }
      }
    }

    const threshold = correctAnswer.length <= 5 ? 0.8 : 0.75;
    return maxSimilarity >= threshold;
  }

  function calculateSimilarity(a: string, b: string): number {
    if (a.length === 0 || b.length === 0) return 0;

    const matrix = Array(a.length + 1).fill(null).map(() => Array(b.length + 1).fill(0));

    for (let i = 0; i <= a.length; i++) matrix[i][0] = i;
    for (let j = 0; j <= b.length; j++) matrix[0][j] = j;

    for (let i = 1; i <= a.length; i++) {
      for (let j = 1; j <= b.length; j++) {
        const cost = a[i - 1] === b[j - 1] ? 0 : 1;
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j - 1] + cost
        );
      }
    }

    const distance = matrix[a.length][b.length];
    const maxLength = Math.max(a.length, b.length);

    return 1 - distance / maxLength;
  }

  function handleCorrectAnswer() {
    score.value++;

    const userGuess = guess.value.trim().toLowerCase();
    const officialName = currentCountry.value?.name.toLowerCase() || "";

    let usedAltName = false;
    let nameUsed = officialName;

    if (userGuess !== officialName && currentCountry.value?.alternativeNames) {
      for (const altName of currentCountry.value.alternativeNames) {
        if (userGuess === altName.toLowerCase() ||
            calculateSimilarity(userGuess, altName.toLowerCase()) > 0.9) {
          usedAltName = true;
          nameUsed = altName;
          break;
        }
      }
    }

    if (usedAltName) {
      feedback.value = `Correct! You used "${nameUsed}", officially known as "${currentCountry.value?.name}".`;
    } else {
      feedback.value = "Correct!";
    }

    feedbackType.value = "correct";
    stopTimer();

    if (currentCountry.value && !correctAnswers.value.includes(currentCountry.value)) {
      correctAnswers.value.push(currentCountry.value);
    }

    showAnswer.value = true;
    setTimeout(() => {
      nextRound();
    }, 2000);
  }

  function handleIncorrectAnswer(userGuess: string) {
    feedback.value = "Incorrect!";
    feedbackType.value = "incorrect";

    showAnswer.value = true;
    stopTimer();

    if (currentCountry.value && !wrongAnswers.value.includes(currentCountry.value)) {
      wrongAnswers.value.push(currentCountry.value);
    }
  }

  function showHint() {
    if (hintsUsed.value >= maxHints.value || !currentCountry.value) return;

    hintsUsed.value++;
    hintVisible.value = true;

    const country = currentCountry.value;
    const hints = [
      `The country name starts with "${country.name[0]}"`,
      `The country name has ${country.name.length} letters`,
      country.capital ? `The capital is ${country.capital}` : `This country is in ${country.continent || 'Unknown continent'}`,
      `The first three letters are "${country.name.substring(0, 3)}"`,
      country.population
        ? `Population is about ${formatPopulation(country.population)}`
        : ''
    ].filter(Boolean);

    let randomHint;
    do {
      randomHint = hints[Math.floor(Math.random() * hints.length)];
    } while (randomHint === currentHint.value && hints.length > 1);

    currentHint.value = randomHint;
  }

  function startTimer() {
    timer.value = 0;
    stopTimer();

    timerInterval.value = setInterval(() => {
      timer.value++;
    }, 1000) as unknown as number;
  }

  function stopTimer() {
    if (timerInterval.value) {
      clearInterval(timerInterval.value);
      timerInterval.value = null;
      totalTime.value += timer.value;
    }
  }

  function formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  function endGame() {
    gameEnded.value = true;
    stopTimer();
  }

  function shareSocial() {
    const text = `I scored ${score.value}/${totalRounds.value} (${Math.round((score.value / totalRounds.value) * 100)}%) on Flag Guesser in ${formatTime(totalTime.value)} on ${difficulty.value} difficulty!`;

    if (navigator.share) {
      navigator.share({
        title: 'My Flag Guesser Score',
        text: text,
      }).catch(() => {
        navigator.clipboard.writeText(text);
        alert('Score copied to clipboard!');
      });
    } else {
      navigator.clipboard.writeText(text);
      alert('Score copied to clipboard!');
    }
  }

  function handleImageError(event: Event) {
    if (!currentCountry.value) return;

    const img = event.target as HTMLImageElement;
    const code = currentCountry.value.code.toLowerCase();

    if (img.src.includes('flagcdn.com')) {
      img.src = `https://flagsapi.com/${code.toUpperCase()}/flat/64.png`;
    } else if (img.src.includes('flagsapi.com')) {
      img.src = `https://hatscripts.github.io/circle-flags/flags/${code}.svg`;
    }
  }

  onMounted(() => {
    initGame();
  });

  onUnmounted(() => {
    stopTimer();
  });
</script>

<style scoped>
  .flag-game {
    display: flex;
    flex-direction: column;
    align-items: center;
    font-family: Segoe UI, Tahoma, Geneva, Verdana, sans-serif;
    padding: 20px;
    max-width: 600px;
    margin: 0 auto;
    min-height: 100vh;
    transition: all 0.3s ease;
    color: #333;
  }

  .game-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100%;
    margin-bottom: 20px;
  }

  h1 {
    font-size: 2rem;
    margin: 0;
    color: #4c84ff;
  }



  .loading-container, .error-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 300px;
    width: 100%;
  }

  .spinner {
    border: 5px solid rgb(0 0 0 / 10%);
    border-top-color: #4c84ff;
    border-radius: 50%;
    width: 40px;
    height: 40px;
    animation: spin 1s linear infinite;
    margin-bottom: 15px;
  }



  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  .game-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    width: 100%;
  }

  .difficulty-selector {
    display: flex;
    flex-direction: column;
    align-items: center;
    margin-bottom: 20px;
    width: 100%;
  }

  .difficulty-buttons {
    display: flex;
    gap: 10px;
    margin: 15px 0;
  }

  .difficulty-buttons button {
    padding: 8px 16px;
    background-color: #e0e0e0;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .difficulty-buttons button.active {
    background-color: #4c84ff;
    color: white;
  }

  .game-stats {
    display: flex;
    justify-content: space-around;
    width: 100%;
    margin-bottom: 15px;
    padding: 10px;
    background-color: #f5f5f5;
    border-radius: 8px;
  }



  .stat {
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  .stat-label {
    font-size: 0.9rem;
    opacity: 0.7;
  }

  .stat-value {
    font-size: 1.2rem;
    font-weight: 700;
  }

  .flag-container {
    width: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    margin-bottom: 20px;
  }

  .flag-wrapper {
    border-radius: 8px;
    overflow: hidden;
    box-shadow: 0 4px 12px rgb(0 0 0 / 10%);
    width: 100%;
    max-width: 320px;
    margin-bottom: 10px;
    background-color: #f5f5f5;
    position: relative;
  }



  .flag-img {
    width: 100%;
    height: auto;
    display: block;
    transition: transform 0.3s ease;
  }

  .reveal-animation .flag-img {
    animation: pulse 0.8s ease-in-out;
  }

  @keyframes pulse {
    0% { transform: scale(1); }
    50% { transform: scale(1.05); }
    100% { transform: scale(1); }
  }

  .hint-box {
    background-color: #fff9c4;
    padding: 8px 12px;
    border-radius: 4px;
    margin-top: 10px;
    color: #7a6e00;
    width: 100%;
    max-width: 320px;
    font-size: 0.9rem;
    animation: fade-in 0.3s ease;
  }



  @keyframes fade-in {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  .guess-form {
    width: 100%;
    max-width: 320px;
    margin-bottom: 15px;
  }

  .input-container {
    display: flex;
    flex-direction: column;
    gap: 10px;
    width: 100%;
  }

  input {
    padding: 12px;
    font-size: 16px;
    border: 1px solid #ccc;
    border-radius: 4px;
    width: 100%;
    transition: border-color 0.3s ease;
  }

  input:focus {
    outline: none;
    border-color: #4c84ff;
  }



  .actions {
    display: flex;
    gap: 10px;
    width: 100%;
  }

  .hint-button, .guess-button {
    padding: 10px;
    font-size: 14px;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    transition: background-color 0.3s ease;
  }

  .hint-button {
    background-color: #f5f5f5;
    color: #333;
    flex: 1;
  }



  .guess-button {
    background-color: #4c84ff;
    color: white;
    flex: 1;
  }



  button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .feedback {
    padding: 10px 15px;
    border-radius: 4px;
    text-align: center;
    width: 100%;
    max-width: 320px;
    margin-bottom: 15px;
    animation: fade-in 0.3s ease;
  }

  .feedback.correct {
    background-color: #4caf50;
    color: white;
  }

  .feedback.incorrect {
    background-color: #f44336;
    color: white;
  }

  .correct-answer {
    margin-top: 5px;
    font-size: 0.9rem;
  }

  .next-button-container {
    margin-top: 10px;
  }

  .primary-button {
    padding: 10px 20px;
    background-color: #4c84ff;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 16px;
    transition: background-color 0.3s ease;
  }

  .primary-button:hover {
    background-color: #3b73e8;
  }

  .secondary-button {
    padding: 10px 20px;
    background-color: #e0e0e0;
    color: #333;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 16px;
    transition: background-color 0.3s ease;
  }

  .secondary-button:hover {
    background-color: #d0d0d0;
  }

  .game-over {
    display: flex;
    flex-direction: column;
    align-items: center;
    width: 100%;
    text-align: center;
  }

  .results {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 15px;
    margin: 20px 0;
    width: 100%;
    max-width: 400px;
  }

  .country-review {
    width: 100%;
    margin: 20px 0;
  }

  .country-list {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
    gap: 10px;
    margin-top: 10px;
  }



  .mini-flag {
    width: 30px;
    height: 20px;
    object-fit: cover;
    border-radius: 2px;
  }

  .action-buttons {
    display: flex;
    gap: 10px;
    margin-top: 20px;
  }

  .capitalize {
    text-transform: capitalize;
  }

  @media (width <= 480px) {
    .results {
      grid-template-columns: 1fr;
    }

    .country-list {
      grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
    }

    .action-buttons {
      flex-direction: column;
      width: 100%;
      max-width: 300px;
    }

    .flag-img {
      max-height: 200px;
      object-fit: contain;
    }
  }

  .rounds-selector {
    margin: 15px 0;
    text-align: center;
  }

  .rounds-buttons {
    display: flex;
    gap: 10px;
    justify-content: center;
    margin: 10px 0;
  }

  .rounds-buttons button {
    padding: 8px 16px;
    background-color: #e0e0e0;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .rounds-buttons button.active {
    background-color: #4c84ff;
    color: white;
  }

  .country-info {
    margin-top: 5px;
    font-size: 0.9rem;
    font-style: italic;
  }

  .population-info {
    display: block;
    font-size: 0.8rem;
    opacity: 0.7;
    margin-top: 2px;
  }

  /* Session recap section */
  .session-recap {
    width: 100%;
    margin: 20px 0;
  }

  .recap-container {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 20px;
    margin-top: 15px;
  }

  .recap-column {
    background-color: var(--bg-secondary);
    border-radius: 8px;
    padding: 15px;
    box-shadow: 0 2px 5px rgb(0 0 0 / 5%);
  }

  .recap-column h4 {
    margin-top: 0;
    margin-bottom: 10px;
    text-align: center;
    padding-bottom: 8px;
    border-bottom: 1px solid var(--map-border-color);
  }

  .correct-column h4 {
    color: var(--map-correct-color);
  }

  .wrong-column h4 {
    color: var(--map-wrong-color);
  }

  .empty-list {
    text-align: center;
    padding: 20px;
    color: var(--text-hint);
    font-style: italic;
  }

  /* Country list items in session recap */
  .country-item {
    display: flex;
    align-items: center;
    gap: 8px;
    background-color: var(--bg-tertiary);
    padding: 8px;
    border-radius: 4px;
    font-size: 0.9rem;
    color: var(--text-primary);
  }

  /* Result items in game over section */
  .result-item {
    display: flex;
    flex-direction: column;
    background-color: var(--bg-tertiary);
    padding: 15px;
    border-radius: 8px;
  }

  .result-label {
    font-size: 0.9rem;
    opacity: 0.7;
    color: var(--text-secondary);
  }

  .result-value {
    font-size: 1.3rem;
    font-weight: 700;
    color: var(--text-primary);
  }

  @media (width <= 600px) {
    .recap-container {
      grid-template-columns: 1fr;
    }
  }
</style>
