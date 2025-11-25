import { describe, it, expect } from 'vitest';
import { State } from '../src/state/State';

describe('Parent/Child inheritance (immutable schema)', () => {
    it('child writes to parent when key not declared locally', () => {
        const parent = new State({ name: 'Ada', valid: true });
        const child  = new State({}, { parent });

        expect(child.name).toBe('Ada'); // inherited
        child.name = 'Alan';            // forwarded to parent
        expect(child.name).toBe('Alan');
        expect(parent.name).toBe('Alan'); // parent UPDATED
    });

    it('child overrides locally when key is declared in child schema', () => {
        const parent = new State({ name: 'Ada', valid: true });
        const child  = new State({ name: 'John' }, { parent });

        expect(child.name).toBe('John'); // local override
        child.name = 'Alan';             // writes on child, not parent
        expect(child.name).toBe('Alan');
        expect(parent.name).toBe('Ada'); // parent untouched
    });

    it('writing unknown key throws', () => {
        const parent = new State({ a: 1 });
        const child  = new State({}, { parent });
        expect(() => { (child as any).b = 2; }).toThrow(/unknown property/i);
    });

    it('Child prop dependency on parent prop value 1', () => {
        const parent = new State({ title: "test" });
        const child  = new State({ hidden: "{!title}"}, { parent });
        expect(child.hidden).toBe(false);
        parent.title = null;
        expect(child.hidden).toBe(true);
    });

    it('Child prop dependency on parent prop value 2', () => {
        const parent = new State({ title: "test" });
        const child  = new State({ hidden: (st: State) => !st.title}, { parent });
        expect(child.hidden).toBe(false);
        parent.title = null;
        expect(child.hidden).toBe(true);
    });
});
