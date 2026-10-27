// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ERC4626} from "@openzeppelin/contracts/token/ERC20/extensions/ERC4626.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Ownable2Step} from "@openzeppelin/contracts/access/Ownable2Step.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title FlowVault
/// @notice FlowFi Phase 1 USDC Earn vault. Deposit, withdrawal and performance fees are all 0.
/// @dev No strategy or guaranteed yield: assets remain in this vault. Yield is funded by the owner
///      and streams linearly over yieldPeriod, excluded from share pricing until vested.
///      If all shares are redeemed mid-stream, the unvested remainder goes to the next depositors.
///      Intended asset on Arc Testnet: 0x3600000000000000000000000000000000000000 (6 decimals).
///      Shares have asset decimals + 6, i.e. 12 for USDC. Read decimals() for UI formatting.
///      The cap applies to deposits, mints and addYield, including locked yield; unsolicited token
///      transfers cannot be prevented and may put the raw balance above the cap, closing further inflows.
///      Pausing never restricts withdrawals, redemptions or receipt-token transfers.
contract FlowVault is ERC4626, Ownable2Step, Pausable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    error ZeroAddress();
    error ZeroAmount();
    error NoSharesOutstanding();
    error InvalidYieldPeriod();
    error DepositCapExceeded(uint256 assets, uint256 available);
    error CapBelowTotalAssets(uint256 newCap, uint256 totalAssets);

    event DepositCapUpdated(uint256 previousCap, uint256 newCap);
    event YieldAdded(
        address indexed owner,
        uint256 assets,
        uint256 totalAssetsAfter,
        uint256 totalSupplyAfter,
        uint256 streamEnd
    );

    /// @notice Maximum underlying balance allowed by vault-controlled inflows, in asset base units.
    uint256 public depositCap;

    /// @notice Timestamp of vault creation, in seconds since the Unix epoch.
    uint256 public immutable inceptionTimestamp;

    /// @notice Duration in seconds over which injected yield streams linearly.
    uint256 public immutable yieldPeriod;

    /// @notice Total yield scheduled at the start of the current stream, in asset base units.
    uint256 public streamAmount;

    /// @notice Start timestamp of the current yield stream.
    uint256 public streamStart;

    /// @notice End timestamp of the current yield stream.
    uint256 public streamEnd;

    /// @param asset_ USDC ERC-20 asset; must not be the zero address.
    /// @param owner_ Initial two-step owner; must not be the zero address.
    /// @param depositCap_ Initial cap in USDC base units; zero closes deposits and yield additions.
    /// @param yieldPeriod_ Yield streaming duration in seconds, from 1 hour to 30 days inclusive.
    constructor(IERC20 asset_, address owner_, uint256 depositCap_, uint256 yieldPeriod_)
        ERC20("FlowFi USDC Vault", "fvUSDC")
        ERC4626(asset_)
        Ownable(owner_)
    {
        // Ownable's constructor rejects a zero owner with OwnableInvalidOwner.
        if (address(asset_) == address(0)) revert ZeroAddress();
        if (yieldPeriod_ < 1 hours || yieldPeriod_ > 30 days) revert InvalidYieldPeriod();
        depositCap = depositCap_;
        inceptionTimestamp = block.timestamp;
        yieldPeriod = yieldPeriod_;
        emit DepositCapUpdated(0, depositCap_);
    }

    /// @notice Set the cap; it cannot be reduced below the current underlying balance.
    function setDepositCap(uint256 newCap) external onlyOwner {
        uint256 managedAssets = IERC20(asset()).balanceOf(address(this));
        if (newCap < managedAssets) revert CapBelowTotalAssets(newCap, managedAssets);
        uint256 previousCap = depositCap;
        depositCap = newCap;
        emit DepositCapUpdated(previousCap, newCap);
    }

    /// @notice Pause deposits and mints only. Existing holders can still exit.
    function pause() external onlyOwner {
        _pause();
    }

    /// @notice Re-enable deposits and mints, subject to the cap.
    function unpause() external onlyOwner {
        _unpause();
    }

    /// @notice Stream owner-funded yield over yieldPeriod without minting shares or charging fees.
    /// @dev Requires prior asset approval. Available while paused, but subject to the raw balance cap.
    ///      Raise the cap first if necessary. Rejects an empty vault at injection time.
    ///      Remaining locked yield is combined with the injection and streamed over a new yieldPeriod.
    ///      If all shares are redeemed mid-stream, the unvested remainder goes to the next depositors.
    /// @param assets Amount of USDC in base units to transfer from the current owner.
    function addYield(uint256 assets) external onlyOwner nonReentrant {
        if (assets == 0) revert ZeroAmount();
        if (totalSupply() == 0) revert NoSharesOutstanding();
        _checkInflowCap(assets);
        uint256 remainingYield = lockedYield();
        IERC20(asset()).safeTransferFrom(_msgSender(), address(this), assets);
        streamAmount = remainingYield + assets;
        streamStart = block.timestamp;
        streamEnd = block.timestamp + yieldPeriod;
        emit YieldAdded(_msgSender(), assets, totalAssets(), totalSupply(), streamEnd);
    }

    /// @notice Unvested yield excluded from share pricing, in asset base units.
    function lockedYield() public view returns (uint256) {
        if (block.timestamp >= streamEnd) return 0;
        return streamAmount * (streamEnd - block.timestamp) / (streamEnd - streamStart);
    }

    /// @inheritdoc ERC4626
    /// @dev Only vested yield is included in assets backing share conversions.
    function totalAssets() public view override returns (uint256) {
        return IERC20(asset()).balanceOf(address(this)) - lockedYield();
    }

    /// @inheritdoc ERC4626
    function maxDeposit(address) public view override returns (uint256) {
        if (paused()) return 0;
        uint256 managedAssets = IERC20(asset()).balanceOf(address(this));
        return managedAssets < depositCap ? depositCap - managedAssets : 0;
    }

    /// @inheritdoc ERC4626
    function maxMint(address receiver) public view override returns (uint256) {
        // Floor rounding ensures previewMint(result) cannot exceed the remaining asset capacity.
        return convertToShares(maxDeposit(receiver));
    }

    /// @dev Shared deposit/mint hook; also rejects zero-amount calls while paused.
    function _deposit(address caller, address receiver, uint256 assets, uint256 shares)
        internal
        override
        nonReentrant
        whenNotPaused
    {
        _checkInflowCap(assets);
        super._deposit(caller, receiver, assets, shares);
    }

    /// @dev Shared withdraw/redeem hook. Deliberately has no pause or cap restriction.
    function _withdraw(address caller, address receiver, address owner_, uint256 assets, uint256 shares)
        internal
        override
        nonReentrant
    {
        super._withdraw(caller, receiver, owner_, assets, shares);
    }

    /// @dev Virtual shares mitigate first-depositor inflation attacks using OpenZeppelin's accounting.
    function _decimalsOffset() internal pure override returns (uint8) {
        return 6;
    }

    function _checkInflowCap(uint256 assets) private view {
        uint256 managedAssets = IERC20(asset()).balanceOf(address(this));
        uint256 available = managedAssets < depositCap ? depositCap - managedAssets : 0;
        if (managedAssets > depositCap || assets > available) {
            revert DepositCapExceeded(assets, available);
        }
    }
}
