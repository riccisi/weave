import { describe, it, expect } from 'vitest';
import { tokenize } from '../src/state/PathTokenizer';
import { State } from '../src/state/State';

describe('PathTokenizer edge cases', () => {
    it('supports single and double quotes for map keys', () => {
        const t1 = tokenize('settings["theme"]');
        const t2 = tokenize("settings['theme']");
        expect(t1.top).toBe('settings');
        expect(t2.top).toBe('settings');
        expect(t1.rest).toEqual([{ kind: 'mapKey', key: 'theme' }]);
        expect(t2.rest).toEqual([{ kind: 'mapKey', key: 'theme' }]);
    });

    it('supports escaped quotes inside key', () => {
        const t = tokenize('settings["weird\\"key\\""]');
        expect(t.rest).toEqual([{ kind: 'mapKey', key: 'weird"key"' }]);
    });

    it('allows spaces/symbols in quoted map key', () => {
        const t = tokenize('settings["sp ace./-_:*?"]');
        expect(t.rest).toEqual([{ kind: 'mapKey', key: 'sp ace./-_:*?' }]);
    });

    it('out-of-range numeric index is syntactically valid (semantic check happens later)', () => {
        const t = tokenize('arr[999].x');
        expect(t.top).toBe('arr');
        expect(t.rest).toEqual([{ kind: 'index', index: 999 }, { kind: 'prop', name: 'x' }]);
    });

    it('throws on missing closing bracket', () => {
        expect(() => tokenize('arr[1.x')).toThrow(/expected/i);
    });

    it('throws on non-numeric index', () => {
        expect(() => tokenize('arr[abc]')).toThrow(/Numeric index expected/i);
    });

    it('throws on missing closing quote', () => {
        expect(() => tokenize('settings["oops]')).toThrow(/Missing closing/i);
    });

    it('throws on unexpected character', () => {
        expect(() => tokenize('name#bad')).toThrow(/Unexpected token/i);
    });
});

describe('PathAttribute runtime notes', () => {
    it('reading arr[2] when arr has len 1 returns undefined, but navigating deeper throws', () => {
        const s = new State({ arr: [{ v: 1 }] });
        // Lettura diretta via proxy JS: undefined
        const v = (s as any)['arr'][2];
        expect(v).toBeUndefined();
        // Navigazione PathAttribute su elemento non presente: errore
        expect(() => s.on('arr[2].v', () => {})).toThrow(/List element not navigable/);
    });
});
