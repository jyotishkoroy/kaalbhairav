import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto'

const ALGO = 'aes-256-gcm'

function getKey(version = 1): Buffer {
  const secret = process.env.PII_ENCRYPTION_KEY
  if (!secret || secret.length < 16) {
    throw new Error('PII_ENCRYPTION_KEY missing or too short')
  }
  const salt = `kaalbhairav-pii-v${version}`
  return scryptSync(secret, salt, 32)
}

export function encryptJson(payload: unknown, keyVersion = 1): string {
  const key = getKey(keyVersion)
  const iv = randomBytes(12)
  const plaintext = Buffer.from(JSON.stringify(payload), 'utf8')
  const cipher = createCipheriv(ALGO, key, iv)
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()])
  const authTag = cipher.getAuthTag()
  const envelope = {
    v: keyVersion,
    iv: iv.toString('base64'),
    tag: authTag.toString('base64'),
    ct: ciphertext.toString('base64'),
  }
  return Buffer.from(JSON.stringify(envelope), 'utf8').toString('base64')
}

export function decryptJson<T = unknown>(envelopeB64: string): T {
  const envelopeJson = Buffer.from(envelopeB64, 'base64').toString('utf8')
  const env = JSON.parse(envelopeJson) as { v: number; iv: string; tag: string; ct: string }
  const key = getKey(env.v)
  const iv = Buffer.from(env.iv, 'base64')
  const tag = Buffer.from(env.tag, 'base64')
  const ct = Buffer.from(env.ct, 'base64')
  const decipher = createDecipheriv(ALGO, key, iv)
  decipher.setAuthTag(tag)
  const plaintext = Buffer.concat([decipher.update(ct), decipher.final()])
  return JSON.parse(plaintext.toString('utf8')) as T
}
