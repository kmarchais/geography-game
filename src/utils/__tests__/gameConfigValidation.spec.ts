/**
 * Game Configuration Validation Tests
 * Tests all 27 game configurations to identify broken games
 */

import { describe, it, expect } from 'vitest';
import type { GameDefinition } from '../../types/gameRegistry';
import { PROCESSOR_REGISTRY } from '../geo/processors';

// Import all game configurations
import worldCountries from '../../config/games/countries/world.json';
import europeCountries from '../../config/games/countries/europe.json';
import africaCountries from '../../config/games/countries/africa.json';
import asiaCountries from '../../config/games/countries/asia.json';
import northAmericaCountries from '../../config/games/countries/north-america.json';
import southAmericaCountries from '../../config/games/countries/south-america.json';
import oceaniaCountries from '../../config/games/countries/oceania.json';

import usStates from '../../config/games/divisions/us-states.json';
import canadianProvinces from '../../config/games/divisions/canadian-provinces.json';
import spanishCommunities from '../../config/games/divisions/spanish-communities.json';
import germanStates from '../../config/games/divisions/german-states.json';
import italianRegions from '../../config/games/divisions/italian-regions.json';
import brazilianStates from '../../config/games/divisions/brazilian-states.json';
import australianStates from '../../config/games/divisions/australian-states.json';
import chineseProvinces from '../../config/games/divisions/chinese-provinces.json';
import belgianProvinces from '../../config/games/divisions/belgian-provinces.json';
import dutchProvinces from '../../config/games/divisions/dutch-provinces.json';
import ukCounties from '../../config/games/divisions/uk-counties.json';
import russianOblasts from '../../config/games/divisions/russian-oblasts.json';
import ukrainianOblasts from '../../config/games/divisions/ukrainian-oblasts.json';

import parisArrondissements from '../../config/games/cities/paris-arrondissements.json';
import londonBoroughs from '../../config/games/cities/london-boroughs.json';
import parisQuartiers from '../../config/games/cities/paris-quartiers.json';
import parisDistricts from '../../config/games/cities/paris-districts.json';
import barcelonaDistricts from '../../config/games/cities/barcelona-districts.json';
import barcelonaBarrios from '../../config/games/cities/barcelona-barrios.json';
import bordeauxQuartiers from '../../config/games/cities/bordeaux-quartiers.json';

const ALL_GAMES: Array<{ name: string; config: GameDefinition }> = [
  // Countries
  { name: 'World Countries', config: worldCountries as GameDefinition },
  { name: 'Europe Countries', config: europeCountries as GameDefinition },
  { name: 'Africa Countries', config: africaCountries as GameDefinition },
  { name: 'Asia Countries', config: asiaCountries as GameDefinition },
  { name: 'North America Countries', config: northAmericaCountries as GameDefinition },
  { name: 'South America Countries', config: southAmericaCountries as GameDefinition },
  { name: 'Oceania Countries', config: oceaniaCountries as GameDefinition },

  // Divisions
  { name: 'US States', config: usStates as GameDefinition },
  { name: 'Canadian Provinces', config: canadianProvinces as GameDefinition },
  { name: 'Spanish Communities', config: spanishCommunities as GameDefinition },
  { name: 'German States', config: germanStates as GameDefinition },
  { name: 'Italian Regions', config: italianRegions as GameDefinition },
  { name: 'Brazilian States', config: brazilianStates as GameDefinition },
  { name: 'Australian States', config: australianStates as GameDefinition },
  { name: 'Chinese Provinces', config: chineseProvinces as GameDefinition },
  { name: 'Belgian Provinces', config: belgianProvinces as GameDefinition },
  { name: 'Dutch Provinces', config: dutchProvinces as GameDefinition },
  { name: 'UK Counties', config: ukCounties as GameDefinition },
  { name: 'Russian Oblasts', config: russianOblasts as GameDefinition },
  { name: 'Ukrainian Oblasts', config: ukrainianOblasts as GameDefinition },

  // Cities
  { name: 'Paris Arrondissements', config: parisArrondissements as GameDefinition },
  { name: 'London Boroughs', config: londonBoroughs as GameDefinition },
  { name: 'Paris Quartiers', config: parisQuartiers as GameDefinition },
  { name: 'Paris Districts', config: parisDistricts as GameDefinition },
  { name: 'Barcelona Districts', config: barcelonaDistricts as GameDefinition },
  { name: 'Barcelona Barrios', config: barcelonaBarrios as GameDefinition },
  { name: 'Bordeaux Quartiers', config: bordeauxQuartiers as GameDefinition },
];

describe('Game Configuration Validation', () => {
  describe('All games have required top-level fields', () => {
    ALL_GAMES.forEach(({ name, config }) => {
      it(`${name} has required fields`, () => {
        expect(config, `${name} is null/undefined`).toBeDefined();
        expect(config.id, `${name} missing id`).toBeDefined();
        expect(config.name, `${name} missing name`).toBeDefined();
        expect(config.category, `${name} missing category`).toBeDefined();
        expect(config.route, `${name} missing route`).toBeDefined();
        expect(config.config, `${name} missing config object`).toBeDefined();
      });
    });
  });

  describe('All games have valid categories', () => {
    const validCategories = ['countries', 'divisions', 'cities', 'capitals', 'flags'];

    ALL_GAMES.forEach(({ name, config }) => {
      it(`${name} has valid category`, () => {
        expect(validCategories).toContain(config.category);
      });
    });
  });

  describe('All games have valid routes', () => {
    ALL_GAMES.forEach(({ name, config }) => {
      it(`${name} has valid route format`, () => {
        expect(config.route).toMatch(/^\/game\/[a-z0-9-]+$/);
        expect(config.route).toBe(`/game/${config.id}`);
      });
    });
  });

  describe('All games have required config properties', () => {
    ALL_GAMES.forEach(({ name, config }) => {
      it(`${name} config has dataUrl`, () => {
        expect(config.config.dataUrl, `${name} missing config.dataUrl`).toBeDefined();
        expect(typeof config.config.dataUrl).toBe('string');
        expect(config.config.dataUrl.length).toBeGreaterThan(0);
      });

      it(`${name} config has mapCenter`, () => {
        expect(config.config.mapCenter, `${name} missing config.mapCenter`).toBeDefined();
        expect(Array.isArray(config.config.mapCenter)).toBe(true);
        expect(config.config.mapCenter).toHaveLength(2);
        expect(typeof config.config.mapCenter[0]).toBe('number');
        expect(typeof config.config.mapCenter[1]).toBe('number');
      });

      it(`${name} config has zoom`, () => {
        expect(config.config.zoom, `${name} missing config.zoom`).toBeDefined();
        expect(typeof config.config.zoom).toBe('number');
        expect(config.config.zoom).toBeGreaterThan(0);
      });

      it(`${name} config has propertyName`, () => {
        expect(config.config.propertyName, `${name} missing config.propertyName`).toBeDefined();
        expect(typeof config.config.propertyName).toBe('string');
      });

      it(`${name} config has targetLabel`, () => {
        expect(config.config.targetLabel, `${name} missing config.targetLabel`).toBeDefined();
        expect(typeof config.config.targetLabel).toBe('string');
      });
    });
  });

  describe('All games have valid processors', () => {
    ALL_GAMES.forEach(({ name, config }) => {
      if (config.config.processors && config.config.processors.length > 0) {
        it(`${name} has valid processors`, () => {
          config.config.processors!.forEach((processorName: string) => {
            expect(
              PROCESSOR_REGISTRY[processorName as keyof typeof PROCESSOR_REGISTRY],
              `${name} has invalid processor: ${processorName}`
            ).toBeDefined();
          });
        });
      }
    });
  });

  describe('All games have consistent IDs', () => {
    ALL_GAMES.forEach(({ name, config }) => {
      it(`${name} ID matches route`, () => {
        const expectedRoute = `/game/${config.id}`;
        expect(config.route).toBe(expectedRoute);
      });
    });
  });

  describe('Data URL accessibility', () => {
    const urlsByGame = new Map<string, string>();

    ALL_GAMES.forEach(({ name, config }) => {
      urlsByGame.set(name, config.config.dataUrl);
    });

    it('All games have unique or shared data URLs', () => {
      // Log which games share URLs (this is OK for filtering processors)
      const urlGroups = new Map<string, string[]>();

      urlsByGame.forEach((url, gameName) => {
        if (!urlGroups.has(url)) {
          urlGroups.set(url, []);
        }
        urlGroups.get(url)!.push(gameName);
      });

      urlGroups.forEach((games, url) => {
        if (games.length > 1) {
          console.log(`Shared URL (${games.length} games): ${url}`);
          console.log(`  Games: ${games.join(', ')}`);
        }
      });

      // All URLs should be valid strings (either absolute URLs or relative paths)
      urlsByGame.forEach((url, gameName) => {
        expect(url, `${gameName} has invalid URL`).toBeTruthy();

        const isAbsoluteUrl = url.startsWith('http://') || url.startsWith('https://');
        const isRelativePath = url.startsWith('./') || url.startsWith('/');

        expect(
          isAbsoluteUrl || isRelativePath,
          `${gameName} URL should be either an absolute URL (http://) or a relative path (./ or /), got: ${url}`
        ).toBe(true);

        // Log relative paths for visibility
        if (isRelativePath) {
          console.log(`Local data file: ${gameName} -> ${url}`);
        }
      });
    });
  });

  describe('Summary Report', () => {
    it('should list all games with their key properties', () => {
      const report = ALL_GAMES.map(({ name, config }) => ({
        name,
        id: config.id,
        category: config.category,
        hasProcessors: !!config.config.processors && config.config.processors.length > 0,
        processorCount: config.config.processors?.length || 0,
        processors: config.config.processors || [],
        difficulty: config.difficulty,
        featured: config.featured,
        dataUrl: config.config.dataUrl.split('/').pop(), // Just filename
      }));

      console.log('\n=== GAME CONFIGURATION SUMMARY ===');
      console.log(`Total games: ${ALL_GAMES.length}`);
      console.log('\nGames by category:');

      const byCategory = report.reduce((acc, game) => {
        if (!acc[game.category]) acc[game.category] = [];
        acc[game.category].push(game);
        return acc;
      }, {} as Record<string, typeof report>);

      Object.entries(byCategory).forEach(([category, games]) => {
        console.log(`  ${category}: ${games.length} games`);
      });

      console.log('\nGames with processors:');
      report.filter(g => g.hasProcessors).forEach(game => {
        console.log(`  ${game.name}: [${game.processors.join(', ')}]`);
      });

      console.log('\nFeatured games:');
      report.filter(g => g.featured).forEach(game => {
        console.log(`  ${game.name}`);
      });

      expect(report.length).toBe(27);
    });
  });
});
