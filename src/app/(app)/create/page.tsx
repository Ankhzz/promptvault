'use client'

import { useState, useCallback } from 'react'
import { AppShell } from '@/components/AppShell'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { useToast } from '@/components/ui/Toast'
import { ShieldIcon, LockIcon, ArrowRightIcon, CheckIcon } from '@/components/Icons'
import { AuthGuard } from '@/components/AuthGuard'
import { usePrivy, useWallets } from '@privy-io/react-auth'
import { STORY_CHAIN, CONTRACTS, CDR_CONFIG, getCometRpcUrl } from '@/lib/constants'
import { CDR_CONDITIONS, encodeLicenseReadCondition, encodeWriteConditionData } from '@/lib/cdr'
import { initWasm, CDRClient } from '@piplabs/cdr-sdk'
import { createPublicClient, createWalletClient, custom, http, type Address } from 'viem'
import { custom as viemCustom, Account } from 'viem'
import { StoryClient, StoryConfig, PILFlavor } from '@story-protocol/core-sdk'
import { createVaultRecord } from '@/db/queries'
import {
  encryptDataKeyForWallet,
  EIP712_DOMAIN,
  EIP712_TYPES,
  EIP712_PRIMARY_TYPE,
  buildEIP712Message,
} from '@/lib/crypto/datakey-encryption'

type Step = 'idle' | 'register' | 'mint' | 'upload' | 'encrypt_key' | 'persist' | 'done'

interface StepResult {
  ipId?: Address
  licenseTermsId?: number
  licenseTokenId?: bigint
  vaultUuid?: number
  txHashes?: string[]
  dbPersisted?: boolean
}

export default function CreateVaultPage() {
  const { authenticated, login } = usePrivy()
  const { wallets } = useWallets()
  const { addToast } = useToast()

  const [step, setStep] = useState<Step>('idle')
  const [result, setResult] = useState<StepResult>({})
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')

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

  const runFullFlow = useCallback(async () => {
    if (!name.trim()) {
      addToast({ title: 'Name required', description: 'Give your vault a name', variant: 'warning' })
      return
    }

    const clients = await getClients()
    if (!clients) {
      addToast({ title: 'Wallet not connected', variant: 'destructive' })
      return
    }

    const txHashes: string[] = []

    try {
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

      await initWasm()

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

      setResult(prev => ({ ...prev, vaultUuid: uploadResult.uuid, txHashes }))

      setStep('persist')
      addToast({ title: 'Saving vault record...', variant: 'default' })

      try {
        await createVaultRecord({
          uuid: uploadResult.uuid,
          ownerAddress: clients.address,
          name: name.trim(),
          description: description.trim() || undefined,
          ipId,
          licenseTermsId,
          licenseTokenId: licenseTokenId?.toString(),
          encryptedDataKey: JSON.stringify(encryptedDataKey),
          dataKeyEncryptionMeta: JSON.stringify({ version: 2, eip712: true }),
          allocateTxHash: uploadResult.txHashes.allocate,
          writeTxHash: uploadResult.txHashes.write,
          registerTxHash: ipResult.txHash!,
          mintTxHash: licResult.txHash!,
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
      addToast({ title: 'Vault created!', description: `UUID: ${uploadResult.uuid}`, variant: 'accent' })
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      setStep('idle')
      addToast({ title: 'Failed', description: msg.slice(0, 100), variant: 'destructive' })
    }
  }, [name, getClients, addToast])

  const stepItems = [
    { key: 'register' as Step, label: 'Register IP Asset', done: !!result.ipId },
    { key: 'mint' as Step, label: 'Mint License Token', done: !!result.licenseTokenId },
    { key: 'upload' as Step, label: 'Encrypt & Upload CDR', done: !!result.vaultUuid },
    { key: 'encrypt_key' as Step, label: 'Encrypt Data Key', done: !!result.vaultUuid },
    { key: 'persist' as Step, label: 'Save Vault Record', done: result.dbPersisted !== undefined },
  ]

  if (!authenticated) {
    return (
      <AppShell>
        <AuthGuard>{null}</AuthGuard>
      </AppShell>
    )
  }

  return (
    <AppShell>
      <div className="max-w-2xl mx-auto space-y-8 animate-fade-in">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight">Create Vault</h1>
          <p className="mt-2 text-muted text-base">
            Register an IP asset, mint a license token, and encrypt your content in a single flow.
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
              <CardTitle>On-Chain Protection Flow</CardTitle>
            </div>
            <CardDescription>Transactions + data key encryption executed in sequence</CardDescription>
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
              onClick={runFullFlow}
              loading={step !== 'idle' && step !== 'done'}
              disabled={step !== 'idle' && step !== 'done'}
              className="w-full"
            >
              {step === 'done' ? 'Create Another' : 'Create Vault'}
            </Button>
          </CardFooter>
        </Card>

        {step === 'done' && result.vaultUuid && (
          <Card glow className="animate-fade-in-scale">
            <CardHeader>
              <div className="flex items-center gap-2">
                <CheckIcon className="h-5 w-5 text-accent" />
                <CardTitle className="text-accent">Vault Created Successfully</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <DataRow label="Vault UUID" value={String(result.vaultUuid)} mono />
              <DataRow label="IP Asset" value={result.ipId || ''} mono />
              <DataRow label="License Token" value={result.licenseTokenId?.toString() || ''} mono />
              <DataRow label="License Terms" value={result.licenseTermsId?.toString() || ''} mono />
                <DataRow
                  label="Data Key"
                  value={result.dbPersisted ? 'Encrypted & saved' : 'Encryption failed — retry below'}
                  mono={false}
                />
              </CardContent>
              {!result.dbPersisted && (
                <CardFooter>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={async () => {
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
                      }
                    }}
                  >
                    Retry Save
                  </Button>
                </CardFooter>
              )}
              {result.dbPersisted && (
                <CardFooter>
                  <Button variant="secondary" size="sm" onClick={() => navigator.clipboard.writeText(JSON.stringify(result, null, 2))}>
                    Copy Details
                  </Button>
                </CardFooter>
              )}
          </Card>
        )}
      </div>
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
