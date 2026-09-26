import { type MidnightProviders } from '@midnight-ntwrk/midnight-js-types';
import { type ContractAddress, type JubjubPoint } from '@midnight-ntwrk/midnight-js-protocol/compact-runtime';
import { deployContract, findDeployedContract } from '@midnight-ntwrk/midnight-js-contracts';
import { map, type Observable } from 'rxjs';
import {
  Mutual,
  CompiledMutualContract,
  createMutualPrivateState,
  type MutualPrivateState,
} from '../../contract/src/index';

export const mutualPrivateStateKey = 'mutualPrivateState';
export type MutualPrivateStateId = typeof mutualPrivateStateKey;
export type MutualCircuitKeys = 'invite' | 'join' | 'choose' | 'closeRound';
export type MutualProviders = MidnightProviders<MutualCircuitKeys, MutualPrivateStateId, MutualPrivateState>;

export interface GroupMember {
  readonly id: string;
  readonly name: string;
  readonly key: JubjubPoint;
}

export interface GroupState {
  readonly groupName: string;
  readonly open: boolean;
  readonly hostKey: string;
  readonly members: readonly GroupMember[];
  readonly openInvites: number;
  readonly picks: number;
  readonly matches: number;
  readonly ledger: Mutual.Ledger;
}

export const toHex = (bytes: Uint8Array): string => Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');

export const fromHex = (value: string): Uint8Array => {
  const clean = value.trim().replace(/^0x/, '');
  if (!/^[0-9a-fA-F]{64}$/.test(clean)) throw new Error('Expected 64 hex characters');
  return Uint8Array.from(clean.match(/.{2}/g)!.map((b) => parseInt(b, 16)));
};

const hex = toHex;

export const encodeText = (text: string): Uint8Array => {
  const out = new Uint8Array(32);
  out.set(new TextEncoder().encode(text.trim()).slice(0, 32));
  return out;
};

export const decodeText = (bytes: Uint8Array): string => new TextDecoder().decode(bytes).replace(/\0+$/g, '');

export const publicKeyOf = (secretKey: Uint8Array): JubjubPoint => Mutual.pureCircuits.publicKeyOf(secretKey);

export const memberIdOf = (secretKey: Uint8Array): string =>
  hex(Mutual.pureCircuits.memberId(Mutual.pureCircuits.publicKeyOf(secretKey)));

export const hostKeyOf = (secretKey: Uint8Array): string => hex(Mutual.pureCircuits.hostKey(secretKey));

export const inviteHashOf = (code: string): Uint8Array => Mutual.pureCircuits.inviteHash(encodeText(code));

export const newInviteCode = (): string => {
  const alphabet = 'abcdefghjkmnpqrstuvwxyz23456789';
  const bytes = crypto.getRandomValues(new Uint8Array(12));
  const chars = Array.from(bytes, (b) => alphabet[b % alphabet.length]).join('');
  return `${chars.slice(0, 4)}-${chars.slice(4, 8)}-${chars.slice(8, 12)}`;
};

export const deriveGroupState = (state: Mutual.Ledger): GroupState => {
  const members: GroupMember[] = [];
  for (const [id, member] of state.directory) {
    members.push({ id: hex(id), name: decodeText(member.name), key: member.key });
  }
  return {
    groupName: decodeText(state.groupName),
    open: state.round === Mutual.Round.OPEN,
    hostKey: hex(state.host),
    members,
    openInvites: Number(state.invites.size()),
    picks: Number(state.pickCount),
    matches: Number(state.matchCount),
    ledger: state,
  };
};

export const myMatches = (group: GroupState, secretKey: Uint8Array): GroupMember[] => {
  if (group.ledger.matches.isEmpty()) return [];
  const me = memberIdOf(secretKey);
  const raw = group.ledger.groupName;
  return group.members.filter(
    (m) => m.id !== me && group.ledger.matches.member(Mutual.pureCircuits.pairTag(secretKey, m.key, raw)),
  );
};

export const pickOpensMatch = (group: GroupState, secretKey: Uint8Array, target: GroupMember): boolean =>
  group.ledger.picks.member(Mutual.pureCircuits.pairTag(secretKey, target.key, group.ledger.groupName));

export class MutualAPI {
  readonly contractAddress: ContractAddress;
  readonly state$: Observable<GroupState>;

  private constructor(
    private readonly deployed: any,
    providers: MutualProviders,
  ) {
    this.contractAddress = deployed.deployTxData.public.contractAddress;
    providers.privateStateProvider.setContractAddress(this.contractAddress);
    this.state$ = providers.publicDataProvider
      .contractStateObservable(this.contractAddress, { type: 'latest' })
      .pipe(map((contractState) => deriveGroupState(Mutual.ledger(contractState.data))));
  }

  async invite(code: string): Promise<string> {
    const tx = await this.deployed.callTx.invite(inviteHashOf(code));
    return tx.public.txId;
  }

  async join(code: string, name: string): Promise<string> {
    if (!name.trim()) throw new Error('Pick a display name first');
    const tx = await this.deployed.callTx.join(encodeText(code), encodeText(name));
    return tx.public.txId;
  }

  async choose(target: JubjubPoint): Promise<string> {
    const tx = await this.deployed.callTx.choose(target);
    return tx.public.txId;
  }

  async closeRound(): Promise<string> {
    const tx = await this.deployed.callTx.closeRound();
    return tx.public.txId;
  }

  static async deploy(providers: MutualProviders, secretKey: Uint8Array, groupName: string): Promise<MutualAPI> {
    const deployed = await deployContract(providers as any, {
      compiledContract: CompiledMutualContract,
      privateStateId: mutualPrivateStateKey,
      initialPrivateState: createMutualPrivateState(secretKey),
      args: [encodeText(groupName)],
    } as any);
    return new MutualAPI(deployed, providers);
  }

  static async connect(
    providers: MutualProviders,
    contractAddress: ContractAddress,
    secretKey: Uint8Array,
  ): Promise<MutualAPI> {
    const deployed = await findDeployedContract(providers as any, {
      contractAddress,
      compiledContract: CompiledMutualContract,
      privateStateId: mutualPrivateStateKey,
      initialPrivateState: createMutualPrivateState(secretKey),
    } as any);
    return new MutualAPI(deployed, providers);
  }
}
