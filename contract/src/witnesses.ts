import type { WitnessContext, MerkleTreePath } from '@midnight-ntwrk/compact-runtime';
import type { Ledger } from '../managed/mutual/contract/index.js';

export type MutualPrivateState = {
  readonly secretKey: Uint8Array;
};

export const createMutualPrivateState = (secretKey: Uint8Array): MutualPrivateState => ({
  secretKey,
});

export const mutualWitnesses = {
  localSecretKey: ({ privateState }: WitnessContext<Ledger, MutualPrivateState>): [MutualPrivateState, Uint8Array] => [
    privateState,
    privateState.secretKey,
  ],
  findMemberPath: (
    { ledger, privateState }: WitnessContext<Ledger, MutualPrivateState>,
    leaf: Uint8Array,
  ): [MutualPrivateState, MerkleTreePath<Uint8Array>] => {
    const path = ledger.members.findPathForLeaf(leaf);
    if (!path) {
      throw new Error('You have not joined this group yet');
    }
    return [privateState, path];
  },
};
