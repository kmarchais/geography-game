// composables/useFlagGameLogic.ts
import { ref, computed, watch } from "vue";

export interface Country {
  name: string;
  code: string;
  flag: string;
}

export function useFlagGameLogic(countriesRef: Country[]) {
  const score = ref(0);
  const currentRound = ref(1);
  const totalRounds = ref(10);
  const gameEnded = ref(false);
  const usedIndices = ref<number[]>([]);
  const currentCountry = ref<Country | null>(null);
  const feedback = ref("");
  const feedbackType = ref(""); // "correct" | "incorrect"

  function pickNewCountry() {
    // Safety check - if there are no countries or not enough for the game, don't proceed
    if (!countriesRef.length) {
      console.warn("Cannot pick a country: countries array is empty");
      return;
    }

    if (usedIndices.value.length >= totalRounds.value) {
      gameEnded.value = true;
      return;
    }

    let idx: number;
    do {
      idx = Math.floor(Math.random() * countriesRef.length);
    } while (usedIndices.value.includes(idx) && usedIndices.value.length < countriesRef.length);

    usedIndices.value.push(idx);
    currentCountry.value = countriesRef[idx];
    feedback.value = "";
    feedbackType.value = "";
  }

  function startGame() {
    // Only start the game if we have countries data
    if (!countriesRef.length) {
      console.warn("Cannot start game: countries array is empty");
      return;
    }

    score.value = 0;
    currentRound.value = 1;
    gameEnded.value = false;
    usedIndices.value = [];
    pickNewCountry();
  }

  function guessCountry(guess: string) {
    if (!currentCountry.value) return;

    if (guess.trim().toLowerCase() === currentCountry.value.name.toLowerCase()) {
      score.value++;
      feedback.value = "Correct!";
      feedbackType.value = "correct";
    } else {
      feedback.value = `Wrong! It was ${currentCountry.value.name}`;
      feedbackType.value = "incorrect";
    }

    setTimeout(() => {
      currentRound.value++;
      pickNewCountry();
    }, 1200);
  }

  return {
    score,
    currentRound,
    totalRounds,
    gameEnded,
    currentCountry,
    feedback,
    feedbackType,
    startGame,
    guessCountry,
  };
}
