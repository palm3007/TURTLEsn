/**
 * Handles End-to-End Encryption using Web Crypto API.
 * Uses ECDH for key exchange and AES-GCM for message encryption.
 */
export class EncryptionService {
  private keyPair: CryptoKeyPair | null = null;
  private sharedSecret: CryptoKey | null = null;

  // Generate ECDH Key Pair for this session
  async generateKeyPair(): Promise<JsonWebKey> {
    this.keyPair = await window.crypto.subtle.generateKey(
      {
        name: "ECDH",
        namedCurve: "P-256",
      },
      true,
      ["deriveKey", "deriveBits"]
    );

    return await window.crypto.subtle.exportKey("jwk", this.keyPair.publicKey);
  }

  // Derive shared AES-GCM key from other user's public key
  async deriveSharedKey(otherPublicKeyJwk: JsonWebKey): Promise<void> {
    if (!this.keyPair) throw new Error("Key pair not generated");

    const otherPublicKey = await window.crypto.subtle.importKey(
      "jwk",
      otherPublicKeyJwk,
      {
        name: "ECDH",
        namedCurve: "P-256",
      },
      true,
      []
    );

    this.sharedSecret = await window.crypto.subtle.deriveKey(
      {
        name: "ECDH",
        public: otherPublicKey,
      },
      this.keyPair.privateKey,
      {
        name: "AES-GCM",
        length: 256,
      },
      true,
      ["encrypt", "decrypt"]
    );
    console.log("🔒 Shared secret established successfully.");
  }

  // Encrypt text
  async encrypt(text: string): Promise<{ iv: number[]; data: number[] }> {
    if (!this.sharedSecret) throw new Error("Shared secret not established");

    const encoder = new TextEncoder();
    const data = encoder.encode(text);
    const iv = window.crypto.getRandomValues(new Uint8Array(12));

    const encrypted = await window.crypto.subtle.encrypt(
      {
        name: "AES-GCM",
        iv: iv,
      },
      this.sharedSecret,
      data
    );

    return {
      iv: Array.from(iv),
      data: Array.from(new Uint8Array(encrypted)),
    };
  }

  // Decrypt text
  async decrypt(iv: number[], data: number[]): Promise<string> {
    if (!this.sharedSecret) throw new Error("Shared secret not established");

    const decrypted = await window.crypto.subtle.decrypt(
      {
        name: "AES-GCM",
        iv: new Uint8Array(iv),
      },
      this.sharedSecret,
      new Uint8Array(data)
    );

    const decoder = new TextDecoder();
    return decoder.decode(decrypted);
  }
}
