'use client'

import { useState } from 'react'
import { useWallet } from '@/hooks/useWallet'
import { useStoryClient } from '@/hooks/useStoryClient'
import { STORY_CHAIN } from '@/lib/constants'

export default function TestPage() {
  const { address, isConnected, isAuthenticated, isReady, connect, disconnect, chainId } = useWallet()
  const { client: storyClient, isReady: storyReady, registerIPAsset, error: storyError } = useStoryClient()

  const [testStatus, setTestStatus] = useState<string>('')
  const [loading, setLoading] = useState(false)

  const handleTestStory = async () => {
    if (!storyClient || !address) {
      setTestStatus('Story client not ready or wallet not connected')
      return
    }

    setLoading(true)
    setTestStatus('Testing Story SDK...')

    try {
      console.log('Starting Story SDK test...')
      console.log('storyClient:', storyClient)
      console.log('address:', address)

      const testMetadata = {
        title: 'Test IP Asset',
        description: 'Testing Story Protocol integration',
        image: '',
        imageHash: '',
        mediaUrl: '',
        mediaHash: '',
        mediaType: 'text/plain',
        creators: [{ name: 'Test', address: address, description: 'Test creator', contributionPercent: 100, socialMedia: [] }],
      }

      const mockMetadataUri = `data:application/json,${encodeURIComponent(JSON.stringify(testMetadata))}`
      const mockMetadataHash = '0x' + '00'.repeat(32)

      console.log('Calling registerIPAsset...')
      const result = await registerIPAsset({
        metadataUri: mockMetadataUri,
        metadataHash: mockMetadataHash as `0x${string}`,
        licenseType: 'personal',
      })

      console.log('Result:', result)

      if (result.success) {
        setTestStatus(`SUCCESS! IP ID: ${result.ipId}`)
      } else {
        setTestStatus(`ERROR: ${result.error}`)
      }
    } catch (err) {
      console.error('Exception:', err)
      setTestStatus(`EXCEPTION: ${err instanceof Error ? err.message : 'Unknown error'}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ padding: '2rem', fontFamily: 'monospace' }}>
      <h1>PromptVault - Test Page</h1>

      <div style={{ marginBottom: '2rem', padding: '1rem', border: '1px solid #ccc' }}>
        <h2>Wallet Status</h2>
        <p>Connected: {isConnected ? 'YES' : 'NO'}</p>
        <p>Authenticated (Privy): {isAuthenticated ? 'YES' : 'NO'}</p>
        <p>Wallet Ready: {isReady ? 'YES' : 'NO'}</p>
        <p>Address: {address || 'Not connected'}</p>
        <p>Chain ID: {chainId || 'N/A'} (expected: {STORY_CHAIN.id})</p>

        <div style={{ marginTop: '1rem' }}>
          {!isConnected ? (
            <button onClick={connect} style={{ padding: '0.5rem 1rem', cursor: 'pointer' }}>
              Connect Wallet
            </button>
          ) : (
            <button onClick={disconnect} style={{ padding: '0.5rem 1rem', cursor: 'pointer' }}>
              Disconnect
            </button>
          )}
        </div>
      </div>

      <div style={{ marginBottom: '2rem', padding: '1rem', border: '1px solid #ccc' }}>
        <h2>Story Protocol Client</h2>
        <p>Client initialized: {storyClient ? 'YES' : 'NO'}</p>
        <p>Client Ready: {storyReady ? 'YES' : 'NO'}</p>
        {storyError && <p style={{ color: 'red' }}>Error: {storyError}</p>}

        <div style={{ marginTop: '1rem' }}>
          <button
            onClick={handleTestStory}
            disabled={loading || !storyReady}
            style={{
              padding: '0.5rem 1rem',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.5 : 1
            }}
          >
            {loading ? 'Testing...' : 'Test Story SDK'}
          </button>
        </div>

        {testStatus && (
          <p style={{ marginTop: '1rem', padding: '0.5rem', backgroundColor: '#f0f0f0' }}>
            {testStatus}
          </p>
        )}
      </div>

      <div style={{ padding: '1rem', backgroundColor: '#ffffcc' }}>
        <h3>Instructions:</h3>
        <ol>
          <li>Click "Connect Wallet" and authenticate with Privy</li>
          <li>Verify your address appears above</li>
          <li>Click "Test Story SDK" to test IP registration</li>
          <li>Check the result - if successful, you will see an IP ID</li>
        </ol>
      </div>
    </div>
  )
}