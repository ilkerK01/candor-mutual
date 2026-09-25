import { CompiledContract } from '@midnight-ntwrk/compact-js';
import * as MutualContract from '../managed/mutual/contract/index.js';
import { mutualWitnesses } from './witnesses.js';

export * as Mutual from '../managed/mutual/contract/index.js';
export { mutualWitnesses, createMutualPrivateState } from './witnesses.js';
export type { MutualPrivateState } from './witnesses.js';

export const CompiledMutualContract = CompiledContract.make('mutual', MutualContract.Contract).pipe(
  CompiledContract.withWitnesses(mutualWitnesses),
  CompiledContract.withCompiledFileAssets('./managed/mutual'),
);
