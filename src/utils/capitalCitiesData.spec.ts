import { describe, expect, it } from "vitest";
import { worldCapitals } from "./capitalCitiesData";

describe("worldCapitals", () => {
  it("contains one entry for each UN member state", () => {
    expect(worldCapitals).toHaveLength(193);

    const countries = worldCapitals.map((capital) => capital.country);
    expect(new Set(countries).size).toBe(countries.length);
  });

  it("uses current audited capital values for known stale entries", () => {
    expect(worldCapitals).toContainEqual({
      name: "Dodoma",
      country: "Tanzania",
      location: [-6.16, 35.75],
    });
    expect(worldCapitals).toContainEqual({
      name: "Abuja",
      country: "Nigeria",
      location: [9.08, 7.53],
    });
    expect(worldCapitals).toContainEqual({
      name: "Gitega",
      country: "Burundi",
      location: [-3.43, 29.93],
    });
    expect(worldCapitals).toContainEqual({
      name: "Kyiv",
      country: "Ukraine",
      location: [50.43, 30.52],
    });
    expect(worldCapitals).toContainEqual({
      name: "Sucre",
      country: "Bolivia",
      location: [-19.02, -65.26],
    });

    expect(worldCapitals).not.toContainEqual(
      expect.objectContaining({ name: "Dar es Salaam", country: "Tanzania" })
    );
    expect(worldCapitals).not.toContainEqual(
      expect.objectContaining({ name: "Lagos", country: "Nigeria" })
    );
    expect(worldCapitals).not.toContainEqual(
      expect.objectContaining({ name: "Bujumbura", country: "Burundi" })
    );
    expect(worldCapitals).not.toContainEqual(
      expect.objectContaining({ name: "Kiev", country: "Ukraine" })
    );
  });

  it("includes previously missing UN member states from the audit", () => {
    expect(worldCapitals).toContainEqual(
      expect.objectContaining({ name: "Bissau", country: "Guinea-Bissau" })
    );
    expect(worldCapitals).toContainEqual(
      expect.objectContaining({ name: "Yerevan", country: "Armenia" })
    );
    expect(worldCapitals).toContainEqual(
      expect.objectContaining({ name: "Juba", country: "South Sudan" })
    );
    expect(worldCapitals).toContainEqual(
      expect.objectContaining({ name: "Kampala", country: "Uganda" })
    );
  });

  it("uses valid latitude and longitude coordinates", () => {
    for (const capital of worldCapitals) {
      const [latitude, longitude] = capital.location;

      expect(Number.isFinite(latitude), `${capital.country} latitude`).toBe(true);
      expect(Number.isFinite(longitude), `${capital.country} longitude`).toBe(true);
      expect(latitude, `${capital.country} latitude`).toBeGreaterThanOrEqual(-90);
      expect(latitude, `${capital.country} latitude`).toBeLessThanOrEqual(90);
      expect(longitude, `${capital.country} longitude`).toBeGreaterThanOrEqual(-180);
      expect(longitude, `${capital.country} longitude`).toBeLessThanOrEqual(180);
    }
  });
});
