"use strict";
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
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var sdk_contracts_1 = require("@bch-intents/sdk-contracts");
var cashscript_1 = require("cashscript");
function main() {
    return __awaiter(this, void 0, void 0, function () {
        var provider, dutchParams, dutchContract, currentPrice, contractUtxos, TestNetWallet, solverWif, wallet, solverAddress, solverUtxos, result, e_1, limitParams, limitContract, limitUtxos;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    console.log('🤖 BCH Intents — Solver Bot Example\n');
                    provider = new cashscript_1.ElectrumNetworkProvider('chipnet');
                    // =========================================================================
                    // Example 1: Fill a Dutch Auction
                    // =========================================================================
                    console.log('--- Dutch Auction Fill ---');
                    dutchParams = {
                        makerAddress: 'bchtest:qqmhr60gt2w2kz7aps6ds9rgv2e3f4ksdg3gye8det',
                        sellToken: 'b4863d5773c7a269b6fe3b9f7ce2ce1098ab71c0b046ef2a39058d5e30b1f353',
                        buyToken: 'BCH', // Maker wants BCH for their tokens
                        sellAmount: 1000n,
                        startBuyAmount: 5500n, // Start at 5500 sats
                        endBuyAmount: 4500n, // Decay to 4500 sats
                        duration: 600n, // 10 minute auction
                    };
                    dutchContract = sdk_contracts_1.DutchAuctionContract.compile(dutchParams, provider);
                    console.log("  Contract: ".concat(dutchContract.address));
                    currentPrice = sdk_contracts_1.DutchAuctionSolver.getCurrentPrice(dutchParams);
                    console.log("  Current Price: ".concat(currentPrice, " sats"));
                    return [4 /*yield*/, provider.getUtxos(dutchContract.tokenAddress)];
                case 1:
                    contractUtxos = _a.sent();
                    if (!(contractUtxos.length === 0)) return [3 /*break*/, 2];
                    console.log('  ⚠️  No funded UTXOs found — maker has not funded the contract yet.');
                    console.log('  Skipping fill (this is expected in a cold example).\n');
                    return [3 /*break*/, 9];
                case 2: return [4 /*yield*/, Promise.resolve().then(function () { return require('mainnet-js'); })];
                case 3:
                    TestNetWallet = (_a.sent()).TestNetWallet;
                    solverWif = 'cN4nUwGunYVjG2mKd1ERPXtKFbcu4P9gGBL6DJYMPSVrzqyk1VFv';
                    return [4 /*yield*/, TestNetWallet.fromWIF(solverWif)];
                case 4:
                    wallet = _a.sent();
                    solverAddress = wallet.address || wallet.cashaddr;
                    console.log("  Solver Address: ".concat(solverAddress));
                    return [4 /*yield*/, provider.getUtxos(solverAddress)];
                case 5:
                    solverUtxos = _a.sent();
                    _a.label = 6;
                case 6:
                    _a.trys.push([6, 8, , 9]);
                    return [4 /*yield*/, sdk_contracts_1.DutchAuctionSolver.fill({
                            contract: dutchContract,
                            contractUtxo: contractUtxos[0],
                            params: dutchParams,
                            solverWif: solverWif,
                            solverUtxos: solverUtxos,
                        })];
                case 7:
                    result = _a.sent();
                    console.log("  \u2705 Filled! TXID: ".concat(result.txid));
                    console.log("  Price Paid: ".concat(result.pricePaid, " sats"));
                    return [3 /*break*/, 9];
                case 8:
                    e_1 = _a.sent();
                    console.error("  \u274C Fill failed: ".concat(e_1.message));
                    return [3 /*break*/, 9];
                case 9:
                    // =========================================================================
                    // Example 2: Fill a Limit Order
                    // =========================================================================
                    console.log('--- Limit Order Fill ---');
                    limitParams = {
                        makerAddress: 'bchtest:qqmhr60gt2w2kz7aps6ds9rgv2e3f4ksdg3gye8det',
                        sellToken: 'b4863d5773c7a269b6fe3b9f7ce2ce1098ab71c0b046ef2a39058d5e30b1f353',
                        buyToken: 'BCH',
                        sellAmount: 500n,
                        buyAmount: 2500n, // Fixed price: 2500 sats for 500 tokens
                    };
                    limitContract = sdk_contracts_1.LimitOrderContract.compile(limitParams, provider);
                    console.log("  Contract: ".concat(limitContract.address));
                    return [4 /*yield*/, provider.getUtxos(limitContract.tokenAddress)];
                case 10:
                    limitUtxos = _a.sent();
                    if (limitUtxos.length === 0) {
                        console.log('  ⚠️  No funded UTXOs — skipping fill.\n');
                    }
                    else {
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
                    return [2 /*return*/];
            }
        });
    });
}
main().catch(console.error);
