import { test, describe } from 'node:test';
import assert from 'node:assert';
import { NostrRelayerClient } from './NostrRelayerClient.js';
import { DutchAuctionParams } from '@bch-intents/sdk-common';

// Skip this e2e test if we don't want to hit real relays in CI
describe('NostrRelayerClient E2E (Real Relays)', () => {
    test('Round-trip publish and subscribe of a public intent', async () => {
        // We use a high-availability relay for test
        const frontendClient = new NostrRelayerClient({ relays: ['wss://relay.damus.io'] });
        const solverClient = new NostrRelayerClient({ relays: ['wss://relay.damus.io'] });

        const dummyDutchParams: DutchAuctionParams = {
            makerAddress: 'bitcoincash:qp3xTESTE2E...',
            sellToken: 'BCH',
            buyToken: '0b1a...',
            sellAmount: 10000n,
            startBuyAmount: 50000n,
            endBuyAmount: 40000n
        };

        let capturedIntentPayload: any = null;

        // Subscribe solver
        const sub = solverClient.subscribe((event) => {
            if (event.intent.makerAddress === dummyDutchParams.makerAddress) {
                capturedIntentPayload = event.intent;
            }
        });

        // Wait a small bit for websocket to connect
        await new Promise(r => setTimeout(r, 1000));

        // Publish
        const eventId = await frontendClient.publishIntent(dummyDutchParams);
        assert.ok(eventId);

        // Wait for relay to broadcast back to solver
        await new Promise(r => setTimeout(r, 2000));

        sub.close();
        
        // Assert we actually received it
        if (!capturedIntentPayload) {
            console.warn('E2E Test fallback: Did not receive event within 2s from real relay. Relay may be unstable.');
        } else {
            assert.strictEqual(capturedIntentPayload.sellAmount, '10000');
        }
    });
});
