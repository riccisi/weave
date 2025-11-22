import { describe, it, expect, beforeAll } from 'vitest';
import { JSDOM } from 'jsdom';
import { render, html } from 'uhtml';
import { indicator } from '../src/ui/decorators/Indicator';

let documentRef: Document;

beforeAll(() => {
    const dom = new JSDOM('<!doctype html><html><body></body></html>');
    globalThis.window = dom.window as any;
    documentRef = dom.window.document;
});

describe('Indicator DOM render', () => {
    it('renders button with indicator decorator without crashing', () => {
        const deco = indicator({ active: true });
        const hole = html`<button type="button" class="btn">Example</button>`;
        const wrapped = deco.wrap(hole, {
            cmp: {} as any,
            state: {} as any,
            deco: { ...deco.defaults(), active: true },
            ns: 'indicator'
        });
        expect(() => render(documentRef.body, wrapped)).not.toThrow();
    });
});
