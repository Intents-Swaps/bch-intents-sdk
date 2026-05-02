import { test, describe, mock } from 'node:test';
import assert from 'node:assert';
import { NostrRelayerClient } from './NostrRelayerClient.js';
import { NostrKeyManager } from './NostrKeyManager.js';
import { DutchAuctionParams } from '@bch-intents/sdk-common';

describe('NostrRelayerClient', () => {
    test('Client generates ephemeral keypair if none provided', () => {
        const client = new NostrRelayerClient();
        assert.ok(client.pubkey);
        // Uses default relays
        assert.ok(client.relays.includes('wss://relay.damus.io'));
    });

    test('Client uses provided keypair if hex provided', () => {
        const keys = NostrKeyManager.generateEphemeral();
        const client = new NostrRelayerClient({ privateKeyHex: keys.privkeyHex, relays: [] });
        
        assert.strictEqual(client.pubkey, keys.pubkey);
    });

    test('publishIntent successfully broadcasts to pool', async () => {
        const client = new NostrRelayerClient();
        
        // Mock the underlying SimplePool.publish
        const publishMock = mock.fn(() => [Promise.resolve()]);
        (client as any).pool.publish = publishMock;

        const dummyDutchParams: DutchAuctionParams = {
            makerAddress: 'bitcoincash:qp3x...',
            sellToken: 'BCH',
            buyToken: '0b1a...',
            sellAmount: 10000n,
            startBuyAmount: 50000n,
            endBuyAmount: 40000n
        };

        const eventId = await client.publishIntent(dummyDutchParams);
        
        assert.ok(eventId);
        assert.strictEqual(publishMock.mock.calls.length, 1);
        
        const publishedEvent = publishMock.mock.calls[0].arguments[1];
        assert.strictEqual(publishedEvent.kind, 20069);
    });

    test('subscribe captures intent events', () => {
        const client = new NostrRelayerClient();
        
        let handlerPassedToSubscribe: any;
        
        // Mock subscribeMany to capture the handler
        const subMock = mock.fn((relays, filters, options: any) => {
            handlerPassedToSubscribe = options.onevent;
            return { close: () => {} };
        });
        (client as any).pool.subscribeMany = subMock;

        let capturedIntentEvent: any;
        const sub = client.subscribe((intentEvent) => {
            capturedIntentEvent = intentEvent;
        });

        assert.ok(handlerPassedToSubscribe);
        assert.ok(sub.close);
    });
});
