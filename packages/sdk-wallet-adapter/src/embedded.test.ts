import { test, describe, mock } from 'node:test';
import assert from 'node:assert';
import { EmbeddedWalletAdapter } from '../src/EmbeddedWalletAdapter.js';
import type { EmbeddedWalletManager } from '../src/EmbeddedWalletAdapter.js';

describe('EmbeddedWalletAdapter', () => {
    const MOCK_ADDR = 'bitcoincash:qzcsj9hau5r9q30syl9lyqp7v0zpxrtx9c0y980etu';
    const MOCK_PK = '02' + 'aa'.repeat(32);
    const UID = 'user_test_123';

    function mockMgr(): EmbeddedWalletManager {
        return {
            getWalletInfo: mock.fn(async () => ({ address: MOCK_ADDR, publicKey: MOCK_PK })),
            sendBCH: mock.fn(async () => ({ txId: 'bch_tx_001' })),
            sendToken: mock.fn(async () => ({ txId: 'tok_tx_001' })),
        };
    }

    test('getAddress returns address from wallet manager', async () => {
        const adapter = new EmbeddedWalletAdapter(mockMgr(), UID);
        assert.strictEqual(await adapter.getAddress(), MOCK_ADDR);
    });

    test('getPkh derives a 20-byte hash', async () => {
        const adapter = new EmbeddedWalletAdapter(mockMgr(), UID);
        const pkh = await adapter.getPkh();
        assert.strictEqual(pkh.length, 20);
        assert.ok(pkh instanceof Uint8Array);
    });

    test('getPublicKey converts hex to Uint8Array', async () => {
        const adapter = new EmbeddedWalletAdapter(mockMgr(), UID);
        const pk = await adapter.getPublicKey();
        assert.ok(pk instanceof Uint8Array);
        assert.strictEqual(pk.length, 33);
    });

    test('send routes to sendBCH when no token', async () => {
        const mgr = mockMgr();
        const adapter = new EmbeddedWalletAdapter(mgr, UID);
        const txid = await adapter.send(MOCK_ADDR, 10000n);
        assert.strictEqual(txid, 'bch_tx_001');
        assert.strictEqual((mgr.sendBCH as any).mock.calls.length, 1);
        assert.strictEqual((mgr.sendToken as any).mock.calls.length, 0);
    });

    test('send routes to sendToken when token provided', async () => {
        const mgr = mockMgr();
        const adapter = new EmbeddedWalletAdapter(mgr, UID);
        const txid = await adapter.send(MOCK_ADDR, 1000n, { category: 'cc'.repeat(32), amount: 500n });
        assert.strictEqual(txid, 'tok_tx_001');
        assert.strictEqual((mgr.sendToken as any).mock.calls.length, 1);
    });

    test('send strips 0x prefix from token category', async () => {
        const mgr = mockMgr();
        const adapter = new EmbeddedWalletAdapter(mgr, UID);
        await adapter.send(MOCK_ADDR, 1000n, { category: '0x' + 'cc'.repeat(32), amount: 100n });
        const args = (mgr.sendToken as any).mock.calls[0].arguments[0];
        assert.ok(!args.tokenId.startsWith('0x'));
    });
});
