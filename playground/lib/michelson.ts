import { TEZOS_EXPLORER } from './network';

export const TEZLINK_MICHELSON_RPC = 'https://michelson.previewnet.tezosx.nomadic-labs.com';

/** Michelson counter: parameter (or (or (int %decrement) (int %increment)) (unit %reset)); storage int. */
export const MICHELSON_COUNTER_ADDRESS =
  process.env.NEXT_PUBLIC_MICHELSON_COUNTER_ADDRESS ?? 'KT1HL4Scn5Ry8H6QEE2uYV7tcnc1CsEj6wgS';

export async function readMichelsonCounter(): Promise<bigint> {
  const res = await fetch(
    `${TEZLINK_MICHELSON_RPC}/chains/main/blocks/head/context/contracts/${MICHELSON_COUNTER_ADDRESS}/storage`,
  );
  if (!res.ok) throw new Error(`storage read failed (${res.status})`);
  const json = (await res.json()) as { int?: string };
  return BigInt(json.int ?? '0');
}

export function tezosOperationUrl(hash: string): string {
  return `${TEZOS_EXPLORER}/${hash}`;
}
