
import type { Attribute } from './Attribute';

/** Mapper interface: transforms values and may optionally support write-back. */
export interface Mapper<T = any, R = any> {
  read(v: T): R;
  write?(v: R): T;
}

/** Factory for mappers referenced by name and optional arguments. */
export interface MapperFactory {
  name(): string;
  create(args: string[]): Mapper<any, any>;
}

/**
 * AliasResolver builds an alias binding from a string expression.
 * Order matters: the first resolver whose match(expr) returns true wins.
 */
export interface AliasResolver {
  match(expr: string): boolean;
  build(context: {
    resolvePath: (path: string) => Attribute<any>,
    getMapper: (name: string, args: string[]) => Mapper<any, any> | undefined
  }, expr: string): { path: string, mapper?: Mapper<any, any> };
}

/**
 * Global registry for alias resolvers and mapper factories.
 * States consult this registry at parse/read time.
 */
class GlobalRegistry {
  private mapperFactories = new Map<string, MapperFactory>();
  private aliasResolvers: AliasResolver[] = [];

  registerMapperFactory(f: MapperFactory) { this.mapperFactories.set(f.name(), f); }
  registerAliasResolver(r: AliasResolver) { this.aliasResolvers.push(r); }

  getMapper(name: string, args: string[]) { return this.mapperFactories.get(name)?.create(args); }
  getAliasResolvers(): AliasResolver[] { return this.aliasResolvers.slice(); }
  reset() { this.mapperFactories.clear(); this.aliasResolvers = []; }
}

export const StateConfig = new GlobalRegistry();

// ---------- Default mappers ----------

class IdentityMapper implements Mapper<any, any> { read(v: any){ return v; } write(v:any){ return v; } }
class BoolMapper implements Mapper<any, boolean> { read(v:any){ return !!v; } write(v:boolean){ return !!v; } }
class NotMapper implements Mapper<any, boolean> { read(v:any){ return !v; } write(v:boolean){ return !v; } }

class IdentityFactory implements MapperFactory { name(){ return 'id'; } create(){ return new IdentityMapper(); } }
class BoolFactory implements MapperFactory { name(){ return 'bool'; } create(){ return new BoolMapper(); } }
class NotFactory implements MapperFactory { name(){ return 'not'; } create(){ return new NotMapper(); } }

StateConfig.registerMapperFactory(new IdentityFactory());
StateConfig.registerMapperFactory(new BoolFactory());
StateConfig.registerMapperFactory(new NotFactory());

// ---------- Delegating (lazy) mapper for |> ----------
class DelegatingMapper implements Mapper<any, any> {
  constructor(private getter: () => Mapper<any, any> | undefined, private name: string) {}
  private real(): Mapper<any, any> {
    const m = this.getter();
    if (!m) throw new Error(`Mapper '${this.name}' not registered.`);
    return m;
  }
  read(v: any) { return this.real().read(v); }
  write(v: any) {
    const r = this.real() as any;
    if (typeof r.write !== 'function') throw new Error(`Mapper '${this.name}' is read-only (no write)`);
    return r.write(v);
  }
}

// ---------- Alias Resolvers (ordered) ----------
class NotAliasResolver implements AliasResolver {
  private re = /^!\s*(.+)$/;
  match(expr: string) { return this.re.test(expr.trim()); }
  build(ctx: any, expr: string) {
    const m = expr.trim().match(this.re)!;
    const path = m[1].trim();
    const mapper = StateConfig.getMapper('not', [])!;
    return { path, mapper };
  }
}

class PipeAliasResolver implements AliasResolver {
  private re = /^(.+?)\|>\s*([A-Za-z_][\w]*)(?:\s*\((.*?)\))?$/;
  match(expr: string) { return this.re.test(expr.trim()); }
  build(ctx: { resolvePath: (p:string)=>Attribute<any> }, expr: string) {
    const m = expr.trim().match(this.re)!;
    const path = m[1].trim();
    const name = m[2].trim();
    const args = (m[3] ?? '').split(',').map(s => s.trim()).filter(Boolean);
    const mapper = new DelegatingMapper(() => StateConfig.getMapper(name, args), name);
    return { path, mapper };
  }
}

class PathAliasResolver implements AliasResolver {
  match(_expr: string) { return true; }
  build(_ctx: any, expr: string) { return { path: expr.trim() }; }
}

// Register default resolvers
StateConfig.registerAliasResolver(new NotAliasResolver());
StateConfig.registerAliasResolver(new PipeAliasResolver());
StateConfig.registerAliasResolver(new PathAliasResolver());

// ---------- Public helpers ----------
export const registerGlobalMapper = (f: MapperFactory) => StateConfig.registerMapperFactory(f);
export const registerGlobalAliasResolver = (r: AliasResolver) => StateConfig.registerAliasResolver(r);
export const resetGlobalStateConfig = () => {
  StateConfig.reset();
  // restore defaults after reset
  StateConfig.registerMapperFactory(new IdentityFactory());
  StateConfig.registerMapperFactory(new BoolFactory());
  StateConfig.registerMapperFactory(new NotFactory());
  StateConfig.registerAliasResolver(new NotAliasResolver());
  StateConfig.registerAliasResolver(new PipeAliasResolver());
  StateConfig.registerAliasResolver(new PathAliasResolver());
};
