import { generateSecretKey, getPublicKey } from 'nostr-tools';
import { bytesToHex, hexToBytes } from '@noble/hashes/utils';

export class NostrKeyManager {
    /**
     * Generate an ephemeral, throw-away Nostr keypair.
     * This is used by frontends (like 00 Wallet) that don't maintain long-lived Nostr identities.
     */
    static generateEphemeral(): { privkey: Uint8Array, pubkey: string, privkeyHex: string } {
        const privkey = generateSecretKey();
        const pubkey = getPublicKey(privkey);
        return { 
            privkey, 
            pubkey, 
            privkeyHex: bytesToHex(privkey)
        };
    }

    /**
     * Reconstruct a keypair from a known private key hex string.
     */
    static fromPrivateKey(hex: string): { privkey: Uint8Array, pubkey: string } {
        let cleanHex = hex.startsWith('0x') ? hex.slice(2) : hex;
        const privkey = hexToBytes(cleanHex);
        const pubkey = getPublicKey(privkey);
        return { privkey, pubkey };
    }
}
