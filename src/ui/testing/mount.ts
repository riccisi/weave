import type { Component } from '../Component';

/** Monta un Weave Component su un contenitore dedicato e ritorna l’elemento radice. */
export function mountComponent(cmp: Component, parent?: Component | any): HTMLElement {
    const root = document.createElement('div');
    cmp.mount(root, parent);
    return root;
}
