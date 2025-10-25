
import { describe, it, expect } from 'vitest';
import { State } from '../src/state/State';

describe('MapAttribute basics + refs', () => {
  it('get/set and derived', () => {
    const s = new State({
      settings: new Map<string, string | number>([['theme','dark'], ['version', 1]]),
      isDark: (st: State) => st.settings.get('theme') === 'dark'
    });
    expect(s.isDark).toBe(true);
    s.settings.set('theme', 'light');
    expect(s.isDark).toBe(false);
  });

  it('keysRef and sizeRef', () => {
    const s = new State({
      settings: new Map([['a',1]]),
      count: (st: State) => st.settings.sizeRef().get(),
      hasB:  (st: State) => st.settings.keysRef().get().includes('b')
    });
    expect(s.count).toBe(1);
    expect(s.hasB).toBe(false);

    s.settings.set('b', 2);
    s.settings.delete('a');
    s.settings.set('c', 3);

    expect(s.count).toBe(2);
    expect(s.hasB).toBe(true);
  });

  it('alias via bracket key', () => {
    const s = new State({
      settings: new Map([['theme','dark']]),
      theme: '{settings["theme"]}'
    });
    expect(s.theme).toBe('dark');
    s.settings.set('theme', 'light');
    expect(s.theme).toBe('light');
  });

  it('map value object is wrapped as State and supports deep path', () => {
    const s = new State({
      settings: new Map([['user', { name: 'Ada' }]]),
      userName: (st: State) => (st.settings.get('user') as any).name
    });
    expect(s.userName).toBe('Ada');
    (s.settings.get('user') as any).name = 'Alan';
    expect(s.userName).toBe('Alan');
  });
});
