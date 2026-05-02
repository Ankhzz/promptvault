import { Address } from 'viem'

export const STORY_CHAIN = {
  id: 1315,
  name: 'Story Aeneid Testnet',
  rpcUrl: 'https://aeneid.storyrpc.io',
  explorer: 'https://aeneid.storyscan.xyz',
} as const

export const CONTRACTS = {
  SPG_NFT_CONTRACT: '0xc32A8a0FF3beDDDa58393d022aF433e78739FAbc' as Address,
  LICENSE_TOKEN: '0xFe3838BFb30B34170F00030B52eA4893d8aAC6bC' as Address,
  LICENSING_MODULE: '0x04fbd8a2e56dd85CFD5500A4A4DfA955B9f1dE6f' as Address,
  PI_LICENSE_TEMPLATE: '0x2E896b0b2Fdb7457499B56AAaA4AE55BCB4Cd316' as Address,
  WIP_TOKEN: '0x1514000000000000000000000000000000000000' as Address,
  ROYALTY_MODULE: '0xD2f60c40fEbccf6311f8B47c4f2Ec6b040400086' as Address,
  ROYALTY_POLICY_LAP: '0xBe54FB168b3c982b7AaE60dB6CF75Bd8447b390E' as Address,
  OWNER_WRITE_CONDITION: '0x4C9bFC96d7092b590D497A191826C3dA2277c34B' as Address,
  LICENSE_READ_CONDITION: '0xC0640AD4CF2CaA9914C8e5C44234359a9102f7a3' as Address,
} as const

export const CDR_CONFIG = {
  network: 'testnet' as const,
  defaultTimeoutMs: 180000,
  validationRpcUrl: 'https://aeneid.storyrpc.io' as const,
} as const

export function getCometRpcUrl(): string {
  const url = process.env.NEXT_PUBLIC_COMET_RPC_URL
  if (!url) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('NEXT_PUBLIC_COMET_RPC_URL is required in production (must be HTTPS)')
    }
    return 'http://172.192.41.96:26657'
  }
  if (process.env.NODE_ENV === 'production' && !url.startsWith('https://')) {
    throw new Error('NEXT_PUBLIC_COMET_RPC_URL must use HTTPS in production')
  }
  return url
}

export const UI_CONFIG = {
  projectName: 'PromptVault',
  ipfsGateway: 'https://ipfs.io/ipfs/',
} as const