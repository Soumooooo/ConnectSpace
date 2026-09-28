/**
 * Web Crypto API utilities for client-side end-to-end encryption of sensitive
 * shared meeting data (chat messages, shared text/notes).
 */

const SALT_STRING = 'connectspace-room-v1-salt';
const cachedKeys = new Map<string, CryptoKey>();

async function getDerivedKey(passphrase: string): Promise<CryptoKey> {
  if (cachedKeys.has(passphrase)) {
    return cachedKeys.get(passphrase)!;
  }

  const enc = new TextEncoder();
  const rawKeyMaterial = await window.crypto.subtle.importKey(
    'raw',
    enc.encode(passphrase),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  const derivedKey = await window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: enc.encode(SALT_STRING),
      iterations: 100000,
      hash: 'SHA-256'
    },
    rawKeyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );

  cachedKeys.set(passphrase, derivedKey);
  return derivedKey;
}

export async function encryptText(plainText: string, passphrase: string): Promise<string> {
  if (!passphrase || !plainText) return plainText;
  try {
    const key = await getDerivedKey(passphrase);
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const enc = new TextEncoder();
    const encodedData = enc.encode(plainText);

    const ciphertext = await window.crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv
      },
      key,
      encodedData
    );

    // Pack IV + ciphertext into base64
    const combined = new Uint8Array(iv.length + ciphertext.byteLength);
    combined.set(iv, 0);
    combined.set(new Uint8Array(ciphertext), iv.length);

    let binary = '';
    for (let i = 0; i < combined.byteLength; i++) {
      binary += String.fromCharCode(combined[i]);
    }
    return `enc:v1:${window.btoa(binary)}`;
  } catch (err) {
    console.error('Web Crypto encrypt error:', err);
    return plainText;
  }
}

export async function decryptText(encryptedText: string, passphrase: string): Promise<string> {
  if (!encryptedText || !encryptedText.startsWith('enc:v1:')) {
    return encryptedText;
  }
  if (!passphrase) {
    return '[🔒 Encrypted message - enter room passkey to view]';
  }

  try {
    const key = await getDerivedKey(passphrase);
    const base64Data = encryptedText.slice(7);
    const binary = window.atob(base64Data);
    const combined = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      combined[i] = binary.charCodeAt(i);
    }

    const iv = combined.slice(0, 12);
    const ciphertext = combined.slice(12);

    const decryptedBuffer = await window.crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv
      },
      key,
      ciphertext
    );

    const dec = new TextDecoder();
    return dec.decode(decryptedBuffer);
  } catch (err) {
    return '[🔒 Encrypted message - incorrect room passkey]';
  }
}

export function generateRandomPasskey(): string {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
  let result = '';
  const randomBytes = window.crypto.getRandomValues(new Uint8Array(12));
  for (let i = 0; i < 12; i++) {
    result += chars[randomBytes[i] % chars.length];
  }
  return result;
}
