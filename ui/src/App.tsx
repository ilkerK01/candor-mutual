import { useEffect, useState } from 'react';
import { loadSecret } from './identity';
import { connectWallet, readDust, type WalletSession } from './wallet';
import { Ico, Sprite, errorText, scrollToId, shorten } from './common';
import { DEMO_GROUP, MutualApp, readGroupFromUrl, type MutualTab } from './Mutual';

const REPO_URL = 'https://github.com/ilkerK01/candor-mutual';

const formatDust = (value: bigint) => {
  const whole = Number(value / 10n ** 12n) / 1_000_000;
  return whole.toLocaleString(undefined, { maximumFractionDigits: 2 });
};

const scenes = [
  {
    img: '/img/scene-project.webp',
    quote: '"Want to do the final project together?"',
    text: 'You keep sitting at the same table. Neither of you asks, because a no would make the rest of the term awkward.',
  },
  {
    img: '/img/scene-flatmates.webp',
    quote: '"Should we be flatmates next year?"',
    text: 'Housing forms are due in a week. You both have a spare key in mind and nobody wants to be the one who asked first.',
  },
  {
    img: '/img/scene-makeup.webp',
    quote: '"Can we just talk again?"',
    text: 'The argument was weeks ago. You both miss the friendship, and you are both waiting for the other to move.',
  },
];

const steps: [string, string, string][] = [
  ['01', 'Get a one-time invite', 'The group host issues invite links. Only a hash of each code goes on-chain, and every code works once.'],
  ['02', 'Join under your name', 'Your display name and a public key go into the group directory so people can find you. Your secret key never leaves this browser.'],
  ['03', 'Seal your picks', 'Pick anyone you would say yes to. The chain gets a membership proof and an opaque tag that only the two of you could ever compute.'],
  ['04', 'Open only if mutual', 'When the other person seals the same pair, the tags collide and the contract records a match that only the two of you can recognise.'],
];

const proofs: [string, string, string][] = [
  ['i-lock', 'Sealed until returned', 'A pick is a tag derived from a secret only the two of you share. If it is never returned, it never opens.'],
  ['i-once', 'Members only, once each', 'Every pick carries a zero-knowledge proof of membership and spends a nullifier, so nobody picks the same person twice.'],
  ['i-heart', 'Matches cannot be faked', 'The tag is bound to both members’ keys. A match exists only when both people really sealed a pick.'],
  ['i-shield', 'Not even Candor', 'Keys stay on your device. The chain holds tags, nullifiers and counts. There is no database of who picked whom.'],
];

export default function App() {
  const [secret] = useState<Uint8Array>(() => loadSecret());
  const [session, setSession] = useState<WalletSession | null>(null);
  const [dust, setDust] = useState<{ balance: bigint; cap: bigint } | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [connectError, setConnectError] = useState<string | null>(null);
  const [tab, setTab] = useState<MutualTab>('group');
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (readGroupFromUrl()) setTimeout(() => scrollToId('app'), 300);
  }, []);

  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('in');
            io.unobserve(e.target);
          }
        }),
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' },
    );
    document.querySelectorAll('.reveal').forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!session) return;
    const tick = () => readDust(session).then(setDust).catch(() => setDust(null));
    tick();
    const id = setInterval(tick, 15_000);
    return () => clearInterval(id);
  }, [session]);

  const connect = async () => {
    setConnecting(true);
    setConnectError(null);
    try {
      setSession(await connectWallet());
    } catch (e) {
      setConnectError(errorText(e));
      scrollToId('app');
    } finally {
      setConnecting(false);
    }
  };

  const goToApp = (next: MutualTab) => {
    setTab(next);
    scrollToId('app');
  };

  return (
    <>
      <Sprite />
      <header className={`nav${scrolled ? ' scrolled' : ''}`}>
        <div className="wrap nav-in">
          <a href="#top" className="brand" aria-label="Candor home">
            <img src="/img/candor-logo.svg" alt="Candor" height="34" />
          </a>
          <nav className="nav-links hide-sm" aria-label="Sections">
            <a href="#why">Why</a>
            <a href="#how">How it works</a>
            <a href="#app">App</a>
          </nav>
          {session ? (
            <div className="wallet-pill">
              <span className="dot" />
              <span className="addr" title={session.address}>{shorten(session.address, 10, 5)}</span>
              {dust && <span className="dust">{formatDust(dust.balance)} tDUST</span>}
              <button className="btn btn-quiet btn-sm" onClick={() => { setSession(null); setDust(null); }}>Disconnect</button>
            </div>
          ) : (
            <button className="btn btn-ink btn-sm" onClick={connect} disabled={connecting}>
              {connecting ? 'Connecting…' : 'Connect Lace'}
            </button>
          )}
        </div>
      </header>

      <main id="top">
        <section className="hero">
          <div className="wrap hero-copy">
            <p className="eyebrow">Private picks for classes, dorms and teams</p>
            <h1>
              Say it only if it's <em>mutual.</em>
            </h1>
            <p className="lead">
              Pick the people you would say yes to. If they pick you too, you both find out. If they don't, nobody ever knows
              you asked.
            </p>
            <div className="cta-row">
              <button className="btn btn-red" onClick={() => goToApp('group')}>Open the app</button>
              <button className="btn btn-line" onClick={() => scrollToId('how')}>How it works</button>
            </div>
          </div>
          <figure className="hero-art">
            <img src="/img/hero.webp" alt="Two people each holding out a sealed envelope towards the other" />
          </figure>
        </section>

        <section className="scenes" id="why">
          <div className="wrap">
            <div className="head reveal">
              <p className="eyebrow">Why it exists</p>
              <h2>The things nobody says first</h2>
              <p className="lead">Going first costs too much, so everybody waits. Candor removes the first move.</p>
            </div>
            <div className="scene-grid">
              {scenes.map((s) => (
                <article className="scene reveal" key={s.img}>
                  <img src={s.img} alt="" loading="lazy" />
                  <h3>{s.quote}</h3>
                  <p>{s.text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="outcomes">
          <div className="wrap outcome-grid">
            <article className="outcome reveal">
              <img src="/img/match.webp" alt="Two envelopes opening at the same moment" loading="lazy" />
              <p className="eyebrow red">If it's mutual</p>
              <h3>Both seals break at once</h3>
              <p>You both see the match, at the same time, with no one having gone first.</p>
            </article>
            <article className="outcome reveal">
              <img src="/img/sealed.webp" alt="A sealed envelope resting on a desk" loading="lazy" />
              <p className="eyebrow">If it's not</p>
              <h3>The envelope stays sealed</h3>
              <p>Nothing happens. They never learn they were picked, and nobody else ever will.</p>
            </article>
          </div>
        </section>

        <section className="how" id="how">
          <div className="wrap">
            <div className="head reveal">
              <p className="eyebrow">How it works</p>
              <h2>Four steps, no first move</h2>
            </div>
            <ol className="steps">
              {steps.map(([n, title, text]) => (
                <li className="reveal" key={n}>
                  <span className="num">{n}</span>
                  <h3>{title}</h3>
                  <p>{text}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="proofs">
          <div className="wrap">
            <div className="head reveal">
              <p className="eyebrow">Built on Midnight</p>
              <h2>Prove it, don't promise it</h2>
              <p className="lead">Web2 versions of this ask you to trust a server that sees every choice. Candor has no such server.</p>
            </div>
            <div className="proof-grid">
              {proofs.map(([icon, title, text]) => (
                <article className="proof reveal" key={title}>
                  <Ico id={icon} className="proof-ico" />
                  <h3>{title}</h3>
                  <p>{text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {connectError && (
          <div className="wrap">
            <div className="banner err">{connectError}</div>
          </div>
        )}

        <MutualApp session={session} connecting={connecting} onConnect={connect} secret={secret} tab={tab} setTab={setTab} />

        <section className="closing">
          <div className="wrap closing-in">
            <div className="reveal">
              <h2>Start with your people</h2>
              <p className="lead">
                Create a group for your class, dorm or team, send each person a one-time invite link, and let everyone pick in
                private.
              </p>
              <div className="cta-row">
                <button className="btn btn-red" onClick={() => goToApp('host')}>Start a group</button>
                {DEMO_GROUP && (
                  <a className="btn btn-line" href={`?group=${DEMO_GROUP}`}>Try the demo group</a>
                )}
              </div>
            </div>
            <img className="closing-art reveal" src="/img/closing.webp" alt="Students hanging out on campus steps" loading="lazy" />
          </div>
        </section>
      </main>

      <footer className="foot">
        <div className="wrap foot-in">
          <img src="/img/candor-logo.svg" alt="Candor" height="28" />
          <p>Say it only if it's mutual. Proven on Midnight, known only to the two of you.</p>
          <nav aria-label="Footer">
            <a href={REPO_URL} target="_blank" rel="noreferrer">GitHub</a>
            <a href={`${REPO_URL}/blob/main/docs/USAGE.md`} target="_blank" rel="noreferrer">Usage guide</a>
            <a href="https://midnight.network" target="_blank" rel="noreferrer">Midnight</a>
          </nav>
          <small>© 2026 Candor · Built for Rise In × Midnight, New Moon to Full</small>
        </div>
      </footer>
    </>
  );
}
