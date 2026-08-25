import { generateKeyPair, savePrivateKey } from './crypto';

export async function setupUserEncryption(userId: string, token: string) {
  if (!localStorage.getItem(`meshchat_priv_${userId}`)) {
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
}