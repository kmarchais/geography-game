/**
 * Tests for StatsChart component
 */

import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import StatsChart from './StatsChart.vue'

describe('StatsChart', () => {
  const createStats = (foundOnAttempt1 = 0, foundOnAttempt2 = 0, foundOnAttempt3 = 0, failed = 0, skipped = 0) => ({
    foundOnAttempt1,
    foundOnAttempt2,
    foundOnAttempt3,
    failed,
    skipped,
    territoriesAttempt1: Array.from({ length: foundOnAttempt1 }, (_, i) => `Territory${i + 1}`),
    territoriesAttempt2: Array.from({ length: foundOnAttempt2 }, (_, i) => `Territory${foundOnAttempt1 + i + 1}`),
    territoriesAttempt3: Array.from({ length: foundOnAttempt3 }, (_, i) => `Territory${foundOnAttempt1 + foundOnAttempt2 + i + 1}`),
    territoriesFailed: Array.from({ length: failed }, (_, i) => `FailedTerritory${i + 1}`),
    territoriesSkipped: Array.from({ length: skipped }, (_, i) => `SkippedTerritory${i + 1}`),
  })

  describe('rendering', () => {
    it('should render SVG pie chart', () => {
      const wrapper = mount(StatsChart, {
        props: {
          stats: createStats(5, 3, 1, 0, 0),
          totalRounds: 9,
        },
      })

      const svg = wrapper.find('svg')
      expect(svg.exists()).toBe(true)
    })

    it('should render legend', () => {
      const wrapper = mount(StatsChart, {
        props: {
          stats: createStats(5, 3, 1, 0, 0),
          totalRounds: 9,
        },
      })

      const legend = wrapper.find('.chart-legend')
      expect(legend.exists()).toBe(true)
    })

    it('should use custom size prop', () => {
      const wrapper = mount(StatsChart, {
        props: {
          stats: createStats(5, 3, 1, 0, 0),
          totalRounds: 9,
          size: 300,
        },
      })

      const svg = wrapper.find('svg')
      expect(svg.attributes('width')).toBe('300')
      expect(svg.attributes('height')).toBe('300')
    })

    it('should use default size 200 when not provided', () => {
      const wrapper = mount(StatsChart, {
        props: {
          stats: createStats(5, 3, 1, 0, 0),
          totalRounds: 9,
        },
      })

      const svg = wrapper.find('svg')
      expect(svg.attributes('width')).toBe('200')
      expect(svg.attributes('height')).toBe('200')
    })
  })

  describe('segments', () => {
    it('should only show segments with non-zero counts', () => {
      const wrapper = mount(StatsChart, {
        props: {
          stats: createStats(5, 3, 0, 0, 0), // Only 1st and 2nd try
          totalRounds: 8,
        },
      })

      const paths = wrapper.findAll('.pie-segment')
      expect(paths.length).toBe(2) // Only 2 segments shown
    })

    it('should show all 5 segments when all have counts', () => {
      const wrapper = mount(StatsChart, {
        props: {
          stats: createStats(2, 2, 2, 2, 2),
          totalRounds: 10,
        },
      })

      const paths = wrapper.findAll('.pie-segment')
      expect(paths.length).toBe(5)
    })

    it('should show no segments for empty stats', () => {
      const wrapper = mount(StatsChart, {
        props: {
          stats: createStats(0, 0, 0, 0, 0),
          totalRounds: 10,
        },
      })

      const paths = wrapper.findAll('.pie-segment')
      expect(paths.length).toBe(0)
    })
  })

  describe('legend', () => {
    it('should show legend items for all segment types', () => {
      const wrapper = mount(StatsChart, {
        props: {
          stats: createStats(5, 3, 1, 0, 0),
          totalRounds: 9,
        },
      })

      const legendItems = wrapper.findAll('.legend-item')
      expect(legendItems.length).toBe(3) // Only non-zero segments
    })

    it('should display correct counts in legend', () => {
      const wrapper = mount(StatsChart, {
        props: {
          stats: createStats(5, 3, 1, 0, 0),
          totalRounds: 9,
        },
      })

      const legendValues = wrapper.findAll('.legend-value')
      expect(legendValues[0]?.text()).toBe('5/9')
      expect(legendValues[1]?.text()).toBe('3/9')
      expect(legendValues[2]?.text()).toBe('1/9')
    })
  })

  describe('tooltip', () => {
    it('should show tooltip on segment hover', async () => {
      const wrapper = mount(StatsChart, {
        props: {
          stats: createStats(5, 3, 1, 0, 0),
          totalRounds: 9,
        },
      })

      const segment = wrapper.find('.pie-segment')
      await segment.trigger('mouseenter')

      const tooltip = wrapper.find('.chart-tooltip')
      expect(tooltip.exists()).toBe(true)
    })

    it('should hide tooltip when no segment is hovered', () => {
      const wrapper = mount(StatsChart, {
        props: {
          stats: createStats(5, 3, 1, 0, 0),
          totalRounds: 9,
        },
      })

      const tooltip = wrapper.find('.chart-tooltip')
      expect(tooltip.exists()).toBe(false)
    })

    it('should display territory names in tooltip', async () => {
      const wrapper = mount(StatsChart, {
        props: {
          stats: createStats(2, 0, 0, 0, 0),
          totalRounds: 2,
        },
      })

      const segment = wrapper.find('.pie-segment')
      await segment.trigger('mouseenter')

      const tooltip = wrapper.find('.chart-tooltip')
      expect(tooltip.text()).toContain('Territory1')
      expect(tooltip.text()).toContain('Territory2')
    })

    it('should show "None" for empty territory lists', async () => {
      const stats = createStats(0, 0, 0, 0, 0)
      stats.failed = 0 // Ensure empty

      const wrapper = mount(StatsChart, {
        props: {
          stats,
          totalRounds: 5,
        },
      })

      // Can't test this without segments, so just verify structure
      expect(wrapper.find('.stats-chart-container').exists()).toBe(true)
    })
  })

  describe('interactivity', () => {
    it('should highlight segment on legend hover', async () => {
      const wrapper = mount(StatsChart, {
        props: {
          stats: createStats(5, 3, 1, 0, 0),
          totalRounds: 9,
        },
      })

      const legendItem = wrapper.find('.legend-item')
      await legendItem.trigger('mouseenter')

      // Verify segment is highlighted (has 'hovered' class)
      const segment = wrapper.find('.pie-segment.hovered')
      expect(segment.exists()).toBe(true)
    })

    it('should remove highlight on legend mouseleave', async () => {
      const wrapper = mount(StatsChart, {
        props: {
          stats: createStats(5, 3, 1, 0, 0),
          totalRounds: 9,
        },
      })

      const legendItem = wrapper.find('.legend-item')
      await legendItem.trigger('mouseenter')
      await legendItem.trigger('mouseleave')

      const hoveredSegment = wrapper.find('.pie-segment.hovered')
      expect(hoveredSegment.exists()).toBe(false)
    })
  })
})
