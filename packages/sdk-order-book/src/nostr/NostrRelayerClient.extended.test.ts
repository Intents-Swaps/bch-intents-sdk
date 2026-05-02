import { test, describe, mock } from 'node:test';
import assert from 'node:assert';
import { NostrRelayerClient } from './NostrRelayerClient.js';
import { NostrKeyManager } from './NostrKeyManager.js';
import { LimitOrderParams, DutchAuctionParams } from '@bch-intents/sdk-common';
import { INTENT_EVENT_KIND } from './constants.js';

describe('NostrRelayerClient — Extended', () => {
    test('publishIntent with LIMIT_ORDER type uses correct event kind', async () => {
        const client = new NostrRelayerClient();

        // Mock the pool.publish
        const publishMock = mock.fn(() => [Promise.resolve()]);
        (client as any).pool.publish = publishMock;

        const limitParams: LimitOrderParams = {
            makerAddress: 'bitcoincash:qzcsj9hau5r9q30syl9lyqp7v0zpxrtx9c0y980etu',
            sellToken: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
            buyToken: 'BCH',
            sellAmount: 500n,
            buyAmount: 10000n,
        };

        const eventId = await client.publishIntent(limitParams, 'LIMIT_ORDER');

        assert.ok(eventId);
        assert.strictEqual(publishMock.mock.calls.length, 1);

        const publishedEvent = publishMock.mock.calls[0].arguments[1];
        assert.strictEqual(publishedEvent.kind, INTENT_EVENT_KIND);

        // Verify the content includes LIMIT_ORDER type
        const content = JSON.parse(publishedEvent.content);
        assert.strictEqual(content.type, 'LIMIT_ORDER');
    });

    test('publishPrivateIntent encrypts content before publishing', async () => {
        const client = new NostrRelayerClient();
        const solverKeys = NostrKeyManager.generateEphemeral();

        const publishMock = mock.fn(() => [Promise.resolve()]);
        (client as any).pool.publish = publishMock;

        const rawPayload = JSON.stringify({ type: 'LIMIT_ORDER', secret: 'data' });
        const eventId = await client.publishPrivateIntent(rawPayload, solverKeys.pubkey);

        assert.ok(eventId);
        const publishedEvent = publishMock.mock.calls[0].arguments[1];

        // The content must NOT be the raw payload (it's encrypted)
        assert.notStrictEqual(publishedEvent.content, rawPayload);

        // The p tag must point to the solver's pubkey
        const pTag = publishedEvent.tags.find((t: string[]) => t[0] === 'p');
        assert.strictEqual(pTag?.[1], solverKeys.pubkey);
    });

    test('subscribe sets up filter with correct event kind', () => {
        const client = new NostrRelayerClient();

        let capturedFilter: any;
        const subMock = mock.fn((relays: any, filters: any, options: any) => {
            capturedFilter = filters;
            return { close: () => {} };
        });
        (client as any).pool.subscribeMany = subMock;

        client.subscribe(() => {});

        assert.ok(capturedFilter);
        // subscribeMany receives filters — could be array or single object
        const filter = Array.isArray(capturedFilter) ? capturedFilter[0] : capturedFilter;
        assert.ok(filter.kinds, 'Filter should contain kinds property');
        assert.ok(filter.kinds.includes(INTENT_EVENT_KIND), `Filter kinds should include ${INTENT_EVENT_KIND}`);
    });

    test('getActiveIntents returns parsed intents from mocked query', async () => {
        const client = new NostrRelayerClient();
        const keys = NostrKeyManager.generateEphemeral();

        // Import NostrEventBuilder to create a realistic event
        const { NostrEventBuilder } = await import('./NostrEventBuilder.js');

        const dummyParams: DutchAuctionParams = {
            makerAddress: 'bitcoincash:qzcsj9hau5r9q30syl9lyqp7v0zpxrtx9c0y980etu',
            sellToken: 'BCH',
            buyToken: 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
            sellAmount: 10000n,
            startBuyAmount: 50000n,
            endBuyAmount: 40000n,
        };
        const realEvent = NostrEventBuilder.dutchAuctionEvent(dummyParams, keys.privkey);

        // Mock querySync to return the event
        (client as any).pool.querySync = mock.fn(async () => [realEvent]);

        const intents = await client.getActiveIntents();

        assert.strictEqual(intents.length, 1);
        assert.strictEqual(intents[0].intent.type, 'DUTCH_AUCTION');
        assert.strictEqual(intents[0].intent.sellAmount, '10000');
        assert.strictEqual(intents[0].mode, 'public');
    });
});
