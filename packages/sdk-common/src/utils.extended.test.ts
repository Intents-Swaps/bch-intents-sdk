import test from 'node:test';
import assert from 'node:assert';
import { derivePkhFromAddress, generateIntentId, Duration } from '../src/index.js';

test('@bch-intents/sdk-common — Extended Edge Cases', async (t) => {

    await t.test('derivePkhFromAddress throws on garbage input', () => {
        assert.throws(() => {
            derivePkhFromAddress('not_a_valid_address');
        });
    });

    await t.test('derivePkhFromAddress throws on empty string', () => {
        assert.throws(() => {
            derivePkhFromAddress('');
        });
    });

    await t.test('generateIntentId produces unique IDs across 100 calls', () => {
        const ids = new Set<string>();
        for (let i = 0; i < 100; i++) {
            ids.add(generateIntentId());
        }
        assert.strictEqual(ids.size, 100, 'All 100 intent IDs should be unique');
    });

    await t.test('generateIntentId follows expected format', () => {
        const id = generateIntentId();
        assert.ok(id.startsWith('intent_'), `ID "${id}" should start with "intent_"`);
    });

    await t.test('Duration.hours(1) returns 3600n', () => {
        assert.strictEqual(Duration.hours(1), 3600n);
    });

    await t.test('Duration.days(1) returns 86400n', () => {
        assert.strictEqual(Duration.days(1), 86400n);
    });

    await t.test('Duration.minutes(30) returns 1800n', () => {
        assert.strictEqual(Duration.minutes(30), 1800n);
    });

    await t.test('Duration.seconds(42) returns 42n', () => {
        assert.strictEqual(Duration.seconds(42), 42n);
    });
});
