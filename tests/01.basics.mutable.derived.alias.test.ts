
import { describe, it, expect, vi } from 'vitest';
import { State } from '../src/state/State';
import { registerGlobalMapper, resetGlobalStateConfig } from '../src/state/StateConfig';

describe('Basics: mutable properties', () => {
  it('read/write primitive and subscribe (immediate true by default)', () => {
    const s = new State({ name: 'Ada' });
    const seen: any[] = [];
    s.on('name', v => seen.push(v)); // immediate
    expect(seen).toEqual(['Ada']);
    s.name = 'Alan';
    expect(seen).toEqual(['Ada', 'Alan']);
  });

  it('subscribe with immediate:false', () => {
    const s = new State({ n: 1 });
    const seen: number[] = [];
    s.on('n', v => seen.push(Number(v)), { immediate: false });
    expect(seen).toEqual([]);
    s.n = 2;
    expect(seen).toEqual([2]);
  });

  it('buffers callbacks when buffer option is provided', () => {
    vi.useFakeTimers();
    try {
      const s = new State({ count: 0 });
      const seen: number[] = [];

      s.on('count', v => seen.push(Number(v)), { buffer: 50 });

      expect(seen).toEqual([]);
      vi.advanceTimersByTime(50);
      expect(seen).toEqual([0]);

      s.count = 1;
      vi.advanceTimersByTime(25);
      s.count = 2;
      vi.advanceTimersByTime(25);
      expect(seen).toEqual([0]);

      vi.advanceTimersByTime(50);
      expect(seen).toEqual([0, 2]);
    } finally {
      vi.useRealTimers();
    }
  });

  it('delays callbacks when delay option is provided', () => {
    vi.useFakeTimers();
    try {
      const s = new State({ count: 0 });
      const seen: number[] = [];

      s.on('count', v => seen.push(Number(v)), { delay: 50 });

      expect(seen).toEqual([]);
      vi.advanceTimersByTime(49);
      expect(seen).toEqual([]);

      vi.advanceTimersByTime(1);
      expect(seen).toEqual([0]);

      s.count = 1;
      vi.advanceTimersByTime(49);
      expect(seen).toEqual([0]);

      vi.advanceTimersByTime(1);
      expect(seen).toEqual([0, 1]);
    } finally {
      vi.useRealTimers();
    }
  });
});

describe('Derived attributes', () => {
  it('auto-tracks dependencies and recomputes', () => {
    const s = new State({
      a: 1, b: 2,
      sum: (st: State) => st.a + st.b
    });
    expect(s.sum).toBe(3);
    const seen:number[] = [];
    s.on('sum', v => seen.push(Number(v)), { immediate:false });
    s.a = 10; // -> 12
    s.b = 5;  // -> 15
    expect(seen).toEqual([12, 15]);
  });

  it('derived is read-only', () => {
    const s = new State({ a: 1, x: (st: State) => st.a * 2 });
    expect(() => { (s as any).x = 10; }).toThrow();
  });
});

describe('Alias + global/lazy mappers', () => {
  it('upper mapper registered globally after State creation (lazy resolution)', () => {
    resetGlobalStateConfig();
    class UpperMapper { read(v:string){ return String(v).toUpperCase(); } }
    class UpperFactory { name(){ return 'upper'; } create(){ return new UpperMapper() as any; } }
    const s = new State({ raw: 'Ada', up: '{raw |> upper()}' });
    // register AFTER creating s
    registerGlobalMapper(new UpperFactory());
    expect(s.up).toBe('ADA');
    expect(() => { (s as any).up = 'x'; }).toThrow(); // read-only
  });
});
