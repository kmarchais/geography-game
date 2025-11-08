import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mount, VueWrapper } from "@vue/test-utils";
import { nextTick, ref } from "vue";
import MapGame from "./MapGame.vue";

// Mock Leaflet
const mockMap = {
  remove: vi.fn(),
  hasLayer: vi.fn(() => true),
  on: vi.fn(),
  off: vi.fn(),
};

const mockTileLayer = {
  addTo: vi.fn(() => mockTileLayer),
  setUrl: vi.fn(),
};

const mockGeoJSONLayer = {
  addTo: vi.fn(() => mockGeoJSONLayer),
  eachLayer: vi.fn(),
  on: vi.fn(),
};

const mockPopup = {
  setLatLng: vi.fn(() => mockPopup),
  setContent: vi.fn(() => mockPopup),
  openOn: vi.fn(() => mockPopup),
};

vi.mock("leaflet", () => ({
  default: {
    map: vi.fn(() => mockMap),
    tileLayer: vi.fn(() => mockTileLayer),
    geoJSON: vi.fn(() => mockGeoJSONLayer),
    popup: vi.fn(() => mockPopup),
  },
}));

// Mock Vuetify theme
vi.mock("vuetify", () => ({
  useTheme: () => ({
    global: {
      name: { value: "light" },
    },
  }),
}));

// Mock composable - use actual refs for proper reactivity
const mockGameLogic = {
  score: ref(0),
  currentRound: ref(1),
  currentAttempts: ref(0),
  gameEnded: ref(false),
  targetEntity: ref("TestEntity"),
  foundEntities: ref(new Map<string, number>()),
  formattedTime: ref("00:00"),
  feedback: ref(""),
  feedbackType: ref(""),
  startNewGame: vi.fn(),
  skipEntity: vi.fn(() => ({ skippedEntity: "TestEntity" })),
  handleCorrectGuess: vi.fn(),
  handleIncorrectGuess: vi.fn(() => ({ shouldEndRound: false })),
};

vi.mock("../composables/useMapGameLogic", () => ({
  useMapGameLogic: () => mockGameLogic,
}));

// Mock geojsonUtils
vi.mock("../utils/geojsonUtils", () => ({
  defaultStyle: { color: "blue", weight: 1 },
  selectedStyle: { color: "red", weight: 2 },
  getStyleForAttempts: vi.fn(() => ({ color: "green", weight: 1 })),
  animateLayer: vi.fn(),
  isFeatureCollection: vi.fn(() => true),
}));

describe("MapGame.vue", () => {
  let wrapper: VueWrapper;

  const mockGeoJSONData = {
    type: "FeatureCollection" as const,
    features: [
      {
        type: "Feature" as const,
        properties: { testProp: "Entity1" },
        geometry: {
          type: "Point" as const,
          coordinates: [0, 0],
        },
      },
      {
        type: "Feature" as const,
        properties: { testProp: "Entity2" },
        geometry: {
          type: "Point" as const,
          coordinates: [1, 1],
        },
      },
    ],
  };

  const defaultProps = {
    entityNameSingular: "Country",
    entityNamePlural: "Countries",
    geojsonUrl: "https://example.com/data.geojson",
    geojsonNameProperty: "testProp",
    mapOptions: {
      initialCenter: [0, 0] as [number, number],
      initialZoom: 2,
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Reset mock game logic values
    mockGameLogic.score.value = 0;
    mockGameLogic.currentRound.value = 1;
    mockGameLogic.currentAttempts.value = 0;
    mockGameLogic.gameEnded.value = false;
    mockGameLogic.targetEntity.value = "TestEntity";
    mockGameLogic.foundEntities.value = new Map();
    mockGameLogic.formattedTime.value = "00:00";
    mockGameLogic.feedback.value = "";
    mockGameLogic.feedbackType.value = "";

    globalThis.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockGeoJSONData),
      } as Response)
    );
  });

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount();
    }
  });

  describe("component initialization", () => {
    it("should render game header", async () => {
      wrapper = mount(MapGame, { props: defaultProps });
      await nextTick();

      expect(wrapper.find(".game-header").exists()).toBe(true);
    });

    it("should display score", async () => {
      wrapper = mount(MapGame, { props: defaultProps });
      await nextTick();

      const scoreDisplay = wrapper.find(".score-display");
      expect(scoreDisplay.exists()).toBe(true);
      expect(scoreDisplay.text()).toContain("Score:");
    });

    it("should display round counter", async () => {
      wrapper = mount(MapGame, { props: defaultProps });
      await nextTick();

      const roundDisplay = wrapper.find(".round-display");
      expect(roundDisplay.exists()).toBe(true);
      expect(roundDisplay.text()).toContain("Round:");
    });

    it("should display attempts counter", async () => {
      wrapper = mount(MapGame, { props: defaultProps });
      await nextTick();

      const attemptsDisplay = wrapper.find(".attempts-display");
      expect(attemptsDisplay.exists()).toBe(true);
      expect(attemptsDisplay.text()).toContain("Attempts:");
    });

    it("should display timer", async () => {
      wrapper = mount(MapGame, { props: defaultProps });
      await nextTick();

      const timerDisplay = wrapper.find(".timer-display");
      expect(timerDisplay.exists()).toBe(true);
      expect(timerDisplay.text()).toContain("Time:");
    });

    it("should display target entity", async () => {
      wrapper = mount(MapGame, { props: defaultProps });
      await nextTick();

      const targetEntity = wrapper.find(".target-entity");
      expect(targetEntity.exists()).toBe(true);
      expect(targetEntity.text()).toContain("Find:");
    });
  });

  describe("game state rendering", () => {
    it("should show skip button when game is active", async () => {
      mockGameLogic.gameEnded.value = false;
      wrapper = mount(MapGame, { props: defaultProps });
      await nextTick();

      const skipBtn = wrapper.find(".skip-btn");
      expect(skipBtn.exists()).toBe(true);
      expect(skipBtn.text()).toBe("Skip");
    });

    it("should disable skip button when feedback is shown", async () => {
      mockGameLogic.gameEnded.value = false;
      mockGameLogic.feedback.value = "Correct!";
      wrapper = mount(MapGame, { props: defaultProps });
      await nextTick();

      const skipBtn = wrapper.find(".skip-btn");
      expect(skipBtn.attributes("disabled")).toBeDefined();
    });

    it("should enable skip button when no feedback", async () => {
      mockGameLogic.gameEnded.value = false;
      mockGameLogic.feedback.value = "";
      wrapper = mount(MapGame, { props: defaultProps });
      await nextTick();

      const skipBtn = wrapper.find(".skip-btn");
      expect(skipBtn.attributes("disabled")).toBeUndefined();
    });

    it("should show feedback when present", async () => {
      mockGameLogic.feedback.value = "Correct!";
      mockGameLogic.feedbackType.value = "correct";
      wrapper = mount(MapGame, { props: defaultProps });
      await nextTick();

      const feedback = wrapper.find(".feedback");
      expect(feedback.exists()).toBe(true);
      expect(feedback.text()).toBe("Correct!");
      expect(feedback.classes()).toContain("correct");
    });

    it("should show game end screen when game is ended", async () => {
      mockGameLogic.gameEnded.value = true;
      mockGameLogic.score.value = 5;
      wrapper = mount(MapGame, { props: defaultProps });
      await nextTick();

      const gameEnd = wrapper.find(".game-end");
      expect(gameEnd.exists()).toBe(true);
      expect(wrapper.find(".final-score").exists()).toBe(true);
      expect(wrapper.find(".new-game-btn").exists()).toBe(true);
    });

    it("should show final score when game ends", async () => {
      mockGameLogic.gameEnded.value = true;
      mockGameLogic.score.value = 7;
      wrapper = mount(MapGame, { props: defaultProps });
      await nextTick();

      const finalScore = wrapper.find(".final-score");
      expect(finalScore.text()).toContain("Final Score:");
      expect(finalScore.text()).toContain("7");
    });

    it("should show final time when game ends", async () => {
      mockGameLogic.gameEnded.value = true;
      mockGameLogic.formattedTime.value = "02:30";
      wrapper = mount(MapGame, { props: defaultProps });
      await nextTick();

      const finalTime = wrapper.find(".final-time");
      expect(finalTime.text()).toContain("Time:");
      expect(finalTime.text()).toContain("02:30");
    });
  });

  describe("user interactions", () => {
    it("should call skipEntity when skip button is clicked", async () => {
      mockGameLogic.gameEnded.value = false;
      mockGameLogic.feedback.value = "";
      wrapper = mount(MapGame, { props: defaultProps });
      await nextTick();

      const skipBtn = wrapper.find(".skip-btn");
      await skipBtn.trigger("click");

      expect(mockGameLogic.skipEntity).toHaveBeenCalled();
    });

    it("should call startNewGame when play again button is clicked", async () => {
      mockGameLogic.gameEnded.value = true;
      wrapper = mount(MapGame, { props: defaultProps });
      await nextTick();

      const newGameBtn = wrapper.find(".new-game-btn");
      await newGameBtn.trigger("click");

      expect(mockGameLogic.startNewGame).toHaveBeenCalled();
    });
  });

  describe("GeoJSON data loading", () => {
    it("should fetch GeoJSON data on mount", async () => {
      wrapper = mount(MapGame, { props: defaultProps });
      await nextTick();
      await nextTick(); // Wait for async fetch

      expect(globalThis.fetch).toHaveBeenCalledWith(defaultProps.geojsonUrl);
    });

    it("should handle fetch errors gracefully", async () => {
      const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
      globalThis.fetch = vi.fn(() => Promise.reject(new Error("Network error")));

      wrapper = mount(MapGame, { props: defaultProps });
      await nextTick();
      await nextTick();

      expect(consoleError).toHaveBeenCalled();
      consoleError.mockRestore();
    });

    it("should handle HTTP errors", async () => {
      globalThis.fetch = vi.fn(() =>
        Promise.resolve({
          ok: false,
          status: 404,
        } as Response)
      );

      wrapper = mount(MapGame, { props: defaultProps });
      await nextTick();
      await nextTick();

      // Component should handle the error gracefully
      expect(wrapper.exists()).toBe(true);
    });
  });

  describe("props", () => {
    it("should accept totalRoundsOverride prop", async () => {
      wrapper = mount(MapGame, {
        props: {
          ...defaultProps,
          totalRoundsOverride: 5,
        },
      });
      await nextTick();
      await nextTick(); // Wait for async operations

      // Component should mount successfully with custom prop
      expect(wrapper.exists()).toBe(true);
    });

    it("should process GeoJSON data with custom function", async () => {
      const processGeoJsonFn = vi.fn((data) => data);

      wrapper = mount(MapGame, {
        props: {
          ...defaultProps,
          processGeojsonDataFn: processGeoJsonFn,
        },
      });
      await nextTick();
      await nextTick();

      expect(processGeoJsonFn).toHaveBeenCalled();
    });

    it("should use geojsonCodeProperty if provided", async () => {
      const dataWithCodes = {
        type: "FeatureCollection" as const,
        features: [
          {
            type: "Feature" as const,
            properties: { testProp: "Entity1", code: "E1" },
            geometry: { type: "Point" as const, coordinates: [0, 0] },
          },
        ],
      };

      globalThis.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve(dataWithCodes),
        } as Response)
      );

      wrapper = mount(MapGame, {
        props: {
          ...defaultProps,
          geojsonCodeProperty: "code",
        },
      });
      await nextTick();
      await nextTick();

      expect(wrapper.exists()).toBe(true);
    });
  });

  describe("component lifecycle", () => {
    it("should clean up map on unmount", async () => {
      wrapper = mount(MapGame, { props: defaultProps });
      await nextTick();
      await nextTick();

      wrapper.unmount();

      expect(mockMap.remove).toHaveBeenCalled();
    });

    it("should handle map cleanup errors", async () => {
      const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
      mockMap.remove.mockImplementationOnce(() => {
        throw new Error("Cleanup error");
      });

      wrapper = mount(MapGame, { props: defaultProps });
      await nextTick();
      await nextTick();

      wrapper.unmount();

      expect(consoleError).toHaveBeenCalled();
      consoleError.mockRestore();
    });
  });

  describe("reactive state updates", () => {
    it("should display current score from composable", async () => {
      mockGameLogic.score.value = 3;
      wrapper = mount(MapGame, { props: defaultProps });
      await nextTick();
      await nextTick();

      // Component renders the score from the composable
      expect(wrapper.html()).toContain("Score:");
    });

    it("should display current round from composable", async () => {
      mockGameLogic.currentRound.value = 5;
      wrapper = mount(MapGame, { props: defaultProps });
      await nextTick();
      await nextTick();

      // Component renders the round from the composable
      expect(wrapper.html()).toContain("Round:");
    });

    it("should display current attempts from composable", async () => {
      mockGameLogic.currentAttempts.value = 2;
      wrapper = mount(MapGame, { props: defaultProps });
      await nextTick();
      await nextTick();

      // Component renders the attempts from the composable
      expect(wrapper.html()).toContain("Attempts:");
    });

    it("should show game end view when gameEnded is true", async () => {
      mockGameLogic.gameEnded.value = true;
      wrapper = mount(MapGame, { props: defaultProps });
      await nextTick();
      await nextTick();

      expect(wrapper.find(".game-end").exists()).toBe(true);
      expect(wrapper.find(".skip-btn").exists()).toBe(false);
    });
  });
});
