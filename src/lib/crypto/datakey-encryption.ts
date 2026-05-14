import type { Address } from 'viem'

export interface EIP712Domain {
  name: string
  version: string
  chainId: number
  verifyingContract: Address
}

export const EIP712_DOMAIN: EIP712Domain = {
  name: 'PromptVault',
  version: '1',
  chainId: 1315,
  verifyingContract: '0x0000000000000000000000000000000000000001',
} as const

export const EIP712_TYPES = {
  EncryptDataKey: [
    { name: 'wallet', type: 'address' },
    { name: 'purpose', type: 'string' },
    { name: 'version', type: 'uint256' },
  ],
} as const

export const EIP712_PRIMARY_TYPE = 'EncryptDataKey' as const

export function buildEIP712Domain(chainId: number): EIP712Domain {
  return {
    name: EIP712_DOMAIN.name,
    version: EIP712_DOMAIN.version,
    chainId,
    verifyingContract: EIP712_DOMAIN.verifyingContract,
  }
}

export interface EncryptedDataKeyV1 {
  v: 1
  ciphertext: string
  iv: string
  walletAddress: string
}

export interface EncryptedDataKeyV2 {
  v: 2
  ciphertext: string
  iv: string
  walletAddress: string
  eip712Domain: {
    chainId: number
    verifyingContract: string
  }
}

export type EncryptedDataKey = EncryptedDataKeyV1 | EncryptedDataKeyV2

const V1_SIGNATURE_MESSAGE =
  'PromptVault: Enable encrypted data key recovery for your vaults.\n\nThis signature allows you to recover your data keys using this wallet.\nIt does not grant access to your vault content — a valid license token is still required.'

const V2_SALT_PREFIX = 'promptvault-datakey-v2'
const V1_SALT_PREFIX = 'promptvault-datakey-v1'
const PBKDF2_ITERATIONS = 100000

export { V1_SIGNATURE_MESSAGE }

export type SignTypedDataFn = (params: {
  domain: EIP712Domain
  types: typeof EIP712_TYPES
  primaryType: 'EncryptDataKey'
  message: { wallet: Address; purpose: string; version: bigint }
}) => Promise<`0x${string}`>

export type SignMessageFn = (message: string) => Promise<string>

export function buildEIP712Message(walletAddress: string): { wallet: Address; purpose: string; version: bigint } {
  return {
    wallet: walletAddress.toLowerCase() as Address,
    purpose: 'Enable encrypted data key recovery for your vaults',
    version: BigInt(1),
  }
}

export async function encryptDataKeyForWallet(
  dataKey: Uint8Array,
  walletAddress: string,
  signTypedDataFn: SignTypedDataFn,
  signMessageFn?: SignMessageFn,
  chainId: number = EIP712_DOMAIN.chainId,
): Promise<EncryptedDataKey> {
  try {
    const message = buildEIP712Message(walletAddress)
    const domain = buildEIP712Domain(chainId)
    const signature = await signTypedDataFn({
      domain,
      types: EIP712_TYPES,
      primaryType: EIP712_PRIMARY_TYPE,
      message,
    })

    const aesKey = await deriveAesKeyFromEIP712Signature(signature, walletAddress)
    const iv = new Uint8Array(12)
    crypto.getRandomValues(iv)
    const ciphertext = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: iv.buffer as ArrayBuffer },
      aesKey,
      dataKey.buffer as ArrayBuffer,
    )

    return {
      v: 2,
      ciphertext: arrayBufferToBase64(ciphertext),
      iv: arrayBufferToBase64(iv.buffer as ArrayBuffer),
      walletAddress: walletAddress.toLowerCase(),
      eip712Domain: {
        chainId: domain.chainId,
        verifyingContract: domain.verifyingContract,
      },
    }
  } catch (eip712Err) {
    if (!signMessageFn) {
      throw eip712Err
    }
    const errMsg = eip712Err instanceof Error ? eip712Err.message.toLowerCase() : ''
    const isMethodNotSupported =
      errMsg.includes('not supported') ||
      errMsg.includes('not found') ||
      errMsg.includes('not implemented') ||
      errMsg.includes('method') ||
      errMsg.includes('unsupported') ||
      errMsg.includes('wallet')
    if (!isMethodNotSupported) {
      throw eip712Err
    }

    const signature = await signMessageFn(V1_SIGNATURE_MESSAGE)
    const aesKey = await deriveAesKeyFromPersonalSign(signature, walletAddress)
    const iv = new Uint8Array(12)
    crypto.getRandomValues(iv)
    const ciphertext = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: iv.buffer as ArrayBuffer },
      aesKey,
      dataKey.buffer as ArrayBuffer,
    )

    return {
      v: 1,
      ciphertext: arrayBufferToBase64(ciphertext),
      iv: arrayBufferToBase64(iv.buffer as ArrayBuffer),
      walletAddress: walletAddress.toLowerCase(),
    }
  }
}

export async function decryptDataKeyForWallet(
  encrypted: EncryptedDataKey,
  signTypedDataFn: SignTypedDataFn,
  signMessageFn?: SignMessageFn,
): Promise<Uint8Array> {
  if (encrypted.v === 2) {
    return decryptDataKeyV2(encrypted, signTypedDataFn)
  }

  if (encrypted.v === 1) {
    if (!signMessageFn) {
      throw new Error('signMessageFn is required for v1 backward compatibility')
    }
    return decryptDataKeyV1(encrypted as EncryptedDataKeyV1, signMessageFn)
  }

  throw new Error(`Unsupported EncryptedDataKey version: ${(encrypted as any).v}`)
}

async function decryptDataKeyV2(
  encrypted: EncryptedDataKeyV2,
  signTypedDataFn: SignTypedDataFn,
): Promise<Uint8Array> {
  const message = buildEIP712Message(encrypted.walletAddress)
  const domain = buildEIP712Domain(encrypted.eip712Domain.chainId)
  const signature = await signTypedDataFn({
    domain,
    types: EIP712_TYPES,
    primaryType: EIP712_PRIMARY_TYPE,
    message,
  })

  const aesKey = await deriveAesKeyFromEIP712Signature(signature, encrypted.walletAddress)
  const ciphertext = base64ToArrayBuffer(encrypted.ciphertext)
  const iv = base64ToArrayBuffer(encrypted.iv)
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    aesKey,
    ciphertext,
  )
  return new Uint8Array(decrypted)
}

async function decryptDataKeyV1(
  encrypted: EncryptedDataKeyV1,
  signMessageFn: SignMessageFn,
): Promise<Uint8Array> {
  const signature = await signMessageFn(V1_SIGNATURE_MESSAGE)
  const aesKey = await deriveAesKeyFromPersonalSign(signature, encrypted.walletAddress)
  const ciphertext = base64ToArrayBuffer(encrypted.ciphertext)
  const iv = base64ToArrayBuffer(encrypted.iv)
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    aesKey,
    ciphertext,
  )
  return new Uint8Array(decrypted)
}

async function deriveAesKeyFromEIP712Signature(
  signature: `0x${string}`,
  walletAddress: string,
): Promise<CryptoKey> {
  const encoder = new TextEncoder()
  const salt = encoder.encode(`${V2_SALT_PREFIX}-${walletAddress.toLowerCase()}`)
  const signatureBytes = hexToBytes(signature.replace('0x', ''))
  const hash = await crypto.subtle.digest('SHA-256', signatureBytes)
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    hash,
    'PBKDF2',
    false,
    ['deriveKey'],
  )
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  )
}

async function deriveAesKeyFromPersonalSign(
  signature: string,
  walletAddress: string,
): Promise<CryptoKey> {
  const encoder = new TextEncoder()
  const salt = encoder.encode(`${V1_SALT_PREFIX}-${walletAddress.toLowerCase()}`)
  const signatureBytes = hexToBytes(signature.replace('0x', ''))
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    signatureBytes,
    'PBKDF2',
    false,
    ['deriveKey'],
  )
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  )
}

function hexToBytes(hex: string): Uint8Array<ArrayBuffer> {
  const clean = hex.startsWith('0x') ? hex.slice(2) : hex
  if (clean.length === 0 || clean.length % 2 !== 0 || !/^[0-9a-fA-F]+$/.test(clean)) {
    throw new Error(`Invalid hex string: length=${clean.length}`)
  }
  const bytes = new Uint8Array(clean.length / 2) as Uint8Array<ArrayBuffer>
  for (let i = 0; i < clean.length; i += 2) {
    bytes[i / 2] = parseInt(clean.substr(i, 2), 16)
  }
  return bytes
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes.buffer as ArrayBuffer
}
