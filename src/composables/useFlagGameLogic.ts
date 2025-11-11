// composables/useFlagGameLogic.ts
import { ref } from "vue";

export interface Country {
  name: string;
  code: string;
  flag: string;
}

export interface FlagGameLogicOptions {
  countries: Country[];
  /**
   * Optional pre-defined country order for daily challenges.
   * If provided, countries will be selected in this exact order instead of randomly.
   */
  predefinedCountryOrder?: Country[];
}

export function useFlagGameLogic(options: FlagGameLogicOptions | Country[]) {
  // Support both old signature (array) and new signature (options object) for backwards compatibility
  const countriesRef = Array.isArray(options) ? options : options.countries;
  const predefinedCountryOrder = Array.isArray(options) ? undefined : options.predefinedCountryOrder;

  const score = ref(0);
  const currentRound = ref(1);
  const totalRounds = ref(10);
  const gameEnded = ref(false);
  const usedIndices = ref<number[]>([]);
  const usedCountries = ref<Country[]>([]);
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

    // For daily challenges with predefined order, select sequentially
    if (predefinedCountryOrder && predefinedCountryOrder.length > 0) {
      const nextIndex = usedCountries.value.length;
      if (nextIndex < predefinedCountryOrder.length) {
        const country = predefinedCountryOrder[nextIndex];
        if (country) {
          usedCountries.value.push(country);
          currentCountry.value = country;
          feedback.value = "";
          feedbackType.value = "";
          return;
        }
      }
      // Fallback if we've exhausted the predefined list
      console.warn("Exhausted predefined country order, game should have ended");
      gameEnded.value = true;
      return;
    }

    // Regular random selection for normal games
    let idx: number;
    do {
      idx = Math.floor(Math.random() * countriesRef.length);
    } while (usedIndices.value.includes(idx) && usedIndices.value.length < countriesRef.length);

    const country = countriesRef[idx];
    if (!country) {
      console.error("Failed to select a country");
      return;
    }

    usedIndices.value.push(idx);
    currentCountry.value = country;
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
    if (!currentCountry.value) {return;}

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
