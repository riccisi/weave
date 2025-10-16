
import { describe, it, expect } from 'vitest';
import { State } from '../src/state/State';

describe('Nested + path rewire', () => {
  it('subscribe to user.address.city and rewire when intermediate replaced', () => {
    const s = new State({ user: { address: { city: 'Rome' } } });
    const seen:string[] = [];
    s.on('user.address.city', v => seen.push(String(v)), { immediate:false });

    s.user.address.city = 'Milan';
    s.user = { address: { city: 'Paris' } };
    s.user.address = { city: 'Berlin' };

    expect(seen).toEqual(['Milan', 'Paris', 'Berlin']);
  });

  it('bracket array path works and rewire on replacement element', () => {
    const s = new State({ users: [{name:'Ada'}, {name:'Alan'}] });
    const seen:string[] = [];
    s.on('users[0].name', v => seen.push(String(v)), { immediate:false });

    s.users[0].name = 'Grace';
    s.users[0] = { name: 'Barbara' };

    expect(seen).toEqual(['Grace', 'Barbara']);
  });
});
