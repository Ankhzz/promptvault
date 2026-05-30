'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { AppShell } from '@/components/AppShell'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { useToast } from '@/components/ui/Toast'
import { ShieldIcon, LockIcon, ArrowRightIcon, CheckIcon, FileIcon, ClockIcon, PricetagIcon } from '@/components/Icons'
import { AuthGuard } from '@/components/AuthGuard'
import { usePrivy, useWallets } from '@privy-io/react-auth'
import { STORY_CHAIN, CONTRACTS, CDR_CONFIG, getCometRpcUrl } from '@/lib/constants'
import { toBigIntSafe } from '@/lib/math'
import { CDR_CONDITIONS, encodeLicenseReadCondition, encodeWriteConditionData, encodeTimeLockReadCondition } from '@/lib/cdr'
import { initWasm, CDRClient } from '@piplabs/cdr-sdk'
import { createPublicClient, createWalletClient, custom, http, type Address, toHex } from 'viem'
import { custom as viemCustom, type Account } from 'viem'
import { StoryClient, PILFlavor } from '@story-protocol/core-sdk'
import { createVaultRecord } from '@/db/queries'
import { parseTxError } from '@/lib/parseTxError'
import {
  encryptDataKeyForWallet,
  EIP712_DOMAIN,
  EIP712_TYPES,
  EIP712_PRIMARY_TYPE,
  buildEIP712Message,
} from '@/lib/crypto/datakey-encryption'
import { encryptFile, uploadToIpfs, type EncryptedFile } from '@/lib/encrypt-file'

type Step = 'idle' | 'register' | 'mint' | 'upload' | 'encrypt_file' | 'encrypt_key' | 'persist' | 'done'
type VaultType = 'licensed' | 'private' | 'timelocked'

interface StepResult {
  ipId?: Address
  licenseTermsId?: number
  licenseTokenId?: bigint
  vaultUuid?: number
  ipfsCid?: string
  txHashes?: string[]
  dbPersisted?: boolean
  encryptedFileMeta?: string
  encryptedDataKeyJson?: string
  dataKeyEncryptionMetaJson?: string
  allocateTxHash?: string
  writeTxHash?: string
  registerTxHash?: string
  mintTxHash?: string
}

export default function CreateVaultPage() {
  const { authenticated, login } = usePrivy()
  const { wallets } = useWallets()
  const { addToast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const isRunningRef = useRef(false)
  const retryingRef = useRef(false)

  const [step, setStep] = useState<Step>('idle')
  const [result, setResult] = useState<StepResult>({})
  const [retrying, setRetrying] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [vaultType, setVaultType] = useState<VaultType>('licensed')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [unlockTime, setUnlockTime] = useState('')
  const [priceMusdc, setPriceMusdc] = useState('')
  const [wasmReady, setWasmReady] = useState(false)
  const [wasmError, setWasmError] = useState(false)

  useEffect(() => {
    initWasm()
      .then(() => setWasmReady(true))
      .catch(() => setWasmError(true))
  }, [])

  const getClients = useCallback(async () => {
    if (wallets.length === 0) return null
    const wallet = wallets[0]
    const provider = await wallet.getEthereumProvider()
    const walletClient = createWalletClient({
      transport: custom(provider),
      account: wallet.address as Address,
    })
    const publicClient = createPublicClient({ transport: http(STORY_CHAIN.rpcUrl) })
    const storyClient = StoryClient.newClient({
      account: walletClient.account as Account,
      transport: viemCustom(walletClient.transport),
      chainId: 'aeneid',
    })
    return { walletClient, publicClient, storyClient, address: wallet.address as Address }
  }, [wallets])

  const persistVault = useCallback(async (params: {
    uuid: number
    ownerAddress: Address
    ipId?: Address
    licenseTermsId?: number
    licenseTokenId?: string
    ipfsCid?: string
    encryptedFileMeta?: string
    encryptedDataKey: Awaited<ReturnType<typeof encryptDataKeyForWallet>>
    allocateTxHash: string
    writeTxHash: string
    registerTxHash?: string
    mintTxHash?: string
    unlockTime?: Date
    vaultType: VaultType
    priceMusdc?: string
  }) => {
    setStep('persist')
    addToast({ title: 'Saving vault record...', variant: 'default' })

    try {
      await createVaultRecord({
        uuid: params.uuid,
        ownerAddress: params.ownerAddress,
        name: name.trim(),
        description: description.trim() || undefined,
        vaultType: params.vaultType,
        ipId: params.ipId,
        licenseTermsId: params.licenseTermsId,
        licenseTokenId: params.licenseTokenId,
        ipfsCid: params.ipfsCid,
        encryptedFileMeta: params.encryptedFileMeta,
        encryptedDataKey: JSON.stringify(params.encryptedDataKey),
        dataKeyEncryptionMeta: JSON.stringify({ version: 2, eip712: true }),
        allocateTxHash: params.allocateTxHash,
        writeTxHash: params.writeTxHash,
        registerTxHash: params.registerTxHash,
        mintTxHash: params.mintTxHash,
        unlockTime: params.unlockTime,
        priceMusdc: params.priceMusdc,
      })
      setResult(prev => ({ ...prev, dbPersisted: true }))
    } catch (dbErr) {
      setResult(prev => ({ ...prev, dbPersisted: false }))
      addToast({
        title: 'DB save failed',
        description: 'Vault is on-chain but local record failed. You can retry from dashboard.',
        variant: 'warning',
      })
    }

    setStep('done')
    isRunningRef.current = false
    addToast({ title: 'Vault created!', description: `UUID: ${params.uuid}`, variant: 'accent' })
  }, [name, description, addToast])

  const runLicensedFlow = useCallback(async (
    clients: NonNullable<Awaited<ReturnType<typeof getClients>>>,
    txHashes: string[],
    _ipfsCid: string | undefined,
    _encryptedFileMeta: string | undefined,
    vaultType: VaultType,
  ) => {
    setStep('register')
    addToast({ title: 'Registering IP Asset...', variant: 'default' })

    const ipResult = await clients.storyClient.ipAsset.registerIpAsset({
      nft: { type: 'mint', spgNftContract: CONTRACTS.SPG_NFT_CONTRACT },
      licenseTermsData: [{ terms: PILFlavor.nonCommercialSocialRemixing() }],
      ipMetadata: {
        ipMetadataURI: `https://promptvault.xyz/metadata/${name.trim().toLowerCase().replace(/\s+/g, '-')}`,
        ipMetadataHash: `0x${'ab'.repeat(32)}` as `0x${string}`,
        nftMetadataURI: `https://promptvault.xyz/nft/${name.trim().toLowerCase().replace(/\s+/g, '-')}`,
        nftMetadataHash: `0x${'cd'.repeat(32)}` as `0x${string}`,
      },
    })

    const ipId = ipResult.ipId as Address
    const licenseTermsId = Number(ipResult.licenseTermsIds?.[0])
    txHashes.push(ipResult.txHash!)
    setResult(prev => ({ ...prev, ipId, licenseTermsId }))

    setStep('mint')
    addToast({ title: 'Minting license token...', variant: 'default' })

    const licResult = await clients.storyClient.license.mintLicenseTokens({
      licensorIpId: ipId,
      licenseTermsId,
      amount: 1,
    })

    const licenseTokenId = licResult.licenseTokenIds?.[0]
    txHashes.push(licResult.txHash!)
    setResult(prev => ({ ...prev, licenseTokenId }))

  setStep('upload')
  addToast({ title: 'Encrypting & uploading vault...', variant: 'default' })

  const cdrClient = new CDRClient({
      network: CDR_CONFIG.network,
      publicClient: clients.publicClient,
      walletClient: clients.walletClient,
      cometRpcUrl: getCometRpcUrl(),
      validationRpcUrls: [CDR_CONFIG.validationRpcUrl],
    })

    const globalPubKey = await cdrClient.observer.getGlobalPubKey()
    const dataKey = crypto.getRandomValues(new Uint8Array(32))

    const readConditionData = encodeLicenseReadCondition(ipId)
    const writeConditionData = encodeWriteConditionData(clients.address)

    const uploadResult = await cdrClient.uploader.uploadCDR({
      dataKey,
      globalPubKey,
      updatable: false,
      writeConditionAddr: CDR_CONDITIONS.writeCondition,
      readConditionAddr: CDR_CONDITIONS.readCondition,
      writeConditionData,
      readConditionData,
      accessAuxData: '0x',
    })

    txHashes.push(uploadResult.txHashes.allocate)
    txHashes.push(uploadResult.txHashes.write)

    let ipfsCid: string | undefined
    let encryptedFileMeta: string | undefined

    if (selectedFile) {
      setStep('encrypt_file')
      addToast({ title: 'Encrypting file & uploading to IPFS...', variant: 'default' })

      const { encrypted, encryptedBlob } = await encryptFile(selectedFile, dataKey)
      encryptedFileMeta = JSON.stringify(encrypted)

      ipfsCid = await uploadToIpfs(encryptedBlob)
      setResult(prev => ({ ...prev, ipfsCid, encryptedFileMeta }))
    }

    setStep('encrypt_key')
    addToast({ title: 'Encrypting data key for wallet...', variant: 'default' })

    const signTypedDataFn = async (params: {
      domain: typeof EIP712_DOMAIN
      types: typeof EIP712_TYPES
      primaryType: 'EncryptDataKey'
      message: { wallet: Address; purpose: string; version: bigint }
    }) => {
      return clients.walletClient.signTypedData({
        domain: params.domain,
        types: params.types,
        primaryType: params.primaryType,
        message: params.message,
      })
    }

    const encryptedDataKey = await encryptDataKeyForWallet(
      dataKey,
      clients.address,
      signTypedDataFn,
    )

    setResult(prev => ({
      ...prev,
      vaultUuid: uploadResult.uuid,
      txHashes,
      encryptedDataKeyJson: JSON.stringify(encryptedDataKey),
      dataKeyEncryptionMetaJson: JSON.stringify({ version: 2, eip712: true }),
      allocateTxHash: uploadResult.txHashes.allocate,
      writeTxHash: uploadResult.txHashes.write,
      registerTxHash: ipResult.txHash ?? undefined,
      mintTxHash: licResult.txHash ?? undefined,
    }))

    await persistVault({
      uuid: uploadResult.uuid,
      ownerAddress: clients.address,
      ipId,
      licenseTermsId,
      licenseTokenId: licenseTokenId?.toString(),
      ipfsCid,
      encryptedFileMeta,
      encryptedDataKey,
      allocateTxHash: uploadResult.txHashes.allocate,
      writeTxHash: uploadResult.txHashes.write,
      registerTxHash: ipResult.txHash!,
      mintTxHash: licResult.txHash!,
      vaultType,
      priceMusdc: priceMusdc || undefined,
    })
  }, [name, selectedFile, priceMusdc, addToast, persistVault])

  const runTimeLockedFlow = useCallback(async (
    clients: NonNullable<Awaited<ReturnType<typeof getClients>>>,
    txHashes: string[],
    _ipfsCid: string | undefined,
    _encryptedFileMeta: string | undefined,
    vaultType: VaultType,
  ) => {
  setStep('upload')
  addToast({ title: 'Encrypting & uploading time-locked vault...', variant: 'default' })

  const cdrClient = new CDRClient({
      network: CDR_CONFIG.network,
      publicClient: clients.publicClient,
      walletClient: clients.walletClient,
      cometRpcUrl: getCometRpcUrl(),
      validationRpcUrls: [CDR_CONFIG.validationRpcUrl],
    })

    const unlockDate = new Date(unlockTime)
    const unlockTimestamp = BigInt(Math.floor(unlockDate.getTime() / 1000))

    const writeConditionData = encodeWriteConditionData(clients.address)
    const readConditionData = encodeTimeLockReadCondition(unlockTimestamp)

    const globalPubKey = await cdrClient.observer.getGlobalPubKey()
    const dataKey = crypto.getRandomValues(new Uint8Array(32))

    const uploadResult = await cdrClient.uploader.uploadCDR({
      dataKey,
      globalPubKey,
      updatable: false,
      writeConditionAddr: CDR_CONDITIONS.writeCondition,
      readConditionAddr: CONTRACTS.TIME_LOCK_READ_CONDITION,
      writeConditionData,
      readConditionData,
      accessAuxData: '0x',
    })

    txHashes.push(uploadResult.txHashes.allocate)
    txHashes.push(uploadResult.txHashes.write)

    let ipfsCid: string | undefined
    let encryptedFileMeta: string | undefined

    if (selectedFile) {
      setStep('encrypt_file')
      addToast({ title: 'Encrypting file & uploading to IPFS...', variant: 'default' })

      const { encrypted, encryptedBlob } = await encryptFile(selectedFile, dataKey)
      encryptedFileMeta = JSON.stringify(encrypted)

      ipfsCid = await uploadToIpfs(encryptedBlob)
      setResult(prev => ({ ...prev, ipfsCid, encryptedFileMeta }))
    }

    setStep('encrypt_key')
    addToast({ title: 'Encrypting data key for wallet...', variant: 'default' })

    const signTypedDataFn = async (params: {
      domain: typeof EIP712_DOMAIN
      types: typeof EIP712_TYPES
      primaryType: 'EncryptDataKey'
      message: { wallet: Address; purpose: string; version: bigint }
    }) => {
      return clients.walletClient.signTypedData({
        domain: params.domain,
        types: params.types,
        primaryType: params.primaryType,
        message: params.message,
      })
    }

    const encryptedDataKey = await encryptDataKeyForWallet(
      dataKey,
      clients.address,
      signTypedDataFn,
    )

    setResult(prev => ({
      ...prev,
      vaultUuid: uploadResult.uuid,
      txHashes,
      encryptedDataKeyJson: JSON.stringify(encryptedDataKey),
      dataKeyEncryptionMetaJson: JSON.stringify({ version: 2, eip712: true }),
      allocateTxHash: uploadResult.txHashes.allocate,
      writeTxHash: uploadResult.txHashes.write,
    }))

    await persistVault({
      uuid: uploadResult.uuid,
      ownerAddress: clients.address,
      ipfsCid,
      encryptedFileMeta,
      encryptedDataKey,
      allocateTxHash: uploadResult.txHashes.allocate,
      writeTxHash: uploadResult.txHashes.write,
      unlockTime: unlockDate,
      vaultType,
    })
  }, [selectedFile, unlockTime, addToast, persistVault])

  const runPrivateFlow = useCallback(async (
    clients: NonNullable<Awaited<ReturnType<typeof getClients>>>,
    txHashes: string[],
    _ipfsCid: string | undefined,
    _encryptedFileMeta: string | undefined,
    vaultType: VaultType,
  ) => {
  setStep('upload')
  addToast({ title: 'Encrypting & uploading private vault...', variant: 'default' })

  const cdrClient = new CDRClient({
      network: CDR_CONFIG.network,
      publicClient: clients.publicClient,
      walletClient: clients.walletClient,
      cometRpcUrl: getCometRpcUrl(),
      validationRpcUrls: [CDR_CONFIG.validationRpcUrl],
    })

    const writeConditionData = encodeWriteConditionData(clients.address)
    const readConditionData = '0x' as `0x${string}`

    const { uuid, txHash: allocateTxHash } = await cdrClient.uploader.allocate({
      updatable: false,
      writeConditionAddr: CDR_CONDITIONS.writeCondition,
      writeConditionData,
      readConditionAddr: clients.address,
      readConditionData,
      skipConditionValidation: true,
    })

    txHashes.push(allocateTxHash)

    const globalPubKey = await cdrClient.observer.getGlobalPubKey()
    const dataKey = crypto.getRandomValues(new Uint8Array(32))

    const { uuidToLabel } = await import('@piplabs/cdr-sdk')
    const ciphertext = await cdrClient.uploader.encryptDataKey({
      dataKey,
      globalPubKey,
      label: uuidToLabel(uuid),
    })

    const writeResult = await cdrClient.uploader.write({
      uuid,
      accessAuxData: '0x',
      encryptedData: toHex(ciphertext.raw),
    })

    txHashes.push(writeResult.txHash)

    let ipfsCid: string | undefined
    let encryptedFileMeta: string | undefined

    if (selectedFile) {
      setStep('encrypt_file')
      addToast({ title: 'Encrypting file & uploading to IPFS...', variant: 'default' })

      const { encrypted, encryptedBlob } = await encryptFile(selectedFile, dataKey)
      encryptedFileMeta = JSON.stringify(encrypted)

      ipfsCid = await uploadToIpfs(encryptedBlob)
      setResult(prev => ({ ...prev, ipfsCid, encryptedFileMeta }))
    }

    setStep('encrypt_key')
    addToast({ title: 'Encrypting data key for wallet...', variant: 'default' })

    const signTypedDataFn = async (params: {
      domain: typeof EIP712_DOMAIN
      types: typeof EIP712_TYPES
      primaryType: 'EncryptDataKey'
      message: { wallet: Address; purpose: string; version: bigint }
    }) => {
      return clients.walletClient.signTypedData({
        domain: params.domain,
        types: params.types,
        primaryType: params.primaryType,
        message: params.message,
      })
    }

    const encryptedDataKey = await encryptDataKeyForWallet(
      dataKey,
      clients.address,
      signTypedDataFn,
    )

    setResult(prev => ({
      ...prev,
      vaultUuid: uuid,
      txHashes,
      encryptedDataKeyJson: JSON.stringify(encryptedDataKey),
      dataKeyEncryptionMetaJson: JSON.stringify({ version: 2, eip712: true }),
      allocateTxHash: allocateTxHash as string,
      writeTxHash: writeResult.txHash,
    }))

    await persistVault({
      uuid,
      ownerAddress: clients.address,
      ipfsCid,
      encryptedFileMeta,
      encryptedDataKey,
      allocateTxHash: allocateTxHash as string,
      writeTxHash: writeResult.txHash,
      vaultType,
    })
  }, [selectedFile, addToast, persistVault])

  const runFullFlow = useCallback(async () => {
    if (isRunningRef.current) return
    if (!name.trim()) {
      addToast({ title: 'Name required', description: 'Give your vault a name', variant: 'warning' })
      return
    }

    if (vaultType === 'timelocked') {
      if (!unlockTime) {
        addToast({ title: 'Unlock time required', description: 'Set a future unlock time for the time-locked vault', variant: 'warning' })
        return
      }
      const unlockDate = new Date(unlockTime)
      if (unlockDate <= new Date()) {
        addToast({ title: 'Invalid unlock time', description: 'Unlock time must be in the future', variant: 'warning' })
        return
      }
      if (!CONTRACTS.TIME_LOCK_READ_CONDITION) {
        addToast({ title: 'Time-Lock contract not deployed', description: 'Deploy TimeLockReadCondition on Aeneid and set address in constants.ts', variant: 'destructive' })
        return
      }
    }

    if (vaultType === 'licensed' && priceMusdc && !toBigIntSafe(priceMusdc)) {
      addToast({ title: 'Invalid MUSDC price', description: 'Enter a valid number (e.g. 10 or 0.01)', variant: 'warning' })
      return
    }

    if (!selectedFile) {
      addToast({ title: 'File required', description: 'Upload a file before creating a vault', variant: 'warning' })
      return
    }

    isRunningRef.current = true
    const clients = await getClients()
    if (!clients) {
      isRunningRef.current = false
      addToast({ title: 'Wallet not connected', variant: 'destructive' })
      return
    }

    // Lighthouse API key is checked server-side on the upload API route

    const txHashes: string[] = []
    let ipfsCid: string | undefined
    let encryptedFileMeta: string | undefined

    try {
      if (vaultType === 'licensed') {
        await runLicensedFlow(clients, txHashes, ipfsCid, encryptedFileMeta, vaultType)
      } else if (vaultType === 'timelocked') {
        await runTimeLockedFlow(clients, txHashes, ipfsCid, encryptedFileMeta, vaultType)
      } else {
        await runPrivateFlow(clients, txHashes, ipfsCid, encryptedFileMeta, vaultType)
      }
    } catch (err) {
      const parsed = parseTxError(err)
      setStep('idle')
      addToast({ title: parsed.title, description: parsed.description, variant: parsed.variant })
    } finally {
      isRunningRef.current = false
    }
  }, [name, vaultType, unlockTime, priceMusdc, getClients, addToast, selectedFile, runLicensedFlow, runTimeLockedFlow, runPrivateFlow])

  const stepItems = [
    ...(vaultType === 'licensed' ? [
      { key: 'register' as Step, label: 'Register IP Asset', done: !!result.ipId },
      { key: 'mint' as Step, label: 'Mint License Token', done: !!result.licenseTokenId },
    ] : []),
    { key: 'upload' as Step, label: 'Secure Vault Key On-Chain', done: !!result.vaultUuid },
    ...(selectedFile ? [
      { key: 'encrypt_file' as Step, label: 'Encrypt & Upload Content to IPFS', done: !!result.ipfsCid },
    ] : []),
    { key: 'encrypt_key' as Step, label: 'Backup Vault Key to Wallet', done: !!result.vaultUuid },
    { key: 'persist' as Step, label: 'Save Vault Record', done: result.dbPersisted !== undefined },
  ]

  return (
    <AppShell>
      <AuthGuard>
      <div className="max-w-2xl mx-auto space-y-8 animate-fade-in">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight">Create Vault</h1>
          <p className="mt-2 text-muted text-base">
            {vaultType === 'licensed'
              ? 'Register an IP asset, mint a license token, and encrypt your content in a single flow.'
              : vaultType === 'timelocked'
              ? 'Create a time-locked vault that can only be accessed after a specified unlock time — enforced on-chain.'
              : 'Create a private vault with owner-only EOA access — no IP registration needed.'}
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Vault Details</CardTitle>
            <CardDescription>Basic information about your encrypted vault</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              label="Vault Name"
              placeholder="e.g. Advanced Prompt Engineering Guide"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={step !== 'idle'}
            />
            <Input
              label="Description"
              placeholder="What does this vault contain?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={step !== 'idle'}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <ShieldIcon className="h-5 w-5 text-accent" />
              <CardTitle>Vault Type</CardTitle>
            </div>
        <CardDescription>
          {vaultType === 'licensed'
            ? 'Licensed vaults: register an IP asset + mint license tokens for access gating'
            : vaultType === 'timelocked'
            ? 'Time-locked vaults: on-chain condition enforces unlock time, anyone can read after'
            : 'Private vaults: owner-only access via EOA, no IP registration needed'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-3">
          <button
            type="button"
            disabled={step !== 'idle'}
            onClick={() => setVaultType('licensed')}
            className={`relative flex flex-col items-start gap-1 rounded-lg border-2 px-4 py-3 text-left transition-all disabled:opacity-50 ${
              vaultType === 'licensed'
                ? 'border-accent bg-accent-muted'
                : 'border-border bg-surface hover:border-border/80'
            }`}
          >
            <div className="flex items-center gap-2">
              <ShieldIcon className="h-4 w-4 text-accent" />
              <span className="text-sm font-semibold text-foreground">Licensed</span>
            </div>
            <span className="text-xs text-muted">IP registration + license tokens gate access</span>
          </button>
          <button
            type="button"
            disabled={step !== 'idle'}
            onClick={() => setVaultType('timelocked')}
            className={`relative flex flex-col items-start gap-1 rounded-lg border-2 px-4 py-3 text-left transition-all disabled:opacity-50 ${
              vaultType === 'timelocked'
                ? 'border-accent bg-accent-muted'
                : 'border-border bg-surface hover:border-border/80'
            }`}
          >
            <div className="flex items-center gap-2">
              <ClockIcon className="h-4 w-4 text-accent" />
              <span className="text-sm font-semibold text-foreground">Time-Locked</span>
            </div>
            <span className="text-xs text-muted">On-chain unlock time condition, public after</span>
          </button>
          <button
            type="button"
            disabled={step !== 'idle'}
            onClick={() => setVaultType('private')}
            className={`relative flex flex-col items-start gap-1 rounded-lg border-2 px-4 py-3 text-left transition-all disabled:opacity-50 ${
              vaultType === 'private'
                ? 'border-accent bg-accent-muted'
                : 'border-border bg-surface hover:border-border/80'
            }`}
          >
            <div className="flex items-center gap-2">
              <LockIcon className="h-4 w-4 text-accent" />
              <span className="text-sm font-semibold text-foreground">Private</span>
            </div>
            <span className="text-xs text-muted">Owner-only EOA access, no on-chain licensing</span>
          </button>
        </div>
      {vaultType === 'timelocked' && (
        <div className="mt-4">
          <label className="block text-sm font-medium text-foreground mb-1.5">Unlock Time</label>
          <input
            type="datetime-local"
            value={unlockTime}
            onChange={(e) => setUnlockTime(e.target.value)}
            disabled={step !== 'idle'}
            min={new Date(Date.now() + 60000).toISOString().slice(0, 16)}
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent disabled:opacity-50"
          />
          <p className="mt-1 text-xs text-muted">
            Vault content can only be decrypted after this time (enforced on-chain). Times are in your local timezone ({Intl.DateTimeFormat().resolvedOptions().timeZone}).
          </p>
        </div>
      )}
      {vaultType === 'licensed' && (
        <div className="mt-4">
          <Input
            label="Price (MUSDC)"
            type="number"
            min="0"
            step="0.01"
            placeholder="e.g. 10"
            value={priceMusdc}
            onChange={(e) => setPriceMusdc(e.target.value)}
            disabled={step !== 'idle'}
            hint="Set a price in Mock USDC for buyers to purchase this vault via the marketplace. Leave empty to list as free."
          />
        </div>
      )}
      </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <FileIcon className="h-5 w-5 text-accent" />
              <CardTitle>Content File</CardTitle>
            </div>
            <CardDescription>
              {selectedFile
                ? 'File will be encrypted client-side before upload'
                : 'Optional: attach a file to encrypt and store on IPFS'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept=".txt,.md,.json,.yaml,.yml,.csv,.xml,.html,.js,.ts,.py,.sh"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (!file) return

                if (e.target) e.target.value = ''

                const ext = '.' + file.name.split('.').pop()?.toLowerCase()
                const ALLOWED = ['.txt', '.md', '.json', '.yaml', '.yml', '.csv', '.xml', '.html', '.js', '.ts', '.py', '.sh']

                if (file.size > 5 * 1024 * 1024) {
                  addToast({ title: 'File too large', description: 'Maximum file size is 5 MB. Allowed: .txt, .md, .json, .yaml, .yml, .csv, .xml, .html, .js, .ts, .py, .sh', variant: 'warning' })
                  return
                }

                if (!ALLOWED.includes(ext)) {
                  addToast({ title: 'Invalid file type', description: `Allowed: ${ALLOWED.join(', ')}`, variant: 'warning' })
                  return
                }

                setSelectedFile(file)
              }}
              disabled={step !== 'idle'}
            />
            {selectedFile ? (
              <div className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
                <div className="flex items-center gap-3 min-w-0">
                  <FileIcon className="h-5 w-5 text-muted shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{selectedFile.name}</p>
                    <p className="text-xs text-subtle">{formatFileSize(selectedFile.size)}</p>
                  </div>
                </div>
                {step === 'idle' && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSelectedFile(null)
                      if (fileInputRef.current) fileInputRef.current.value = ''
                    }}
                  >
                    Remove
                  </Button>
                )}
              </div>
            ) : (
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={step !== 'idle'}
                className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border px-4 py-8 text-muted hover:border-accent/30 hover:text-accent transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <FileIcon className="h-5 w-5" />
                <span className="text-sm font-medium">Choose file to encrypt</span>
              </button>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <ShieldIcon className="h-5 w-5 text-accent" />
              <CardTitle>{vaultType === 'licensed' ? 'On-Chain Protection Flow' : vaultType === 'timelocked' ? 'Time-Locked Encryption Flow' : 'Private Encryption Flow'}</CardTitle>
            </div>
            <CardDescription>{vaultType === 'licensed' ? 'Transactions + data key encryption executed in sequence' : vaultType === 'timelocked' ? 'Upload CDR with time-lock condition + wallet key encryption' : 'Allocate → encrypt → write + wallet key encryption'}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stepItems.map((item) => {
                const isActive = step === item.key
                return (
                  <div
                    key={item.key}
                    className={`flex items-center gap-3 rounded-lg border px-4 py-3 transition-all duration-[var(--transition)] ${
                      isActive ? 'border-accent/30 bg-accent-muted' :
                      item.done ? 'border-accent/10 bg-accent-muted/30' :
                      'border-border bg-surface'
                    }`}
                  >
                    <div className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                      item.done ? 'bg-accent text-background' :
                      isActive ? 'border-2 border-accent text-accent' :
                      'bg-surface-active text-subtle'
                    }`}>
                      {item.done ? <CheckIcon className="h-3.5 w-3.5" /> : (
                        stepItems.indexOf(item) + 1
                      )}
                    </div>
                    <span className={`text-sm font-medium ${
                      item.done ? 'text-accent' :
                      isActive ? 'text-foreground' :
                      'text-subtle'
                    }`}>
                      {item.label}
                    </span>
                    {isActive && (
                      <svg className="h-4 w-4 animate-spin text-accent ml-auto" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                    )}
                  </div>
                )
              })}
            </div>
          </CardContent>
          <CardFooter>
        <Button
          variant="primary"
          size="lg"
onClick={step === 'done' ? () => {
          setResult({})
          setStep('idle')
          setPriceMusdc('')
          setSelectedFile(null)
          setName('')
          setDescription('')
          setUnlockTime('')
          if (fileInputRef.current) fileInputRef.current.value = ''
          isRunningRef.current = false
          } : runFullFlow}
          loading={step !== 'idle' && step !== 'done'}
          disabled={(step !== 'idle' && step !== 'done') || (!wasmReady && !wasmError) || (!selectedFile && step === 'idle')}
          className="w-full"
        >
          {step === 'done' ? 'Create Another' : wasmError ? 'WASM failed - refresh page' : !wasmReady ? 'Loading WASM...' : 'Create Vault'}
        </Button>
          </CardFooter>
        </Card>

        {step === 'done' && result.vaultUuid && (
          <Card className="animate-fade-in-scale border-accent/30">
            <CardHeader>
              <div className="flex items-center gap-2">
                <CheckIcon className="h-5 w-5 text-accent" />
                <CardTitle className="text-accent">Vault Created Successfully</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <DataRow label="Vault UUID" value={String(result.vaultUuid)} mono />
                {vaultType === 'licensed' && (
                  <>
                    <DataRow label="IP Asset" value={result.ipId || ''} mono />
                    <DataRow label="License Token" value={result.licenseTokenId?.toString() || ''} mono />
                    <DataRow label="License Terms" value={result.licenseTermsId?.toString() || ''} mono />
                    {priceMusdc && <DataRow label="Price" value={`${priceMusdc} MUSDC`} mono={false} />}
                  </>
                )}
        {vaultType === 'private' && (
          <DataRow label="Vault Type" value="Private (Owner-Only EOA)" mono={false} />
        )}
        {vaultType === 'timelocked' && (
          <>
            <DataRow label="Vault Type" value="Time-Locked" mono={false} />
            <DataRow label="Unlock Time" value={unlockTime ? new Date(unlockTime).toLocaleString() : ''} mono={false} />
          </>
        )}
              {result.ipfsCid && (
                <DataRow label="IPFS CID" value={result.ipfsCid} mono />
              )}
              <DataRow
                label="Data Key"
                value={result.dbPersisted ? 'Encrypted & saved' : 'Encryption failed — retry below'}
                mono={false}
              />
            </CardContent>
            {!result.dbPersisted && (
              <CardFooter>
      <Button
        variant="outline"
        size="sm"
        loading={retrying}
        disabled={retrying}
        onClick={async () => {
          if (retryingRef.current) return
          retryingRef.current = true
          setRetrying(true)
          try {
            const res = await fetch('/api/vaults/retry-persist', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                uuid: result.vaultUuid,
                ownerAddress: wallets[0]?.address,
                name: name.trim(),
                description: description.trim() || undefined,
                ipId: result.ipId,
                licenseTermsId: result.licenseTermsId,
                licenseTokenId: result.licenseTokenId?.toString(),
                ipfsCid: result.ipfsCid,
                encryptedFileMeta: result.encryptedFileMeta,
                encryptedDataKey: result.encryptedDataKeyJson,
                dataKeyEncryptionMeta: result.dataKeyEncryptionMetaJson,
                allocateTxHash: result.allocateTxHash,
                writeTxHash: result.writeTxHash,
          registerTxHash: result.registerTxHash,
            mintTxHash: result.mintTxHash,
            priceMusdc: priceMusdc || undefined,
              }),
            })
            const data = await res.json()
            if (data.ok) {
              setResult(prev => ({ ...prev, dbPersisted: true }))
              addToast({ title: 'Vault record saved!', variant: 'accent' })
            } else {
              addToast({ title: 'Retry failed', description: data.error, variant: 'destructive' })
            }
          } catch {
            addToast({ title: 'Retry failed', description: 'Network error', variant: 'destructive' })
          } finally {
            retryingRef.current = false
            setRetrying(false)
          }
        }}
                >
                  Retry Save
                </Button>
              </CardFooter>
            )}
            {result.dbPersisted && (
              <CardFooter>
                <Button variant="outline" size="sm" onClick={() => navigator.clipboard.writeText(JSON.stringify(result, null, 2))}>
                  Copy Details
                </Button>
              </CardFooter>
            )}
          </Card>
        )}
      </div>
      </AuthGuard>
    </AppShell>
  )
}

function DataRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-sm text-muted shrink-0">{label}</span>
      <span className={`text-sm text-foreground text-right truncate ${mono ? 'font-mono text-xs' : ''}`}>
        {value}
      </span>
    </div>
  )
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
