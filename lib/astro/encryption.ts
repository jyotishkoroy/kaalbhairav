import crypto from 'crypto'

type EncryptedEnvelope = {
  version: number
  iv: string
  tag: string
  ciphertext: string
}

function getKey(): Buffer {
  const raw = process.env.PII_ENCRYPTION_KEY

  if (!raw) {
    throw new Error('PII_ENCRYPTION_KEY is missing')
  }

  const key = Buffer.from(raw, 'base64')

  if (key.length !== 32) {
    throw new Error('PII_ENCRYPTION_KEY must be 32 bytes base64')
  }

  return key
}

export function encryptJson(value: unknown): string {
  const key = getKey()
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv)
  const plaintext = Buffer.from(JSON.stringify(value), 'utf8')

  const ciphertext = Buffer.concat([
    cipher.update(plaintext),
    cipher.final(),
  ])

  const envelope: EncryptedEnvelope = {
    version: Number(process.env.PII_ENCRYPTION_KEY_VERSION ?? '1'),
    iv: iv.toString('base64'),
    tag: cipher.getAuthTag().toString('base64'),
    ciphertext: ciphertext.toString('base64'),
  }

  return JSON.stringify(envelope)
}

export function decryptJson<T>(encrypted: string): T {
  const key = getKey()
  const envelope = JSON.parse(encrypted) as EncryptedEnvelope
  const decipher = crypto.createDecipheriv(
    'aes-256-gcm',
    key,
    Buffer.from(envelope.iv, 'base64'),
  )

  decipher.setAuthTag(Buffer.from(envelope.tag, 'base64'))

  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(envelope.ciphertext, 'base64')),
    decipher.final(),
  ])

  return JSON.parse(plaintext.toString('utf8')) as T
}
