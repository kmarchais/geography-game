import { ref, computed, onScopeDispose, type Ref } from "vue";

export interface MapGameLogicOptions {
  entityNameSingular: string;
  entityNamePlural: string;
  availableEntities: Ref<string[]>;
  totalRounds: Ref<number>;
}

export function useMapGameLogic(options: MapGameLogicOptions) {
  const { entityNameSingular, availableEntities, totalRounds } = options;

  const score = ref(0);
  const currentRound = ref(1);
  const currentAttempts = ref(0);
  const gameEnded = ref(false);
  const targetEntity = ref("");
  const usedEntities = ref<string[]>([]);

  const foundEntities = ref(new Map<string, number>());

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

  const stopTimer = () => {
    if (timerInterval.value !== null) {
      console.log("Clearing timer interval from composable scope dispose.");
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

  const showFeedback = (isCorrect: boolean, customMsg?: string) => {
    feedbackType.value = isCorrect ? "correct" : "incorrect";
    if (customMsg) {
      feedback.value = customMsg;
    } else if (isCorrect) {
      feedback.value =
        currentAttempts.value === 1 ? "Perfect! Well done!" : "Correct!";
    } else {
      feedback.value =
        currentAttempts.value === 3
          ? `Out of attempts! The correct ${entityNameSingular} was ${targetEntity.value}`
          : `Wrong! Try again to find ${targetEntity.value}`;
    }
    setTimeout(() => {
      feedback.value = "";
      feedbackType.value = "";
    }, 500);
  };

  const clearFeedback = () => {
    feedback.value = "";
    feedbackType.value = "";
  };

  const selectNewTargetEntity = () => {
    if (availableEntities.value.length === 0) {
      console.warn("No available entities to select from.");
      targetEntity.value = "Error: No entities loaded";
      return;
    }

    const remainingEntities = availableEntities.value.filter(
      (entity) => !usedEntities.value.includes(entity)
    );

    let entitiesToChooseFrom = remainingEntities;
    if (remainingEntities.length === 0) {
      console.log("All entities used, starting over selection.");
      usedEntities.value = [];
      entitiesToChooseFrom = availableEntities.value;
    }

    const randomIndex = Math.floor(Math.random() * entitiesToChooseFrom.length);
    const newTarget = entitiesToChooseFrom[randomIndex];
    usedEntities.value.push(newTarget);
    targetEntity.value = newTarget;
    currentAttempts.value = 0;
    clearFeedback();
  };

  const advanceRound = () => {
    if (currentRound.value >= totalRounds.value) {
      endGame();
    } else {
      currentRound.value++;
      selectNewTargetEntity();
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
    currentAttempts.value = 0;
    gameEnded.value = false;
    usedEntities.value = [];
    foundEntities.value.clear();
    clearFeedback();
    selectNewTargetEntity();
    startTimer();
  };

  const handleCorrectGuess = (guessedEntity: string) => {
    currentAttempts.value++;
    if (currentAttempts.value === 1) {
      score.value++;
    }
    foundEntities.value.set(guessedEntity, currentAttempts.value);
    showFeedback(true);
    advanceRound();
  };

  const handleIncorrectGuess = (): { shouldEndRound: boolean } => {
    currentAttempts.value++;
    const isOutOfAttempts = currentAttempts.value >= 3;

    if (isOutOfAttempts) {
      foundEntities.value.set(targetEntity.value, 4);
      showFeedback(false);
      advanceRound();
      return { shouldEndRound: true };
    } else {
      showFeedback(false);
      return { shouldEndRound: false };
    }
  };

  const skipEntity = () => {
    if (gameEnded.value) return { skippedEntity: "" };
    currentAttempts.value = 3;
    foundEntities.value.set(targetEntity.value, 4);
    showFeedback(
      false,
      `Skipped! The correct ${entityNameSingular} was ${targetEntity.value}`
    );
    const skipped = targetEntity.value;
    advanceRound();
    return { skippedEntity: skipped };
  };

  onScopeDispose(() => {
    stopTimer();
  });

  return {
    // State Refs
    score,
    currentRound,
    currentAttempts,
    gameEnded,
    targetEntity,
    foundEntities,
    timer,
    feedback,
    feedbackType,

    // Computed Refs
    formattedTime,

    // Methods
    startNewGame,
    skipEntity,
    handleCorrectGuess,
    handleIncorrectGuess,
  };
}
