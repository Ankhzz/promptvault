export type UploadState =
  | 'idle'
  | 'encrypting'
  | 'uploading_ipfs'
  | 'creating_metadata'
  | 'registering_story'
  | 'creating_cdr_vault'
  | 'complete'
  | 'error'

export interface UploadProgress {
  state: UploadState
  message: string
  progress: number
  error?: string
}

export interface AssetMetadata {
  name: string
  description: string
  fileType: string
  encryptedFileCid: string
  creatorAddress: `0x${string}`
  createdAt: string
}

export interface RegistrationResult {
  success: boolean
  ipId?: `0x${string}`
  licenseTermsId?: number
  txHash?: string
  error?: string
}