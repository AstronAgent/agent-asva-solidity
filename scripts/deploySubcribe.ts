import { ethers } from "hardhat";
import * as dotenv from "dotenv";

dotenv.config();

async function main() {
  console.log("Deploying RavenAccessWithSubgraphHooks...\n");

  // Contract addresses (Base mainnet)
  // Update these with actual addresses for your deployment
  const USDC_ADDRESS = process.env.USDC_ADDRESS || "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"; // Base USDC
  const USDT_ADDRESS = process.env.USDT_ADDRESS || "0xfde4C96c8593536E31F229EA8f37b2ADa2699fc2"; // Base USDT
  const TREASURY_ADDRESS = process.env.TREASURY_ADDRESS || ethers.ZeroAddress; // Set after treasury deployment
  const ORACLE_ADDRESS = process.env.ORACLE_ADDRESS || ethers.ZeroAddress; // Set after oracle deployment

  console.log("Deployment Parameters:");
  console.log("- USDC:", USDC_ADDRESS);
  console.log("- USDT:", USDT_ADDRESS);
  console.log("- Treasury:", TREASURY_ADDRESS);
  console.log("- Oracle:", ORACLE_ADDRESS);
  console.log();

  const RavenAccess = await ethers.getContractFactory("RavenAccessWithSubgraphHooks");
  const ravenAccess = await RavenAccess.deploy(
    USDC_ADDRESS,
    USDT_ADDRESS,
    TREASURY_ADDRESS,
    ORACLE_ADDRESS
  );

  await ravenAccess.waitForDeployment();

  const address = await ravenAccess.getAddress();
  console.log("RavenAccessWithSubgraphHooks deployed to:", address);
  console.log("Network:", (await ethers.provider.getNetwork()).name);
  console.log("Block number:", await ethers.provider.getBlockNumber());

  // Verify deployment
  console.log("\nVerifying deployment...");
  const usdcAddress = await ravenAccess.USDC();
  const usdtAddress = await ravenAccess.USDT();
  const treasuryAddress = await ravenAccess.treasury();
  const oracleAddress = await ravenAccess.oracle();

  console.log("Contract Configuration:");
  console.log("- USDC:", usdcAddress);
  console.log("- USDT:", usdtAddress);
  console.log("- Treasury:", treasuryAddress);
  console.log("- Oracle:", oracleAddress);

  // Check plan configurations
  const plan1 = await ravenAccess.plans(1);
  const plan2 = await ravenAccess.plans(2);
  const plan3 = await ravenAccess.plans(3);

  console.log("\nSubscription Plans:");
  console.log("Plan 1:", ethers.formatUnits(plan1.priceUnits, 6), "USDC,", plan1.monthlyCap.toNumber(), "requests/month");
  console.log("Plan 2:", ethers.formatUnits(plan2.priceUnits, 6), "USDC,", plan2.monthlyCap.toNumber(), "requests/month");
  console.log("Plan 3:", ethers.formatUnits(plan3.priceUnits, 6), "USDC,", plan3.monthlyCap.toNumber(), "requests/month");

  console.log("\nDeployment Complete!");
  console.log("\nNext steps:");
  console.log("1. Update TREASURY_ADDRESS in .env");
  console.log("2. Update ORACLE_ADDRESS in .env");
  console.log("3. Verify contract on block explorer");
  console.log("4. Deploy subgraph with this contract address");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

