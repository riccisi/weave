
import { describe, it, expect } from 'vitest';
import { State } from '../src/state/State';

describe('Bracket paths and alias', () => {
  it('alias to array element prop', () => {
    const s = new State({
      arr: [{v: 1}, {v: 2}],
      firstV: '{arr[0].v}'
    });
    expect(s.firstV).toBe(1);
    s.arr[0].v = 7;
    expect(s.firstV).toBe(7);
  });

  it('alias to array element (IndexAttribute) can replace element through alias', () => {
    const s = new State({
      arr: [{v: 1}],
      elem: '{arr[0]}'
    });
    expect((s as any).elem.v).toBe(1);
    (s as any).elem = { v: 5 };
    expect(s.arr[0].v).toBe(5);
  });
});
