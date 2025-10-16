import {AbstractAttribute} from './AbstractAttribute';
import type {Unsub} from './Attribute';
import {MapAttribute} from './MapAttribute';

/**
 * Represents a key-value pair within a `MapAttribute`, allowing interaction with a specific key in the map.
 * This class extends `AbstractAttribute` and provides methods to get, set, and monitor changes to
 * the value associated with the specified key.
 *
 * The `MapKeyAttribute` is tied to a parent `MapAttribute` and monitors updates to the parent map,
 * emitting changes when the value associated with the specific key is modified.
 */
export class MapKeyAttribute extends AbstractAttribute<any> {
    private off?: Unsub;

    constructor(private parent: MapAttribute<any>, private keyStr: string) {
        super(`${parent.key()}["${keyStr}"]`, (parent as any).runtime);
        this.off = parent.subscribe(() => this.emit(), {immediate: false});
    }

    get(): any {
        this.collect();
        return this.parent.getValue(this.keyStr);
    }

    set(v: any): void {
        (this.parent as any).setValue(this.keyStr, v);
    }

    isWritable(): boolean {
        return true;
    }

    dispose(): void {
        super.dispose();
        this.off && this.off();
        this.off = undefined;
    }
}
