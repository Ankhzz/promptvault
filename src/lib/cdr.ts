import { encodeAbiParameters } from 'viem';
import { CONTRACTS } from './constants';

export const CDR_CONDITIONS = {
  writeCondition: CONTRACTS.OWNER_WRITE_CONDITION,
  readCondition: CONTRACTS.LICENSE_READ_CONDITION,
  licenseToken: CONTRACTS.LICENSE_TOKEN,
} as const;

export function encodeLicenseReadCondition(
  ipId: `0x${string}`
): `0x${string}` {
  return encodeAbiParameters(
    [{ type: 'address' }, { type: 'address' }],
    [CDR_CONDITIONS.licenseToken, ipId]
  );
}

export function encodeAccessAuxData(licenseTokenId: bigint): `0x${string}` {
  return encodeAbiParameters(
    [{ type: 'uint256[]' }],
    [[licenseTokenId]]
  );
}

export function encodeWriteConditionData(
  writerAddress: `0x${string}`
): `0x${string}` {
  return encodeAbiParameters([{ type: 'address' }], [writerAddress]);
}