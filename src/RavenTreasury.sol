// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

// Gnosis Safe interface
interface IGnosisSafe {
    function isOwner(address owner) external view returns (bool);
    function getOwners() external view returns (address[] memory);
    function getThreshold() external view returns (uint256);
    function execTransaction(
        address to,
        uint256 value,
        bytes calldata data,
        uint8 operation,
        uint256 safeTxGas,
        uint256 baseGas,
        uint256 gasPrice,
        address gasToken,
        address payable refundReceiver,
        bytes memory signatures
    ) external returns (bool success);
}

contract RavenTreasury is Ownable, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;

    // Gnosis Safe instance
    IGnosisSafe public gnosisSafe;

    // Token addresses
    IERC20 public immutable USDC;
    IERC20 public immutable USDT;

    // Proposal-based transfer system with 24-hour window
    struct TransferProposal {
        address to;
        address token;
        uint256 amount;
        uint256 proposedAt;
        bool executed;
        bool cancelled;
    }

    mapping(uint256 => TransferProposal) public pendingTransfers;
    uint256 public nextProposalId;

    // Events
    event GnosisSafeSet(address indexed gnosisSafe);
    event FundsTransferred(address indexed to, address indexed token, uint256 amount);
    event SpendingApproved(address indexed token, address indexed spender, uint256 amount);
    event TransferProposed(
        uint256 indexed proposalId,
        address indexed to,
        address indexed token,
        uint256 amount,
        uint256 deadline
    );
    event TransferExecuted(uint256 indexed proposalId);
    event TransferCancelled(uint256 indexed proposalId);

    modifier onlyGnosisSafe() {
        require(msg.sender == address(gnosisSafe), "only gnosis safe");
        _;
    }

    modifier onlyGnosisOwner() {
        require(address(gnosisSafe) != address(0), "gnosis safe not set");
        require(gnosisSafe.isOwner(msg.sender), "not gnosis owner");
        _;
    }

    constructor(
        address _gnosisSafe,
        address _usdc,
        address _usdt
    ) Ownable(msg.sender) {
        require(_usdc != address(0), "zero USDC address");
        require(_usdt != address(0), "zero USDT address");

        // Allow deployment without Gnosis Safe initially (for testing)
        if (_gnosisSafe != address(0)) {
            gnosisSafe = IGnosisSafe(_gnosisSafe);
            emit GnosisSafeSet(_gnosisSafe);
        }

        USDC = IERC20(_usdc);
        USDT = IERC20(_usdt);
    }

    // Function to propose a transfer (callable by Gnosis Safe via UI)
    function proposeTransfer(
        address to,
        address token,
        uint256 amount
    ) external onlyGnosisSafe whenNotPaused {
        require(to != address(0), "zero recipient");
        require(amount > 0, "zero amount");

        uint256 proposalId = nextProposalId++;
        uint256 deadline = block.timestamp + 24 hours;

        pendingTransfers[proposalId] = TransferProposal({
            to: to,
            token: token,
            amount: amount,
            proposedAt: block.timestamp,
            executed: false,
            cancelled: false
        });

        emit TransferProposed(proposalId, to, token, amount, deadline);
    }

    // Function to execute a proposed transfer (only callable by Gnosis Safe after multi-sig approval)
    function executeTransfer(uint256 proposalId) external onlyGnosisSafe nonReentrant whenNotPaused {
        TransferProposal storage proposal = pendingTransfers[proposalId];

        require(!proposal.executed, "already executed");
        require(!proposal.cancelled, "cancelled");
        require(block.timestamp <= proposal.proposedAt + 24 hours, "24h window expired");
        require(proposal.amount > 0, "invalid proposal");
        
        proposal.executed = true;
        
        if (proposal.token == address(0)) {
            // ETH transfer
            require(address(this).balance >= proposal.amount, "insufficient ETH");
            (bool success, ) = payable(proposal.to).call{value: proposal.amount}("");
            require(success, "ETH transfer failed");
        } else {
            // ERC20 transfer
            IERC20(proposal.token).safeTransfer(proposal.to, proposal.amount);
        }

        emit TransferExecuted(proposalId);
        emit FundsTransferred(proposal.to, proposal.token, proposal.amount);
    }

    // Function to transfer funds directly (only callable by Gnosis Safe - for immediate transfers)
    /*function transferFunds(
        address to,
        address token,
        uint256 amount
    ) external onlyGnosisSafe nonReentrant whenNotPaused {
        require(to != address(0), "zero recipient");
        require(amount > 0, "zero amount");

        if (token == address(0)) {
            // ETH transfer
            require(address(this).balance >= amount, "insufficient ETH balance");
            (bool success, ) = payable(to).call{value: amount}("");
            require(success, "ETH transfer failed");
        } else {
            // ERC20 transfer
            IERC20(token).safeTransfer(to, amount);
        }

        emit FundsTransferred(to, token, amount);
    }*/

    // Function to approve spending (only callable by Gnosis Safe)
    function approveSpending(
        address token,
        address spender,
        uint256 amount
    ) external onlyGnosisSafe {
        require(token != address(0), "zero token");
        require(spender != address(0), "zero spender");
        IERC20 erc20 = IERC20(token);
        erc20.forceApprove(spender, amount);
        emit SpendingApproved(token, spender, amount);
    }

    // Emergency pause (only Gnosis Safe owners)
    function pause() external onlyGnosisOwner {
        _pause();
    }

    function unpause() external onlyGnosisOwner {
        _unpause();
    }

    // Admin functions (only owner, typically the Gnosis Safe)
    function setGnosisSafe(address _gnosisSafe) external onlyOwner {
        require(_gnosisSafe != address(0), "zero address");
        gnosisSafe = IGnosisSafe(_gnosisSafe);
        emit GnosisSafeSet(_gnosisSafe);
    }

    // Transfer ownership to Gnosis Safe (recommended after deployment)
    function transferOwnershipToGnosisSafe() external onlyOwner {
        require(address(gnosisSafe) != address(0), "gnosis safe not set");
        _transferOwnership(address(gnosisSafe));
    }

    // View functions
    function getGnosisOwners() external view returns (address[] memory) {
        require(address(gnosisSafe) != address(0), "gnosis safe not set");
        return gnosisSafe.getOwners();
    }

    function getGnosisThreshold() external view returns (uint256) {
        require(address(gnosisSafe) != address(0), "gnosis safe not set");
        return gnosisSafe.getThreshold();
    }

    function isGnosisOwner(address owner) external view returns (bool) {
        require(address(gnosisSafe) != address(0), "gnosis safe not set");
        return gnosisSafe.isOwner(owner);
    }

    function getTokenBalance(address token) external view returns (uint256) {
        if (token == address(0)) {
            return address(this).balance;
        }
        return IERC20(token).balanceOf(address(this));
    }

    function getUSDCBalance() external view returns (uint256) {
        return USDC.balanceOf(address(this));
    }

    function getUSDTBalance() external view returns (uint256) {
        return USDT.balanceOf(address(this));
    }

    // Function to cancel a proposal (callable by Gnosis Safe via UI)
    function cancelTransfer(uint256 proposalId) external onlyGnosisSafe {
        TransferProposal storage proposal = pendingTransfers[proposalId];
        require(!proposal.executed, "already executed");
        require(!proposal.cancelled, "already cancelled");
        proposal.cancelled = true;
        emit TransferCancelled(proposalId);
    }

    // View functions for proposals
    function getProposal(uint256 proposalId) external view returns (
        address to,
        address token,
        uint256 amount,
        uint256 proposedAt,
        bool executed,
        bool cancelled,
        bool isWindowActive,
        uint256 timeRemaining
    ) {
        TransferProposal storage proposal = pendingTransfers[proposalId];
        require(proposal.amount > 0, "invalid proposal");
        
        to = proposal.to;
        token = proposal.token;
        amount = proposal.amount;
        proposedAt = proposal.proposedAt;
        executed = proposal.executed;
        cancelled = proposal.cancelled;
        
        uint256 currentTime = block.timestamp;
        uint256 deadline = proposedAt + 24 hours;
        isWindowActive = !executed && !cancelled && (currentTime <= deadline);
        
        if (isWindowActive) {
            timeRemaining = deadline - currentTime;
        } else {
            timeRemaining = 0;
        }
    }

    function isProposalWindowActive(uint256 proposalId) external view returns (bool) {
        TransferProposal storage proposal = pendingTransfers[proposalId];
        if (proposal.amount == 0 || proposal.executed || proposal.cancelled) return false;
        uint256 currentTime = block.timestamp;
        return currentTime <= proposal.proposedAt + 24 hours;
    }

    function getProposalDeadline(uint256 proposalId) external view returns (uint256) {
        TransferProposal storage proposal = pendingTransfers[proposalId];
        require(proposal.amount > 0, "invalid proposal");
        return proposal.proposedAt + 24 hours;
    }

    // Receive ETH
    receive() external payable {}

    // Fallback function
    fallback() external payable {}
}
