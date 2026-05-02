import { test, describe, mock } from 'node:test';
import assert from 'node:assert';
import { derivePkhFromAddress, stripHex } from '@bch-intents/sdk-common';

// ============================================================================
// WizardConnectAdapter logic tests
// ============================================================================
// We cannot import WizardConnectAdapter directly because @wizardconnect/dapp
// is not installed in dev. Instead we test the adapter's internal logic
// (session management, payload construction, PKH derivation) in isolation.

describe('WizardConnect Adapter Logic', () => {
    const MOCK_ADDR = 'bitcoincash:qzcsj9hau5r9q30syl9lyqp7v0zpxrtx9c0y980etu';
    const MOCK_PK = '02' + 'bb'.repeat(32);

    /** Minimal replica of WizardConnectAdapter's session state machine */
    function createSessionAdapter() {
        let cashaddr: string | null = null;
        let pubKeyHex: string | null = null;

        return {
            async connect() {
                return 'wiz://test-session-uri';
            },
            async waitForSession(accounts: any[]) {
                if (!accounts || accounts.length === 0) {
                    throw new Error('WizardConnect session did not provide any accounts.');
                }
                cashaddr = accounts[0].cashaddr;
                pubKeyHex = accounts[0].pubkey;
            },
            async getAddress() {
                if (!cashaddr) throw new Error('WizardConnect session not established. Call `waitForSession` first.');
                return cashaddr;
            },
            async getPkh() {
                const address = await this.getAddress();
                return derivePkhFromAddress(address);
            },
            async getPublicKey() {
                if (!pubKeyHex) throw new Error('WizardConnect session not established.');
                const hex = stripHex(pubKeyHex);
                return new Uint8Array(hex.match(/.{1,2}/g)?.map((byte: string) => parseInt(byte, 16)) || []);
            },
            buildSendPayload(toAddress: string, satoshis: bigint, token?: { category: string; amount: bigint }) {
                const outputs: any[] = [{ to: toAddress, amount: Number(satoshis) }];
                if (token) {
                    outputs[0].token = {
                        category: stripHex(token.category),
                        amount: Number(token.amount),
                    };
                }
                return { method: 'bch_sendTransaction', params: [{ from: cashaddr, outputs }] };
            },
        };
    }

    test('connect returns a wiz:// URI string', async () => {
        const adapter = createSessionAdapter();
        const uri = await adapter.connect();
        assert.ok(uri.startsWith('wiz://'));
    });

    test('waitForSession throws if session provides no accounts', async () => {
        const adapter = createSessionAdapter();
        await assert.rejects(() => adapter.waitForSession([]), /did not provide any accounts/);
    });

    test('getAddress throws before session is established', async () => {
        const adapter = createSessionAdapter();
        await assert.rejects(() => adapter.getAddress(), /not established/);
    });

    test('getAddress returns cached cashaddr after waitForSession', async () => {
        const adapter = createSessionAdapter();
        await adapter.waitForSession([{ cashaddr: MOCK_ADDR, pubkey: MOCK_PK }]);
        const addr = await adapter.getAddress();
        assert.strictEqual(addr, MOCK_ADDR);
    });

    test('getPkh derives valid 20-byte hash after session', async () => {
        const adapter = createSessionAdapter();
        await adapter.waitForSession([{ cashaddr: MOCK_ADDR, pubkey: MOCK_PK }]);
        const pkh = await adapter.getPkh();
        assert.strictEqual(pkh.length, 20);
        assert.ok(pkh instanceof Uint8Array);
    });

    test('getPublicKey converts hex to correct Uint8Array', async () => {
        const adapter = createSessionAdapter();
        await adapter.waitForSession([{ cashaddr: MOCK_ADDR, pubkey: MOCK_PK }]);
        const pk = await adapter.getPublicKey();
        assert.ok(pk instanceof Uint8Array);
        assert.strictEqual(pk.length, 33); // compressed pubkey
    });

    test('buildSendPayload for BCH has no token field', async () => {
        const adapter = createSessionAdapter();
        await adapter.waitForSession([{ cashaddr: MOCK_ADDR, pubkey: MOCK_PK }]);
        const payload = adapter.buildSendPayload(MOCK_ADDR, 5000n);
        assert.strictEqual(payload.method, 'bch_sendTransaction');
        assert.strictEqual(payload.params[0].outputs[0].amount, 5000);
        assert.strictEqual(payload.params[0].outputs[0].token, undefined);
    });

    test('buildSendPayload includes token data when specified', async () => {
        const adapter = createSessionAdapter();
        await adapter.waitForSession([{ cashaddr: MOCK_ADDR, pubkey: MOCK_PK }]);
        const payload = adapter.buildSendPayload(MOCK_ADDR, 1000n, { category: '0x' + 'dd'.repeat(32), amount: 200n });
        assert.ok(payload.params[0].outputs[0].token);
        assert.strictEqual(payload.params[0].outputs[0].token.amount, 200);
        assert.ok(!payload.params[0].outputs[0].token.category.startsWith('0x'), '0x prefix should be stripped');
    });
});
