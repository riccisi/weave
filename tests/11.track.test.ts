import { describe, it, expect } from 'vitest';
import { State } from '../src/state/State';

describe('State.track()', () => {
    it('raccoglie le chiavi lette durante la computazione', () => {
        const s = new State({ a: 1, b: 2, c: 3 });
        const { value, deps } = s.track(() => {
            const a = s.a;
            const b = s.b;
            return a + b;
        });
        expect(value).toBe(3);
        expect([...deps].sort()).toEqual(['a','b']);
    });
});
