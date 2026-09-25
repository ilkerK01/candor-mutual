import type * as __compactRuntime from '@midnight-ntwrk/compact-runtime';

export enum Round { OPEN = 0, CLOSED = 1 }

export type Member = { name: Uint8Array; key: __compactRuntime.JubjubPoint };

export type Witnesses<PS> = {
  localSecretKey(context: __compactRuntime.WitnessContext<Ledger, PS>): [PS, Uint8Array];
  findMemberPath(context: __compactRuntime.WitnessContext<Ledger, PS>,
                 leaf_0: Uint8Array): [PS, { leaf: Uint8Array,
                                             path: { sibling: { field: bigint },
                                                     goes_left: boolean
                                                   }[]
                                           }];
}

export type ImpureCircuits<PS> = {
  invite(context: __compactRuntime.CircuitContext<PS>, codeHash_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  join(context: __compactRuntime.CircuitContext<PS>,
       code_0: Uint8Array,
       name_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  choose(context: __compactRuntime.CircuitContext<PS>,
         target_0: __compactRuntime.JubjubPoint): __compactRuntime.CircuitResults<PS, []>;
  closeRound(context: __compactRuntime.CircuitContext<PS>): __compactRuntime.CircuitResults<PS, []>;
}

export type ProvableCircuits<PS> = {
  invite(context: __compactRuntime.CircuitContext<PS>, codeHash_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  join(context: __compactRuntime.CircuitContext<PS>,
       code_0: Uint8Array,
       name_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  choose(context: __compactRuntime.CircuitContext<PS>,
         target_0: __compactRuntime.JubjubPoint): __compactRuntime.CircuitResults<PS, []>;
  closeRound(context: __compactRuntime.CircuitContext<PS>): __compactRuntime.CircuitResults<PS, []>;
}

export type PureCircuits = {
  hostKey(sk_0: Uint8Array): Uint8Array;
  inviteHash(code_0: Uint8Array): Uint8Array;
  publicKeyOf(sk_0: Uint8Array): __compactRuntime.JubjubPoint;
  memberId(key_0: __compactRuntime.JubjubPoint): Uint8Array;
  pairTag(sk_0: Uint8Array,
          other_0: __compactRuntime.JubjubPoint,
          group_0: Uint8Array): Uint8Array;
  pickNullifier(sk_0: Uint8Array, tag_0: Uint8Array): Uint8Array;
}

export type Circuits<PS> = {
  hostKey(context: __compactRuntime.CircuitContext<PS>, sk_0: Uint8Array): __compactRuntime.CircuitResults<PS, Uint8Array>;
  inviteHash(context: __compactRuntime.CircuitContext<PS>, code_0: Uint8Array): __compactRuntime.CircuitResults<PS, Uint8Array>;
  publicKeyOf(context: __compactRuntime.CircuitContext<PS>, sk_0: Uint8Array): __compactRuntime.CircuitResults<PS, __compactRuntime.JubjubPoint>;
  memberId(context: __compactRuntime.CircuitContext<PS>,
           key_0: __compactRuntime.JubjubPoint): __compactRuntime.CircuitResults<PS, Uint8Array>;
  pairTag(context: __compactRuntime.CircuitContext<PS>,
          sk_0: Uint8Array,
          other_0: __compactRuntime.JubjubPoint,
          group_0: Uint8Array): __compactRuntime.CircuitResults<PS, Uint8Array>;
  pickNullifier(context: __compactRuntime.CircuitContext<PS>,
                sk_0: Uint8Array,
                tag_0: Uint8Array): __compactRuntime.CircuitResults<PS, Uint8Array>;
  invite(context: __compactRuntime.CircuitContext<PS>, codeHash_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  join(context: __compactRuntime.CircuitContext<PS>,
       code_0: Uint8Array,
       name_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  choose(context: __compactRuntime.CircuitContext<PS>,
         target_0: __compactRuntime.JubjubPoint): __compactRuntime.CircuitResults<PS, []>;
  closeRound(context: __compactRuntime.CircuitContext<PS>): __compactRuntime.CircuitResults<PS, []>;
}

export type Ledger = {
  readonly groupName: Uint8Array;
  readonly host: Uint8Array;
  readonly round: Round;
  invites: {
    isEmpty(): boolean;
    size(): bigint;
    member(elem_0: Uint8Array): boolean;
    [Symbol.iterator](): Iterator<Uint8Array>
  };
  members: {
    isFull(): boolean;
    checkRoot(rt_0: { field: bigint }): boolean;
    root(): __compactRuntime.MerkleTreeDigest;
    firstFree(): bigint;
    pathForLeaf(index_0: bigint, leaf_0: Uint8Array): __compactRuntime.MerkleTreePath<Uint8Array>;
    findPathForLeaf(leaf_0: Uint8Array): __compactRuntime.MerkleTreePath<Uint8Array> | undefined;
    history(): Iterator<__compactRuntime.MerkleTreeDigest>
  };
  directory: {
    isEmpty(): boolean;
    size(): bigint;
    member(key_0: Uint8Array): boolean;
    lookup(key_0: Uint8Array): Member;
    [Symbol.iterator](): Iterator<[Uint8Array, Member]>
  };
  readonly memberCount: bigint;
  picks: {
    isEmpty(): boolean;
    size(): bigint;
    member(elem_0: Uint8Array): boolean;
    [Symbol.iterator](): Iterator<Uint8Array>
  };
  nullifiers: {
    isEmpty(): boolean;
    size(): bigint;
    member(elem_0: Uint8Array): boolean;
    [Symbol.iterator](): Iterator<Uint8Array>
  };
  matches: {
    isEmpty(): boolean;
    size(): bigint;
    member(elem_0: Uint8Array): boolean;
    [Symbol.iterator](): Iterator<Uint8Array>
  };
  readonly pickCount: bigint;
  readonly matchCount: bigint;
}

export type ContractReferenceLocations = any;

export declare const contractReferenceLocations : ContractReferenceLocations;

export declare class Contract<PS = any, W extends Witnesses<PS> = Witnesses<PS>> {
  witnesses: W;
  circuits: Circuits<PS>;
  impureCircuits: ImpureCircuits<PS>;
  provableCircuits: ProvableCircuits<PS>;
  constructor(witnesses: W);
  initialState(context: __compactRuntime.ConstructorContext<PS>,
               name_0: Uint8Array): __compactRuntime.ConstructorResult<PS>;
}

export declare function ledger(state: __compactRuntime.StateValue | __compactRuntime.ChargedState): Ledger;
export declare const pureCircuits: PureCircuits;
