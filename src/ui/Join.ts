import type { StateInit } from './Component';
import { Container } from './Container';
import { ComponentRegistry } from './Registry';

type Orientation = 'horizontal' | 'vertical';

/**
 * Represents a Join container component that ensures the layout is always set to 'join'.
 * This class is a specialized container that enforces a specific layout configuration.
 *
 * @class
 * @extends Container
 */
export class Join extends Container {
    static wtype = 'join';

    protected stateInit: StateInit = {};

    protected beforeMount(): void {
        const topLevelOrientation = (this.props.orientation as Orientation | undefined) ?? 'horizontal';
        const incoming = this.props.layout as Record<string, any> | undefined;

        if(incoming) {
            throw new Error('Layout prop not allowed in Join: ' + JSON.stringify(incoming, null, 2) + '');
        }

        this.props.layout = { type: 'join', orientation: topLevelOrientation };

        super.beforeMount();
    }
}

ComponentRegistry.registerClass(Join);
