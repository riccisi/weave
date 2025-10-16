
import { describe, it, expect } from 'vitest';
import { State } from '../src/state/State';

describe('List API and coalescing', () => {
  it('mutating methods trigger derived recompute', () => {
    const s = new State({
      values: [1,2,3],
      sum: (st: State) => st.values.reduce((t:number, x:number) => t + x, 0)
    });
    const seen:number[] = [];
    s.on('sum', v => seen.push(Number(v)), { immediate:false });

    s.values.push(4);
    s.values[1] = 20;
    s.values.length = 2;

    expect(s.sum).toBe(21);
    expect(seen).toEqual([10, 28, 21]);
  });

  it('ergonomic helpers batch (we do manual batching in UI, here we test helpers only)', () => {
    const s = new State({
      values: [1,2,3],
      sum: (st: State) => st.values.reduce((t:number, x:number) => t + x, 0)
    });
    const seen:number[] = [];
    s.on('sum', v => seen.push(Number(v)), { immediate:false });

    s.values.update(1, (x:number)=>x+10); // [1,12,3]
    s.values.replaceAll((x:number)=>x*2); // [2,24,6]
    s.values.insertAt(1, 100);            // [2,100,24,6]
    s.values.move(3, 0);                  // [6,2,100,24]
    s.values.removeAt(2);                 // [6,2,24]

    expect(s.sum).toBe(32);
    expect(seen.at(-1)).toBe(32);
  });

  it('IndexAttribute: on(objects[0]) vs on(objects[0].prop)', () => {
    const s = new State({ objects: [{x:1},{x:2}] });
    const elem:any[] = [];
    const prop:number[] = [];
    s.on('objects[0]', v => elem.push(v), { immediate:false });
    s.on('objects[0].x', v => prop.push(Number(v)), { immediate:false });

    s.objects[0].x = 5;             // only prop listener
    s.objects[0] = { x: 10 };       // both

    expect(elem.length).toBe(1);
    expect(prop).toEqual([5,10]);
  });
});
