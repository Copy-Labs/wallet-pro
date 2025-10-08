/**
 * Encryption Service
 * Handles password-based encryption for private keys and sensitive data
 * Uses Web Crypto API with AES-GCM and PBKDF2
 */

// Encryption configuration
const PBKDF2_ITERATIONS = 100000 // OWASP recommended minimum
const SALT_LENGTH = 16 // 128 bits
const IV_LENGTH = 12 // 96 bits for GCM
const KEY_LENGTH = 256 // 256 bits for AES

/**
 * Generate a random salt for PBKDF2
 */
function generateSalt(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(SALT_LENGTH))
}

/**
 * Generate a random IV for AES-GCM
 */
function generateIV(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(IV_LENGTH))
}

/**
 * Derive an encryption key from a password using PBKDF2
 */
async function deriveKey(
  password: string,
  salt: Uint8Array,
  extractable: boolean = false
): Promise<CryptoKey> {
  // Convert password to key material
  const encoder = new TextEncoder()
  const passwordBuffer = encoder.encode(password)

  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    passwordBuffer,
    'PBKDF2',
    false,
    ['deriveBits', 'deriveKey']
  )

  // Derive key using PBKDF2
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256'
    },
    keyMaterial,
    {
      name: 'AES-GCM',
      length: KEY_LENGTH
    },
    extractable, // Make extractable when needed for hashing
    ['encrypt', 'decrypt']
  )
}

/**
 * Encrypt data with a password
 */
export async function encryptWithPassword(
  data: string,
  password: string
): Promise<string> {
  try {
    // Generate salt and IV
    const salt = generateSalt()
    const iv = generateIV()

    // Derive encryption key from password
    const key = await deriveKey(password, salt)

    // Encrypt data
    const encoder = new TextEncoder()
    const dataBuffer = encoder.encode(data)
    
    const encryptedBuffer = await crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv
      },
      key,
      dataBuffer
    )

    // Combine salt + iv + encrypted data
    const encryptedArray = new Uint8Array(encryptedBuffer)
    const combined = new Uint8Array(salt.length + iv.length + encryptedArray.length)
    combined.set(salt, 0)
    combined.set(iv, salt.length)
    combined.set(encryptedArray, salt.length + iv.length)

    // Convert to base64 for storage
    return btoa(String.fromCharCode(...combined))
  } catch (error) {
    console.error('[Encryption] Error encrypting data:', error)
    throw new Error('Failed to encrypt data')
  }
}

/**
 * Decrypt data with a password
 */
export async function decryptWithPassword(
  encryptedData: string,
  password: string
): Promise<string> {
  try {
    // Convert from base64
    const combined = Uint8Array.from(atob(encryptedData), c => c.charCodeAt(0))

    // Extract salt, iv, and encrypted data
    const salt = combined.slice(0, SALT_LENGTH)
    const iv = combined.slice(SALT_LENGTH, SALT_LENGTH + IV_LENGTH)
    const encryptedArray = combined.slice(SALT_LENGTH + IV_LENGTH)

    // Derive decryption key from password
    const key = await deriveKey(password, salt)

    // Decrypt data
    const decryptedBuffer = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv
      },
      key,
      encryptedArray
    )

    // Convert back to string
    const decoder = new TextDecoder()
    return decoder.decode(decryptedBuffer)
  } catch (error) {
    console.error('[Encryption] Error decrypting data:', error)
    throw new Error('Failed to decrypt data - incorrect password or corrupted data')
  }
}

/**
 * Hash a password for verification (not for encryption!)
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = generateSalt()
  const key = await deriveKey(password, salt, true) // Make extractable for hashing

  // Export key as raw bytes
  const keyBuffer = await crypto.subtle.exportKey('raw', key)
  const keyArray = new Uint8Array(keyBuffer)

  // Combine salt + key hash
  const combined = new Uint8Array(salt.length + keyArray.length)
  combined.set(salt, 0)
  combined.set(keyArray, salt.length)

  return btoa(String.fromCharCode(...combined))
}

/**
 * Verify a password against a hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  try {
    // Convert from base64
    const combined = Uint8Array.from(atob(hash), c => c.charCodeAt(0))

    // Extract salt and stored key hash
    const salt = combined.slice(0, SALT_LENGTH)
    const storedKeyHash = combined.slice(SALT_LENGTH)

    // Derive key from provided password
    const key = await deriveKey(password, salt, true) // Make extractable for verification
    const keyBuffer = await crypto.subtle.exportKey('raw', key)
    const keyArray = new Uint8Array(keyBuffer)
    
    // Compare key hashes (constant-time comparison)
    if (keyArray.length !== storedKeyHash.length) {
      return false
    }
    
    let result = 0
    for (let i = 0; i < keyArray.length; i++) {
      result |= keyArray[i] ^ storedKeyHash[i]
    }
    
    return result === 0
  } catch (error) {
    console.error('[Encryption] Error verifying password:', error)
    return false
  }
}

/**
 * Validate password strength
 */
export function validatePasswordStrength(password: string): {
  valid: boolean
  errors: string[]
  strength: 'weak' | 'medium' | 'strong'
} {
  const errors: string[] = []
  
  // Minimum length
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long')
  }
  
  // Check for uppercase
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter')
  }
  
  // Check for lowercase
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter')
  }
  
  // Check for numbers
  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number')
  }
  
  // Check for special characters
  if (!/[^A-Za-z0-9]/.test(password)) {
    errors.push('Password must contain at least one special character')
  }
  
  // Determine strength
  let strength: 'weak' | 'medium' | 'strong' = 'weak'
  if (errors.length === 0) {
    if (password.length >= 12) {
      strength = 'strong'
    } else {
      strength = 'medium'
    }
  }
  
  return {
    valid: errors.length === 0,
    errors,
    strength
  }
}

/**
 * Generate a secure random password
 */
export function generateSecurePassword(length: number = 16): string {
  const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=[]{}|;:,.<>?'
  const randomValues = crypto.getRandomValues(new Uint8Array(length))
  
  let password = ''
  for (let i = 0; i < length; i++) {
    password += charset[randomValues[i] % charset.length]
  }
  
  return password
}

