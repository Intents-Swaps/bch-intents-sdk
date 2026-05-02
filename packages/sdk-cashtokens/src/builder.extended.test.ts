import test from 'node:test';
import assert from 'node:assert';
import { IntentBuilder } from '../src/IntentBuilder.js';
import { TokenId, Duration, MissingParameterError } from '@bch-intents/sdk-common';

test('@bch-intents/sdk-cashtokens IntentBuilder — Extended', async (t) => {

    const dummyMaker = 'bitcoincash:qzcsj9hau5r9q30syl9lyqp7v0zpxrtx9c0y980etu';
    const dummyCategory = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';

    // =========================================================================
    // LimitOrderBuilder Extended
    // =========================================================================

    await t.test('LimitOrderBuilder accepts TokenId objects (not just strings)', () => {
        const params = IntentBuilder.limitOrder()
            .makerAddress(dummyMaker)
            .sellToken(TokenId.BCH)
            .buyToken(TokenId.fromCategory(dummyCategory))
            .sellAmount(1000n)
            .buyAmount(500n)
            .build();

        assert.strictEqual(params.sellToken, 'BCH');
        assert.strictEqual(params.buyToken, dummyCategory);
    });

    await t.test('LimitOrderBuilder with explicit expiryTime', () => {
        const expiry = BigInt(Math.floor(Date.now() / 1000) + 7200);
        const params = IntentBuilder.limitOrder()
            .makerAddress(dummyMaker)
            .sellToken('BCH')
            .buyToken(dummyCategory)
            .sellAmount(1000n)
            .buyAmount(500n)
            .expiryTime(expiry)
            .build();

        assert.strictEqual(params.expiryTime, expiry);
    });

    await t.test('Builder fluent API returns this for chaining', () => {
        const builder = IntentBuilder.limitOrder();
        const returned = builder.makerAddress(dummyMaker);
        assert.strictEqual(returned, builder, 'makerAddress() should return the same builder instance');
    });

    // =========================================================================
    // DutchAuctionBuilder Extended
    // =========================================================================

    await t.test('DutchAuctionBuilder includes duration in output when set', () => {
        const params = IntentBuilder.dutchAuction()
            .makerAddress(dummyMaker)
            .sellToken('BCH')
            .buyToken(dummyCategory)
            .sellAmount(10000n)
            .startBuyAmount(500n)
            .endBuyAmount(400n)
            .duration(Duration.hours(2))
            .build();

        assert.strictEqual(params.duration, 7200n);
    });

    await t.test('DutchAuctionBuilder throws on missing startBuyAmount', () => {
        assert.throws(() => {
            IntentBuilder.dutchAuction()
                .makerAddress(dummyMaker)
                .sellToken('BCH')
                .buyToken(dummyCategory)
                .sellAmount(10000n)
                // Missing startBuyAmount
                .endBuyAmount(400n)
                .build();
        }, MissingParameterError);
    });

    await t.test('DutchAuctionBuilder throws on missing endBuyAmount', () => {
        assert.throws(() => {
            IntentBuilder.dutchAuction()
                .makerAddress(dummyMaker)
                .sellToken('BCH')
                .buyToken(dummyCategory)
                .sellAmount(10000n)
                .startBuyAmount(500n)
                // Missing endBuyAmount
                .build();
        }, MissingParameterError);
    });
});
