# Using Candor

Candor lets a verified group (a class, a dorm, a team) say one thing privately: *I would say yes to you.* A pick opens only when it is mutual. If it is not returned, nobody learns it was ever made, including the person who was picked.

This guide walks through the app at **https://candor-mutual.vercel.app** on Midnight Preprod.

## Before you start

You need three things once per machine:

1. **Lace wallet** in Chrome, with Midnight switched to **Preprod** (Settings → Network).
2. **tDUST for fees.** Get tNIGHT from the [Preprod faucet](https://faucet.preprod.midnight.network/), then turn on tDUST generation in Lace and wait until the balance is above zero.
3. **A local proof server** on port 6300. Proofs are generated on your own machine, so your secret key never leaves it.

   ```bash
   docker run -d --name midnight-proof -p 6300:6300 midnightntwrk/proof-server:8.1.0 midnight-proof-server -v
   ```

   In Lace, open **Settings → Midnight → Proof Server** and choose **Local (http://localhost:6300)**.

Reading a group (members, pick count, match count) needs none of this. Only writing does.

## Your identity

The first time you open the app, your browser creates a random secret key and keeps it in local storage. Your public key is derived from it and is what the group sees next to your display name.

- The secret key is **never sent anywhere**. It is used only as a private input to the zero-knowledge proofs.
- If you clear your browser storage you lose the identity, and with it the ability to see your matches in that group.
- The wallet pays fees. It is not your identity, so two members can share one wallet without sharing picks.

## As a host

1. Open the **Host** tab and type a group name, for example `Dorm B Fall 2026`.
2. Click **Create**. Lace asks you to sign a deploy transaction. When it lands, the page moves to `?group=<address>`. That address is your group.
3. Choose how many invites you need and click **Issue**. Each invite is one transaction and one single-use code. Only a hash of the code goes on-chain.
4. Click **Copy link** next to each code and send one link to one person. A link looks like `https://candor-mutual.vercel.app/?group=<address>&invite=<code>`.
5. When the round is over, click **Close round**. Joins and picks stop. Matches that already opened stay visible to their pairs.

Only the browser that created the group holds the host key. Invites and closing the round are rejected from anywhere else.

## As a member

1. Open the invite link. The group address and invite code are filled in for you.
2. In the **Group** tab, enter a display name and click **Join**. Lace asks you to sign. The invite is consumed and cannot be used again.
3. The member list appears. Click **Pick** next to anyone you would say yes to, then **Seal pick** to confirm. Lace asks you to sign.
4. Open the **Matches** tab at any time. A match shows up the moment the other person picks you too.

What you can count on:

- **A one-sided pick leaves no readable trace.** The chain stores a tag that only the two people in a pair can compute. Nobody else can link it to either of you.
- **No double picks, no self picks.** A nullifier derived from your secret key blocks a second pick of the same person. The circuit refuses a pick of your own key.
- **Only members can pick.** Every pick carries a proof of membership in the group's Merkle tree, without revealing which member you are.

## Checking on-chain

Every group is a contract on Preprod. You can read its actions straight from the public indexer:

```bash
curl -s https://indexer.preprod.midnight.network/api/v4/graphql -H 'content-type: application/json' \
  -d '{"query":"{ contractAction(address: \"<group address>\") { __typename transaction { hash block { height } } } }"}'
```

## Troubleshooting

| Symptom | Fix |
| --- | --- |
| "Lace wallet not found" | Install Lace, enable Midnight, reload the page. |
| "Lace is on mainnet" or another network | Switch Midnight to Preprod in Lace settings. |
| Proving fails or hangs | Check that `docker ps` shows the proof server on port 6300 and that Lace's proof server is set to Local. |
| Fee error or "not enough dust" | Wait for tDUST generation in Lace, or request more tNIGHT from the faucet. |
| "invite code is not valid or was already used" | Each code works once. Ask the host for a new invite. |
| "you have already picked this person" | Your earlier pick is still sealed. Nothing more to do. |
| Matches tab is empty on a new device | Picks and matches belong to the secret key in your original browser. |
