import { ethers } from "hardhat";
import * as dotenv from "dotenv";

dotenv.config();

async function main() {
  console.log("Setting oracle address on RavenAccessWithSubgraphHooks...\n");

  const ACCESS_ADDRESS = process.env.RAVEN_ACCESS_ADDRESS || "0x92a2f8F3cC2c7E4CB9B772C060f84D4d2F441d66";
  const NEW_ORACLE = "0x13719837f64746c863497bc804fa8b38093a3e35";

  const [signer] = await ethers.getSigners();
  console.log("Signer:", signer.address);

  const access = await ethers.getContractAt("RavenAccessWithSubgraphHooks", ACCESS_ADDRESS);

  // Check current oracle
  const currentOracle = await access.oracle();
  console.log("Current oracle:", currentOracle);

  // Check if caller is owner
  const owner = await access.owner();
  console.log("Contract owner:", owner);
  
  if (owner.toLowerCase() !== signer.address.toLowerCase()) {
    throw new Error("Signer is not the contract owner");
  }

  console.log("\nSetting new oracle:", NEW_ORACLE);
  const tx = await access.setOracle(NEW_ORACLE);
  console.log("Transaction hash:", tx.hash);
  
  await tx.wait();
  console.log("Transaction confirmed!");

  // Verify
  const updatedOracle = await access.oracle();
  console.log("\nUpdated oracle:", updatedOracle);
  console.log("Oracle updated successfully!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });


