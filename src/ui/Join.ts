import { StateInit } from './Component';
import { Container } from './Container';
import { ComponentRegistry } from './Registry';

export class Join extends Container {
    static wtype = 'join';

    protected stateInit: StateInit = {};

    protected willMount(): void {
        // forza il layout join se non passato
        if (!this.props.layout) {
            this.props.layout = { type: 'join', orientation: 'horizontal' };
        }
        super.willMount();
    }
}

ComponentRegistry.registerClass(Join);