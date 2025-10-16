
import { describe, it, expect } from 'vitest';
import { State } from '../src/state/State';
import { registerGlobalMapper, resetGlobalStateConfig } from '../src/state/StateConfig';

describe('Custom mapper registration', () => {
  it('read-only custom mapper and writeable custom mapper (global, lazy)', () => {
    resetGlobalStateConfig();

    class SuffixMapper {
      constructor(private suffix: string) {}
      read(v: any) { return String(v) + this.suffix; }
      // no write => read-only
    }
    class SuffixFactory {
      name() { return 'suffix'; }
      create(args: string[]) { return new SuffixMapper(args[0] ?? ''); }
    }

    class TimesMapper {
      constructor(private k: number) {}
      read(v: number) { return Number(v) * this.k; }
      write(v: number) { return Number(v) / this.k; }
    }
    class TimesFactory {
      name() { return 'times'; }
      create(args: string[]) { return new TimesMapper(Number(args[0] ?? 1)); }
    }

    const s = new State({ raw: 'Ada', num: 10, ro: '{raw |> suffix(X)}', scaled: '{num |> times(5)}' });

    // register AFTER state creation
    registerGlobalMapper(new SuffixFactory() as any);
    registerGlobalMapper(new TimesFactory() as any);

    expect(s.ro).toBe('AdaX');
    expect(() => { (s as any).ro = 'Z'; }).toThrow();

    expect(s.scaled).toBe(50);
    s.scaled = 25; // writes back -> num becomes 5
    expect(s.num).toBe(5);
  });
});
