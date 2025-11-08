import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mount, VueWrapper } from "@vue/test-utils";
import { nextTick } from "vue";
import GameHub from "./GameHub.vue";

// Mock child components
vi.mock("./WorldCountries/WorldCountries.vue", () => ({
  default: { name: "WorldCountries", template: "<div>World Countries Game</div>" },
}));

vi.mock("../views/WorldCapitals.vue", () => ({
  default: { name: "WorldCapitals", template: "<div>World Capitals Game</div>" },
}));

vi.mock("./CityDistricts/CityDistricts.vue", () => ({
  default: { name: "CityDistricts", template: "<div>City Districts Game</div>" },
}));

// Mock useAuth composable
vi.mock("../composables/useAuth", () => ({
  useAuth: () => ({
    isLoggedIn: { value: false },
  }),
}));

describe("GameHub.vue", () => {
  let wrapper: VueWrapper;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount();
    }
  });

  describe("game selection screen", () => {
    it("should render game selection header", () => {
      wrapper = mount(GameHub);

      const header = wrapper.find(".selection-header");
      expect(header.exists()).toBe(true);
      expect(header.find("h1").text()).toBe("Geography Games");
      expect(header.find("p").text()).toBe("Choose a game mode to play");
    });

    it("should render all three game options", () => {
      wrapper = mount(GameHub);

      const options = wrapper.findAll(".game-option");
      expect(options).toHaveLength(3);
    });

    it("should render Countries game option", () => {
      wrapper = mount(GameHub);

      const options = wrapper.findAll(".game-option");
      const countriesOption = options[0];

      expect(countriesOption?.find("h2").text()).toBe("Countries");
      expect(countriesOption?.find("p").text()).toBe("Find countries on the world map");
      expect(countriesOption?.find(".option-icon").text()).toBe("🌎");
    });

    it("should render Capitals game option", () => {
      wrapper = mount(GameHub);

      const options = wrapper.findAll(".game-option");
      const capitalsOption = options[1];

      expect(capitalsOption?.find("h2").text()).toBe("Capitals");
      expect(capitalsOption?.find("p").text()).toBe("Guess the location of capital cities");
      expect(capitalsOption?.find(".option-icon").text()).toBe("🏙️");
    });

    it("should render City Districts game option", () => {
      wrapper = mount(GameHub);

      const options = wrapper.findAll(".game-option");
      const districtsOption = options[2];

      expect(districtsOption?.find("h2").text()).toBe("City Districts");
      expect(districtsOption?.find("p").text()).toBe("Find districts within major cities");
      expect(districtsOption?.find(".option-icon").text()).toBe("🏘️");
    });
  });

  describe("game selection interaction", () => {
    it("should show game container when Countries is selected", async () => {
      wrapper = mount(GameHub);

      const countriesOption = wrapper.findAll(".game-option")[0];
      await countriesOption?.trigger("click");
      await nextTick();

      expect(wrapper.find(".game-selection").exists()).toBe(false);
      expect(wrapper.find(".game-container").exists()).toBe(true);
    });

    it("should show game container when Capitals is selected", async () => {
      wrapper = mount(GameHub);

      const capitalsOption = wrapper.findAll(".game-option")[1];
      await capitalsOption?.trigger("click");
      await nextTick();

      expect(wrapper.find(".game-selection").exists()).toBe(false);
      expect(wrapper.find(".game-container").exists()).toBe(true);
    });

    it("should show game container when City Districts is selected", async () => {
      wrapper = mount(GameHub);

      const districtsOption = wrapper.findAll(".game-option")[2];
      await districtsOption?.trigger("click");
      await nextTick();

      expect(wrapper.find(".game-selection").exists()).toBe(false);
      expect(wrapper.find(".game-container").exists()).toBe(true);
    });

    it("should render back button when game is active", async () => {
      wrapper = mount(GameHub);

      const countriesOption = wrapper.findAll(".game-option")[0];
      await countriesOption?.trigger("click");
      await nextTick();

      const backButton = wrapper.find(".back-button");
      expect(backButton.exists()).toBe(true);
      expect(backButton.text()).toBe("← Back to Menu");
    });

    it("should return to menu when back button is clicked", async () => {
      wrapper = mount(GameHub);

      // Select a game
      const countriesOption = wrapper.findAll(".game-option")[0];
      await countriesOption?.trigger("click");
      await nextTick();

      expect(wrapper.find(".game-container").exists()).toBe(true);

      // Click back button
      const backButton = wrapper.find(".back-button");
      await backButton.trigger("click");
      await nextTick();

      expect(wrapper.find(".game-selection").exists()).toBe(true);
      expect(wrapper.find(".game-container").exists()).toBe(false);
    });
  });

  describe("component rendering", () => {
    it("should render WorldCountries component when countries mode is selected", async () => {
      wrapper = mount(GameHub);

      const countriesOption = wrapper.findAll(".game-option")[0];
      await countriesOption?.trigger("click");
      await nextTick();

      expect(wrapper.html()).toContain("World Countries Game");
    });

    it("should render WorldCapitals component when capitals mode is selected", async () => {
      wrapper = mount(GameHub);

      const capitalsOption = wrapper.findAll(".game-option")[1];
      await capitalsOption?.trigger("click");
      await nextTick();

      expect(wrapper.html()).toContain("World Capitals Game");
    });

    it("should render CityDistricts component when districts mode is selected", async () => {
      wrapper = mount(GameHub);

      const districtsOption = wrapper.findAll(".game-option")[2];
      await districtsOption?.trigger("click");
      await nextTick();

      expect(wrapper.html()).toContain("City Districts Game");
    });
  });

  describe("game mode state", () => {
    it("should initialize with no game mode selected", () => {
      wrapper = mount(GameHub);

      expect(wrapper.find(".game-selection").exists()).toBe(true);
      expect(wrapper.find(".game-container").exists()).toBe(false);
    });

    it("should maintain game mode after selection", async () => {
      wrapper = mount(GameHub);

      const countriesOption = wrapper.findAll(".game-option")[0];
      await countriesOption?.trigger("click");
      await nextTick();

      expect(wrapper.find(".game-container").exists()).toBe(true);

      // Component should still render game container after re-render
      await nextTick();
      expect(wrapper.find(".game-container").exists()).toBe(true);
    });

    it("should clear game mode when returning to menu", async () => {
      wrapper = mount(GameHub);

      // Select game
      const countriesOption = wrapper.findAll(".game-option")[0];
      await countriesOption?.trigger("click");
      await nextTick();

      // Return to menu
      const backButton = wrapper.find(".back-button");
      await backButton.trigger("click");
      await nextTick();

      // Should be back to selection screen
      expect(wrapper.find(".game-selection").exists()).toBe(true);

      // Can select a different game
      const capitalsOption = wrapper.findAll(".game-option")[1];
      await capitalsOption?.trigger("click");
      await nextTick();

      expect(wrapper.html()).toContain("World Capitals Game");
    });
  });

  describe("responsive behavior", () => {
    it("should render game options container", () => {
      wrapper = mount(GameHub);

      const gameOptions = wrapper.find(".game-options");
      expect(gameOptions.exists()).toBe(true);
    });

    it("should apply hover effects to game options", async () => {
      wrapper = mount(GameHub);

      const gameOption = wrapper.find(".game-option");
      expect(gameOption.exists()).toBe(true);

      // Verify the element can receive hover events
      await gameOption.trigger("mouseenter");
      await nextTick();

      expect(gameOption.exists()).toBe(true);
    });
  });

  describe("accessibility", () => {
    it("should have clickable game options", () => {
      wrapper = mount(GameHub);

      const options = wrapper.findAll(".game-option");
      options.forEach((option) => {
        expect(option.attributes("role")).toBeFalsy(); // No explicit role needed for divs with click handlers
      });
    });

    it("should have descriptive text for each game mode", () => {
      wrapper = mount(GameHub);

      const options = wrapper.findAll(".game-option");

      expect(options[0]?.find("h2").text()).toBeTruthy();
      expect(options[0]?.find("p").text()).toBeTruthy();

      expect(options[1]?.find("h2").text()).toBeTruthy();
      expect(options[1]?.find("p").text()).toBeTruthy();

      expect(options[2]?.find("h2").text()).toBeTruthy();
      expect(options[2]?.find("p").text()).toBeTruthy();
    });
  });
});
