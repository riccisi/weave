
import { describe, it, expect } from 'vitest';
import { State } from '../src/state/State';

describe('Batch coalescing general', () => {
  it('multiple changes -> single emission for a derived via manual batching', () => {
    const s = new State({
      a: 1, b: 2,
      sum: (st: State) => st.a + st.b
    });
    const seen:number[] = [];
    s.on('sum', v => seen.push(Number(v)), { immediate:false });

    s._runtime.batch(() => {
      s.a = 10;
      s.b = 20;
      s.a = 30;
    });
    expect(s.sum).toBe(50);
    expect(seen).toEqual([50]);
  });
});
