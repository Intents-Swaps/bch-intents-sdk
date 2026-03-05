// ============================================================================
// Example: Building a Solver Bot with the BCH Intents SDK
// ============================================================================
//
// This example shows how a third party can fill Dutch Auction and Limit Order
// intents using ONLY the SDK — no relayer code needed.
//
// Usage:
//   npx tsx examples/solver-bot-example.ts
//
// Prerequisites:
//   - A funded BCH wallet (Chipnet/Mainnet)
//   - An existing Dutch Auction or Limit Order contract with funded UTXOs
//
// ============================================================================

import {
    DutchAuctionContract,
    DutchAuctionSolver,
    LimitOrderContract,
    LimitOrderSolver,
} from '@bch-intents/sdk-contracts';
import type { DutchAuctionParams, LimitOrderParams } from '@bch-intents/sdk-common';
import { ElectrumNetworkProvider } from 'cashscript';

async function main() {
    console.log('🤖 BCH Intents — Solver Bot Example\n');

    const provider = new ElectrumNetworkProvider('chipnet');

    // =========================================================================
    // Example 1: Fill a Dutch Auction
    // =========================================================================
    console.log('--- Dutch Auction Fill ---');

    // These params come from the intent registry / order book / API
    const dutchParams: DutchAuctionParams = {
        makerAddress: 'bchtest:qqmhr60gt2w2kz7aps6ds9rgv2e3f4ksdg3gye8det',
        sellToken: 'b4863d5773c7a269b6fe3b9f7ce2ce1098ab71c0b046ef2a39058d5e30b1f353',
        buyToken: 'BCH', // Maker wants BCH for their tokens
        sellAmount: 1000n,
        startBuyAmount: 5500n, // Start at 5500 sats
        endBuyAmount: 4500n,   // Decay to 4500 sats
        duration: 600n,        // 10 minute auction
    };

    // 1. Compile the contract (recreates the same address as the maker)
    const dutchContract = DutchAuctionContract.compile(dutchParams, provider);
    console.log(`  Contract: ${dutchContract.address}`);

    // 2. Check current auction price
    const currentPrice = DutchAuctionSolver.getCurrentPrice(dutchParams);
    console.log(`  Current Price: ${currentPrice} sats`);

    // 3. Find the funded UTXO on-chain
    const contractUtxos = await provider.getUtxos(dutchContract.tokenAddress);
    if (contractUtxos.length === 0) {
        console.log('  ⚠️  No funded UTXOs found — maker has not funded the contract yet.');
        console.log('  Skipping fill (this is expected in a cold example).\n');
    } else {
        // 4. Get solver's UTXOs for payment
        const solverWif = 'YOUR_SOLVER_WIF_HERE'; // Replace with actual WIF
        const solverAddress = 'bchtest:qq...'; // Replace
        const solverUtxos = await provider.getUtxos(solverAddress);

        // 5. Fill the auction!
        try {
            const result = await DutchAuctionSolver.fill({
                contract: dutchContract,
                contractUtxo: contractUtxos[0],
                params: dutchParams,
                solverWif,
                solverUtxos,
            });
            console.log(`  ✅ Filled! TXID: ${result.txid}`);
            console.log(`  Price Paid: ${result.pricePaid} sats`);
        } catch (e: any) {
            console.error(`  ❌ Fill failed: ${e.message}`);
        }
    }

    // =========================================================================
    // Example 2: Fill a Limit Order
    // =========================================================================
    console.log('--- Limit Order Fill ---');

    const limitParams: LimitOrderParams = {
        makerAddress: 'bchtest:qqmhr60gt2w2kz7aps6ds9rgv2e3f4ksdg3gye8det',
        sellToken: 'b4863d5773c7a269b6fe3b9f7ce2ce1098ab71c0b046ef2a39058d5e30b1f353',
        buyToken: 'BCH',
        sellAmount: 500n,
        buyAmount: 2500n, // Fixed price: 2500 sats for 500 tokens
    };

    const limitContract = LimitOrderContract.compile(limitParams, provider);
    console.log(`  Contract: ${limitContract.address}`);

    const limitUtxos = await provider.getUtxos(limitContract.tokenAddress);
    if (limitUtxos.length === 0) {
        console.log('  ⚠️  No funded UTXOs — skipping fill.\n');
    } else {
        console.log('  Found funded UTXO — would call LimitOrderSolver.fill() here.');
    }

    // =========================================================================
    // Example 3: Cancel an expired order (Maker perspective)
    // =========================================================================
    console.log('--- Cancel (Maker) ---');
    console.log('  To cancel an expired order:');
    console.log('    const result = await DutchAuctionSolver.cancel({');
    console.log('        contract, contractUtxo,');
    console.log('        makerWif: "YOUR_WIF",');
    console.log('        makerAddress: "bchtest:qq...",');
    console.log('    });');
    console.log('    console.log("Reclaimed! TX:", result.txid);\n');

    console.log('🎉 Done. See @bch-intents/sdk-contracts for full API.');
}

main().catch(console.error);
