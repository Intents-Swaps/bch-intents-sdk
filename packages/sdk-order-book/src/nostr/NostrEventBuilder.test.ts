import { test, describe } from 'node:test';
import assert from 'node:assert';
import { NostrEventBuilder } from './NostrEventBuilder.js';
import { NostrKeyManager } from './NostrKeyManager.js';
import { DutchAuctionParams, LimitOrderParams } from '@bch-intents/sdk-common';
import { verifyEvent } from 'nostr-tools';

describe('NostrEventBuilder', () => {
    const keys = NostrKeyManager.generateEphemeral();

    const dummyDutchParams: DutchAuctionParams = {
        makerAddress: 'bitcoincash:qp3x...',
        sellToken: 'BCH',
        buyToken: '0b1a...',
        sellAmount: 10000n,
        startBuyAmount: 50000n,
        endBuyAmount: 40000n,
        duration: 3600n
    };

    test('dutchAuctionEvent constructs a valid NIP-01 event', () => {
        const event = NostrEventBuilder.dutchAuctionEvent(dummyDutchParams, keys.privkey);
        
        assert.ok(event.id);
        assert.ok(event.sig);
        assert.strictEqual(event.pubkey, keys.pubkey);
        assert.ok(verifyEvent(event));

        const tTag = event.tags.find(t => t[0] === 't');
        assert.strictEqual(tTag?.[1], 'bch-intent');
        
        const typeTag = event.tags.find(t => t[0] === 'intent-type');
        assert.strictEqual(typeTag?.[1], 'DUTCH_AUCTION');
    });

    test('parseIntentFromEvent parses intended payload', () => {
        const event = NostrEventBuilder.dutchAuctionEvent(dummyDutchParams, keys.privkey);
        const intent = NostrEventBuilder.parseIntentFromEvent(event);
        
        assert.strictEqual(intent.type, 'DUTCH_AUCTION');
        assert.strictEqual(intent.makerAddress, dummyDutchParams.makerAddress);
        assert.strictEqual(intent.sellAmount, '10000');
    });

    test('encryptForSolver properly encrypts event', () => {
        const solverKeys = NostrKeyManager.generateEphemeral();
        const payload = JSON.stringify({ secret: "data" });
        
        const event = NostrEventBuilder.encryptForSolver(payload, keys.privkey, solverKeys.pubkey);
        
        assert.ok(verifyEvent(event));
        assert.strictEqual(event.kind, 20070);
        
        const pTag = event.tags.find(t => t[0] === 'p');
        assert.strictEqual(pTag?.[1], solverKeys.pubkey);
        
        assert.notStrictEqual(event.content, payload); // ensure it's encrypted
    });
});
