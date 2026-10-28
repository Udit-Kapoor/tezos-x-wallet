'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { DAppClient } from '@tezos-x/octez.connect-dapp';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  MICHELSON_COUNTER_ADDRESS,
  readMichelsonCounter,
  TEZLINK_MICHELSON_RPC,
  tezosOperationUrl,
} from '@/lib/michelson';

type Entrypoint = 'increment' | 'decrement' | 'reset';
type LogEntry = { id: string; label: string; hash?: string; error?: string; at: number };

/** octez.connect dApp for the Michelson side of Tezos X previewnet: connect, drive a counter, log operations. */
export default function MichelsonPlayground() {
  const clientRef = useRef<DAppClient | null>(null);
  const [account, setAccount] = useState<{ address: string; network: string } | null>(null);
  const [counter, setCounter] = useState<bigint | null>(null);
  const [busy, setBusy] = useState<Entrypoint | 'connect' | null>(null);
  const [log, setLog] = useState<LogEntry[]>([]);

  const client = useCallback(async () => {
    if (clientRef.current) return clientRef.current;
    const { DAppClient, NetworkType } = await import('@tezos-x/octez.connect-dapp');
    const projectId = process.env.NEXT_PUBLIC_WC_PROJECT_ID;
    clientRef.current = new DAppClient({
      name: 'Tezos X Michelson Playground',
      network: { type: NetworkType.TEZOSX_PREVIEWNET, rpcUrl: TEZLINK_MICHELSON_RPC },
      ...(projectId ? { walletConnectOptions: { projectId } } : {}),
    });
    return clientRef.current;
  }, []);

  const refresh = useCallback(async () => {
    try {
      setCounter(await readMichelsonCounter());
    } catch {
      setCounter(null);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const timer = setInterval(() => void refresh(), 5000);
    void client().then(async (c) => {
      const active = await c.getActiveAccount();
      if (active) setAccount({ address: active.address, network: active.network.type });
    });
    return () => clearInterval(timer);
  }, [client, refresh]);

  const connect = async () => {
    setBusy('connect');
    try {
      const c = await client();
      const permissions = await c.requestPermissions();
      setAccount({ address: permissions.address, network: permissions.network?.type ?? 'unknown' });
    } catch (error) {
      setLog((prev) => [...prev, { id: `${Date.now()}`, label: 'connect', error: String((error as Error)?.message ?? error), at: Date.now() }]);
    } finally {
      setBusy(null);
    }
  };

  const disconnect = async () => {
    const c = await client();
    await c.clearActiveAccount();
    setAccount(null);
  };

  const call = async (entrypoint: Entrypoint) => {
    setBusy(entrypoint);
    const value = entrypoint === 'reset' ? { prim: 'Unit' } : { int: '1' };
    try {
      const c = await client();
      const { transactionHash } = await c.requestOperation({
        operationDetails: [
          {
            kind: 'transaction' as never,
            amount: '0',
            destination: MICHELSON_COUNTER_ADDRESS,
            parameters: { entrypoint, value },
          } as never,
        ],
      });
      setLog((prev) => [...prev, { id: transactionHash, label: entrypoint, hash: transactionHash, at: Date.now() }]);
    } catch (error) {
      setLog((prev) => [...prev, { id: `${Date.now()}`, label: entrypoint, error: String((error as Error)?.message ?? error), at: Date.now() }]);
    } finally {
      setBusy(null);
      void refresh();
    }
  };

  return (
    <main className="mx-auto flex max-w-4xl flex-col gap-6 px-6 py-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="gradient-text text-lg font-bold tracking-tight">Tezos X — Michelson side</h1>
          <p className="section-label mt-0.5">octez.connect playground · previewnet</p>
        </div>
        <Link href="/" className="text-xs underline" style={{ color: 'var(--color-muted)' }}>
          ← EVM playground
        </Link>
      </div>

      <Card className="flex flex-col gap-3 p-6">
        <p className="section-label">Wallet</p>
        {account ? (
          <>
            <p className="text-sm">Connected via octez.connect ({account.network})</p>
            <p className="font-mono text-sm" data-testid="michelson-account">{account.address}</p>
            <p className="text-xs" style={{ color: 'var(--color-muted)' }}>
              {account.address.startsWith('KT1')
                ? 'KT1: the Tezos alias of an EVM account — Bento signs with the EVM key through the NAC precompile.'
                : 'Implicit account: Bento signs natively on the Michelson runtime.'}
            </p>
            <Button variant="outline" onClick={() => void disconnect()}>Disconnect</Button>
          </>
        ) : (
          <Button onClick={() => void connect()} disabled={busy === 'connect'}>
            {busy === 'connect' ? 'Connecting…' : 'Connect wallet (octez.connect)'}
          </Button>
        )}
      </Card>

      <Card className="flex flex-col gap-3 p-6">
        <p className="section-label">Counter contract</p>
        <p className="font-mono text-xs">{MICHELSON_COUNTER_ADDRESS}</p>
        <p className="text-4xl font-bold" data-testid="michelson-counter">{counter?.toString() ?? '—'}</p>
        <div className="grid grid-cols-3 gap-3">
          {(['increment', 'decrement', 'reset'] as const).map((entrypoint) => (
            <Button key={entrypoint} disabled={!account || busy !== null} onClick={() => void call(entrypoint)}>
              {busy === entrypoint ? '…' : entrypoint[0].toUpperCase() + entrypoint.slice(1)}
            </Button>
          ))}
        </div>
      </Card>

      <Card className="flex flex-col gap-2 p-6">
        <p className="section-label">Operation log</p>
        {log.length === 0 ? <p className="text-xs">No operations yet</p> : null}
        {[...log].reverse().map((entry) => (
          <p key={entry.id} className="font-mono text-xs" data-testid="michelson-log-entry">
            {new Date(entry.at).toLocaleTimeString()} · {entry.label} ·{' '}
            {entry.hash ? (
              <a href={tezosOperationUrl(entry.hash)} target="_blank" rel="noreferrer" className="underline">{entry.hash}</a>
            ) : (
              <span style={{ color: 'var(--color-red, #f35)' }}>{entry.error}</span>
            )}
          </p>
        ))}
      </Card>
    </main>
  );
}
