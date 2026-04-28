import { describe, expect, it } from 'vitest';
import { formatLatLng } from '../hover-crosshair';

describe('formatLatLng', () => {
  it('Warsaw → 52.23°N, 21.01°E', () => {
    expect(formatLatLng(52.23, 21.01)).toBe('52.23°N, 21.01°E');
  });

  it('Sydney → 33.86°S, 151.21°E', () => {
    expect(formatLatLng(-33.86, 151.21)).toBe('33.86°S, 151.21°E');
  });

  it('NYC → 40.71°N, 74.01°W', () => {
    expect(formatLatLng(40.7128, -74.006)).toBe('40.71°N, 74.01°W');
  });

  it('zero is positive-poled (N/E)', () => {
    expect(formatLatLng(0, 0)).toBe('0.00°N, 0.00°E');
  });

  it('clamps lat above 90', () => {
    expect(formatLatLng(91.5, 10)).toBe('90.00°N, 10.00°E');
  });

  it('clamps lat below -90', () => {
    expect(formatLatLng(-95, 10)).toBe('90.00°S, 10.00°E');
  });

  it('wraps lng past 180 into the W hemisphere', () => {
    expect(formatLatLng(0, 200)).toBe('0.00°N, 160.00°W');
  });

  it('wraps lng past -180 into the E hemisphere', () => {
    expect(formatLatLng(0, -200)).toBe('0.00°N, 160.00°E');
  });

  it('rounds to 2 decimals', () => {
    expect(formatLatLng(12.3456, 78.9012)).toBe('12.35°N, 78.90°E');
  });
});
