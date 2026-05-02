import { test, describe } from 'node:test';
import assert from 'node:assert';
import { NostrEventBuilder } from './NostrEventBuilder.js';
import { NostrKeyManager } from './NostrKeyManager.js';
import { LimitOrderParams, DutchAuctionParams } from '@bch-intents/sdk-common';
import { verifyEvent, nip44 } from 'nostr-tools';
import { INTENT_EVENT_KIND, PRIVATE_INTENT_KIND } from './constants.js';

describe('NostrEventBuilder — Limit Order Events', () => {
    const keys = NostrKeyManager.generateEphemeral();

    const dummyLimitParams: LimitOrderParams = {
        makerAddress: 'bitcoincash:qzcsj9hau5r9q30syl9lyqp7v0zpxrtx9c0y980etu',
        sellToken: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
        buyToken: 'BCH',
        sellAmount: 500n,
        buyAmount: 10000n,
        expiryTime: BigInt(Math.floor(Date.now() / 1000) + 3600)
    };

    test('limitOrderEvent constructs a valid NIP-01 event with correct tags', () => {
        const event = NostrEventBuilder.limitOrderEvent(dummyLimitParams, keys.privkey);

        assert.ok(event.id);
        assert.ok(event.sig);
        assert.strictEqual(event.pubkey, keys.pubkey);
        assert.ok(verifyEvent(event));

        const tTag = event.tags.find((t: string[]) => t[0] === 't');
        assert.strictEqual(tTag?.[1], 'bch-intent');

        const typeTag = event.tags.find((t: string[]) => t[0] === 'intent-type');
        assert.strictEqual(typeTag?.[1], 'LIMIT_ORDER');
    });

    test('limitOrderEvent includes expiryTime in serialized payload', () => {
        const event = NostrEventBuilder.limitOrderEvent(dummyLimitParams, keys.privkey);
        const payload = JSON.parse(event.content);

        assert.ok(payload.expiryTime);
        assert.strictEqual(payload.expiryTime, Number(dummyLimitParams.expiryTime));
    });

    test('parseIntentFromEvent round-trips a Limit Order correctly', () => {
        const event = NostrEventBuilder.limitOrderEvent(dummyLimitParams, keys.privkey);
        const intent = NostrEventBuilder.parseIntentFromEvent(event);

        assert.strictEqual(intent.type, 'LIMIT_ORDER');
        assert.strictEqual(intent.makerAddress, dummyLimitParams.makerAddress);
        assert.strictEqual(intent.sellAmount, '500');
        assert.strictEqual(intent.buyAmount, '10000');
    });

    test('event content contains valid JSON with all required Intent fields', () => {
        const event = NostrEventBuilder.limitOrderEvent(dummyLimitParams, keys.privkey);
        const payload = JSON.parse(event.content);

        // Required fields on every Intent
        assert.ok(payload.id, 'missing id');
        assert.ok(payload.type, 'missing type');
        assert.ok(payload.makerAddress, 'missing makerAddress');
        assert.ok(payload.sellToken, 'missing sellToken');
        assert.ok(payload.buyToken, 'missing buyToken');
        assert.ok(payload.sellAmount, 'missing sellAmount');
        assert.ok(payload.buyAmount, 'missing buyAmount');
        assert.ok(payload.status, 'missing status');
        assert.ok(payload.createdAt, 'missing createdAt');
    });
});

describe('NostrEventBuilder — Error Paths', () => {
    test('parseIntentFromEvent throws on invalid event kind', () => {
        const fakeEvent = {
            id: 'fake',
            pubkey: 'fake',
            created_at: 0,
            kind: 1, // Standard text note — NOT an intent event
            tags: [['t', 'bch-intent']],
            content: '{}',
            sig: 'fake'
        } as any;

        assert.throws(() => {
            NostrEventBuilder.parseIntentFromEvent(fakeEvent);
        }, /Invalid event kind/);
    });

    test('parseIntentFromEvent throws on missing bch-intent tag', () => {
        const fakeEvent = {
            id: 'fake',
            pubkey: 'fake',
            created_at: 0,
            kind: INTENT_EVENT_KIND,
            tags: [], // No tags
            content: '{}',
            sig: 'fake'
        } as any;

        assert.throws(() => {
            NostrEventBuilder.parseIntentFromEvent(fakeEvent);
        }, /Missing or invalid tag/);
    });

    test('parseIntentFromEvent throws on wrong tag value', () => {
        const fakeEvent = {
            id: 'fake',
            pubkey: 'fake',
            created_at: 0,
            kind: INTENT_EVENT_KIND,
            tags: [['t', 'wrong-tag']],
            content: '{}',
            sig: 'fake'
        } as any;

        assert.throws(() => {
            NostrEventBuilder.parseIntentFromEvent(fakeEvent);
        }, /Missing or invalid tag/);
    });
});

describe('NostrEventBuilder — NIP-44 Encryption Round-Trip', () => {
    test('encrypt with sender key, decrypt with solver key produces original payload', () => {
        const senderKeys = NostrKeyManager.generateEphemeral();
        const solverKeys = NostrKeyManager.generateEphemeral();

        const originalPayload = JSON.stringify({
            type: 'DUTCH_AUCTION',
            sellToken: 'BCH',
            buyToken: 'aabb',
            sellAmount: '10000',
        });

        // Encrypt as sender
        const encryptedEvent = NostrEventBuilder.encryptForSolver(
            originalPayload,
            senderKeys.privkey,
            solverKeys.pubkey
        );

        assert.ok(verifyEvent(encryptedEvent));
        assert.notStrictEqual(encryptedEvent.content, originalPayload);

        // Decrypt as solver
        const sharedKey = nip44.v2.utils.getConversationKey(solverKeys.privkey, senderKeys.pubkey);
        const decrypted = nip44.v2.decrypt(encryptedEvent.content, sharedKey);

        assert.strictEqual(decrypted, originalPayload);
        const parsed = JSON.parse(decrypted);
        assert.strictEqual(parsed.type, 'DUTCH_AUCTION');
    });

    test('decryption fails with wrong key', () => {
        const senderKeys = NostrKeyManager.generateEphemeral();
        const solverKeys = NostrKeyManager.generateEphemeral();
        const wrongKeys = NostrKeyManager.generateEphemeral();

        const payload = JSON.stringify({ secret: 'data' });
        const encryptedEvent = NostrEventBuilder.encryptForSolver(
            payload,
            senderKeys.privkey,
            solverKeys.pubkey
        );

        // Try to decrypt with a completely unrelated key
        const wrongSharedKey = nip44.v2.utils.getConversationKey(wrongKeys.privkey, senderKeys.pubkey);
        
        assert.throws(() => {
            nip44.v2.decrypt(encryptedEvent.content, wrongSharedKey);
        });
    });
});
