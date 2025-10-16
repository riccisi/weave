import {AbstractAttribute} from './AbstractAttribute';
import type {Unsub} from './Attribute';
import {ListAttribute} from './ListAttribute';

/**
 * Represents an attribute that mirrors an indexed position within a parent list attribute.
 * This class is used to interact with and manage a specific index within a proxied array,
 * allowing observation and updates through the associated runtime reactive system.
 *
 * Extends the functionality of `AbstractAttribute` to work specifically with index-based
 * values in a list context, including event propagation and reactive updates.
 */
export class IndexAttribute extends AbstractAttribute<any> {

    private off?: Unsub;

    constructor(private parent: ListAttribute<any>, private index: number) {
        super(`${parent.key()}[${index}]`, (parent as any).runtime);
        // Quando cambia la lista (sposta/aggiunge/rimuove), propaga l'evento.
        this.off = parent.subscribe(() => this.emit(), {immediate: false});
    }

    get(): any {
        this.collect();
        const arr = this.parent.get(); // proxy array
        return (arr as any[])[this.index];
    }

    set(v: any): void {
        const arr = this.parent.get(); // proxy array
        (arr as any[])[this.index] = v; // passa dal proxy ⇒ wrapping + emit via ListAttribute
    }

    isWritable(): boolean {
        return true;
    }

    dispose(): void {
        super.dispose();
        this.off?.();
        this.off = undefined;
    }
}