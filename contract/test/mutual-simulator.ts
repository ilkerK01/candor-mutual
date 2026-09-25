import {
  type CircuitContext,
  type JubjubPoint,
  sampleContractAddress,
  createConstructorContext,
  createCircuitContext,
} from '@midnight-ntwrk/compact-runtime';
import { Contract, type Ledger, ledger, pureCircuits } from '../managed/mutual/contract/index.js';
import { type MutualPrivateState, createMutualPrivateState, mutualWitnesses } from '../src/witnesses.js';

export const bytes32 = (text: string): Uint8Array => {
  const out = new Uint8Array(32);
  out.set(new TextEncoder().encode(text).slice(0, 32));
  return out;
};

export const randomKey = (): Uint8Array => crypto.getRandomValues(new Uint8Array(32));

export class MutualSimulator {
  readonly contract: Contract<MutualPrivateState>;
  readonly group: Uint8Array;
  circuitContext: CircuitContext<MutualPrivateState>;

  constructor(hostKey: Uint8Array, groupName: string) {
    this.contract = new Contract<MutualPrivateState>(mutualWitnesses);
    this.group = bytes32(groupName);
    const { currentPrivateState, currentContractState, currentZswapLocalState } = this.contract.initialState(
      createConstructorContext(createMutualPrivateState(hostKey), '0'.repeat(64)),
      this.group,
    );
    this.circuitContext = createCircuitContext(
      sampleContractAddress(),
      currentZswapLocalState,
      currentContractState,
      currentPrivateState,
    );
  }

  as(secretKey: Uint8Array): this {
    this.circuitContext = { ...this.circuitContext, currentPrivateState: createMutualPrivateState(secretKey) };
    return this;
  }

  ledger(): Ledger {
    return ledger(this.circuitContext.currentQueryContext.state);
  }

  static keyOf(secretKey: Uint8Array): JubjubPoint {
    return pureCircuits.publicKeyOf(secretKey);
  }

  static idOf(secretKey: Uint8Array): Uint8Array {
    return pureCircuits.memberId(pureCircuits.publicKeyOf(secretKey));
  }

  tagFor(secretKey: Uint8Array, other: Uint8Array): Uint8Array {
    return pureCircuits.pairTag(secretKey, MutualSimulator.keyOf(other), this.group);
  }

  invite(code: string): Ledger {
    const hash = pureCircuits.inviteHash(bytes32(code));
    this.circuitContext = this.contract.impureCircuits.invite(this.circuitContext, hash).context;
    return this.ledger();
  }

  join(code: string, name: string): Ledger {
    this.circuitContext = this.contract.impureCircuits.join(this.circuitContext, bytes32(code), bytes32(name)).context;
    return this.ledger();
  }

  choose(target: JubjubPoint): Ledger {
    this.circuitContext = this.contract.impureCircuits.choose(this.circuitContext, target).context;
    return this.ledger();
  }

  closeRound(): Ledger {
    this.circuitContext = this.contract.impureCircuits.closeRound(this.circuitContext).context;
    return this.ledger();
  }
}
