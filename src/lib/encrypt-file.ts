const FILE_ENCRYPTION_ALGO = 'AES-GCM'
const FILE_KEY_LENGTH = 256
const FILE_IV_LENGTH = 12
const CHUNK_SIZE = 1024 * 1024

export interface EncryptedFile {
  iv: string
  chunks: EncryptedChunk[]
  originalName: string
  originalType: string
  originalSize: number
}

export interface EncryptedChunk {
  iv: string
  ciphertext: string
}

export async function encryptFile(
  file: File,
  dataKey: Uint8Array,
): Promise<{ encrypted: EncryptedFile; encryptedBlob: Blob }> {
  const masterIv = crypto.getRandomValues(new Uint8Array(FILE_IV_LENGTH))
  const chunks: EncryptedChunk[] = []
  const encryptedParts: ArrayBuffer[] = []

  const aesKey = await crypto.subtle.importKey(
    'raw',
    dataKey.buffer as ArrayBuffer,
    { name: FILE_ENCRYPTION_ALGO },
    false,
    ['encrypt'],
  )

  const buffer = await file.arrayBuffer()
  const bytes = new Uint8Array(buffer)
  let offset = 0
  let chunkIndex = 0

  while (offset < bytes.length) {
    const end = Math.min(offset + CHUNK_SIZE, bytes.length)
    const chunk = bytes.slice(offset, end)

    const chunkIv = new Uint8Array(FILE_IV_LENGTH)
    for (let i = 0; i < FILE_IV_LENGTH; i++) {
      chunkIv[i] = masterIv[i] ^ (chunkIndex & 0xff)
    }
    chunkIv[FILE_IV_LENGTH - 1] ^= (chunkIndex >> 8) & 0xff

    const ciphertext = await crypto.subtle.encrypt(
      { name: FILE_ENCRYPTION_ALGO, iv: chunkIv.buffer as ArrayBuffer },
      aesKey,
      chunk.buffer as ArrayBuffer,
    )

    chunks.push({
      iv: arrayBufferToBase64(chunkIv.buffer as ArrayBuffer),
      ciphertext: arrayBufferToBase64(ciphertext),
    })
    encryptedParts.push(ciphertext)

    offset = end
    chunkIndex++
  }

  const encrypted: EncryptedFile = {
    iv: arrayBufferToBase64(masterIv.buffer as ArrayBuffer),
    chunks,
    originalName: file.name,
    originalType: file.type,
    originalSize: file.size,
  }

  const encryptedBlob = new Blob(encryptedParts, {
    type: 'application/octet-stream',
  })

  return { encrypted, encryptedBlob }
}

export async function decryptFileFromMeta(
  encryptedBlob: Blob,
  meta: EncryptedFile,
  dataKey: Uint8Array,
): Promise<File> {
  const aesKey = await crypto.subtle.importKey(
    'raw',
    dataKey.buffer as ArrayBuffer,
    { name: FILE_ENCRYPTION_ALGO },
    false,
    ['decrypt'],
  )

  const encryptedBytes = new Uint8Array(await encryptedBlob.arrayBuffer())
  const decryptedParts: Uint8Array[] = []
  let readOffset = 0

  for (const chunk of meta.chunks) {
    const chunkIv = base64ToArrayBuffer(chunk.iv)
    const chunkCiphertextLen = base64ToArrayBuffer(chunk.ciphertext).byteLength

    const chunkCiphertext = encryptedBytes.slice(readOffset, readOffset + chunkCiphertextLen)

    const decrypted = await crypto.subtle.decrypt(
      { name: FILE_ENCRYPTION_ALGO, iv: chunkIv },
      aesKey,
      chunkCiphertext.buffer as ArrayBuffer,
    )

    decryptedParts.push(new Uint8Array(decrypted))
    readOffset += chunkCiphertextLen
  }

  const totalLength = decryptedParts.reduce((sum, part) => sum + part.length, 0)
  const result = new Uint8Array(totalLength)
  let writeOffset = 0
  for (const part of decryptedParts) {
    result.set(part, writeOffset)
    writeOffset += part.length
  }

  return new File([result], meta.originalName, {
    type: meta.originalType,
  })
}

export async function decryptFileFromBase64(
  meta: EncryptedFile,
  dataKey: Uint8Array,
): Promise<File> {
  const aesKey = await crypto.subtle.importKey(
    'raw',
    dataKey.buffer as ArrayBuffer,
    { name: FILE_ENCRYPTION_ALGO },
    false,
    ['decrypt'],
  )

  const decryptedParts: Uint8Array[] = []

  for (const chunk of meta.chunks) {
    const chunkIv = base64ToArrayBuffer(chunk.iv)
    const chunkCiphertext = base64ToArrayBuffer(chunk.ciphertext)

    const decrypted = await crypto.subtle.decrypt(
      { name: FILE_ENCRYPTION_ALGO, iv: chunkIv },
      aesKey,
      chunkCiphertext,
    )

    decryptedParts.push(new Uint8Array(decrypted))
  }

  const totalLength = decryptedParts.reduce((sum, part) => sum + part.length, 0)
  const result = new Uint8Array(totalLength)
  let writeOffset = 0
  for (const part of decryptedParts) {
    result.set(part, writeOffset)
    writeOffset += part.length
  }

  return new File([result], meta.originalName, {
    type: meta.originalType,
  })
}

export async function uploadToIpfs(blob: Blob): Promise<string> {
  const tokenRes = await fetch('/api/lighthouse/upload', { method: 'POST' })
  if (!tokenRes.ok) {
    const err = await tokenRes.json().catch(() => ({ error: 'Failed to get upload token' }))
    throw new Error(err.error || `Token request failed with status ${tokenRes.status}`)
  }
  const { jwt } = await tokenRes.json()

  const formData = new FormData()
  formData.append('file', blob, 'encrypted.bin')

  const res = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
    method: 'POST',
    headers: { Authorization: `Bearer ${jwt}` },
    body: formData,
  })

  if (!res.ok) {
    const errText = await res.text().catch(() => '')
    throw new Error(`Pinata upload failed (${res.status}): ${errText}`)
  }

  const data = await res.json()
  return data.IpfsHash as string
}

export async function fetchFromIpfs(cid: string): Promise<Blob> {
  const response = await fetch(`https://gateway.pinata.cloud/ipfs/${cid}`)
  if (!response.ok) {
    throw new Error(`Failed to fetch from IPFS: ${response.status}`)
  }
  return response.blob()
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
