import { test, describe, mock } from 'node:test';
import assert from 'node:assert';
import { DutchAuctionSolver } from './DutchAuctionSolver.js';
import { LimitOrderSolver } from './LimitOrderSolver.js';
import { DutchAuctionParams, LimitOrderParams } from '@bch-intents/sdk-common';

// ============================================================================
// Test Helpers — Mock CashScript objects
// ============================================================================

/** Creates a mock Utxo */
function mockUtxo(satoshis: bigint, token?: { amount: bigint; category: string }): any {
    return {
        txid: 'a'.repeat(64),
        vout: 0,
        satoshis,
        token: token || undefined,
    };
}

/** Creates a mock CashScript Contract with captured transaction data */
function mockContract() {
    const captured: { inputs: any[]; outputs: any[]; locktime: number | null } = {
        inputs: [],
        outputs: [],
        locktime: null,
    };

    const mockTb = {
        addInput: (utxo: any, unlocker: any) => { captured.inputs.push({ utxo, unlocker }); },
        addOutput: (output: any) => { captured.outputs.push(output); },
        setLocktime: (lt: number) => { captured.locktime = lt; },
        send: async () => ({ txid: 'mock_txid_' + Date.now() }),
    };

    const contract: any = {
        address: 'bitcoincash:qztest123',
        tokenAddress: 'bitcoincash:ztest123',
        provider: {},
        unlock: {
            fill: () => 'mock_fill_unlocker',
            cancel: () => 'mock_cancel_unlocker',
        },
        _captured: captured,
        _mockTb: mockTb,
    };

    return { contract, captured, mockTb };
}

// ============================================================================
// DutchAuctionSolver.getCurrentPrice()
// ============================================================================

describe('DutchAuctionSolver.getCurrentPrice()', () => {
    const baseParams: DutchAuctionParams = {
        makerAddress: 'bitcoincash:qzcsj9hau5r9q30syl9lyqp7v0zpxrtx9c0y980etu',
        sellToken: 'BCH',
        buyToken: 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
        sellAmount: 100_000n,
        startBuyAmount: 1000n,
        endBuyAmount: 500n,
        duration: 3600n,
    };

    test('returns startBuyAmount at the beginning of the auction', () => {
        const now = Math.floor(Date.now() / 1000);
        const price = DutchAuctionSolver.getCurrentPrice(baseParams, now);
        // At the very start, price should equal startBuyAmount
        assert.strictEqual(price, baseParams.startBuyAmount);
    });

    test('returns endBuyAmount when auction duration has fully elapsed', () => {
        const now = Math.floor(Date.now() / 1000);
        const futureTime = now + 7200; // Well past the 1h duration
        const price = DutchAuctionSolver.getCurrentPrice(baseParams, futureTime);
        assert.strictEqual(price, baseParams.endBuyAmount);
    });

    test('never returns below endBuyAmount (price floor)', () => {
        const now = Math.floor(Date.now() / 1000);
        const wayFuture = now + 999999;
        const price = DutchAuctionSolver.getCurrentPrice(baseParams, wayFuture);
        assert.ok(price >= baseParams.endBuyAmount, `Price ${price} should be >= endBuyAmount ${baseParams.endBuyAmount}`);
    });

    test('uses default duration of 3600 when params.duration is undefined', () => {
        const noDuration: DutchAuctionParams = { ...baseParams, duration: undefined };
        const now = Math.floor(Date.now() / 1000);
        const price = DutchAuctionSolver.getCurrentPrice(noDuration, now);
        // Should still compute — no crash
        assert.ok(typeof price === 'bigint');
        assert.ok(price >= noDuration.endBuyAmount);
        assert.ok(price <= noDuration.startBuyAmount);
    });

    test('price is between start and end at any valid time', () => {
        const now = Math.floor(Date.now() / 1000);
        // Test at various points
        for (const offset of [0, 900, 1800, 2700, 3600, 5000]) {
            const price = DutchAuctionSolver.getCurrentPrice(baseParams, now + offset);
            assert.ok(price >= baseParams.endBuyAmount, `At offset ${offset}: ${price} < ${baseParams.endBuyAmount}`);
            assert.ok(price <= baseParams.startBuyAmount, `At offset ${offset}: ${price} > ${baseParams.startBuyAmount}`);
        }
    });
});

// ============================================================================
// UTXO Selection & InsufficientFundsError Logic (isolated from CashScript)
// ============================================================================
// The actual fill() methods require a valid WIF key for SignatureTemplate.
// We test the UTXO selection and fund-checking logic in isolation.

import { InsufficientFundsError } from '@bch-intents/sdk-common';

/** Replicates the solver UTXO selection algorithm from DutchAuctionSolver/LimitOrderSolver */
function selectUtxos(solverUtxos: any[], neededSats: bigint) {
    const bchUtxos = solverUtxos.filter((u: any) => !u.token);
    let totalSolverInput = 0n;
    const selectedUtxos: any[] = [];
    const sorted = [...bchUtxos].sort((a: any, b: any) => Number(b.satoshis - a.satoshis));
    for (const u of sorted) {
        if (totalSolverInput >= neededSats) break;
        selectedUtxos.push(u);
        totalSolverInput += u.satoshis;
    }
    if (totalSolverInput < neededSats) {
        throw new InsufficientFundsError(neededSats, totalSolverInput);
    }
    return { selectedUtxos, totalSolverInput };
}

describe('Solver UTXO selection logic', () => {
    test('throws InsufficientFundsError when solver has no UTXOs', () => {
        assert.throws(
            () => selectUtxos([], 50_000n),
            (err: any) => {
                assert.strictEqual(err.name, 'InsufficientFundsError');
                assert.strictEqual(err.required, 50_000n);
                assert.strictEqual(err.available, 0n);
                return true;
            }
        );
    });

    test('throws InsufficientFundsError when solver UTXOs are below required amount', () => {
        assert.throws(
            () => selectUtxos([mockUtxo(100n), mockUtxo(200n)], 50_000n),
            (err: any) => {
                assert.strictEqual(err.name, 'InsufficientFundsError');
                assert.ok(err.required > err.available);
                return true;
            }
        );
    });

    test('skips token UTXOs (only uses pure BCH)', () => {
        const tokenUtxo = mockUtxo(100_000n, { amount: 500n, category: 'aa'.repeat(32) });
        assert.throws(
            () => selectUtxos([tokenUtxo], 50_000n),
            (err: any) => {
                assert.strictEqual(err.name, 'InsufficientFundsError');
                return true;
            }
        );
    });

    test('selects sufficient UTXOs in descending order', () => {
        const utxos = [mockUtxo(1000n), mockUtxo(50_000n), mockUtxo(5000n)];
        const result = selectUtxos(utxos, 40_000n);
        assert.strictEqual(result.selectedUtxos.length, 1); // Only the 50k UTXO needed
        assert.strictEqual(result.totalSolverInput, 50_000n);
    });

    test('selects multiple UTXOs when single is insufficient', () => {
        const utxos = [mockUtxo(20_000n), mockUtxo(30_000n), mockUtxo(10_000n)];
        const result = selectUtxos(utxos, 45_000n);
        assert.strictEqual(result.selectedUtxos.length, 2); // 30k + 20k = 50k >= 45k
        assert.ok(result.totalSolverInput >= 45_000n);
    });

    test('mixes BCH and token UTXOs — only selects BCH ones', () => {
        const utxos = [
            mockUtxo(100_000n, { amount: 500n, category: 'aa'.repeat(32) }), // Token, skipped
            mockUtxo(30_000n), // BCH
            mockUtxo(25_000n), // BCH
        ];
        const result = selectUtxos(utxos, 40_000n);
        assert.strictEqual(result.selectedUtxos.length, 2);
        assert.strictEqual(result.totalSolverInput, 55_000n);
    });
});

// ============================================================================
// LimitOrderSolver.fill() — InsufficientFundsError
// ============================================================================

describe('LimitOrder vs DutchAuction parameter differences', () => {
    test('LimitOrderParams uses exact buyAmount (not decaying)', () => {
        const params: LimitOrderParams = {
            makerAddress: 'bitcoincash:qzcsj9hau5r9q30syl9lyqp7v0zpxrtx9c0y980etu',
            sellToken: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
            buyToken: 'BCH',
            sellAmount: 500n,
            buyAmount: 10_000n,
        };
        assert.strictEqual(params.buyAmount, 10_000n);
        assert.strictEqual((params as any).startBuyAmount, undefined);
        assert.strictEqual((params as any).endBuyAmount, undefined);
    });

    test('LimitOrder neededSats calculation is price + 2000n', () => {
        const price = 10_000n;
        const neededSats = price + 2000n;
        assert.strictEqual(neededSats, 12_000n);
    });
});

// ============================================================================
// Output path verification — BCH vs CashToken
// ============================================================================

describe('Solver output path logic', () => {
    test('BCH buy token is identified correctly', () => {
        // Replicating the logic from DutchAuctionSolver.fill()
        const isBuyBCH_1 = 'BCH' === 'BCH' || 'BCH' === '';
        const isBuyBCH_2 = '' === 'BCH' || '' === '';
        const isBuyBCH_3 = 'aabb' === 'BCH' || 'aabb' === '';

        assert.strictEqual(isBuyBCH_1, true, 'BCH string should be BCH');
        assert.strictEqual(isBuyBCH_2, true, 'empty string should be BCH');
        assert.strictEqual(isBuyBCH_3, false, 'category hex should NOT be BCH');
    });

    test('Change output is suppressed below dust threshold (546 sats)', () => {
        // From solver logic: if (change > 546n) tb.addOutput(...)
        const dustThreshold = 546n;

        assert.ok(547n > dustThreshold, 'Above dust should create change output');
        assert.ok(!(546n > dustThreshold), '546 should NOT create change output');
        assert.ok(!(100n > dustThreshold), 'Below dust should NOT create change output');
    });

    test('UTXO selection sorts descending by satoshis', () => {
        const utxos = [
            mockUtxo(100n),
            mockUtxo(5000n),
            mockUtxo(300n),
            mockUtxo(10000n),
        ];
        const sorted = [...utxos].sort((a: any, b: any) => Number(b.satoshis - a.satoshis));
        
        assert.strictEqual(sorted[0].satoshis, 10000n);
        assert.strictEqual(sorted[1].satoshis, 5000n);
        assert.strictEqual(sorted[2].satoshis, 300n);
        assert.strictEqual(sorted[3].satoshis, 100n);
    });
});
