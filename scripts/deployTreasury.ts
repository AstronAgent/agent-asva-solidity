import { ethers } from "hardhat";
import * as dotenv from "dotenv";

dotenv.config();

async function main() {
  console.log("Deploying RavenTreasury...\n");

  // Contract addresses (Base mainnet)
  // Update these with actual addresses for your deployment
  const GNOSIS_SAFE_ADDRESS = process.env.GNOSIS_SAFE_ADDRESS || ethers.ZeroAddress; // Set after Gnosis Safe creation
  const USDC_ADDRESS = process.env.USDC_ADDRESS || "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"; // Base USDC
  const USDT_ADDRESS = process.env.USDT_ADDRESS || "0xfde4C96c8593536E31F229EA8f37b2ADa2699fc2"; // Base USDT

  console.log("Deployment Parameters:");
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
  console.log("1. Create Gnosis Safe with 2/3 signers");
  console.log("2. Update GNOSIS_SAFE_ADDRESS in .env");
  console.log("3. Set Gnosis Safe in treasury: setGnosisSafe(SAFE_ADDRESS)");
  console.log("4. Transfer ownership to Gnosis Safe: transferOwnershipToGnosisSafe()");
  console.log("5. Verify contract on block explorer");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

