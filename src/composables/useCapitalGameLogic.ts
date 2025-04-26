// composables/useCapitalGameLogic.ts
import { ref, computed, onScopeDispose, type Ref } from "vue";
import L from "leaflet";

export interface Capital {
  name: string;
  country: string;
  location: [number, number]; // [latitude, longitude]
}

export interface CapitalGameLogicOptions {
  availableCapitals: Ref<Capital[]>;
  totalRounds: Ref<number>;
}

export function useCapitalGameLogic(options: CapitalGameLogicOptions) {
  const { availableCapitals, totalRounds } = options;

  const score = ref(0);
  const currentRound = ref(1);
  const gameEnded = ref(false);
  const targetCapital = ref<Capital | null>(null);
  const usedCapitals = ref<Capital[]>([]);
  const currentGuess = ref<L.LatLng | null>(null);
  const currentDistance = ref<number | null>(null);
  const maxDistance = 10000; // Maximum distance in km for scoring (no points beyond this)

  const timer = ref(0);
  const timerInterval = ref<number | null>(null);
  const formattedTime = computed(() => {
    const minutes = Math.floor(timer.value / 60);
    const seconds = timer.value % 60;
    return `${minutes.toString().padStart(2, "0")}:${seconds
      .toString()
      .padStart(2, "0")}`;
  });

  const feedback = ref("");
  const feedbackType = ref("");

  // Score is awarded based on distance: closer = higher score
  // Maximum of 1000 points per guess
  const calculateScore = (distanceKm: number): number => {
    if (distanceKm > maxDistance) return 0;
    return Math.round(1000 * (1 - distanceKm / maxDistance));
  };

  const formatDistance = (distanceKm: number): string => {
    if (distanceKm < 1) {
      return `${Math.round(distanceKm * 1000)} meters`;
    } else {
      return `${Math.round(distanceKm)} km`;
    }
  };

  const stopTimer = () => {
    if (timerInterval.value !== null) {
      clearInterval(timerInterval.value);
      timerInterval.value = null;
    }
  };

  const startTimer = () => {
    stopTimer();
    timer.value = 0;
    timerInterval.value = window.setInterval(() => {
      timer.value++;
    }, 1000);
  };

  const showFeedback = (messageType: string, customMsg: string) => {
    feedbackType.value = messageType;
    feedback.value = customMsg;
    setTimeout(() => {
      feedback.value = "";
      feedbackType.value = "";
    }, 3000);
  };

  const clearFeedback = () => {
    feedback.value = "";
    feedbackType.value = "";
  };

  const selectNewTargetCapital = () => {
    if (availableCapitals.value.length === 0) {
      console.warn("No available capitals to select from.");
      return;
    }

    const remainingCapitals = availableCapitals.value.filter(
      (capital) => !usedCapitals.value.some(used => used.name === capital.name)
    );

    let capitalsToChooseFrom = remainingCapitals;
    if (remainingCapitals.length === 0) {
      console.log("All capitals used, starting over selection.");
      usedCapitals.value = [];
      capitalsToChooseFrom = availableCapitals.value;
    }

    const randomIndex = Math.floor(Math.random() * capitalsToChooseFrom.length);
    const newTarget = capitalsToChooseFrom[randomIndex];
    usedCapitals.value.push(newTarget);
    targetCapital.value = newTarget;
    currentGuess.value = null;
    currentDistance.value = null;
    clearFeedback();
  };

  const advanceRound = () => {
    if (currentRound.value >= totalRounds.value) {
      endGame();
    } else {
      currentRound.value++;
      selectNewTargetCapital();
    }
  };

  const endGame = () => {
    gameEnded.value = true;
    stopTimer();
    clearFeedback();
  };

  const startNewGame = () => {
    score.value = 0;
    currentRound.value = 1;
    gameEnded.value = false;
    usedCapitals.value = [];
    currentGuess.value = null;
    currentDistance.value = null;
    clearFeedback();
    selectNewTargetCapital();
    startTimer();
  };

  // Calculate distance between two points in kilometers using the Haversine formula
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371; // Earth's radius in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const handleGuess = (guessLocation: L.LatLng) => {
    if (gameEnded.value || !targetCapital.value) return;

    currentGuess.value = guessLocation;

    const targetLocation = targetCapital.value.location;
    const distance = calculateDistance(
      guessLocation.lat,
      guessLocation.lng,
      targetLocation[0],
      targetLocation[1]
    );

    currentDistance.value = distance;

    // Calculate points based on distance
    const pointsEarned = calculateScore(distance);
    score.value += pointsEarned;

    // Show feedback based on how close they were
    let feedbackMsg = "";
    let feedbackCategory = "";

    if (distance < 50) {
      feedbackMsg = `Great guess! Only ${formatDistance(distance)} away. +${pointsEarned} points`;
      feedbackCategory = "correct";
    } else if (distance < 500) {
      feedbackMsg = `Not bad! ${formatDistance(distance)} away. +${pointsEarned} points`;
      feedbackCategory = "good";
    } else {
      feedbackMsg = `${formatDistance(distance)} off target. +${pointsEarned} points`;
      feedbackCategory = "incorrect";
    }

    showFeedback(feedbackCategory, feedbackMsg);

    // Wait before moving to next round
    setTimeout(advanceRound, 3000);
  };

  const skipCapital = () => {
    if (gameEnded.value || !targetCapital.value) return;

    showFeedback("incorrect", `Skipped! ${targetCapital.value.name} is the capital of ${targetCapital.value.country}`);
    setTimeout(advanceRound, 2000);
  };

  onScopeDispose(() => {
    stopTimer();
  });

  return {
    // State Refs
    score,
    currentRound,
    gameEnded,
    targetCapital,
    currentGuess,
    currentDistance,
    timer,
    feedback,
    feedbackType,

    // Computed Refs
    formattedTime,

    // Methods
    startNewGame,
    skipCapital,
    handleGuess,
    calculateDistance,
    formatDistance,
    calculateScore,
  };
}
