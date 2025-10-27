# Raven Subscription & Treasury Contracts

Smart contracts for the Raven platform - a decentralized AI inference access control system with subscription management and multi-signature treasury.

## Overview

This repository contains two main contracts for the Raven ecosystem:

### 1. RavenAccessWithSubgraphHooks (Subscribe.sol)
**Main contract for subscription management and credit system**

Manages user subscriptions, credits, and inference requests with three tiered plans:
- **Plan 1**: Price Accuracy - $99/month, 3000 requests/month
- **Plan 2**: Price Accuracy + Reasoning - $129/month, 4000 requests/month  
- **Plan 3**: Full Features (Reasoning + Price Accuracy + Scores) - $149/month, 5000 requests/month

**Key Features:**
- Subscription-based access control with monthly limits
- Credit system for pay-as-you-go inference
- 3000 request cap for price accuracy features across all plans
- Priority billing: Subscription → Credits → Return early if insufficient
- Subgraph-ready events for off-chain indexing

### 2. RavenTreasury.sol
**Multi-signature treasury for fund management**

Secure treasury contract with Gnosis Safe integration for handling subscription payments and fund transfers.

**Key Features:**
- Gnosis Safe multi-signature support
- USDC/USDT token support
- Pausable for emergency situations
- Owner-only configuration functions
- Reentrancy protection

## Installation

```bash
npm install
```

## Configuration

Create a `.env` file in the root directory:

```env
PRIVATE_KEY=your_private_key
SEPOLIA_RPC_URL=your_sepolia_rpc_url
ETHERSCAN_API_KEY=your_etherscan_api_key
```

## Deployment

### Deploy to Sepolia Testnet

```bash
# Compile contracts
npm run build

# Deploy RavenAccessWithSubgraphHooks
npx hardhat run scripts/deploySubcribe.ts --network sepolia

# Deploy RavenTreasury
npx hardhat run scripts/deployTreasury.ts --network sepolia
```

### Deploy to Mainnet

```bash
# Update network config in hardhat.config.ts
# Add BASE_RPC_URL and BASE_PRIVATE_KEY to .env
npx hardhat run scripts/deploySubcribe.ts --network base
npx hardhat run scripts/deployTreasury.ts --network base
```

## Testing

Run tests:

```bash
# Run all tests
npm test

# Run specific test file
npx hardhat test test/Subcribe.test.ts
npx hardhat test test/Treasury.test.ts
```

## Integration Guide

### Integrating RavenAccessWithSubgraphHooks

```javascript
import { ethers } from "ethers";
import RavenAccessWithSubgraphHooks from "./artifacts/contracts/Subcribe.sol/RavenAccessWithSubgraphHooks.json";

// Initialize contract
const provider = new ethers.JsonRpcProvider(RPC_URL);
const signer = await provider.getSigner();
const ravenAccess = new ethers.Contract(
  CONTRACT_ADDRESS,
  RavenAccessWithSubgraphHooks.abi,
  signer
);

// Purchase subscription (Plan 2 - $129/month)
const planId = 2;
const price = ethers.parseUnits("129", 6); // USDC/USDT have 6 decimals
await USDC.approve(CONTRACT_ADDRESS, price);
await ravenAccess.purchaseSubscriptionWithToken(planId, USDC_ADDRESS, price);

// Request inference
await ravenAccess.requestInference("price_accuracy", 1, "context-hash");

// Check user subscription
const subscription = await ravenAccess.getUserSubscription(USER_ADDRESS);
console.log("Plan ID:", subscription.planId);
console.log("Used this month:", subscription.usedThisWindow);
```

### Integrating RavenTreasury

```javascript
import RavenTreasury from "./artifacts/contracts/RavenTreasury.sol/RavenTreasury.json";

const treasury = new ethers.Contract(
  TREASURY_ADDRESS,
  RavenTreasury.abi,
  signer
);

// Get token balances
const usdcBalance = await treasury.getUSDCBalance();
const usdtBalance = await treasury.getUSDTBalance();

// Transfer funds (only callable by Gnosis Safe)
await treasury.transferFunds(RECIPIENT, USDC_ADDRESS, amount);
```

## Pricing Model

### Credit Costs per Inference Mode:
- **basic**: 1 credit
- **tags**: 2 credits
- **price_accuracy**: 4 credits
- **full**: 6 credits

### Subscription Plans:
| Plan | Monthly Cost | Monthly Limit | Price Accuracy Cap |
|------|--------------|---------------|-------------------|
| Plan 1 | $99 | 3000 requests | 3000 requests |
| Plan 2 | $129 | 4000 requests | 3000 requests |
| Plan 3 | $149 | 5000 requests | 3000 requests |

**Note**: All plans are capped at 3000 requests for price accuracy features regardless of plan tier.

## Events for Subgraph Indexing

Both contracts emit rich events for The Graph indexing:

### RavenAccessWithSubgraphHooks Events:
- `SubscriptionPurchased` - New subscription
- `SubscriptionRenewed` - Subscription renewal
- `InferenceLog` - Every inference request with billing info
- `CreditsChanged` - Credit balance updates
- `UserMemoryUpdated` - User memory snapshot updates

### RavenTreasury Events:
- `FundsTransferred` - Treasury transfers
- `SpendingApproved` - Token approvals
- `GnosisSafeSet` - Safe configuration

## Security Features

- OpenZeppelin security standards (Ownable, ReentrancyGuard, Pausable)
- Multi-signature treasury via Gnosis Safe
- SafeERC20 for secure token transfers
- Input validation on all functions
- Gas optimization with optimizer

## Development

```bash
# Install dependencies
npm install

# Compile
npx hardhat compile

# Run tests
npm test

# Generate typechain types
npx hardhat typechain
```

## License

MIT

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## Contact

For questions and support, reach out to the team.
