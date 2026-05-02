import { finalizeEvent, getPublicKey, Event, EventTemplate, nip44 } from 'nostr-tools';
import { bytesToHex } from '@noble/hashes/utils';
import { 
    Intent, 
    IntentType, 
    DutchAuctionParams, 
    LimitOrderParams 
} from '@bch-intents/sdk-common';
import { INTENT_EVENT_KIND, PRIVATE_INTENT_KIND, INTENT_TAG } from './constants.js';

export class NostrEventBuilder {
    /**
     * Builds a NIP-01 public event for a Dutch Auction intent.
     */
    static dutchAuctionEvent(params: DutchAuctionParams, privkey: Uint8Array): Event {
        const intentId = `intent_${Date.now()}_${Math.floor(Math.random()*10000)}`;
        
        const intentPayload: Intent = {
            id: intentId,
            type: 'DUTCH_AUCTION',
            makerAddress: params.makerAddress,
            contractAddress: '', // To be filled by solver or execution
            tokenAddress: '', // To be filled by solver or execution
            sellToken: params.sellToken,
            buyToken: params.buyToken,
            sellAmount: params.sellAmount.toString(),
            buyAmount: params.startBuyAmount.toString(), // Default to start for types
            status: 'pending',
            createdAt: Date.now(),
            startBuyAmount: params.startBuyAmount.toString(),
            endBuyAmount: params.endBuyAmount.toString(),
            duration: Number(params.duration || 3600)
        };

        const template: EventTemplate = {
            kind: INTENT_EVENT_KIND,
            created_at: Math.floor(Date.now() / 1000),
            tags: [
                ['t', INTENT_TAG],
                ['intent-type', 'DUTCH_AUCTION'],
                ['sell-token', params.sellToken],
                ['buy-token', params.buyToken]
            ],
            content: JSON.stringify(intentPayload)
        };

        return finalizeEvent(template, privkey);
    }

    /**
     * Builds a NIP-01 public event for a Limit Order intent.
     */
    static limitOrderEvent(params: LimitOrderParams, privkey: Uint8Array): Event {
        const intentId = `intent_${Date.now()}_${Math.floor(Math.random()*10000)}`;
        
        const intentPayload: Intent = {
            id: intentId,
            type: 'LIMIT_ORDER',
            makerAddress: params.makerAddress,
            contractAddress: '', 
            tokenAddress: '', 
            sellToken: params.sellToken,
            buyToken: params.buyToken,
            sellAmount: params.sellAmount.toString(),
            buyAmount: params.buyAmount.toString(),
            status: 'pending',
            createdAt: Date.now(),
            expiryTime: Number(params.expiryTime || Math.floor(Date.now()/1000) + 3600)
        };

        const template: EventTemplate = {
            kind: INTENT_EVENT_KIND,
            created_at: Math.floor(Date.now() / 1000),
            tags: [
                ['t', INTENT_TAG],
                ['intent-type', 'LIMIT_ORDER'],
                ['sell-token', params.sellToken],
                ['buy-token', params.buyToken]
            ],
            content: JSON.stringify(intentPayload)
        };

        return finalizeEvent(template, privkey);
    }

    /**
     * Parse and validate an incoming Nostr Event into an Intent.
     */
    static parseIntentFromEvent(event: Event): Intent {
        if (event.kind !== INTENT_EVENT_KIND && event.kind !== PRIVATE_INTENT_KIND) {
            throw new Error(`Invalid event kind: ${event.kind}`);
        }
        
        const tTag = event.tags.find((t: string[]) => t[0] === 't');
        if (!tTag || tTag[1] !== INTENT_TAG) {
            throw new Error(`Missing or invalid tag: t=${INTENT_TAG}`);
        }

        const payload: Intent = JSON.parse(event.content);
        return payload;
    }

    /**
     * Encrypts an intent payload specifically for a Solver using NIP-44.
     */
    static encryptForSolver(payload: string, senderKey: Uint8Array, solverPubkey: string): Event {
        // NIP-44 encryption
        const sharedKey = nip44.v2.utils.getConversationKey(senderKey, solverPubkey);
        const encryptedContent = nip44.v2.encrypt(payload, sharedKey);

        const template: EventTemplate = {
            kind: PRIVATE_INTENT_KIND,
            created_at: Math.floor(Date.now() / 1000),
            tags: [
                ['p', solverPubkey],
                ['t', INTENT_TAG]
            ],
            content: encryptedContent
        };

        return finalizeEvent(template, senderKey);
    }
}
