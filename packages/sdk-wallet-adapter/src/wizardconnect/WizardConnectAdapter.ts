import { BCHSigner } from '../BCHSigner.js';
import { DappConnectionManager } from '@wizardconnect/dapp';
import { derivePkhFromAddress, stripHex } from '@bch-intents/sdk-common';

export interface WizardConnectConfig {
    name: string;
    description: string;
    url?: string;
    icons?: string[];
}

export class WizardConnectAdapter implements BCHSigner {
    public client: DappConnectionManager;
    private cashaddr: string | null = null;
    private pubKeyHex: string | null = null;

    constructor(config: WizardConnectConfig) {
        this.client = new DappConnectionManager(config.name, config.icons?.[0]);
    }

    /**
     * Set the manually resolved cashaddr and pubkey from the session.
     */
    setSession(cashaddr: string, pubkeyHex: string) {
        this.cashaddr = cashaddr;
        this.pubKeyHex = pubkeyHex;
    }

    async getAddress(): Promise<string> {
        if (!this.cashaddr) {
            throw new Error("WizardConnect session not established or address not set.");
        }
        return this.cashaddr;
    }

    async getPkh(): Promise<Uint8Array> {
        const address = await this.getAddress();
        return derivePkhFromAddress(address);
    }

    async getPublicKey(): Promise<Uint8Array> {
        if (!this.pubKeyHex) {
            throw new Error("WizardConnect session not established. Cannot retrieve public key.");
        }
        const hex = stripHex(this.pubKeyHex);
        return new Uint8Array(hex.match(/.{1,2}/g)?.map((byte: string) => parseInt(byte, 16)) || []);
    }

    /**
     * Proxies the transaction construction to the connected wallet via signTransaction.
     */
    async send(toAddress: string, satoshis: bigint, token?: { category: string; amount: bigint }): Promise<string> {
        const outputs: any[] = [{
            to: toAddress,
            amount: Number(satoshis)
        }];

        if (token) {
            outputs[0].token = {
                category: stripHex(token.category),
                amount: Number(token.amount)
            };
        }

        const response: any = await this.client.signTransaction({
            transaction: {
                outputs: outputs
            }
        } as any);

        if (!response || !response.transaction) {
            throw new Error('Wallet failed to broadcast the transaction or returning invalid txid via WizardConnect.');
        }

        // Return txid or the raw transaction hex if broadcast is handled separately
        return response.transaction as string;
    }
}
