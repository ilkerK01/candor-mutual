import { useCallback, useMemo, useRef, useState } from 'react';
import {
  MutualAPI,
  hostKeyOf,
  memberIdOf,
  myMatches,
  newInviteCode,
  pickOpensMatch,
  type GroupMember,
  type GroupState,
} from '../../api/src/index';
import type { WalletSession } from './wallet';
import { isContractAddress, useGroupState } from './useGroupState';
import { Ico, describeError, shorten, type Notice } from './common';

export type MutualTab = 'group' | 'host' | 'matches';

export const DEMO_GROUP = '33d0aa8d5345780253c02237c0320c81ed982215f7751001003d1e452df7e135';

const params = () => new URLSearchParams(window.location.search);

export const readGroupFromUrl = () => params().get('group') ?? '';

const writeGroupToUrl = (address: string) => {
  const url = new URL(window.location.href);
  url.searchParams.delete('invite');
  if (address) url.searchParams.set('group', address);
  else url.searchParams.delete('group');
  window.history.replaceState(null, '', url);
};

const inviteLink = (group: string, code: string) => {
  const url = new URL(window.location.origin + window.location.pathname);
  url.searchParams.set('group', group);
  url.searchParams.set('invite', code);
  return url.toString();
};

const stored = <T,>(key: string, fallback: T): T => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
};

const picksKey = (secret: Uint8Array, group: string) => `candor-picks-${memberIdOf(secret).slice(0, 16)}-${group}`;

const store = (key: string, value: unknown) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    return;
  }
};

export function MutualApp(props: {
  session: WalletSession | null;
  connecting: boolean;
  onConnect: () => void;
  secret: Uint8Array;
  tab: MutualTab;
  setTab: (tab: MutualTab) => void;
}) {
  const { session, secret, tab, setTab } = props;
  const [groupInput, setGroupInput] = useState(readGroupFromUrl);
  const [group, setGroup] = useState(() => (isContractAddress(readGroupFromUrl()) ? readGroupFromUrl() : ''));
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice>(null);
  const [picked, setPicked] = useState<string[]>(() => stored(picksKey(secret, readGroupFromUrl()), []));
  const [invites, setInvites] = useState<string[]>(() => stored(`candor-invites-${readGroupFromUrl()}`, []));
  const apiRef = useRef<{ address: string; api: MutualAPI } | null>(null);

  const { state, error: stateError, refresh } = useGroupState(group || null);
  const me = useMemo(() => memberIdOf(secret), [secret]);
  const isHost = !!state && state.hostKey === hostKeyOf(secret);
  const self = state?.members.find((m) => m.id === me) ?? null;
  const matches = useMemo(() => (state && self ? myMatches(state, secret) : []), [state, self, secret]);

  const openGroup = (address: string) => {
    const clean = address.trim();
    if (!isContractAddress(clean)) {
      setNotice({ kind: 'err', text: 'A group address is 64 hex characters.' });
      return false;
    }
    apiRef.current = null;
    setGroup(clean);
    setGroupInput(clean);
    setPicked(stored(picksKey(secret, clean), []));
    setInvites(stored(`candor-invites-${clean}`, []));
    writeGroupToUrl(clean);
    setNotice(null);
    return true;
  };

  const groupApi = useCallback(async (): Promise<MutualAPI> => {
    if (!session) throw new Error('Connect your Lace wallet first.');
    if (apiRef.current?.address === group) return apiRef.current.api;
    const api = await MutualAPI.connect(session.providers, group, secret);
    apiRef.current = { address: group, api };
    return api;
  }, [session, group, secret]);

  const run = async (label: string, action: () => Promise<string | void>, success: string) => {
    setBusy(label);
    setNotice(null);
    try {
      const txId = await action();
      setNotice({ kind: 'ok', text: txId ? `${success} Transaction ${shorten(String(txId), 8, 8)}` : success });
      await refresh();
    } catch (e) {
      console.error(e);
      setNotice({ kind: 'err', text: describeError(e) });
    } finally {
      setBusy(null);
    }
  };

  const createGroup = (name: string) =>
    run(
      'Deploying your group contract. Lace will ask you to approve.',
      async () => {
        if (!session) throw new Error('Connect your Lace wallet first.');
        const api = await MutualAPI.deploy(session.providers, secret, name);
        apiRef.current = { address: api.contractAddress, api };
        openGroup(api.contractAddress);
        setTab('host');
      },
      'Group created. Issue invites and share them with your members.',
    );

  const issueInvites = (count: number) =>
    run(
      `Issuing ${count} invite${count > 1 ? 's' : ''}.`,
      async () => {
        const api = await groupApi();
        let last = '';
        for (let i = 0; i < count; i++) {
          const code = newInviteCode();
          last = await api.invite(code);
          setInvites((prev) => {
            const next = [...prev, code];
            store(`candor-invites-${group}`, next);
            return next;
          });
        }
        return last;
      },
      'Invites are on-chain. Send each link to one person.',
    );

  const join = (code: string, name: string) =>
    run(
      'Joining the group.',
      async () => {
        const txId = await (await groupApi()).join(code, name);
        const url = new URL(window.location.href);
        url.searchParams.delete('invite');
        window.history.replaceState(null, '', url);
        return txId;
      },
      'You are in. Pick the people you would say yes to.',
    );

  const choose = (member: GroupMember) => {
    const mutual = !!state && pickOpensMatch(state, secret, member);
    return run(
      `Sending a sealed pick for ${member.name}.`,
      async () => {
        const txId = await (await groupApi()).choose(member.key);
        setPicked((prev) => {
          const next = [...new Set([...prev, member.id])];
          store(picksKey(secret, group), next);
          return next;
        });
        return txId;
      },
      mutual
        ? `It's mutual. ${member.name} picked you too, and you can both see the match now.`
        : `Your pick is sealed. If ${member.name} picks you too, you will both see the match.`,
    );
  };

  const closeRound = () =>
    run('Closing the round.', async () => (await groupApi()).closeRound(), 'The round is closed. Matches stay visible to their pairs.');

  return (
    <section className="deal" id="app">
      <div className="wrap">
        <div className="center">
          <p className="eyebrow reveal">The app</p>
          <h2 className="reveal">Run a real group on Midnight</h2>
          <p className="lead reveal">
            Everything below talks to the Preprod network through your Lace wallet. Proofs are generated on your machine.
          </p>
          {!session && (
            <button className="btn btn-ghost reveal" onClick={props.onConnect} disabled={props.connecting}>
              {props.connecting ? 'Connecting…' : 'Connect Lace to start'}
            </button>
          )}
        </div>

        <div className="dash reveal">
          <nav className="rail" aria-label="App sections" role="tablist">
            <Ico id="i-mark" className="mark rail-mark" />
            {(
              [
                ['group', 'i-users', 'Group'],
                ['matches', 'i-heart', 'Matches'],
                ['host', 'i-board', 'Host'],
              ] as const
            ).map(([key, icon, label]) => (
              <button key={key} role="tab" aria-selected={tab === key} className={tab === key ? 'on' : ''} onClick={() => setTab(key)}>
                <Ico id={icon} />
                <span>{label}</span>
              </button>
            ))}
          </nav>

          <div className="dash-main">
            <div className="group-bar">
              <label htmlFor="group">Group address</label>
              <div className="row">
                <input
                  id="group"
                  className="field"
                  value={groupInput}
                  placeholder="Paste the group address or open your invite link"
                  onChange={(e) => setGroupInput(e.target.value)}
                  spellCheck={false}
                />
                <button className="btn btn-ghost btn-sm" onClick={() => openGroup(groupInput)}>Open</button>
              </div>
              {group && state && (
                <div className="group-meta">
                  <strong>{state.groupName}</strong>
                  <span className={`badge ${state.open ? 'open' : 'closed'}`}>{state.open ? 'Round open' : 'Closed'}</span>
                  <span>{state.members.length} members · {state.picks} picks · {state.matches} matches</span>
                </div>
              )}
              {group && stateError && !state && <p className="muted small">{stateError}</p>}
            </div>

            {busy && (
              <div className="banner busy">
                <span className="spinner" />
                <span>{busy} Generating the zero-knowledge proof can take a minute.</span>
              </div>
            )}
            {notice && <div className={`banner ${notice.kind}`}>{notice.text}</div>}

            <div className="panel">
              {tab === 'group' && (
                <GroupPanel
                  state={state}
                  self={self}
                  picked={picked}
                  matches={matches}
                  walletReady={!!session}
                  busy={!!busy}
                  onJoin={join}
                  onChoose={choose}
                />
              )}
              {tab === 'matches' && <MatchesPanel state={state} self={self} matches={matches} />}
              {tab === 'host' && (
                <HostPanel
                  state={state}
                  group={group}
                  isHost={isHost}
                  invites={invites}
                  walletReady={!!session}
                  busy={!!busy}
                  onCreate={createGroup}
                  onInvite={issueInvites}
                  onClose={closeRound}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function GroupPanel(props: {
  state: GroupState | null;
  self: GroupMember | null;
  picked: string[];
  matches: GroupMember[];
  walletReady: boolean;
  busy: boolean;
  onJoin: (code: string, name: string) => void;
  onChoose: (member: GroupMember) => void;
}) {
  const [code, setCode] = useState(() => params().get('invite') ?? '');
  const [name, setName] = useState('');
  const [confirm, setConfirm] = useState<string | null>(null);
  const { state, self } = props;

  if (!state)
    return (
      <article className="card empty">
        <img src="/img/empty.webp" alt="" width="260" height="230" />
        <p className="muted">Open your invite link, or paste a group address above.</p>
      </article>
    );

  const others = state.members.filter((m) => m.id !== self?.id);
  const matchedIds = new Set(props.matches.map((m) => m.id));

  return (
    <div className="grid">
      <article className="card">
        {self ? (
          <>
            <h3>You are in as {self.name}</h3>
            <p className="muted">
              Pick anyone you would say yes to. A pick is sealed on-chain: it only opens if they pick you too, and nobody ever
              learns about a pick that was not returned.
            </p>
            <div className="mini-stats">
              <div><b>{props.picked.length}</b><span>your picks</span></div>
              <div><b>{props.matches.length}</b><span>your matches</span></div>
              <div><b>{state.members.length}</b><span>members</span></div>
            </div>
          </>
        ) : (
          <>
            <h3>1 · Join {state.groupName}</h3>
            <p className="muted">
              Use the invite code your host sent you. Your name is shown to the group so people can pick you. Your picks are
              never shown to anyone.
            </p>
            <label htmlFor="invite">Invite code</label>
            <input id="invite" className="field" value={code} onChange={(e) => setCode(e.target.value)} placeholder="xxxx-xxxx-xxxx" spellCheck={false} />
            <label htmlFor="name">Display name</label>
            <input id="name" className="field" value={name} maxLength={32} onChange={(e) => setName(e.target.value)} placeholder="How the group knows you" />
            <button
              className="btn btn-light wide"
              disabled={!props.walletReady || !code.trim() || !name.trim() || props.busy || !state.open}
              onClick={() => props.onJoin(code.trim(), name.trim())}
            >
              {!state.open ? 'This round is closed' : props.walletReady ? 'Join the group' : 'Connect Lace to join'}
            </button>
          </>
        )}
      </article>

      <article className="card">
        <h3>{self ? '2 · Pick someone' : 'Who is here'}</h3>
        {others.length === 0 ? (
          <p className="muted">Nobody else has joined yet.</p>
        ) : (
          <ul className="people">
            {others.map((m) => {
              const matched = matchedIds.has(m.id);
              const mine = props.picked.includes(m.id);
              return (
                <li key={m.id} className={matched ? 'matched' : ''}>
                  <span className="avatar" aria-hidden="true">{m.name.slice(0, 1).toUpperCase()}</span>
                  <span className="who">{m.name}</span>
                  {matched ? (
                    <span className="badge open"><Ico id="i-heart" className="i16" />Mutual</span>
                  ) : mine ? (
                    <span className="badge enrollment">Picked</span>
                  ) : !self ? null : confirm === m.id ? (
                    <span className="row tight">
                      <button className="btn btn-light btn-sm" disabled={props.busy || !state.open} onClick={() => { setConfirm(null); props.onChoose(m); }}>Seal pick</button>
                      <button className="link sm" onClick={() => setConfirm(null)}>Cancel</button>
                    </span>
                  ) : (
                    <button className="btn btn-ghost btn-sm" disabled={!props.walletReady || props.busy || !state.open} onClick={() => setConfirm(m.id)}>
                      Pick
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
        {self && confirm && (
          <p className="muted small">
            Sealing a pick is final for this round. If they pick you too, you both see it. If not, it stays sealed forever.
          </p>
        )}
      </article>
    </div>
  );
}

function MatchesPanel({ state, self, matches }: { state: GroupState | null; self: GroupMember | null; matches: GroupMember[] }) {
  if (!state || !self)
    return (
      <article className="card empty">
        <img src="/img/empty.webp" alt="" width="260" height="230" />
        <p className="muted">{state ? 'Join this group to see your matches.' : 'Open a group to see your matches.'}</p>
      </article>
    );
  return (
    <div className="grid">
      <article className="card">
        <h3>Your matches</h3>
        {matches.length === 0 ? (
          <p className="muted">No matches yet. Matches appear here the moment the other person picks you back.</p>
        ) : (
          <ul className="people">
            {matches.map((m) => (
              <li key={m.id} className="matched">
                <span className="avatar" aria-hidden="true">{m.name.slice(0, 1).toUpperCase()}</span>
                <span className="who">{m.name}</span>
                <span className="badge open"><Ico id="i-heart" className="i16" />It's mutual</span>
              </li>
            ))}
          </ul>
        )}
        <p className="muted small">Only the two people in a match can tell who it is. Everyone else sees a count.</p>
      </article>
      <article className="card results">
        <div className="stats">
          <div><span className="big">{state.members.length}</span><span className="muted">members</span></div>
          <div><span className="big">{state.picks}</span><span className="muted">sealed picks</span></div>
          <div><span className="big">{state.matches}</span><span className="muted">matches</span></div>
        </div>
        <p className="muted small">Read straight from the Midnight indexer. Picks are stored as opaque tags, never as names.</p>
      </article>
    </div>
  );
}

function HostPanel(props: {
  state: GroupState | null;
  group: string;
  isHost: boolean;
  invites: string[];
  walletReady: boolean;
  busy: boolean;
  onCreate: (name: string) => void;
  onInvite: (count: number) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState('');
  const [count, setCount] = useState(3);
  const [copied, setCopied] = useState<string | null>(null);

  const copy = (text: string, key: string) => {
    void navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 1500);
  };

  return (
    <div className="grid">
      <article className="card">
        <h3>Start a group</h3>
        <p className="muted">Deploys a new group contract for a class, a dorm or a team. You become its host through a key in this browser.</p>
        <div className="row">
          <input className="field" aria-label="Group name" value={name} maxLength={32} onChange={(e) => setName(e.target.value)} placeholder="Group name, e.g. Dorm B Fall 2026" />
          <button className="btn btn-light btn-sm" disabled={!props.walletReady || !name.trim() || props.busy} onClick={() => props.onCreate(name.trim())}>
            Create
          </button>
        </div>
        {!props.walletReady && <p className="muted small">Connect Lace to deploy.</p>}
      </article>

      <article className="card">
        <h3>Manage this group</h3>
        {!props.state ? (
          <p className="muted">Create a group or open one you host.</p>
        ) : !props.isHost ? (
          <p className="muted">This browser does not hold the host key for {props.state.groupName}.</p>
        ) : (
          <>
            <p className="muted">
              {props.state.members.length} members, {props.state.openInvites} unused invites. Each invite works once.
            </p>
            {props.state.open && (
              <div className="row">
                <select className="field" aria-label="Number of invites" value={count} onChange={(e) => setCount(Number(e.target.value))}>
                  {[1, 2, 3, 5, 10].map((n) => (
                    <option key={n} value={n}>{n} invite{n > 1 ? 's' : ''}</option>
                  ))}
                </select>
                <button className="btn btn-ghost btn-sm" disabled={props.busy} onClick={() => props.onInvite(count)}>Issue</button>
                <button className="btn btn-light btn-sm" disabled={props.busy} onClick={props.onClose}>Close round</button>
              </div>
            )}
            {!props.state.open && <p className="muted">This round is closed. Existing matches stay visible to their pairs.</p>}
            {props.invites.length > 0 && (
              <ul className="invites">
                {props.invites.map((code) => (
                  <li key={code}>
                    <code>{code}</code>
                    <button className="link sm" onClick={() => copy(inviteLink(props.group, code), code)}>
                      {copied === code ? 'Copied' : 'Copy link'}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </article>
    </div>
  );
}
