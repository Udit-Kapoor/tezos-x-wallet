# Tezos X Playground

A Next.js dApp for manually testing the Tezos X wallets against previewnet:
connect a wallet, check chain id and balance, drive the Counter contract, and
send native transfers.

## Run

```bash
npm install
npm run dev            # http://localhost:3000
```

## Connecting a wallet

- **Chrome extension** (`@tezosx/wallet`): discovered via EIP-6963 / injected
  `window.ethereum` — it appears in the wallet list automatically.
- **Mobile wallet** (`@tezosx/wallet-mobile`): connects over WalletConnect v2.
  Copy `.env.example` to `.env.local` and set `NEXT_PUBLIC_WC_PROJECT_ID`
  (restart `next dev` after changing it — the value is inlined at build time).
  Then pick "Tezos X Mobile (WalletConnect)" in the wallet list and scan the QR
  from the mobile app (Connections → scan), or copy the `wc:` URI and paste it
  into the app's connect sheet. The wallet must be unlocked before pairing.

## Network

Everything targets Tezos X previewnet: EVM chain id `0x1f440` (128064), RPC
`https://evm.previewnet.tezosx.nomadic-labs.com`. The Counter contract lives at
`0x525982C267F4B93cCB075B9323B069A993a9DEd7`.

Note: a transaction sent from a Tezos (tz1) account routes cross-runtime
through the NAC gateway, and the hash returned to the dApp is a synthetic one
the public RPC never indexes. Verify outcomes by re-reading state (the counter
value, balances) rather than by looking the hash up in an explorer; allow
~15-40 s for the cross-runtime path to land.

## Michelson page (`/michelson`)

An octez.connect dApp for the Michelson side: connect over WalletConnect on
`tezosx-previewnet`, then call a Michelson counter (`increment`, `decrement`,
`reset`). The counter is `KT1HL4Scn5Ry8H6QEE2uYV7tcnc1CsEj6wgS`
(`parameter (or (or (int %decrement) (int %increment)) (unit %reset)); storage int`);
override it with `NEXT_PUBLIC_MICHELSON_COUNTER_ADDRESS`.

**octez.connect 5.0.4 cannot finish a WalletConnect connection on previewnet
as published.** `TEZOS_NETWORK_GENESIS_IDS` in
`@tezos-x/octez.connect-core/dist/{esm,cjs}/src/utils/caip2.js` has no
`TEZOSX_PREVIEWNET` entry, so the permission fan-out drops the chain and the
dApp waits forever after the wallet approves. Until it is fixed upstream,
`patches/@tezos-x+octez.connect-core+5.0.4.patch` adds
`[NetworkType.TEZOSX_PREVIEWNET]: 'NetXY2oPPzkxUW1'` to both files, applied by
`patch-package` on `postinstall` (so a Vercel build picks it up too). Drop the
patch once octez.connect ships the entry; a version bump fails the install
until you do.

The EVM Counter (`/`) was redeployed after a previewnet reset; set
`NEXT_PUBLIC_COUNTER_ADDRESS` to the current one.
