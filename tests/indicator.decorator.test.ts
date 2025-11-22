import { describe, it, expect } from 'vitest';
import { indicator } from '../src/ui/decorators/Indicator';
import { html } from 'uhtml';

const decorator = indicator({ active: true });

describe('Indicator decorator', () => {
    it('leaves hole unchanged when null', () => {
        const wrapped = decorator.wrap(null, {
            cmp: {} as any,
            state: {} as any,
            deco: decorator.defaults(),
            ns: 'indicator'
        });
        expect(wrapped).toBeNull();
    });

    it('returns same hole when provided', () => {
        const hole = html`<button>Test</button>`;
        const wrapped = decorator.wrap(hole, {
            cmp: {} as any,
            state: {} as any,
            deco: { ...decorator.defaults(), active: true },
            ns: 'indicator'
        });
        expect(wrapped).toBe(hole);
    });
});
