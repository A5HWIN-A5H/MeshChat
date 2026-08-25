
export async function generateKeyPair() {
  const keyPair = await window.crypto.subtle.generateKey(
    {
      name: "RSA-OAEP",
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: "SHA-256",
    },
    true,
    ["encrypt", "decrypt"]
  );

  const publicKeyJwk = await window.crypto.subtle.exportKey("jwk", keyPair.publicKey);
  const privateKeyJwk = await window.crypto.subtle.exportKey("jwk", keyPair.privateKey);

  return {
    publicKey: JSON.stringify(publicKeyJwk),
    privateKey: JSON.stringify(privateKeyJwk),
  };
}

export function savePrivateKey(userId: string, privateKey: string) {
  localStorage.setItem(`meshchat_priv_${userId}`, privateKey);
}

export function getPrivateKey(userId: string): string | null {
  return localStorage.getItem(`meshchat_priv_${userId}`);
}

export async function encryptMessage(publicKeyJwkStr: string, plaintext: string): Promise<string> {
  const jwk = JSON.parse(publicKeyJwkStr);
  const publicKey = await window.crypto.subtle.importKey(
    "jwk",
    jwk,
    { name: "RSA-OAEP", hash: "SHA-256" },
    false,
    ["encrypt"]
  );

  const encoded = new TextEncoder().encode(plaintext);
  const ciphertext = await window.crypto.subtle.encrypt(
    { name: "RSA-OAEP" },
    publicKey,
    encoded
  );

  return btoa(String.fromCharCode(...new Uint8Array(ciphertext)));
}

export async function decryptMessage(privateKeyJwkStr: string, base64Ciphertext: string): Promise<string> {
  try {
    const jwk = JSON.parse(privateKeyJwkStr);
    const privateKey = await window.crypto.subtle.importKey(
      "jwk",
      jwk,
      { name: "RSA-OAEP", hash: "SHA-256" },
      false,
      ["decrypt"]
    );

    const binaryString = atob(base64Ciphertext);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    const decrypted = await window.crypto.subtle.decrypt(
      { name: "RSA-OAEP" },
      privateKey,
      bytes
    );

    return new TextDecoder().decode(decrypted);
  } catch (err) {
    return "[Unable to decrypt message]";
  }
}


export async function setupUserEncryption(userId: string, token: string) {
  const storageKey = `meshchat_priv_${userId}`;
  const existingPrivateKeyJwk = localStorage.getItem(storageKey);

  if (existingPrivateKeyJwk) {
    return;
  }

  try {
    const { publicKey, privateKey } = await generateKeyPair();
    savePrivateKey(userId, privateKey);

    await fetch(`${process.env.NEXT_PUBLIC_API_URL}/users/keys`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ publicKey })
    });
  } catch (err) {
    console.error('Failed to initialize E2EE keypair:', err);
  }
}