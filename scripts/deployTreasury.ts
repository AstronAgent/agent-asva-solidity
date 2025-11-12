import { ethers } from "hardhat";
import * as dotenv from "dotenv";

dotenv.config();

async function main() {
  console.log("Deploying RavenTreasury to Sepolia...\n");

  // Gnosis Safe address on Sepolia
  const GNOSIS_SAFE_ADDRESS = "0xa8C135d27535aDC159d812dDf6B11908181D4bcD";
  
  // Sepolia token addresses (update if you have different ones)
  // Common Sepolia testnet tokens or use mocks
  const USDC_ADDRESS = process.env.USDC_ADDRESS || "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238"; // Sepolia USDC (example)
  const USDT_ADDRESS = process.env.USDT_ADDRESS || "0xaA8E23Fb1079EA71e0a56F48a2aA51851D8433D0"; // Sepolia USDT (example)

  // Validate Gnosis Safe address
  if (!ethers.isAddress(GNOSIS_SAFE_ADDRESS)) {
    throw new Error("Invalid Gnosis Safe address");
  }

  console.log("Deployment Parameters:");
  console.log("- Network: Sepolia");
  console.log("- Gnosis Safe:", GNOSIS_SAFE_ADDRESS);
  console.log("- USDC:", USDC_ADDRESS);
  console.log("- USDT:", USDT_ADDRESS);
  console.log();

  const Treasury = await ethers.getContractFactory("RavenTreasury");
  const treasury = await Treasury.deploy(
    GNOSIS_SAFE_ADDRESS,
    USDC_ADDRESS,
    USDT_ADDRESS
  );

  await treasury.waitForDeployment();

  const address = await treasury.getAddress();
  console.log("RavenTreasury deployed to:", address);
  console.log("Network:", (await ethers.provider.getNetwork()).name);
  console.log("Block number:", await ethers.provider.getBlockNumber());

  // Verify deployment
  console.log("\nVerifying deployment...");
  const usdcAddress = await treasury.USDC();
  const usdtAddress = await treasury.USDT();
  const gnosisSafe = await treasury.gnosisSafe();

  console.log("Contract Configuration:");
  console.log("- USDC:", usdcAddress);
  console.log("- USDT:", usdtAddress);
  console.log("- Gnosis Safe:", gnosisSafe);

  // If Gnosis Safe is set, get owners
  if (gnosisSafe !== ethers.ZeroAddress) {
    try {
      const owners = await treasury.getGnosisOwners();
      const threshold = await treasury.getGnosisThreshold();
      console.log("- Gnosis Owners:", owners);
      console.log("- Required Threshold:", threshold.toNumber());
    } catch (error) {
      console.log("- Gnosis Safe not accessible yet");
    }
  }

  console.log("\nDeployment Complete!");
  console.log("\nNext steps:");
  console.log("1. Verify contract on Etherscan:");
  console.log(`   npx hardhat verify --network sepolia ${address} "${GNOSIS_SAFE_ADDRESS}" "${USDC_ADDRESS}" "${USDT_ADDRESS}"`);
  console.log("2. The Gnosis Safe is already configured in the contract");
  console.log("3. Test the contract from Gnosis Safe UI:");
  console.log("   - proposeTransfer(to, token, amount)");
  console.log("   - executeTransfer(proposalId)");
  console.log("   - cancelTransfer(proposalId)");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

