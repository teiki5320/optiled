import { describe, expect, it } from 'vitest';
import { accord, nombre } from './format.ts';

describe('format', () => {
  it('accord en nombre : pluriel à partir de 2', () => {
    expect(`${nombre(1)} ${accord(1, 'watt')}`).toBe('1 watt');
    expect(accord(1.5, 'watt')).toBe('watt');
    expect(accord(0, 'barre')).toBe('barre');
    expect(accord(2, 'watt')).toBe('watts');
    expect(accord(3, 'œil', 'yeux')).toBe('yeux');
  });
});
