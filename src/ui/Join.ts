import type { StateInit } from './Component';
import { Container } from './Container';
import { ComponentRegistry } from './Registry';

type Orientation = 'horizontal' | 'vertical';

/**
 * Join container:
 * - di default applica il Layout { type: 'join', orientation: 'horizontal' }
 * - se l'utente passa `orientation` a livello di Join, la inietta nel layout (se non già specificata)
 * - se l'utente passa `layout: { type: 'join', ... }`, NON lo sovrascrive (completa solo i buchi)
 * - se l'utente passa un layout diverso da 'join', lo rispetta e non interviene
 */
export class Join extends Container {
    static wtype = 'join';

    protected stateInit: StateInit = {};

    /** Assicura che il layout sia 'join' (a meno che l'utente non ne abbia definito un altro). */
    protected beforeMount(): void {
        const topLevelOrientation = (this.props.orientation as Orientation | undefined) ?? 'horizontal';
        const incoming = this.props.layout as Record<string, any> | undefined;

        if (!incoming) {
            // nessun layout esplicito → forziamo join con l'orientation (default: horizontal)
            this.props.layout = { type: 'join', orientation: topLevelOrientation };
        } else if (typeof incoming === 'object' && incoming.type === 'join') {
            // layout join esplicito → completa orientation se mancante usando l'alias a livello di Join
            if (incoming.orientation == null) incoming.orientation = topLevelOrientation;
        } // else: layout diverso da 'join' → rispetta scelta dell'utente

        super.beforeMount();
    }
}

ComponentRegistry.registerClass(Join);
