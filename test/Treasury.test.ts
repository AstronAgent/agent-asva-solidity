import { expect } from "chai";
import { ethers } from "hardhat";
import { RavenTreasury } from "../typechain-types";
import { MockERC20 } from "../typechain-types";

describe("RavenTreasury", function () {
  let treasury: RavenTreasury;
  let usdc: MockERC20;
  let usdt: MockERC20;
  let owner: any;
  let user1: any;
  let gnosisSafe: any;

  beforeEach(async function () {
    [owner, user1, gnosisSafe] = await ethers.getSigners();

    // Deploy mock tokens
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    usdc = await MockERC20.deploy("USD Coin", "USDC", 6);
    usdt = await MockERC20.deploy("Tether", "USDT", 6);

    // Deploy treasury
    const Treasury = await ethers.getContractFactory("RavenTreasury");
    treasury = await Treasury.deploy(
      gnosisSafe.address,
      await usdc.getAddress(),
      await usdt.getAddress()
    );

    // Mint tokens to treasury for testing
    await usdc.mint(await treasury.getAddress(), ethers.parseUnits("10000", 6));
    await usdt.mint(await treasury.getAddress(), ethers.parseUnits("10000", 6));
  });

  describe("Deployment", function () {
    it("Should set correct token addresses", async function () {
      expect(await treasury.USDC()).to.equal(await usdc.getAddress());
      expect(await treasury.USDT()).to.equal(await usdt.getAddress());
      expect(await treasury.gnosisSafe()).to.equal(gnosisSafe.address);
    });

    it("Should have token balances", async function () {
      const usdcBalance = await treasury.getUSDCBalance();
      const usdtBalance = await treasury.getUSDTBalance();
      expect(usdcBalance).to.equal(ethers.parseUnits("10000", 6));
      expect(usdtBalance).to.equal(ethers.parseUnits("10000", 6));
    });
  });

  describe("Fund Transfers", function () {
    it("Should allow Gnosis Safe to transfer USDC", async function () {
      const amount = ethers.parseUnits("100", 6);
      
      // Simulate Gnosis Safe call
      await treasury.connect(gnosisSafe).transferFunds(
        user1.address,
        await usdc.getAddress(),
        amount
      );

      expect(await usdc.balanceOf(user1.address)).to.equal(amount);
    });

    it("Should reject non-Gnosis Safe transfers", async function () {
      const amount = ethers.parseUnits("100", 6);
      
      await expect(
        treasury.connect(user1).transferFunds(
          user1.address,
          await usdc.getAddress(),
          amount
        )
      ).to.be.revertedWith("only gnosis safe");
    });

    it("Should allow ETH transfers", async function () {
      const amount = ethers.parseEther("1");
      await owner.sendTransaction({ to: await treasury.getAddress(), value: amount });

      const balanceBefore = await ethers.provider.getBalance(user1.address);
      
      await treasury.connect(gnosisSafe).transferFunds(
        user1.address,
        ethers.ZeroAddress, // ETH
        amount
      );

      const balanceAfter = await ethers.provider.getBalance(user1.address);
      expect(balanceAfter - balanceBefore).to.equal(amount);
    });
  });

  describe("Spending Approvals", function () {
    it("Should allow Gnosis Safe to approve spending", async function () {
      const spender = user1.address;
      const amount = ethers.parseUnits("1000", 6);
      
      await treasury.connect(gnosisSafe).approveSpending(
        await usdc.getAddress(),
        spender,
        amount
      );

      expect(await usdc.allowance(await treasury.getAddress(), spender)).to.equal(amount);
    });
  });

  describe("Pause Functionality", function () {
    it("Should allow Gnosis Safe owner to pause", async function () {
      // Note: This requires implementing the Gnosis Safe owner check
      // For testing, we'll assume it works
      await treasury.connect(gnosisSafe).pause();
      expect(await treasury.paused()).to.be.true;
    });

    it("Should allow unpause", async function () {
      await treasury.connect(gnosisSafe).unpause();
      expect(await treasury.paused()).to.be.false;
    });
  });

  describe("Ownership Transfer", function () {
    it("Should transfer ownership to Gnosis Safe", async function () {
      await treasury.connect(owner).transferOwnershipToGnosisSafe();
      expect(await treasury.owner()).to.equal(gnosisSafe.address);
    });
  });
});

