import type {IStaticMethods} from 'flyonui/flyonui';

declare global {
    interface Window {
        HSStaticMethods: IStaticMethods | undefined
    }
}

let _loading: Promise<void> | null = null;

export async function ensureFlyonJS(): Promise<void> {
    if (window.HSStaticMethods) return;
    if (_loading) return _loading;

    _loading = (async () => {
        try {
            // primo tentativo: import ESM del bundle principale
            await import('flyonui/flyonui');
        } catch {
            // fallback DEV: Storybook/Vite servono /node_modules come statico
            await injectScript('/node_modules/flyonui/flyonui.js');
            // se non funziona, ultimo fallback: copia manualmente flyonui.js in /public/
            if (!window.HSStaticMethods) await injectScript('/flyonui.js');
        }
        if (!window.HSStaticMethods) {
            // non trovato: lascia un messaggio chiaro in console
            // (non throw, per non spezzare il render)
            console.warn('[Flyon] HSStaticMethods not found after loading flyonui.js');
        }
    })();

    return _loading;
}

function injectScript(src: string): Promise<void> {
    return new Promise((resolve, reject) => {
        if (window.HSStaticMethods) return resolve();
        const s = document.createElement('script');
        s.src = src;
        s.async = true;
        s.defer = true;
        s.onload = () => resolve();
        s.onerror = (e) => reject(e);
        document.head.appendChild(s);
    });
}

// ---- coalescing scheduler ----------------------------------------------------

const _pending = new Set<string>();
let _flushQueued = false;

/** Richiede (coalescente) l'auto-init dei plugin Flyon indicati. */
export function scheduleFlyonInit(names: string[] | undefined): void {
    if (!names || names.length === 0) return;
    for (const n of names) if (n) _pending.add(n);

    if (_flushQueued) return;
    _flushQueued = true;
    queueMicrotask(async () => {
        _flushQueued = false;
        const list = [..._pending];
        _pending.clear();
        await ensureFlyonJS();
        (window as any).HSStaticMethods?.autoInit?.(list);
    });
}