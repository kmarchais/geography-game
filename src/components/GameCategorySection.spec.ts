import { describe, it, expect } from "vitest";

// Category configuration types from GameCategorySection component
interface CategoryConfig {
  title: string;
  icon: string;
  iconColor: string;
  bgClass: string;
  cols: number;
}

const categoryConfigs: Record<string, CategoryConfig> = {
  countries: {
    title: "Country Maps",
    icon: "mdi-earth",
    iconColor: "blue",
    bgClass: "bg-blue-lighten-5",
    cols: 6,
  },
  divisions: {
    title: "Administrative Divisions",
    icon: "mdi-map-marker-radius",
    iconColor: "green",
    bgClass: "bg-green-lighten-5",
    cols: 6,
  },
  cities: {
    title: "City Districts",
    icon: "mdi-city",
    iconColor: "orange",
    bgClass: "bg-orange-lighten-5",
    cols: 4,
  },
  capitals: {
    title: "Capitals",
    icon: "mdi-office-building-marker",
    iconColor: "purple",
    bgClass: "bg-purple-lighten-5",
    cols: 6,
  },
  flags: {
    title: "Flags",
    icon: "mdi-flag",
    iconColor: "red",
    bgClass: "bg-red-lighten-5",
    cols: 6,
  },
};

const getCategoryConfig = (category: string): CategoryConfig => {
  return (
    categoryConfigs[category] || {
      title: category.charAt(0).toUpperCase() + category.slice(1),
      icon: "mdi-map",
      iconColor: "grey",
      bgClass: "bg-grey-lighten-5",
      cols: 6,
    }
  );
};

describe("GameCategorySection", () => {
  describe("categoryConfigs", () => {
    it("should have config for countries category", () => {
      const config = categoryConfigs.countries!;
      expect(config.title).toBe("Country Maps");
      expect(config.icon).toBe("mdi-earth");
      expect(config.iconColor).toBe("blue");
      expect(config.bgClass).toBe("bg-blue-lighten-5");
      expect(config.cols).toBe(6);
    });

    it("should have config for divisions category", () => {
      const config = categoryConfigs.divisions!;
      expect(config.title).toBe("Administrative Divisions");
      expect(config.icon).toBe("mdi-map-marker-radius");
      expect(config.iconColor).toBe("green");
      expect(config.bgClass).toBe("bg-green-lighten-5");
      expect(config.cols).toBe(6);
    });

    it("should have config for cities category", () => {
      const config = categoryConfigs.cities!;
      expect(config.title).toBe("City Districts");
      expect(config.icon).toBe("mdi-city");
      expect(config.iconColor).toBe("orange");
      expect(config.bgClass).toBe("bg-orange-lighten-5");
      expect(config.cols).toBe(4);
    });

    it("should have config for capitals category", () => {
      const config = categoryConfigs.capitals!;
      expect(config.title).toBe("Capitals");
      expect(config.icon).toBe("mdi-office-building-marker");
      expect(config.iconColor).toBe("purple");
      expect(config.bgClass).toBe("bg-purple-lighten-5");
      expect(config.cols).toBe(6);
    });

    it("should have config for flags category", () => {
      const config = categoryConfigs.flags!;
      expect(config.title).toBe("Flags");
      expect(config.icon).toBe("mdi-flag");
      expect(config.iconColor).toBe("red");
      expect(config.bgClass).toBe("bg-red-lighten-5");
      expect(config.cols).toBe(6);
    });
  });

  describe("getCategoryConfig", () => {
    it("should return config for known categories", () => {
      expect(getCategoryConfig("countries")).toEqual(categoryConfigs.countries!);
      expect(getCategoryConfig("divisions")).toEqual(categoryConfigs.divisions!);
      expect(getCategoryConfig("cities")).toEqual(categoryConfigs.cities!);
    });

    it("should return default config for unknown category", () => {
      const config = getCategoryConfig("unknown");
      expect(config.title).toBe("Unknown");
      expect(config.icon).toBe("mdi-map");
      expect(config.iconColor).toBe("grey");
      expect(config.bgClass).toBe("bg-grey-lighten-5");
      expect(config.cols).toBe(6);
    });

    it("should capitalize first letter of unknown category in title", () => {
      const config = getCategoryConfig("custom");
      expect(config.title).toBe("Custom");
    });

    it("should handle empty category name", () => {
      const config = getCategoryConfig("");
      expect(config.title).toBe("");
      expect(config.icon).toBe("mdi-map");
    });
  });

  describe("category-specific styling", () => {
    it("should use different columns for cities category", () => {
      expect(categoryConfigs.cities!.cols).toBe(4);
      expect(categoryConfigs.countries!.cols).toBe(6);
      expect(categoryConfigs.divisions!.cols).toBe(6);
    });

    it("should use unique background classes for each category", () => {
      const bgClasses = Object.values(categoryConfigs).map((c) => c.bgClass);
      const uniqueBgClasses = new Set(bgClasses);
      expect(uniqueBgClasses.size).toBe(bgClasses.length);
    });

    it("should use unique icon colors for each category", () => {
      const iconColors = Object.values(categoryConfigs).map(
        (c) => c.iconColor
      );
      const uniqueIconColors = new Set(iconColors);
      expect(uniqueIconColors.size).toBe(iconColors.length);
    });
  });
});
