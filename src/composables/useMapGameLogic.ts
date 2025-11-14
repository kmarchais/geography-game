import { ref, computed, onScopeDispose, type Ref } from "vue";

/**
 * Weighted Scoring System
 *
 * Points are awarded based on attempt number:
 * - First try:  4 points
 * - Second try: 2 points
 * - Third try:  1 point
 * - Failed:     0 points
 * - Skipped:    0 points
 *
 * IMPORTANT: The score is calculated as (points_earned / max_possible_points) × 100
 * and then FLOORED to an integer. This means:
 *
 * - Only a PERFECT game (all territories on first try) will achieve 100 points
 * - Even one mistake will result in a score < 100
 *
 * Example with 9 territories:
 * - All on 1st try: (9×4)/36 × 100 = 100.00 → 100 points ✓
 * - 8 on 1st, 1 on 2nd: (34)/36 × 100 = 94.44 → 94 points
 * - 4 on 1st, 3 on 2nd, 2 on 3rd: (22)/36 × 100 = 61.11 → 61 points
 *
 * The raw percentage (with full precision) is also stored separately for
 * leaderboard tiebreaking purposes.
 */
export const SCORE_WEIGHTS = {
  FIRST_TRY: 4,
  SECOND_TRY: 2,
  THIRD_TRY: 1,
  FAILED: 0,
  SKIPPED: 0,
} as const;

/**
 * Attempt status codes
 * These are used to track how a territory was handled
 */
export const ATTEMPT_STATUS = {
  FIRST_TRY: 1,
  SECOND_TRY: 2,
  THIRD_TRY: 3,
  FAILED: 4,      // Failed after 3 attempts
  SKIPPED: 5,     // Manually skipped by player
} as const;

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

  // Game completion statistics with territory names
  const gameStats = computed(() => {
    const stats = {
      foundOnAttempt1: 0,
      foundOnAttempt2: 0,
      foundOnAttempt3: 0,
      failed: 0,
      skipped: 0,
      territoriesAttempt1: [] as string[],
      territoriesAttempt2: [] as string[],
      territoriesAttempt3: [] as string[],
      territoriesFailed: [] as string[],
      territoriesSkipped: [] as string[],
    };

    foundEntities.value.forEach((attempts, name) => {
      if (attempts === ATTEMPT_STATUS.FIRST_TRY) {
        stats.foundOnAttempt1++;
        stats.territoriesAttempt1.push(name);
      } else if (attempts === ATTEMPT_STATUS.SECOND_TRY) {
        stats.foundOnAttempt2++;
        stats.territoriesAttempt2.push(name);
      } else if (attempts === ATTEMPT_STATUS.THIRD_TRY) {
        stats.foundOnAttempt3++;
        stats.territoriesAttempt3.push(name);
      } else if (attempts === ATTEMPT_STATUS.FAILED) {
        stats.failed++;
        stats.territoriesFailed.push(name);
      } else if (attempts === ATTEMPT_STATUS.SKIPPED) {
        stats.skipped++;
        stats.territoriesSkipped.push(name);
      }
    });

    // Sort territory lists alphabetically
    stats.territoriesAttempt1.sort();
    stats.territoriesAttempt2.sort();
    stats.territoriesAttempt3.sort();
    stats.territoriesFailed.sort();
    stats.territoriesSkipped.sort();

    return stats;
  });

  // Raw score percentage (with full precision for tiebreaking)
  const rawScorePercentage = computed(() => {
    const stats = gameStats.value;

    // Calculate points earned
    const pointsEarned =
      (stats.foundOnAttempt1 * SCORE_WEIGHTS.FIRST_TRY) +
      (stats.foundOnAttempt2 * SCORE_WEIGHTS.SECOND_TRY) +
      (stats.foundOnAttempt3 * SCORE_WEIGHTS.THIRD_TRY) +
      (stats.failed * SCORE_WEIGHTS.FAILED) +
      (stats.skipped * SCORE_WEIGHTS.SKIPPED);

    // Maximum possible points (all territories on first try)
    const maxPoints = totalRounds.value * SCORE_WEIGHTS.FIRST_TRY;

    // Calculate exact percentage (keep full precision for tiebreaking)
    if (maxPoints === 0) {return 0;}
    return (pointsEarned / maxPoints) * 100;
  });

  // Weighted score (0-100 points, floored for display)
  const weightedScore = computed(() => {
    return Math.floor(rawScorePercentage.value);
  });

  const feedback = ref("");
  const feedbackType = ref("");

  const stopTimer = () => {
    if (timerInterval.value !== null) {
      clearInterval(timerInterval.value);
      timerInterval.value = null;
    }
  };

  const startTimer = () => {
    stopTimer();
    timer.value = 0;
    timerInterval.value = setInterval(() => {
      timer.value++;
    }, 1000) as unknown as number;
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
      if (import.meta.env.DEV) {
        console.warn("No available entities to select from.");
      }
      targetEntity.value = "Error: No entities loaded";
      return;
    }

    const remainingEntities = availableEntities.value.filter(
      (entity) => !usedEntities.value.includes(entity)
    );

    let entitiesToChooseFrom = remainingEntities;
    if (remainingEntities.length === 0) {
      usedEntities.value = [];
      entitiesToChooseFrom = availableEntities.value;
    }

    const randomIndex = Math.floor(Math.random() * entitiesToChooseFrom.length);
    const newTarget = entitiesToChooseFrom[randomIndex];
    if (!newTarget) {
      console.error("Failed to select a target entity");
      return;
    }
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
    const isOutOfAttempts = currentAttempts.value >= ATTEMPT_STATUS.THIRD_TRY;

    if (isOutOfAttempts) {
      foundEntities.value.set(targetEntity.value, ATTEMPT_STATUS.FAILED);
      showFeedback(false);
      advanceRound();
      return { shouldEndRound: true };
    } else {
      showFeedback(false);
      return { shouldEndRound: false };
    }
  };

  const skipEntity = () => {
    if (gameEnded.value) {return { skippedEntity: "" };}
    currentAttempts.value = ATTEMPT_STATUS.THIRD_TRY;
    foundEntities.value.set(targetEntity.value, ATTEMPT_STATUS.SKIPPED);
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
    gameStats,
    weightedScore,
    rawScorePercentage,

    // Methods
    startNewGame,
    skipEntity,
    handleCorrectGuess,
    handleIncorrectGuess,
  };
}
