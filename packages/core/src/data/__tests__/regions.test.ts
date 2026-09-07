import { describe, it, expect } from 'vitest';
import {
  G7,
  G20,
  NATO,
  EU,
  BRICS,
  ASEAN,
  OECD,
  EFTA,
  MERCOSUR,
  AU,
  EUROPE,
  ASIA,
  AFRICA,
  NORTH_AMERICA,
  SOUTH_AMERICA,
  OCEANIA,
} from '../regions';

const allGroups = {
  G7, G20, NATO, EU, BRICS, ASEAN, OECD, EFTA, MERCOSUR, AU,
  EUROPE, ASIA, AFRICA, NORTH_AMERICA, SOUTH_AMERICA, OCEANIA,
};

describe('region groupings: structural invariants', () => {
  it('every grouping is a non-empty array of strings', () => {
    for (const [name, group] of Object.entries(allGroups)) {
      expect(group.length, `${name} should not be empty`).toBeGreaterThan(0);
      for (const id of group) {
        expect(typeof id).toBe('string');
        // World-atlas feature ids are numeric ISO 3166-1 codes as zero-padded
        // 3-character strings ('008' Albania, '840' USA); region ids must use
        // the same form or membership lookups silently miss.
        expect(id, `${name} id "${id}"`).toMatch(/^[0-9]{3}$/);
      }
    }
  });

  it('every grouping has unique IDs (no duplicate countries)', () => {
    for (const [name, group] of Object.entries(allGroups)) {
      const set = new Set(group);
      expect(set.size, `${name} duplicates`).toBe(group.length);
    }
  });
});

describe('expected memberships', () => {
  it('G7 has exactly 7 countries', () => {
    expect(G7.length).toBe(7);
  });

  it('G20 has 19 countries (the 20th member is the EU as a bloc, intentionally not in this list)', () => {
    expect(G20.length).toBe(19);
  });

  it('NATO contains 32 members including Finland and Sweden', () => {
    expect(NATO.length).toBe(32);
    expect(NATO).toContain('246'); // Finland
    expect(NATO).toContain('752'); // Sweden
    // Malta is not a NATO member.
    expect(NATO).not.toContain('470');
  });

  it('EU contains 27 members (no UK)', () => {
    expect(EU.length).toBe(27);
    expect(EU).not.toContain('826'); // UK
  });

  it('BRICS includes the original 5 plus the 2024 expansion', () => {
    expect(BRICS).toContain('076'); // Brazil
    expect(BRICS).toContain('643'); // Russia
    expect(BRICS).toContain('356'); // India
    expect(BRICS).toContain('156'); // China
    expect(BRICS).toContain('710'); // South Africa
    // 2024 expansion that has formally joined
    expect(BRICS).toContain('364'); // Iran
    expect(BRICS).toContain('784'); // UAE
    expect(BRICS).toContain('818'); // Egypt
    expect(BRICS).toContain('231'); // Ethiopia
  });
});

describe('continent buckets cover the major economies', () => {
  it('USA is in NORTH_AMERICA', () => {
    expect(NORTH_AMERICA).toContain('840');
  });

  it('Brazil is in SOUTH_AMERICA', () => {
    expect(SOUTH_AMERICA).toContain('076');
  });

  it('Germany is in EUROPE and not in ASIA', () => {
    expect(EUROPE).toContain('276');
    expect(ASIA).not.toContain('276');
  });

  it('China is in ASIA', () => {
    expect(ASIA).toContain('156');
  });

  it('Australia is in OCEANIA', () => {
    expect(OCEANIA).toContain('036');
  });

  it('AFRICA mirrors AU (same set of African Union members)', () => {
    expect(AFRICA).toBe(AU);
  });

  it('low-numbered countries are padded so they match world-atlas ids', () => {
    expect(G20).toContain('032'); // Argentina
    expect(MERCOSUR).toContain('068'); // Bolivia
    expect(ASIA).toContain('004'); // Afghanistan
    expect(NATO).toContain('008'); // Albania
  });
});
