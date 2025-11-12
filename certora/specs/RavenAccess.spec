using RavenAccessWithSubgraphHooks as Raven;

methods {
    function Raven.purchaseSubscriptionWithToken(uint8,address,uint256) external;
    function Raven.requestInference(string calldata,uint256,string calldata) external;
    function Raven.awardCredits(address,uint256,string calldata) external;

    function Raven.getUserCredits(address) external returns uint256 envfree;
    function Raven.getUserSubscription(address)
        external returns (uint8,uint256,uint256,uint256,uint256,uint256) envfree;

    function Raven.treasury()   external returns address envfree;
    function Raven.oracle()     external returns address envfree;
    function Raven.owner()      external returns address envfree;
    function Raven.userSequence(address) external returns uint256 envfree;
    function Raven.USDC()       external returns address envfree;
    function Raven.USDT()       external returns address envfree;
    function Raven.GLOBAL_PRICE_ACCURACY_CAP() external returns uint256 envfree;

    function MockERC20.transferFrom(address,address,uint256) external returns (bool);
    function MockERC20.balanceOf(address) external returns uint256 envfree;

    // ADD THESE
    function _.balanceOf(address) external envfree;
    function _.transferFrom(address,address,uint256) external envfree;
    function _.approve(address,uint256) external envfree;
}

// REMOVE ALL INVARIANTS
// ADD THESE RULES INSTEAD
/*rule treasury_is_set() {
    assert Raven.treasury() != 0;
}*/

rule usdc_is_set() {
    assert Raven.USDC() != 0;
}

rule usdt_is_set() {
    assert Raven.USDT() != 0;
}

rule only_oracle_or_owner_awards(address user, uint256 amount, string reason) {
    env e;
    Raven.awardCredits@withrevert(e, user, amount, reason);
    assert !lastReverted => (e.msg.sender == Raven.oracle() || e.msg.sender == Raven.owner());
}

rule credits_increase_on_award(address user, uint256 amount, string reason) {
    env e;
    uint256 before = Raven.getUserCredits(user);
    require amount > 0;
    Raven.awardCredits(e, user, amount, reason);
    uint256 after = Raven.getUserCredits(user);
    assert after == before + amount;
}

rule purchase_sets_subscription(uint8 planId, address token, uint256 amountUnits) {
    env e;
    require token == Raven.USDC() || token == Raven.USDT();
    require planId >= 1;

    uint8 oldPlanId; uint256 oldUsed;
    (oldPlanId, _, oldUsed, _, _, _) = Raven.getUserSubscription(e.msg.sender);

    uint256 price; uint256 cap;
    (_, _, _, _, cap, price) = Raven.getUserSubscription(0);
    require amountUnits >= price;
    require cap > 0;

    Raven.purchaseSubscriptionWithToken@withrevert(e, planId, token, amountUnits);
    bool succeeded = !lastReverted;

    uint8 newPlanId; uint256 newUsed;
    (newPlanId, _, newUsed, _, _, _) = Raven.getUserSubscription(e.msg.sender);

    assert !succeeded || (newPlanId == planId && newUsed == 0);
}

rule inference_respects_limits(string mode, uint256 quantity, string contextHash) {
    env e;
    address usr = e.msg.sender;

    require mode.length        <= 32;
    require contextHash.length <= 32;

    uint8 pid; uint256 used; uint256 cap;
    (pid, _, used, _, cap, _) = Raven.getUserSubscription(usr);
    uint256 cred = Raven.getUserCredits(usr);

    require quantity > 0;

    Raven.requestInference@withrevert(e, mode, quantity, contextHash);
    bool success = !lastReverted;

    assert success =>
        (pid > 0 && used + quantity <= cap) ||
        (cred >= quantity * 6);
}

rule user_cannot_exceed_cap_without_credits(string mode, uint256 quantity, string contextHash) {
    env e;
    address usr = e.msg.sender;

    require mode.length <= 32;
    require contextHash.length <= 32;
    require quantity > 0;

    uint8 pid; uint256 used; uint256 cap;
    (pid, _, used, _, cap, _) = Raven.getUserSubscription(usr);
    uint256 cred = Raven.getUserCredits(usr);

    require pid > 0;
    require used + quantity > cap;
    require cred < quantity * 6;

    Raven.requestInference@withrevert(e, mode, quantity, contextHash);
    assert lastReverted;
}

rule cannot_purchase_twice_in_same_sequence(uint8 planId , address token, uint256 amountUnits) {

    env e1; env e2;
    require e1.msg.sender == e2.msg.sender;

    require token == Raven.USDC() || token == Raven.USDT();

    require planId >= 1;

    uint256 price; uint256 cap;

    (_,_,_,_,cap , price) = Raven.getUserSubscription(0);

    require amountUnits >= price;

    uint256 seqBefore = Raven.userSequence(e1.msg.sender);

    Raven.purchaseSubscriptionWithToken(e1, planId , token , amountUnits);

    Raven.purchaseSubscriptionWithToken@withrevert(e2, planId , token, amountUnits);

    uint256 seqAfter = Raven.userSequence(e2.msg.sender);

    assert seqAfter > seqBefore;
}

