import {AbstractAttribute} from './AbstractAttribute';
import type {Attribute} from './Attribute';
import type {Mapper} from './StateConfig';

/**
 * Represents an alias for another attribute, providing a way to map or transform the value when getting or setting it.
 * This class abstracts access to a target attribute and optionally applies a mapping function.
 *
 * @template T The type of the target attribute's value.
 * @template R The type of the value after mapping or transforming.
 *
 * @extends AbstractAttribute<R>
 */
export class AliasAttribute<T = any, R = T> extends AbstractAttribute<R> {

    constructor(
        key: string,
        rt: any,
        private resolve: () => Attribute<T>,
        private mapper?: Mapper<T, R>
    ) {
        super(key, rt);
    }

    private target(): Attribute<T> {
        const t = this.resolve();
        if (!t) throw new Error(`Alias '${this.key()}' has no target.`);
        return t;
    }

    get(): R {
        this.collect();
        const tv = this.target().get();
        return this.mapper ? this.mapper.read(tv as T) : (tv as unknown as R);
    }

    set(v: R): void {
        const tgt = this.target();
        if (this.mapper) {
            if (!this.mapper.write) throw new Error(`Alias '${this.key()}' is read-only (mapper has no write).`);
            tgt.set(this.mapper.write(v));
        } else {
            tgt.set(v as unknown as T);
        }
    }

    isWritable(): boolean {
        const tgt = this.target();
        if (!this.mapper) return tgt.isWritable();
        return !!this.mapper.write && tgt.isWritable();
    }

    subscribe(fn: (v: R) => void, opts?: { immediate?: boolean, buffer?: number, delay?: number }) {
        if (!this.mapper) return this.target().subscribe(fn as any, opts);
        return this.target().subscribe((tv) => fn(this.mapper!.read(tv as T)), opts);
    }
}
