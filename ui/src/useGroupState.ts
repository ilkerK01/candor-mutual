import { useCallback, useEffect, useState } from 'react';
import { ContractState } from '@midnight-ntwrk/midnight-js-protocol/compact-runtime';
import { Mutual } from '../../contract/src/index';
import { deriveGroupState, type GroupState } from '../../api/src/index';

const INDEXER_URL = import.meta.env.VITE_INDEXER_URL ?? 'https://indexer.preprod.midnight.network/api/v4/graphql';

const QUERY = `
  query ContractState($address: HexEncoded!) {
    contractAction(address: $address) {
      state
    }
  }
`;

const hexToBytes = (hex: string): Uint8Array => Uint8Array.from(hex.match(/.{2}/g) ?? [], (b) => parseInt(b, 16));

export const isContractAddress = (value: string): boolean => /^[0-9a-fA-F]{64}$/.test(value);

function useContractState<T>(address: string | null, decode: (state: ContractState) => T, missing: string, refreshMs: number) {
  const [state, setState] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!address || !isContractAddress(address)) {
      setState(null);
      return;
    }
    setLoading(true);
    const abort = new AbortController();
    const timer = setTimeout(() => abort.abort(), 15_000);
    try {
      const res = await fetch(INDEXER_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: QUERY, variables: { address } }),
        signal: abort.signal,
      });
      const body = await res.json();
      if (body.errors) throw new Error(body.errors[0]?.message ?? 'Indexer query failed');
      const hex = body.data?.contractAction?.state;
      if (!hex) throw new Error(missing);
      setState(decode(ContractState.deserialize(hexToBytes(hex))));
      setError(null);
    } catch (e) {
      const aborted = e instanceof DOMException && e.name === 'AbortError';
      setError(aborted ? 'The Midnight indexer did not answer in time. Retrying shortly.' : e instanceof Error ? e.message : String(e));
    } finally {
      clearTimeout(timer);
      setLoading(false);
    }
  }, [address, decode, missing]);

  useEffect(() => {
    void refresh();
    if (!address) return;
    const id = setInterval(() => void refresh(), refreshMs);
    return () => clearInterval(id);
  }, [address, refresh, refreshMs]);

  return { state, error, loading, refresh };
}

const decodeGroup = (s: ContractState): GroupState => deriveGroupState(Mutual.ledger(s.data));

export const useGroupState = (address: string | null, refreshMs = 8_000) =>
  useContractState(address, decodeGroup, 'No group found at this address yet', refreshMs);
