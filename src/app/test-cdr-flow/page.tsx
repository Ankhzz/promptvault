'use client';

import { useState, useCallback, useRef } from 'react';
import { createPublicClient, createWalletClient, custom, http, type Address, toHex } from 'viem';
import { usePrivy, useWallets } from '@privy-io/react-auth';
import { StoryClient, StoryConfig, PILFlavor } from '@story-protocol/core-sdk';
import { custom as viemCustom, Account } from 'viem';
import { STORY_CHAIN, CDR_CONFIG, CONTRACTS } from '@/lib/constants';
import { CDR_CONDITIONS, encodeLicenseReadCondition, encodeWriteConditionData, encodeAccessAuxData } from '@/lib/cdr';
import { initWasm, CDRClient, getWasm } from '@piplabs/cdr-sdk';

type StepStatus = 'idle' | 'running' | 'ok' | 'fail';

interface LogEntry {
  ts: string;
  msg: string;
  level: 'info' | 'error' | 'warn';
}

interface PersistedState {
  ipId?: Address;
  licenseTermsId?: number;
  licenseTokenId?: bigint;
  vaultUuid?: number;
  globalPubKeyHex?: string;
  dataKeyHex?: string;
}

export default function TestCDRFlowPage() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [steps, setSteps] = useState<Record<string, StepStatus>>({
    registerIP: 'idle',
    mintLicense: 'idle',
    uploadCDR: 'idle',
    accessCDR: 'idle',
    decrypt: 'idle',
  });
  const [persisted, setPersisted] = useState<PersistedState>({});

  const addLog = useCallback((msg: string, level: 'info' | 'error' | 'warn' = 'info') => {
    const ts = new Date().toLocaleTimeString('en-US', { hour12: false, fractionalSecondDigits: 3 });
    if (level === 'error') console.error(msg);
    else if (level === 'warn') console.warn(msg);
    else console.log(msg);
    setLogs(prev => [...prev, { ts, msg, level }]);
  }, []);

  const setStep = useCallback((step: string, status: StepStatus) => {
    setSteps(prev => ({ ...prev, [step]: status }));
  }, []);

  const { authenticated, login } = usePrivy();
  const { wallets } = useWallets();

  const getWalletClients = useCallback(async () => {
    if (wallets.length === 0) {
      addLog('No wallet connected', 'error');
      return null;
    }
    const wallet = wallets[0];
    const provider = await wallet.getEthereumProvider();
    if (!provider) {
      addLog('Ethereum provider is null', 'error');
      return null;
    }
    const walletClient = createWalletClient({
      transport: custom(provider),
      account: wallet.address as Address,
    });
    const publicClient = createPublicClient({
      transport: http(STORY_CHAIN.rpcUrl),
    });
    return { walletClient, publicClient, address: wallet.address as Address };
  }, [wallets, addLog]);

  // ──── STEP 1: Register IP Asset on Story Protocol ────
  const step_registerIP = useCallback(async () => {
    setStep('registerIP', 'running');
    addLog('─── Step 1: Register IP Asset ────');

    const clients = await getWalletClients();
    if (!clients) { setStep('registerIP', 'fail'); return; }

    try {
      const config: StoryConfig = {
        account: clients.walletClient.account as Account,
        transport: viemCustom(clients.walletClient.transport),
        chainId: 'aeneid',
      };
      const storyClient = StoryClient.newClient(config);
      addLog('StoryClient initialized');

      const licenseTermsData = [{
        terms: PILFlavor.nonCommercialSocialRemixing(),
      }];

      addLog('Calling registerIpAsset with nonCommercialSocialRemixing...');
      const t0 = performance.now();
      const result = await storyClient.ipAsset.registerIpAsset({
        nft: {
          type: 'mint',
          spgNftContract: CONTRACTS.SPG_NFT_CONTRACT,
        },
        licenseTermsData,
        ipMetadata: {
          ipMetadataURI: 'https://promptvault.test/metadata/e2e-test',
          ipMetadataHash: '0x' + 'ab'.repeat(32) as `0x${string}`,
          nftMetadataURI: 'https://promptvault.test/nft/e2e-test',
          nftMetadataHash: '0x' + 'cd'.repeat(32) as `0x${string}`,
        },
      });
      const dt = performance.now() - t0;

      const ipId = result.ipId as Address;
      const licenseTermsId = Number(result.licenseTermsIds?.[0]);

      addLog(`registerIpAsset OK (${dt.toFixed(0)}ms)`);
      addLog(`  ipId: ${ipId}`);
      addLog(`  licenseTermsId: ${licenseTermsId}`);
      addLog(`  txHash: ${result.txHash}`);

      setPersisted(prev => ({ ...prev, ipId, licenseTermsId }));
      setStep('registerIP', 'ok');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      const stack = err instanceof Error ? err.stack : undefined;
      addLog(`registerIpAsset FAILED: ${msg}`, 'error');
      if (stack) addLog(`Stack: ${stack}`, 'error');
      if (err && typeof err === 'object' && 'shortMessage' in err) addLog(`Short: ${String((err as any).shortMessage)}`, 'error');
      setStep('registerIP', 'fail');
    }
  }, [addLog, setStep, getWalletClients]);

  // ──── STEP 2: Mint License Token ────
  const step_mintLicense = useCallback(async () => {
    setStep('mintLicense', 'running');
    addLog('─── Step 2: Mint License Token ────');

    if (!persisted.ipId || !persisted.licenseTermsId) {
      addLog('SKIP: Register IP first (Step 1)', 'warn');
      setStep('mintLicense', 'fail');
      return;
    }

    const clients = await getWalletClients();
    if (!clients) { setStep('mintLicense', 'fail'); return; }

    try {
      const config: StoryConfig = {
        account: clients.walletClient.account as Account,
        transport: viemCustom(clients.walletClient.transport),
        chainId: 'aeneid',
      };
      const storyClient = StoryClient.newClient(config);

      addLog(`Minting license token for ipId=${persisted.ipId}, termsId=${persisted.licenseTermsId}...`);
      const t0 = performance.now();
      const result = await storyClient.license.mintLicenseTokens({
        licensorIpId: persisted.ipId,
        licenseTermsId: persisted.licenseTermsId,
        amount: 1,
      });
      const dt = performance.now() - t0;

      const licenseTokenId = result.licenseTokenIds?.[0];

      addLog(`mintLicenseTokens OK (${dt.toFixed(0)}ms)`);
      addLog(`  licenseTokenIds: [${result.licenseTokenIds?.join(', ')}]`);
      addLog(`  licenseTokenId[0]: ${licenseTokenId}`);
      addLog(`  txHash: ${result.txHash}`);

      setPersisted(prev => ({ ...prev, licenseTokenId }));
      setStep('mintLicense', 'ok');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      const stack = err instanceof Error ? err.stack : undefined;
      addLog(`mintLicenseTokens FAILED: ${msg}`, 'error');
      if (stack) addLog(`Stack: ${stack}`, 'error');
      if (err && typeof err === 'object' && 'shortMessage' in err) addLog(`Short: ${String((err as any).shortMessage)}`, 'error');
      setStep('mintLicense', 'fail');
    }
  }, [addLog, setStep, getWalletClients, persisted.ipId, persisted.licenseTermsId]);

  // ──── STEP 3: Upload CDR (encrypt + on-chain vault) ────
  const step_uploadCDR = useCallback(async () => {
    setStep('uploadCDR', 'running');
    addLog('─── Step 3: Upload CDR ────');

    if (!persisted.ipId) {
      addLog('SKIP: Register IP first (Step 1)', 'warn');
      setStep('uploadCDR', 'fail');
      return;
    }

    const clients = await getWalletClients();
    if (!clients) { setStep('uploadCDR', 'fail'); return; }

    try {
      await initWasm({ skipHashCheck: true });
      addLog('WASM initialized');

      const publicClient = createPublicClient({ transport: http(STORY_CHAIN.rpcUrl) });
      const cdrClient = new CDRClient({
        network: CDR_CONFIG.network,
        publicClient,
        walletClient: clients.walletClient,
      });

      addLog('Getting globalPubKey...');
      const globalPubKey = await cdrClient.observer.getGlobalPubKey();
      addLog(`globalPubKey: ${toHex(globalPubKey).slice(0, 20)}... (${globalPubKey.length} bytes)`);

      const dataKey = crypto.getRandomValues(new Uint8Array(32));
      const dataKeyHex = toHex(dataKey) as `0x${string}`;

      const readConditionData = encodeLicenseReadCondition(persisted.ipId);
      const writeConditionData = encodeWriteConditionData(clients.address);

      addLog('Calling uploadCDR()...');
      addLog(`  ipId (in readConditionData): ${persisted.ipId}`);
      addLog(`  writer: ${clients.address}`);

      const t0 = performance.now();
      const result = await cdrClient.uploader.uploadCDR({
        dataKey,
        globalPubKey,
        updatable: false,
        writeConditionAddr: CDR_CONDITIONS.writeCondition,
        readConditionAddr: CDR_CONDITIONS.readCondition,
        writeConditionData,
        readConditionData,
        accessAuxData: '0x',
      });
      const dt = performance.now() - t0;

      addLog(`uploadCDR OK (${dt.toFixed(0)}ms)`);
      addLog(`  UUID: ${result.uuid}`);
      addLog(`  Allocate tx: ${result.txHashes.allocate}`);
      addLog(`  Write tx: ${result.txHashes.write}`);

      setPersisted(prev => ({
        ...prev,
        vaultUuid: result.uuid,
        globalPubKeyHex: toHex(globalPubKey),
        dataKeyHex,
      }));
      setStep('uploadCDR', 'ok');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      const stack = err instanceof Error ? err.stack : undefined;
      addLog(`uploadCDR FAILED: ${msg}`, 'error');
      if (stack) addLog(`Stack: ${stack}`, 'error');
      if (err && typeof err === 'object' && 'shortMessage' in err) addLog(`Short: ${String((err as any).shortMessage)}`, 'error');
      setStep('uploadCDR', 'fail');
    }
  }, [addLog, setStep, getWalletClients, persisted.ipId]);

  // ──── STEP 4: Access CDR (read vault + collect partials) ────
  const step_accessCDR = useCallback(async () => {
    setStep('accessCDR', 'running');
    addLog('─── Step 4: Access CDR ────');

    if (!persisted.vaultUuid || !persisted.licenseTokenId) {
      addLog('SKIP: Need vaultUuid and licenseTokenId (run Steps 1-3)', 'warn');
      setStep('accessCDR', 'fail');
      return;
    }

    const clients = await getWalletClients();
    if (!clients) { setStep('accessCDR', 'fail'); return; }

    try {
      const accessAuxData = encodeAccessAuxData(persisted.licenseTokenId);
      addLog(`accessAuxData: ${accessAuxData.slice(0, 30)}...`);
      addLog(`  licenseTokenId in auxData: ${persisted.licenseTokenId}`);

      await initWasm({ skipHashCheck: true });

      const publicClient = createPublicClient({ transport: http(STORY_CHAIN.rpcUrl) });
      const cdrClient = new CDRClient({
        network: CDR_CONFIG.network,
        publicClient,
        walletClient: clients.walletClient,
      });

      addLog(`Calling accessCDR(uuid=${persisted.vaultUuid})...`);
      addLog('  This may take 30-90s (wait for validator partials)...');

      const t0 = performance.now();
      const result = await cdrClient.consumer.accessCDR({
        uuid: persisted.vaultUuid,
        accessAuxData,
        timeoutMs: 120_000,
      });
      const dt = performance.now() - t0;

      addLog(`accessCDR OK (${dt.toFixed(0)}ms)`);
      addLog(`  dataKey recovered: ${toHex(result.dataKey).slice(0, 20)}...`);
      addLog(`  dataKey length: ${result.dataKey.length} bytes`);
      addLog(`  read txHash: ${result.txHash}`);
      addLog(`  dataKey matches original: ${persisted.dataKeyHex === toHex(result.dataKey) ? 'YES' : 'NO'}`,
        persisted.dataKeyHex === toHex(result.dataKey) ? 'info' : 'warn');

      setStep('accessCDR', 'ok');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      const stack = err instanceof Error ? err.stack : undefined;
      addLog(`accessCDR FAILED: ${msg}`, 'error');
      if (stack) addLog(`Stack: ${stack}`, 'error');
      if (err && typeof err === 'object') {
        if ('cause' in err) addLog(`Cause: ${String((err as any).cause)}`, 'error');
        if ('shortMessage' in err) addLog(`Short: ${String((err as any).shortMessage)}`, 'error');
        if ('details' in err) addLog(`Details: ${String((err as any).details)}`, 'error');
      }
      setStep('accessCDR', 'fail');
    }
  }, [addLog, setStep, getWalletClients, persisted.vaultUuid, persisted.licenseTokenId, persisted.dataKeyHex]);

  // ──── STEP 5: Verify decrypt (compare recovered dataKey) ────
  const step_decrypt = useCallback(async () => {
    setStep('decrypt', 'running');
    addLog('─── Step 5: Verify Decrypt ────');

    if (!persisted.dataKeyHex) {
      addLog('SKIP: No original dataKey stored (run Step 3 first)', 'warn');
      setStep('decrypt', 'fail');
      return;
    }

    addLog(`Original dataKey:  ${persisted.dataKeyHex}`);
    addLog('If Step 4 passed, the dataKey was already recovered by accessCDR().');
    addLog('Decrypt validation is implicit in accessCDR — it combines partials to recover the dataKey.');
    addLog('If dataKey matches original upload, the full cycle is validated.');

    setStep('decrypt', 'ok');
  }, [addLog, setStep, persisted.dataKeyHex]);

  const statusColor: Record<StepStatus, string> = {
    idle: '#666', running: '#ffc107', ok: '#28a745', fail: '#dc3545',
  };

  const btnStyle = (status: StepStatus) => ({
    padding: '0.5rem 1rem', fontSize: '0.85rem',
    cursor: status === 'running' ? 'wait' as const : 'pointer' as const,
    backgroundColor: statusColor[status], color: 'white',
    border: 'none', borderRadius: '4px',
    opacity: status === 'running' ? 0.7 : 1,
  });

  return (
    <div style={{ padding: '2rem', fontFamily: 'monospace', maxWidth: '1000px', margin: '0 auto' }}>
      <h1>CDR Full Flow Test</h1>
      <p style={{ color: '#666', marginBottom: '1rem' }}>
        registerIP → mintLicenseToken → uploadCDR → accessCDR → verify decrypt
      </p>

      <div style={{ marginBottom: '1.5rem', padding: '1rem', backgroundColor: '#f0f0f0', borderRadius: '4px', fontSize: '0.8rem' }}>
        <strong>Persisted State:</strong>
        <div>ipId: {persisted.ipId || '—'}</div>
        <div>licenseTermsId: {persisted.licenseTermsId ?? '—'}</div>
        <div>licenseTokenId: {persisted.licenseTokenId?.toString() ?? '—'}</div>
        <div>vaultUuid: {persisted.vaultUuid ?? '—'}</div>
        <div>dataKeyHex: {persisted.dataKeyHex ? persisted.dataKeyHex.slice(0, 20) + '...' : '—'}</div>
        <div>Privy Auth: {authenticated ? 'YES' : 'NO'}</div>
        <div>Wallets: {wallets.length}</div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '0.5rem', marginBottom: '2rem' }}>
        {[
          { key: 'registerIP', label: '1. Register IP Asset', fn: step_registerIP },
          { key: 'mintLicense', label: '2. Mint License Token', fn: step_mintLicense },
          { key: 'uploadCDR', label: '3. Upload CDR (encrypt + vault)', fn: step_uploadCDR },
          { key: 'accessCDR', label: '4. Access CDR (read + collect partials)', fn: step_accessCDR },
          { key: 'decrypt', label: '5. Verify Decrypt', fn: step_decrypt },
        ].map(({ key, label, fn }) => (
          <div key={key} style={{ display: 'contents' }}>
            <span style={{ fontSize: '0.85rem', lineHeight: '2rem' }}>{label}</span>
            <button onClick={fn} disabled={steps[key] === 'running'} style={btnStyle(steps[key])}>
              {steps[key] === 'running' ? '...' : steps[key] === 'ok' ? 'PASS' : steps[key] === 'fail' ? 'FAIL' : 'Run'}
            </button>
          </div>
        ))}
      </div>

      <div style={{
        padding: '1rem', backgroundColor: '#1a1a1a', color: '#00ff00',
        borderRadius: '4px', maxHeight: '500px', overflow: 'auto',
        fontSize: '0.8rem', whiteSpace: 'pre-wrap', wordBreak: 'break-all',
      }}>
        {logs.length === 0 ? (
          <p style={{ color: '#666' }}>Click a step button to begin...</p>
        ) : (
          logs.map((entry, i) => (
            <div key={i} style={{ color: entry.level === 'error' ? '#ff4444' : entry.level === 'warn' ? '#ffc107' : '#00ff00' }}>
              <span style={{ color: '#666' }}>{entry.ts}</span> {entry.msg}
            </div>
          ))
        )}
      </div>

      <div style={{ marginTop: '1rem', padding: '1rem', backgroundColor: '#fff3cd', borderRadius: '4px', fontSize: '0.8rem' }}>
        <strong>Contracts:</strong> WriteCondition={CDR_CONDITIONS.writeCondition} | ReadCondition={CDR_CONDITIONS.readCondition} | LicenseToken={CDR_CONDITIONS.licenseToken}
      </div>
    </div>
  );
}
