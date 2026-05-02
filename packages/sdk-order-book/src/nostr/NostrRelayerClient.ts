import { SimplePool, type Filter, type Event, nip44 } from 'nostr-tools';
import { Intent, DutchAuctionParams, LimitOrderParams, NostrConfig, NostrIntentEvent } from '@bch-intents/sdk-common';
import { INTENT_EVENT_KIND, PRIVATE_INTENT_KIND, DEFAULT_RELAYS } from './constants.js';
import { NostrKeyManager } from './NostrKeyManager.js';
import { NostrEventBuilder } from './NostrEventBuilder.js';

export class NostrRelayerClient {
    private pool: SimplePool;
    public relays: string[];
    private privkey: Uint8Array;
    public pubkey: string;

    constructor(config?: NostrConfig) {
        this.pool = new SimplePool();
        this.relays = config?.relays && config.relays.length > 0 ? config.relays : DEFAULT_RELAYS;
        
        if (config?.privateKeyHex) {
            const keys = NostrKeyManager.fromPrivateKey(config.privateKeyHex);
            this.privkey = keys.privkey;
            this.pubkey = keys.pubkey;
        } else {
            const keys = NostrKeyManager.generateEphemeral();
            this.privkey = keys.privkey;
            this.pubkey = keys.pubkey;
        }
    }

    /**
     * Publishes a public intent to the Nostr relay network.
     */
    async publishIntent(params: DutchAuctionParams | LimitOrderParams, type: 'DUTCH_AUCTION' | 'LIMIT_ORDER' = 'DUTCH_AUCTION'): Promise<string> {
        let event: Event;
        if (type === 'DUTCH_AUCTION') {
            event = NostrEventBuilder.dutchAuctionEvent(params as DutchAuctionParams, this.privkey);
        } else {
            event = NostrEventBuilder.limitOrderEvent(params as LimitOrderParams, this.privkey);
        }

        const pubs = this.pool.publish(this.relays, event);
        await Promise.any(pubs);
        return event.id;
    }

    /**
     * Publishes a private, encrypted intent directed at a specific solver's pubkey.
     */
    async publishPrivateIntent(payload: string, solverPubkey: string): Promise<string> {
        const event = NostrEventBuilder.encryptForSolver(payload, this.privkey, solverPubkey);
        const pubs = this.pool.publish(this.relays, event);
        await Promise.any(pubs);
        return event.id;
    }

    /**
     * Subscribes to public intents. Usually used by solvers.
     */
    subscribe(onIntent: (event: NostrIntentEvent) => void): { close: () => void } {
        const filter: Filter = {
            kinds: [INTENT_EVENT_KIND]
        };

        const sub = this.pool.subscribeMany(this.relays, filter, {
            onevent(event: Event) {
                try {
                    const intent = NostrEventBuilder.parseIntentFromEvent(event);
                    onIntent({ eventId: event.id, intent, mode: 'public' });
                } catch(e) {
                    // Ignore parsing errors
                }
            }
        });
        return { close: () => sub.close() };
    }

    /**
     * Subscribes to private intents addressed to this client's pubkey.
     * Usually used by solvers with known pubkeys.
     */
    subscribePrivate(onIntent: (event: NostrIntentEvent) => void): { close: () => void } {
        const filter: Filter = {
            kinds: [PRIVATE_INTENT_KIND],
            "#p": [this.pubkey]
        };

        const sub = this.pool.subscribeMany(this.relays, filter, {
            onevent: (event: Event) => {
                try {
                    const senderPubkey = event.pubkey;
                    const sharedKey = nip44.v2.utils.getConversationKey(this.privkey, senderPubkey);
                    const decryptedContent = nip44.v2.decrypt(event.content, sharedKey);
                    
                    const intent: Intent = JSON.parse(decryptedContent);
                    onIntent({ eventId: event.id, intent, mode: 'private' });
                } catch(e) {
                    // Ignore decryption or parsing errors
                }
            }
        });
        return { close: () => sub.close() };
    }

    /**
     * Fetches a batch of active public intents from the relays.
     */
    async getActiveIntents(): Promise<NostrIntentEvent[]> {
        const filter: Filter = {
            kinds: [INTENT_EVENT_KIND],
            limit: 100
        };

        const events = await this.pool.querySync(this.relays, filter);
        const intents: NostrIntentEvent[] = [];
        for (const event of events) {
            try {
                const intent = NostrEventBuilder.parseIntentFromEvent(event);
                intents.push({ eventId: event.id, intent, mode: 'public' });
            } catch(e) {
                // Ignore
            }
        }
        return intents;
    }
}
