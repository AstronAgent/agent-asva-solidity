import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import * as dotenv from "dotenv";

dotenv.config();

const RavenTreasuryModule = buildModule("RavenTreasuryModule", (m) => {
  // Gnosis Safe address on Sepolia
  const gnosisSafe = m.getParameter(
    "gnosisSafe",
    "0xa8C135d27535aDC159d812dDf6B11908181D4bcD"
  );

  // Token addresses - can be overridden via parameters
  const usdcAddress = m.getParameter(
    "usdc",
    process.env.USDC_ADDRESS || "0x69c11e54051401b254fFE969e2709447817DD547"
  );

  const usdtAddress = m.getParameter(
    "usdt",
    process.env.USDT_ADDRESS || "0x071048c25e28E8Af737A9Aa0edA631426C1932A9"
  );

  const treasury = m.contract("RavenTreasury", [gnosisSafe, usdcAddress, usdtAddress]);

  return { treasury };
});

export default RavenTreasuryModule;

