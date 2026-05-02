import test from 'node:test';
import assert from 'node:assert';
import { IntentsLocalClient } from '../src/IntentsLocalClient.js';
import { TokenId, Duration } from '@bch-intents/sdk-common';

test('@bch-intents/sdk-cashtokens IntentsLocalClient', async (t) => {

    const dummyMaker = 'bitcoincash:qzcsj9hau5r9q30syl9lyqp7v0zpxrtx9c0y980etu';
    const dummyCategory = 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';

    // Use no provider (defaults to ElectrumNetworkProvider internally)
    const client = new IntentsLocalClient();

    await t.test('compileDutchAuction returns a Contract with valid .address', () => {
        const contract = client.compileDutchAuction({
            makerAddress: dummyMaker,
            sellToken: 'BCH',
            buyToken: dummyCategory,
            sellAmount: 10000n,
            startBuyAmount: 500n,
            endBuyAmount: 400n,
            duration: Duration.hours(1),
        });

        assert.ok(contract.address);
        assert.ok(contract.address.startsWith('bitcoincash:'));
    });

    await t.test('compileLimitOrder returns a Contract with valid .tokenAddress', () => {
        const contract = client.compileLimitOrder({
            makerAddress: dummyMaker,
            sellToken: dummyCategory,
            buyToken: 'BCH',
            sellAmount: 500n,
            buyAmount: 10000n,
        });

        assert.ok(contract.address);
        assert.ok(contract.tokenAddress);
    });

    await t.test('compileFromType DUTCH_AUCTION routes correctly', () => {
        const contract = client.compileFromType('DUTCH_AUCTION', {
            makerAddress: dummyMaker,
            sellToken: 'BCH',
            buyToken: dummyCategory,
            sellAmount: 10000n,
            startBuyAmount: 500n,
            endBuyAmount: 400n,
            duration: Duration.hours(1),
        });

        assert.ok(contract.address);
    });

    await t.test('compileFromType LIMIT_ORDER routes correctly', () => {
        const contract = client.compileFromType('LIMIT_ORDER', {
            makerAddress: dummyMaker,
            sellToken: dummyCategory,
            buyToken: 'BCH',
            sellAmount: 500n,
            buyAmount: 10000n,
        });

        assert.ok(contract.address);
    });
});
