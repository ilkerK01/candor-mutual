import { describe, it, expect, beforeEach } from 'vitest';
import { degradeToTransient, ecMul } from '@midnight-ntwrk/compact-runtime';
import { Round } from '../managed/mutual/contract/index.js';
import { MutualSimulator, randomKey } from './mutual-simulator.js';

const JUBJUB_ORDER = 0x0e7db4ea6533afa906673b0101343b00a6682093ccc81082d0970e5ed6f72cb7n;

const modInverse = (a: bigint, m: bigint): bigint => {
  let [oldR, r] = [((a % m) + m) % m, m];
  let [oldS, s] = [1n, 0n];
  while (r !== 0n) {
    const q = oldR / r;
    [oldR, r] = [r, oldR - q * r];
    [oldS, s] = [s, oldS - q * s];
  }
  return ((oldS % m) + m) % m;
};

const same = (a: Uint8Array, b: Uint8Array) => Buffer.from(a).equals(Buffer.from(b));

describe('mutual-only reveal contract', () => {
  let host: Uint8Array;
  let alice: Uint8Array;
  let bob: Uint8Array;
  let carol: Uint8Array;
  let sim: MutualSimulator;

  beforeEach(() => {
    host = randomKey();
    alice = randomKey();
    bob = randomKey();
    carol = randomKey();
    sim = new MutualSimulator(host, 'Dorm B, Fall 2026');
  });

  const seat = (...people: [Uint8Array, string][]) => {
    people.forEach(([key, name], i) => {
      sim.as(host).invite(`invite-${i}-${name}`);
      sim.as(key).join(`invite-${i}-${name}`, name);
    });
  };

  it('starts open with an empty group', () => {
    const state = sim.ledger();
    expect(state.round).toBe(Round.OPEN);
    expect(state.memberCount).toBe(0n);
    expect(state.pickCount).toBe(0n);
    expect(state.matchCount).toBe(0n);
  });

  it('lets only the host issue invites', () => {
    sim.as(host).invite('welcome');
    expect(sim.ledger().invites.size()).toBe(1n);
    sim.as(alice);
    expect(() => sim.invite('sneaky')).toThrow(/only the group host/);
  });

  it('adds a member to the directory with a public key and consumes the invite', () => {
    sim.as(host).invite('welcome');
    const state = sim.as(alice).join('welcome', 'Alice');
    expect(state.memberCount).toBe(1n);
    expect(state.invites.size()).toBe(0n);
    const entry = state.directory.lookup(MutualSimulator.idOf(alice));
    expect(new TextDecoder().decode(entry.name).replace(/\0/g, '')).toBe('Alice');
    expect(entry.key).toEqual(MutualSimulator.keyOf(alice));
  });

  it('rejects unknown or reused invite codes', () => {
    sim.as(host).invite('welcome');
    sim.as(alice).join('welcome', 'Alice');
    sim.as(bob);
    expect(() => sim.join('welcome', 'Bob')).toThrow(/not valid or was already used/);
    expect(() => sim.join('made-up', 'Bob')).toThrow(/not valid or was already used/);
  });

  it('does not let the same key join twice', () => {
    seat([alice, 'Alice']);
    sim.as(host).invite('second');
    sim.as(alice);
    expect(() => sim.join('second', 'Alice again')).toThrow(/already in this group/);
  });

  it('records a one-sided pick without revealing who picked whom', () => {
    seat([alice, 'Alice'], [bob, 'Bob'], [carol, 'Carol']);
    const state = sim.as(alice).choose(MutualSimulator.keyOf(bob));
    expect(state.pickCount).toBe(1n);
    expect(state.matchCount).toBe(0n);
    expect(state.picks.size()).toBe(1n);
    const ids = [alice, bob, carol].map(MutualSimulator.idOf);
    for (const stored of [...state.picks, ...state.nullifiers]) {
      for (const id of ids) expect(same(stored, id)).toBe(false);
    }
  });

  it('derives the same pair tag from either side', () => {
    seat([alice, 'Alice'], [bob, 'Bob']);
    expect(same(sim.tagFor(alice, bob), sim.tagFor(bob, alice))).toBe(true);
    expect(same(sim.tagFor(alice, bob), sim.tagFor(alice, carol))).toBe(false);
  });

  it('opens a match when both people pick each other', () => {
    seat([alice, 'Alice'], [bob, 'Bob'], [carol, 'Carol']);
    sim.as(alice).choose(MutualSimulator.keyOf(bob));
    const state = sim.as(bob).choose(MutualSimulator.keyOf(alice));
    expect(state.matchCount).toBe(1n);
    expect(state.pickCount).toBe(2n);
    expect(state.matches.member(sim.tagFor(alice, bob))).toBe(true);
    expect(state.matches.member(sim.tagFor(carol, alice))).toBe(false);
  });

  it('does not match when the interest is not mutual', () => {
    seat([alice, 'Alice'], [bob, 'Bob'], [carol, 'Carol']);
    sim.as(alice).choose(MutualSimulator.keyOf(bob));
    const state = sim.as(bob).choose(MutualSimulator.keyOf(carol));
    expect(state.matchCount).toBe(0n);
    expect(state.picks.size()).toBe(2n);
  });

  it('refuses to pick the same person twice', () => {
    seat([alice, 'Alice'], [bob, 'Bob']);
    sim.as(alice).choose(MutualSimulator.keyOf(bob));
    expect(() => sim.choose(MutualSimulator.keyOf(bob))).toThrow(/already picked this person/);
    expect(sim.ledger().matchCount).toBe(0n);
  });

  it('refuses to let someone pick themselves', () => {
    seat([alice, 'Alice']);
    sim.as(alice);
    expect(() => sim.choose(MutualSimulator.keyOf(alice))).toThrow(/cannot pick yourself/);
  });

  it('refuses picks from people outside the group', () => {
    seat([alice, 'Alice']);
    sim.as(carol);
    expect(() => sim.choose(MutualSimulator.keyOf(alice))).toThrow(/not joined this group/);
  });

  it('a second identity cannot forge a match with a crafted key', () => {
    const aliceAlt = randomKey();
    seat([alice, 'Alice'], [bob, 'Bob'], [aliceAlt, 'Alice (alt)']);
    sim.as(alice).choose(MutualSimulator.keyOf(bob));
    const shared = ecMul(MutualSimulator.keyOf(bob), degradeToTransient(alice));
    const crafted = ecMul(shared, modInverse(degradeToTransient(aliceAlt), JUBJUB_ORDER));
    expect(ecMul(crafted, degradeToTransient(aliceAlt))).toEqual(shared);
    const state = sim.as(aliceAlt).choose(crafted);
    expect(state.matchCount).toBe(0n);
  });

  it('keeps pair tags separate between groups', () => {
    const other = new MutualSimulator(host, 'Class CENG-301');
    expect(same(sim.tagFor(alice, bob), other.tagFor(alice, bob))).toBe(false);
  });

  it('lets only the host close the round, then blocks joins and picks', () => {
    seat([alice, 'Alice'], [bob, 'Bob']);
    sim.as(alice);
    expect(() => sim.closeRound()).toThrow(/only the group host/);
    sim.as(host).invite('late');
    expect(sim.closeRound().round).toBe(Round.CLOSED);
    sim.as(carol);
    expect(() => sim.join('late', 'Carol')).toThrow(/round is closed/);
    sim.as(alice);
    expect(() => sim.choose(MutualSimulator.keyOf(bob))).toThrow(/round is closed/);
  });
});
