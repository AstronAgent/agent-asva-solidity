import { ethers } from "hardhat";

async function main() {
  console.log("Deploying mock tokens (mUSDC, mUSDT) with 6 decimals on Sepolia...\n");

  const [deployer] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);

  const Mock = await ethers.getContractFactory("MockERC20");

  const usdc = await Mock.deploy("Mock USDC", "mUSDC", 6);
  await usdc.waitForDeployment();
  const usdcAddr = await usdc.getAddress();
  console.log("mUSDC:", usdcAddr);

  const usdt = await Mock.deploy("Mock USDT", "mUSDT", 6);
  await usdt.waitForDeployment();
  const usdtAddr = await usdt.getAddress();
  console.log("mUSDT:", usdtAddr);

  // Mint balances to deployer for testing (1,000,000 tokens each)
  const amount = ethers.parseUnits("1000000", 6);
  await (await usdc.mint(deployer.address, amount)).wait();
  await (await usdt.mint(deployer.address, amount)).wait();
  console.log("Minted 1,000,000 mUSDC and 1,000,000 mUSDT to:", deployer.address);

  console.log("\nUse these addresses for Treasury/Access deployments:");
  console.log("USDC_ADDRESS=", usdcAddr);
  console.log("USDT_ADDRESS=", usdtAddr);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });


