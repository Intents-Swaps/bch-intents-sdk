import { Contract, NetworkProvider, ElectrumNetworkProvider } from 'cashscript';
import {
    derivePkhFromAddress,
    formatCategoryForContract,
    DutchAuctionParams,
    CovenantCompilationError
} from '@bch-intents/sdk-common';

import artifacts from '../artifacts/DutchAuctionSwap.json' with { type: 'json' };
import artifactsWithFee from '../artifacts/DutchAuctionSwapWithFee.json' with { type: 'json' };

/**
 * Wrapper for the DutchAuctionSwap.cash covenant.
 * Handles type-safe compilation and native PKH derivation.
 */
export class DutchAuctionContract {
    /**
     * Compile a CashScript Contract instance for a Dutch Auction intent.
     * 
     * @param params - The Dutch Auction parameters
     * @param provider - CashScript NetworkProvider (Electrum, Mock, etc.)
     * @returns A compiled CashScript Contract instance
     * @throws {CovenantCompilationError} If compilation fails (e.g. invalid arguments)
     */
    static compile(params: DutchAuctionParams, provider?: NetworkProvider): Contract {
        try {
            const makerPkh = derivePkhFromAddress(params.makerAddress);
            const sellCatLE = formatCategoryForContract(params.sellToken);
            const buyCatLE = formatCategoryForContract(params.buyToken);

            // Default duration to 1 hour (3600 seconds)
            const duration = params.duration ?? 3600n;
            const startTime = BigInt(Math.floor(Date.now() / 1000));
            const activeProvider = provider ?? new ElectrumNetworkProvider('mainnet');

            if (params.feeAddress && params.feeAmount) {
                const feePkh = derivePkhFromAddress(params.feeAddress);
                return new Contract(artifactsWithFee, [
                    makerPkh,
                    feePkh,
                    sellCatLE,
                    buyCatLE,
                    params.sellAmount,
                    params.startBuyAmount,
                    params.endBuyAmount,
                    params.feeAmount,
                    startTime,
                    duration,
                ], { provider: activeProvider });
            }

            return new Contract(artifacts, [
                makerPkh,
                sellCatLE,
                buyCatLE,
                params.sellAmount,
                params.startBuyAmount,
                params.endBuyAmount,
                startTime,
                duration,
            ], { provider: activeProvider });
        } catch (error) {
            throw new CovenantCompilationError('DutchAuctionSwap', error);
        }
    }
}
