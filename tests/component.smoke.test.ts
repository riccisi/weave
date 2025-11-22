// test/Component.smoke.test.ts
import { html } from 'uhtml';
import { describe, it, expect } from 'vitest';
import { Component, type ComponentState, type ComponentProps } from '../src/ui/Component';

class Hello extends Component<ComponentState & { label: string }, ComponentProps> {
    protected initialState() {
        return { ...super.initialState(), label: 'A' };
    }
    protected view() {
        const s = this.state();
        return html`<button class="hello">${s.label}</button>`;
    }
}

const flushMicrotasks = () => new Promise<void>(queueMicrotask);

describe('Component smoke', () => {
    let root: HTMLElement;

    beforeEach(() => {
        root = document.createElement('div');
        document.body.appendChild(root);
    });

    afterEach(() => {
        document.body.removeChild(root);
    });

    it('mounts, reacts to state, and unmounts cleanly', async () => {
        const cmp = new Hello();
        cmp.mount(root);

        expect(root.querySelector('button')!.textContent).toBe('A');

        cmp.state().label = 'B';
        await flushMicrotasks();

        expect(root.querySelector('button')!.textContent).toBe('B');

        cmp.unmount();
    });
});