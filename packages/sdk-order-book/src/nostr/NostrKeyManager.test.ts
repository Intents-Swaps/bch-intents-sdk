import { test, describe } from 'node:test';
import assert from 'node:assert';
import { NostrKeyManager } from './NostrKeyManager.js';
import { getPublicKey } from 'nostr-tools';

describe('NostrKeyManager', () => {
    test('generateEphemeral creates valid keypair', () => {
        const keys = NostrKeyManager.generateEphemeral();
        assert.ok(keys.privkey);
        assert.ok(keys.pubkey);
        assert.ok(keys.privkeyHex);
        
        // Verify public key stems from private key
        const derivedPubkey = getPublicKey(keys.privkey);
        assert.strictEqual(keys.pubkey, derivedPubkey);
    });

    test('generateEphemeral generates unique keys', () => {
        const keys1 = NostrKeyManager.generateEphemeral();
        const keys2 = NostrKeyManager.generateEphemeral();
        
        assert.notStrictEqual(keys1.privkeyHex, keys2.privkeyHex);
        assert.notStrictEqual(keys1.pubkey, keys2.pubkey);
    });

    test('fromPrivateKey correctly restores keypair', () => {
        const initial = NostrKeyManager.generateEphemeral();
        const restored = NostrKeyManager.fromPrivateKey(initial.privkeyHex);
        
        assert.strictEqual(restored.pubkey, initial.pubkey);
    });
});
