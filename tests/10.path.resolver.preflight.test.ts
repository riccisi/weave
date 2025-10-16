import { describe, it, expect } from 'vitest';
import { State } from '../src/state/State';
import { PathResolver } from '../src/state/PathResolver';

describe('PathResolver.preflight', () => {
    it('OK: users[1].name', () => {
        const s = new State({ users: [{ name: 'Ada' }, { name: 'Bob' }] });
        const pf = PathResolver.preflight(s, 'users[1].name');
        expect(pf.ok).toBe(true);
        expect(pf.finalKind).toBe('prop');
    });

    it('OK: settings["theme"]', () => {
        const s = new State({ settings: new Map([['theme', 'dark']]) });
        const pf = PathResolver.preflight(s, 'settings["theme"]');
        expect(pf.ok).toBe(true);
        expect(pf.finalKind).toBe('mapKey');
    });

    it('KO: users[5].name (elemento non navigabile)', () => {
        const s = new State({ users: [{ name: 'Ada' }] });
        const pf = PathResolver.preflight(s, 'users[5].name');
        expect(pf.ok).toBe(false);
        expect(pf.error).toMatch(/not navigable/i);
    });

    it('KO: indice su non-list', () => {
        const s = new State({ users: { a: 1 } as any });
        const pf = PathResolver.preflight(s, 'users[0]');
        expect(pf.ok).toBe(false);
        expect(pf.error).toMatch(/index on non-list/i);
    });

    it('KO: proprietà inesistente nello schema', () => {
        const s = new State({ users: [{ name: 'Ada' }] });
        const pf = PathResolver.preflight(s, 'users[0].age');
        expect(pf.ok).toBe(false);
        expect(pf.error).toMatch(/not found/i);
    });
});
