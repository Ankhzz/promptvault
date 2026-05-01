'use client';

import { useState, useCallback, useRef } from 'react';
import { createPublicClient, http, type Address } from 'viem';
import { usePrivy, useWallets } from '@privy-io/react-auth';
import { createWalletClient, custom } from 'viem';
import { STORY_CHAIN, CDR_CONFIG, CONTRACTS } from '@/lib/constants';
import { CDR_CONDITIONS, encodeLicenseReadCondition, encodeWriteConditionData } from '@/lib/cdr';
import { initWasm, CDRClient, getWasm } from '@piplabs/cdr-sdk';

type StepStatus = 'idle' | 'running' | 'ok' | 'fail';

interface LogEntry {
  ts: string;
  msg: string;
  level: 'info' | 'error' | 'warn';
  data?: unknown;
}

export default function TestCDRPage() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [stepStatuses, setStepStatuses] = useState<Record<string, StepStatus>>({
    wasm: 'idle',
    client: 'idle',
    pubKey: 'idle',
    wallet: 'idle',
    upload: 'idle',
  });

  const clientRef = useRef<CDRClient | null>(null);
  const pubKeyRef = useRef<Uint8Array | null>(null);

  const { login, authenticated } = usePrivy();
  const { wallets } = useWallets();

  const addLog = useCallback((msg: string, level: 'info' | 'error' | 'warn' = 'info', data?: unknown) => {
    const ts = new Date().toLocaleTimeString('en-US', { hour12: false, fractionalSecondDigits: 3 });
    if (level === 'error') console.error(msg, data);
    else if (level === 'warn') console.warn(msg, data);
    else console.log(msg, data);
    setLogs(prev => [...prev, { ts, msg, level, data }]);
  }, []);

  const setStep = useCallback((step: string, status: StepStatus) => {
    setStepStatuses(prev => ({ ...prev, [step]: status }));
  }, []);

  const clearLogs = useCallback(() => {
    setLogs([]);
    setStepStatuses({ wasm: 'idle', client: 'idle', pubKey: 'idle', wallet: 'idle', upload: 'idle' });
    clientRef.current = null;
    pubKeyRef.current = null;
  }, []);

  // ──── STEP 1: initWasm ────
  const step_initWasm = useCallback(async () => {
    setStep('wasm', 'running');
    addLog('─── Step 1: initWasm() ────');
    try {
      const t0 = performance.now();
      await initWasm({ skipHashCheck: true });
      const dt = performance.now() - t0;
      const wasm = getWasm();
      addLog(`initWasm() OK (${dt.toFixed(0)}ms)`);
      addLog(`getWasm() returned: ${wasm ? 'CbMpcWasm instance' : 'NULL'}`, wasm ? 'info' : 'error');
      if (wasm) {
        addLog(`  wasm instance keys: ${Object.getOwnPropertyNames(Object.getPrototypeOf(wasm)).join(', ')}`);
      }
      setStep('wasm', 'ok');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      const stack = err instanceof Error ? err.stack : undefined;
      addLog(`initWasm() FAILED: ${msg}`, 'error');
      if (stack) addLog(`Stack: ${stack}`, 'error');
      if (err && typeof err === 'object' && 'cause' in err) addLog(`Cause: ${String((err as any).cause)}`, 'error');
      setStep('wasm', 'fail');
    }
  }, [addLog, setStep]);

  // ──── STEP 2: CDRClient ────
  const step_createClient = useCallback(async () => {
    setStep('client', 'running');
    addLog('─── Step 2: CDRClient() ────');
    try {
      const publicClient = createPublicClient({
        transport: http(STORY_CHAIN.rpcUrl),
      });
      addLog(`publicClient created (rpcUrl: ${STORY_CHAIN.rpcUrl})`);

      const t0 = performance.now();
      const client = new CDRClient({
        network: CDR_CONFIG.network,
        publicClient,
      });
      const dt = performance.now() - t0;
      addLog(`CDRClient created OK (${dt.toFixed(0)}ms) — read-only mode (no walletClient)`);
      addLog(`  client.observer: ${client.observer ? 'Observer instance' : 'MISSING'}`, client.observer ? 'info' : 'error');
      addLog(`  client.observer.dkgSource: ${client.observer.dkgSource}`);
      clientRef.current = client;
      setStep('client', 'ok');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      const stack = err instanceof Error ? err.stack : undefined;
      addLog(`CDRClient() FAILED: ${msg}`, 'error');
      if (stack) addLog(`Stack: ${stack}`, 'error');
      setStep('client', 'fail');
    }
  }, [addLog, setStep]);

  // ──── STEP 3: getGlobalPubKey ────
  const step_getGlobalPubKey = useCallback(async () => {
    setStep('pubKey', 'running');
    addLog('─── Step 3: observer.getGlobalPubKey() ────');
    const client = clientRef.current;
    if (!client) {
      addLog('SKIP: CDRClient not initialized — run Step 2 first', 'warn');
      setStep('pubKey', 'fail');
      return;
    }
    try {
      addLog(`Calling observer.getGlobalPubKey()... (dkgSource: ${client.observer.dkgSource})`);
      const t0 = performance.now();
      const pubKey = await client.observer.getGlobalPubKey();
      const dt = performance.now() - t0;
      addLog(`getGlobalPubKey() OK (${dt.toFixed(0)}ms)`);
      addLog(`  Type: ${pubKey?.constructor?.name}, length: ${pubKey?.length}`);
      addLog(`  First 32 bytes hex: ${Array.from(pubKey.slice(0, 32)).map(b => b.toString(16).padStart(2, '0')).join('')}`);
      addLog(`  Total length: ${pubKey.length} bytes`);
      pubKeyRef.current = pubKey;
      setStep('pubKey', 'ok');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      const stack = err instanceof Error ? err.stack : undefined;
      addLog(`getGlobalPubKey() FAILED: ${msg}`, 'error');
      if (stack) addLog(`Stack: ${stack}`, 'error');
      if (err && typeof err === 'object' && 'cause' in err) addLog(`Cause: ${String((err as any).cause)}`, 'error');
      setStep('pubKey', 'fail');
    }
  }, [addLog, setStep]);

  // ──── STEP 4: wallet connection ────
  const step_walletConnect = useCallback(async () => {
    setStep('wallet', 'running');
    addLog('─── Step 4: Wallet Connection ────');

    if (!authenticated) {
      addLog('Not authenticated — calling login()...', 'warn');
      login({ loginMethods: ['email', 'google', 'github', 'wallet'] });
      setStep('wallet', 'idle');
      return;
    }

    try {
      addLog(`Privy authenticated: ${authenticated}`);
      addLog(`Wallets count: ${wallets.length}`);

      if (wallets.length === 0) {
        addLog('No wallets found after auth — need to connect wallet', 'warn');
        setStep('wallet', 'fail');
        return;
      }

      const wallet = wallets[0];
      addLog(`Wallet[0] address: ${wallet.address}`);
      addLog(`Wallet[0] type: ${wallet.walletClientType}`);

      const provider = await wallet.getEthereumProvider();
      addLog(`Ethereum provider: ${provider ? 'OK' : 'MISSING'}`, provider ? 'info' : 'error');

      if (provider) {
        const walletClient = createWalletClient({
          transport: custom(provider),
          account: wallet.address as Address,
        });
        addLog(`walletClient created OK (account: ${wallet.address})`);

        const chainId = await walletClient.getChainId();
        addLog(`walletClient chainId: ${chainId} (expected: ${STORY_CHAIN.id})`, chainId === STORY_CHAIN.id ? 'info' : 'warn');
      }

      setStep('wallet', 'ok');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      const stack = err instanceof Error ? err.stack : undefined;
      addLog(`Wallet step FAILED: ${msg}`, 'error');
      if (stack) addLog(`Stack: ${stack}`, 'error');
      setStep('wallet', 'fail');
    }
  }, [addLog, setStep, authenticated, wallets, login]);

  // ──── STEP 5: uploadCDR ────
  const step_uploadCDR = useCallback(async () => {
    setStep('upload', 'running');
    addLog('─── Step 5: uploadCDR() ────');

    if (!clientRef.current) {
      addLog('SKIP: CDRClient not initialized', 'warn');
      setStep('upload', 'fail');
      return;
    }
    if (!pubKeyRef.current) {
      addLog('SKIP: globalPubKey not fetched', 'warn');
      setStep('upload', 'fail');
      return;
    }
    if (wallets.length === 0) {
      addLog('SKIP: No wallet connected — run Step 4 first', 'warn');
      setStep('upload', 'fail');
      return;
    }

    try {
      const wallet = wallets[0];
      const provider = await wallet.getEthereumProvider();
      if (!provider) {
        addLog('Ethereum provider is null', 'error');
        setStep('upload', 'fail');
        return;
      }

      const walletClient = createWalletClient({
        transport: custom(provider),
        account: wallet.address as Address,
      });

      const publicClient = createPublicClient({
        transport: http(STORY_CHAIN.rpcUrl),
      });

      addLog('Creating CDRClient with walletClient (write mode)...');
      const client = new CDRClient({
        network: CDR_CONFIG.network,
        publicClient,
        walletClient,
      });

      const globalPubKey = pubKeyRef.current;
      const dataKey = crypto.getRandomValues(new Uint8Array(32));
      const testIpId = `0x${'11'.repeat(20)}` as Address;
      const testWriter = wallet.address as Address;

      const readConditionData = encodeLicenseReadCondition(testIpId);
      const writeConditionData = encodeWriteConditionData(testWriter);

      addLog(`Parameters:`);
      addLog(`  writer (from wallet): ${testWriter}`);
      addLog(`  test ipId: ${testIpId}`);
      addLog(`  writeCondition: ${CDR_CONDITIONS.writeCondition}`);
      addLog(`  readCondition: ${CDR_CONDITIONS.readCondition}`);
      addLog(`  writeConditionData: ${writeConditionData.slice(0, 20)}...`);
      addLog(`  readConditionData: ${readConditionData.slice(0, 20)}...`);
      addLog(`  dataKey length: ${dataKey.length}`);
      addLog(`  globalPubKey length: ${globalPubKey.length}`);

      addLog('Calling client.uploader.uploadCDR()...');
      const t0 = performance.now();
      const result = await client.uploader.uploadCDR({
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

      addLog(`uploadCDR() OK (${dt.toFixed(0)}ms)`, 'info');
      addLog(`  UUID: ${result.uuid}`);
      addLog(`  Allocate txHash: ${result.txHashes.allocate}`);
      addLog(`  Write txHash: ${result.txHashes.write}`);
      addLog(`  Ciphertext type: ${result.ciphertext?.constructor?.name}`);
      setStep('upload', 'ok');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      const stack = err instanceof Error ? err.stack : undefined;
      addLog(`uploadCDR() FAILED: ${msg}`, 'error');
      if (stack) addLog(`Stack:\n${stack}`, 'error');
      if (err && typeof err === 'object') {
        if ('cause' in err) addLog(`Cause: ${String((err as any).cause)}`, 'error');
        if ('details' in err) addLog(`Details: ${String((err as any).details)}`, 'error');
        if ('data' in err) addLog(`Data: ${JSON.stringify((err as any).data)}`, 'error');
        if ('shortMessage' in err) addLog(`Short message: ${String((err as any).shortMessage)}`, 'error');
      }
      setStep('upload', 'fail');
    }
  }, [addLog, setStep, wallets]);

  const statusColor: Record<StepStatus, string> = {
    idle: '#666',
    running: '#ffc107',
    ok: '#28a745',
    fail: '#dc3545',
  };

  const stepButtonStyle = (status: StepStatus) => ({
    padding: '0.5rem 1rem',
    fontSize: '0.85rem',
    cursor: status === 'running' ? 'wait' as const : 'pointer' as const,
    backgroundColor: statusColor[status],
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    opacity: status === 'running' ? 0.7 : 1,
  });

  return (
    <div style={{ padding: '2rem', fontFamily: 'monospace', maxWidth: '1000px', margin: '0 auto' }}>
      <h1>CDR SDK Integration Test</h1>
      <p style={{ color: '#666', marginBottom: '1.5rem' }}>
        Step-by-step validation. Run each step in order. Diagnose failures before proceeding.
      </p>

      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        <button onClick={clearLogs} style={{ padding: '0.5rem 1rem', fontSize: '0.85rem', cursor: 'pointer' }}>
          Clear All
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '0.5rem', marginBottom: '2rem' }}>
        {[
          { key: 'wasm', label: '1. initWasm()', fn: step_initWasm },
          { key: 'client', label: '2. CDRClient (read-only)', fn: step_createClient },
          { key: 'pubKey', label: '3. getGlobalPubKey()', fn: step_getGlobalPubKey },
          { key: 'wallet', label: '4. Wallet Connection', fn: step_walletConnect },
          { key: 'upload', label: '5. uploadCDR() — REAL TX', fn: step_uploadCDR },
        ].map(({ key, label, fn }) => (
          <div key={key} style={{ display: 'contents' }}>
            <span style={{ fontSize: '0.85rem', lineHeight: '2rem' }}>{label}</span>
            <button onClick={fn} disabled={stepStatuses[key] === 'running'} style={stepButtonStyle(stepStatuses[key])}>
              {stepStatuses[key] === 'running' ? '...' : stepStatuses[key] === 'ok' ? 'PASS' : stepStatuses[key] === 'fail' ? 'FAIL' : 'Run'}
            </button>
          </div>
        ))}
      </div>

      <div
        style={{
          padding: '1rem',
          backgroundColor: '#1a1a1a',
          color: '#00ff00',
          borderRadius: '4px',
          maxHeight: '600px',
          overflow: 'auto',
          fontSize: '0.8rem',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-all',
        }}
      >
        {logs.length === 0 ? (
          <p style={{ color: '#666' }}>Click a step button to begin...</p>
        ) : (
          logs.map((entry, i) => (
            <div key={i} style={{ color: entry.level === 'error' ? '#ff4444' : entry.level === 'warn' ? '#ffc107' : '#00ff00' }}>
              <span style={{ color: '#666' }}>{entry.ts}</span> {entry.msg}
              {entry.data !== undefined && (
                <div style={{ color: '#888', marginLeft: '2rem', fontSize: '0.75rem' }}>
                  {typeof entry.data === 'object' ? JSON.stringify(entry.data, null, 2) : String(entry.data)}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      <div style={{ marginTop: '2rem', padding: '1rem', backgroundColor: '#fff3cd', borderRadius: '4px' }}>
        <h3 style={{ marginTop: 0 }}>Configuration:</h3>
        <ul style={{ margin: 0, paddingLeft: '1.5rem', fontSize: '0.85rem' }}>
          <li>Network: {CDR_CONFIG.network} (Aeneid)</li>
          <li>RPC: {STORY_CHAIN.rpcUrl}</li>
          <li>Write Condition: {CDR_CONDITIONS.writeCondition}</li>
          <li>Read Condition: {CDR_CONDITIONS.readCondition}</li>
          <li>License Token: {CDR_CONDITIONS.licenseToken}</li>
          <li>Privy Auth: {authenticated ? 'YES' : 'NO'}</li>
          <li>Wallets: {wallets.length}</li>
        </ul>
      </div>
    </div>
  );
}
