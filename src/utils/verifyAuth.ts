import { createHmac } from 'crypto';

const SECRET_KEY = process.env.AUTH_SECRET_KEY;
if (!SECRET_KEY) {
  throw new Error('AUTH_SECRET_KEY environment variable is not set');
}

export function verifySignature(walletAddress: string, timestamp: string, signature: string): boolean {
  // Verify timestamp is not too old (e.g., 5 minutes)
  const timestampNum = parseInt(timestamp, 10);
  if (isNaN(timestampNum) || Date.now() - timestampNum > 5 * 60 * 1000) {
    return false;
  }

  const message = `${walletAddress.toLowerCase()}:${timestamp}`;
  const expectedSignature = createHmac('sha256', SECRET_KEY || '')
    .update(message)
    .digest('hex');

  return signature === expectedSignature;
}

export function signWallet(walletAddress: string): string {
  const timestamp = Date.now();
  const message = `${walletAddress.toLowerCase()}:${timestamp}`;
  const signature = createHmac('sha256', SECRET_KEY || '')
    .update(message)
    .digest('hex');
  
  return JSON.stringify({ wallet: walletAddress, timestamp, signature });
}

export function verifyStoredWallet(storedData: string): string | null {
  try {
    const { wallet, timestamp, signature } = JSON.parse(storedData);
    if (verifySignature(wallet, timestamp, signature)) {
      return wallet;
    }
  } catch (e) {
    console.error('Error verifying stored wallet:', e);
  }
  return null;
}
