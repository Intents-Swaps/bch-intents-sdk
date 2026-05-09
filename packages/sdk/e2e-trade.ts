import { TestNetWallet } from 'mainnet-js';
import {
    NostrRelayerClient,
    MainnetJSAdapter,
    IntentBuilder,
    TokenId,
    Duration
} from '@bch-intents/sdk';

async function runE2E() {
    console.log('[E2E] Generating fresh Chipnet wallet...');
    const wallet = await TestNetWallet.newRandom();
    const adapter = new MainnetJSAdapter(wallet);
    const address = await adapter.getAddress();

    console.log(`[E2E] Maker Wallet Ready: ${address}`);
    console.log('[E2E] Connecting to Nostr Relay Network...');

    const relayer = new NostrRelayerClient();

    console.log('[E2E] Constructing Limit Order...');
    // Create a mock intent for testing
    // We will use dummy token categories but real BCH amounts
    const sellTokenCat = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
    const buyTokenCat = 'BCH';

    const intentParams = IntentBuilder.limitOrder()
        .makerAddress(address)
        .sellToken(sellTokenCat)
        .buyToken(buyTokenCat)
        .sellAmount(1000n)
        .buyAmount(5000n)
        .build();

    console.log('[E2E] Intent Built:');
    console.log(JSON.stringify(intentParams, (key, value) =>
        typeof value === 'bigint' ? value.toString() : value,
        2));

    try {
        console.log('[E2E] Submitting to Nostr Pool...');
        await relayer.publishIntent(intentParams, 'LIMIT_ORDER');
        console.log(`[E2E] Success! Intent broadcasted to Nostr relays.`);

        console.log('[E2E] Connecting to WebSocket for fill notifications...');
        relayer.subscribe((event: any) => {
            console.log(`[E2E] \u26A1 NOTIFICATION: Intent picked up by solver!`);
            console.log(`[E2E] Event:`, event);
        });

    } catch (error: any) {
        console.error('[E2E ERROR]', error);
    }

}

runE2E().catch(console.error);
