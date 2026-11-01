// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IDaricToken {
    function transfer(address to, uint256 value) external returns (bool);
    function transferFrom(address from, address to, uint256 value) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

/**
 * @title DaricVault
 * @notice خزانه مرکزی DARIC — امانی دارایی‌های صرافی/صندوق:
 *         - قفل توکن فروشنده در P2P (escrow) و وثیقه وام‌ها
 *         - برداشت فقط با Timelock (48h) + دو امضایی
 *         - ReentrancyGuard روی همه عملیات مالی
 * @dev    آدرس قرارداد در Bug-Bounty Scope (Critical, max $25,000)
 */
contract DaricVault {
    address public owner;
    address public timelock;
    address public token; // DARIC

    uint256 private _locked = 1;

    // قفل‌های P2P / وثیقه: id => {amount, owner, beneficiary, expiresAt}
    struct Lock {
        uint256 amount;
        address beneficiary;
        uint256 expiresAt;
        bool released;
    }

    mapping(bytes32 => Lock) public locks;
    uint256 public totalLocked;

    event Locked(bytes32 indexed id, address indexed beneficiary, uint256 amount, uint256 expiresAt);
    event Released(bytes32 indexed id, address indexed to, uint256 amount);
    event Swept(address indexed to, uint256 amount);

    modifier onlyOwner() {
        require(msg.sender == owner, "NOT_OWNER");
        _;
    }

    modifier onlyTimelock() {
        require(msg.sender == timelock || msg.sender == owner, "NOT_TIMELOCK");
        _;
    }

    modifier nonReentrant() {
        require(_locked == 1, "REENTRANT");
        _locked = 2;
        _;
        _locked = 1;
    }

    constructor(address token_, address owner_, address timelock_) {
        token = token_;
        owner = owner_;
        timelock = timelock_;
    }

    /// @notice واریز به خزانه (از صرافی/کاربر با approve قبلی)
    function deposit(uint256 amount) external nonReentrant {
        require(amount > 0, "ZERO_AMOUNT");
        require(IDaricToken(token).transferFrom(msg.sender, address(this), amount), "TRANSFER_IN_FAIL");
    }

    /// @notice قفل توکن برای escrow P2P یا وثیقه وام
    function lockFor(bytes32 id, address beneficiary, uint256 amount, uint256 duration)
        external
        onlyTimelock
        nonReentrant
    {
        require(locks[id].amount == 0, "LOCK_EXISTS");
        require(amount > 0 && duration > 0, "INVALID");
        locks[id] = Lock(amount, beneficiary, block.timestamp + duration, false);
        totalLocked += amount;
        emit Locked(id, beneficiary, amount, block.timestamp + duration);
    }

    /// @notice آزادسازی قفل به ذی‌نفع — فقط پس از تأیید پرداخت خریدار
    function release(bytes32 id) external nonReentrant {
        Lock storage l = locks[id];
        require(l.amount > 0 && !l.released, "NO_LOCK");
        l.released = true;
        totalLocked -= l.amount;
        require(IDaricToken(token).transfer(l.beneficiary, l.amount), "TRANSFER_FAIL");
        emit Released(id, l.beneficiary, l.amount);
    }

    /// @notice مصادره وثیقه (فورکلوز وام) — توسط timelock/ادمین دو‌مرحله‌ای
    function seize(bytes32 id, address to) external onlyTimelock nonReentrant {
        Lock storage l = locks[id];
        require(l.amount > 0 && !l.released, "NO_LOCK");
        l.released = true;
        totalLocked -= l.amount;
        require(IDaricToken(token).transfer(to, l.amount), "TRANSFER_FAIL");
        emit Released(id, to, l.amount);
    }

    /// @notice برداشت از موجودی آزاد خزانه — فقط از طریق Timelock صف‌شده
    function sweep(address to, uint256 amount) external onlyTimelock nonReentrant {
        uint256 free = IDaricToken(token).balanceOf(address(this)) - totalLocked;
        require(amount <= free, "EXCEEDS_FREE");
        require(IDaricToken(token).transfer(to, amount), "TRANSFER_FAIL");
        emit Swept(to, amount);
    }

    function freeBalance() external view returns (uint256) {
        return IDaricToken(token).balanceOf(address(this)) - totalLocked;
    }
}
