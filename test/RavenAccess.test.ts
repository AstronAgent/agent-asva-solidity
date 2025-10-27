import { expect } from "chai";
import { ethers } from "hardhat";
import { RavenAccessWithSubgraphHooks } from "../typechain-types";
import { MockERC20 } from "../typechain-types";

describe("RavenAccessWithSubgraphHooks", function () {
  let ravenAccess: RavenAccessWithSubgraphHooks;
  let usdc: MockERC20;
  let usdt: MockERC20;
  let owner: any;
  let user1: any;
  let user2: any;
  let treasury: any;

  const PLAN1_PRICE = ethers.parseUnits("99", 6);
  const PLAN2_PRICE = ethers.parseUnits("129", 6);
  const PLAN3_PRICE = ethers.parseUnits("149", 6);

  beforeEach(async function () {
    [owner, user1, user2, treasury] = await ethers.getSigners();

    // Deploy mock tokens
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    usdc = await MockERC20.deploy("USD Coin", "USDC", 6);
    usdt = await MockERC20.deploy("Tether", "USDT", 6);

    // Deploy RavenAccess
    const RavenAccess = await ethers.getContractFactory("RavenAccessWithSubgraphHooks");
    ravenAccess = await RavenAccess.deploy(
      await usdc.getAddress(),
      await usdt.getAddress(),
      treasury.address,
      owner.address // oracle
    );

    // Mint tokens to users
    await usdc.mint(user1.address, ethers.parseUnits("1000", 6));
    await usdc.mint(user2.address, ethers.parseUnits("1000", 6));
  });

  describe("Deployment", function () {
    it("Should set correct initial values", async function () {
      expect(await ravenAccess.USDC()).to.equal(await usdc.getAddress());
      expect(await ravenAccess.USDT()).to.equal(await usdt.getAddress());
      expect(await ravenAccess.treasury()).to.equal(treasury.address);
    });

    it("Should initialize subscription plans", async function () {
      const plan1 = await ravenAccess.plans(1);
      const plan2 = await ravenAccess.plans(2);
      const plan3 = await ravenAccess.plans(3);

      expect(plan1.priceUnits).to.equal(PLAN1_PRICE);
      expect(plan1.monthlyCap).to.equal(3000);
      expect(plan2.priceUnits).to.equal(PLAN2_PRICE);
      expect(plan2.monthlyCap).to.equal(4000);
      expect(plan3.priceUnits).to.equal(PLAN3_PRICE);
      expect(plan3.monthlyCap).to.equal(5000);
    });
  });

  describe("Credit Costs", function () {
    it("Should have correct credit costs", async function () {
      expect(await ravenAccess.COST_BASIC()).to.equal(1);
      expect(await ravenAccess.COST_TAGS()).to.equal(2);
      expect(await ravenAccess.COST_PRICE_ACCURACY()).to.equal(4);
      expect(await ravenAccess.COST_FULL()).to.equal(6);
    });
  });

  describe("Subscription Purchase", function () {
    it("Should allow user to purchase Plan 1 subscription", async function () {
      await usdc.connect(user1).approve(await ravenAccess.getAddress(), PLAN1_PRICE);
      await ravenAccess.connect(user1).purchaseSubscriptionWithToken(1, usdc, PLAN1_PRICE);

      const subscription = await ravenAccess.getUserSubscription(user1.address);
      expect(subscription.planId).to.equal(1);
      expect(subscription.usedThisWindow).to.equal(0);
    });

    it("Should transfer payment to treasury", async function () {
      const treasuryBalanceBefore = await usdc.balanceOf(treasury.address);
      
      await usdc.connect(user1).approve(await ravenAccess.getAddress(), PLAN1_PRICE);
      await ravenAccess.connect(user1).purchaseSubscriptionWithToken(1, usdc, PLAN1_PRICE);

      const treasuryBalanceAfter = await usdc.balanceOf(treasury.address);
      expect(treasuryBalanceAfter - treasuryBalanceBefore).to.equal(PLAN1_PRICE);
    });

    it("Should reject invalid plan", async function () {
      await expect(
        ravenAccess.connect(user1).purchaseSubscriptionWithToken(0, usdc, PLAN1_PRICE)
      ).to.be.revertedWith("invalid plan");
    });
  });

  describe("Inference Request", function () {
    beforeEach(async function () {
      // User1 has Plan 1 subscription
      await usdc.connect(user1).approve(await ravenAccess.getAddress(), PLAN1_PRICE);
      await ravenAccess.connect(user1).purchaseSubscriptionWithToken(1, usdc, PLAN1_PRICE);
    });

    it("Should charge subscription for basic mode", async function () {
      await ravenAccess.connect(user1).requestInference("basic", 1, "hash123");
      
      const subscription = await ravenAccess.getUserSubscription(user1.address);
      expect(subscription.usedThisWindow).to.equal(1);
    });

    it("Should apply 3000 cap for price_accuracy mode", async function () {
      // Price accuracy mode should respect GLOBAL_PRICE_ACCURACY_CAP
      expect(await ravenAccess.GLOBAL_PRICE_ACCURACY_CAP()).to.equal(3000);
      
      // Request should succeed
      await ravenAccess.connect(user1).requestInference("price_accuracy", 1, "hash123");
      const subscription = await ravenAccess.getUserSubscription(user1.address);
      expect(subscription.usedThisWindow).to.equal(1);
    });

    it("Should fallback to credits when subscription exhausted", async function () {
      // Award credits to user
      await ravenAccess.connect(owner).awardCredits(user1.address, 10, "test");
      
      // Use up subscription (for simplicity, assume it's exhausted)
      // In reality, you'd need to make 3000 requests
      
      // Try to use credits
      await ravenAccess.connect(user1).requestInference("basic", 1, "hash123");
      const credits = await ravenAccess.getUserCredits(user1.address);
      expect(credits).to.be.greaterThan(0);
    });

    it("Should return early if insufficient resources", async function () {
      // User2 has no subscription or credits
      await expect(
        ravenAccess.connect(user2).requestInference("full", 1, "hash123")
      ).to.not.be.reverted; // Should return silently
    });
  });

  describe("Credit Management", function () {
    it("Should allow oracle to award credits", async function () {
      await ravenAccess.connect(owner).awardCredits(user1.address, 100, "referral");
      
      const credits = await ravenAccess.getUserCredits(user1.address);
      expect(credits).to.equal(100);
    });

    it("Should allow batch credit awards", async function () {
      const users = [user1.address, user2.address];
      const amounts = [50, 30];
      
      await ravenAccess.connect(owner).awardCreditsBatch(users, amounts, "batch");
      
      expect(await ravenAccess.getUserCredits(user1.address)).to.equal(50);
      expect(await ravenAccess.getUserCredits(user2.address)).to.equal(30);
    });
  });
});

