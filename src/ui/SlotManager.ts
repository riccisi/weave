// src/ui/SlotManager.ts
// Gestisce raccolta e riuso di slot (tag dedicato o data-slot) tra re-render.
import { html } from 'uhtml';

const SLOT_TAG  = 'weave-slot' as const;
const SLOT_ATTR = 'data-slot'  as const;
const SLOT_SELECTOR  = `${SLOT_TAG}, [${SLOT_ATTR}]` as const;

export class SlotManager {
    private anchors: Map<string, HTMLElement> = new Map();

    constructor(private host: HTMLElement | null) {}

    /** Riconosce un elemento slot (tag dedicato o data-slot). */
    isSlot(el: Element | null | undefined): el is HTMLElement {
        return !!el
            && el.nodeType === 1
            && (
                el.tagName.toLowerCase() === SLOT_TAG
                || el.hasAttribute(SLOT_ATTR)
            );
    }

    slotName(el: Element): string {
        return el.getAttribute(SLOT_ATTR) ?? 'default';
    }

    /** Registra gli slot già presenti nell'host iniziale. */
    collectFromHost(): Map<string, HTMLElement> {
        const out = new Map<string, HTMLElement>();
        this.host?.querySelectorAll(SLOT_SELECTOR)?.forEach((el) => {
            const name = this.slotName(el);
            out.set(name, el as HTMLElement);
        });
        this.anchors = out;
        return out;
    }

    /** Restituisce/crea un anchor per uno slot specifico. */
    ensure(name: string, attach = true): HTMLElement {
        const existing = this.anchors.get(name);
        if (existing) return existing;
        const el = document.createElement(SLOT_TAG);
        el.setAttribute(SLOT_ATTR, name);
        this.anchors.set(name, el);
        if (attach) this.host?.appendChild(el);
        return el;
    }

    /** Riuso profondo: sostituisce tutti gli slot in `root` con gli anchor esistenti. */
    reuseSlotsFrom(root: HTMLElement): { anchors: Map<string, HTMLElement>; content: DocumentFragment } {
        const newAnchors = new Map<string, HTMLElement>();
        const replacements: Array<{ placeholder: HTMLElement; anchor: HTMLElement; depth: number }> = [];

        const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT);
        let node: Node | null = walker.nextNode();
        while (node) {
            const el = node as HTMLElement;
            if (this.isSlot(el)) {
                const name = this.slotName(el);
                const anchor = this.anchors.get(name) ?? this.ensure(name, false);
                newAnchors.set(name, anchor);
                replacements.push({ placeholder: el, anchor, depth: this.nodeDepth(el) });
            }
            node = walker.nextNode();
        }

        // sostituisci dal più profondo al più superficiale
        replacements.sort((a, b) => b.depth - a.depth);
        for (const { placeholder, anchor } of replacements) {
            const parent = placeholder.parentNode;
            if (!parent) continue;
            // Adotta i child del placeholder solo se l'anchor è vuoto (evita di clobberare subtree montati).
            if (placeholder.childNodes.length > 0 && anchor.childNodes.length === 0) {
                anchor.replaceChildren(...Array.from(placeholder.childNodes));
            }
            parent.replaceChild(anchor, placeholder);
        }

        const frag = document.createDocumentFragment();
        while (root.firstChild) frag.appendChild(root.firstChild);

        this.anchors = newAnchors;
        return { anchors: newAnchors, content: frag };
    }

    private nodeDepth(el: Node): number {
        let d = 0;
        let cur = el.parentNode;
        while (cur) { d += 1; cur = cur.parentNode; }
        return d;
    }
}

export { SLOT_TAG, SLOT_ATTR, SLOT_SELECTOR, SLOT_TAG as SLOT_TAG_NAME };
