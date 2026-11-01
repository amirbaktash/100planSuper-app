// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title DaricToken_Military
 * @notice توکن DARIC — استاندارد ERC-20 با کنترل‌های نظامی‌گونه:
 *        - عرضه ثابت ۱ میلیارد (۱۸ اعشار)
 *        - Blacklist + Freeze برای Anti-Fraud
 *        - Cap برداشت روزانه در فاز Beta (feature-flag)
 *        - فقط NAV-Oracle مجاز به mint/burn تطبیقی (ولی عرضه ثابت: بدون mint)
 * @dev    پس از ماینت اولیه، عرضه ثابت است؛ Vault آدرس اصلی custody است.
 */
contract DaricToken_Military {
    string public constant name = "Daric Token";
    string public constant symbol = "DARIC";
    uint8 public constant decimals = 18;

    uint256 public immutable totalSupply_;
    address public owner;
    address public navOracle;
    address public pauser;

    bool public paused;
    bool public transfersEnabled = true;

    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;
    mapping(address => bool) public blacklist;
    mapping(address => bool) public frozen;

    // سقف برداشت روزانه هر آدرس در بتا (۰ = بدون سقف)
    mapping(address => uint256) public dailyWithdrawCap;
    mapping(address => uint256) public dayStartTotal;
    mapping(address => uint256) public dayStarted;

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
    event Blacklisted(address indexed account, bool status);
    event FrozenSet(address indexed account, bool status);
    event PausedSet(bool status);
    event OracleSet(address indexed oracle);

    modifier onlyOwner() {
        require(msg.sender == owner, "NOT_OWNER");
        _;
    }

    modifier onlyOracle() {
        require(msg.sender == navOracle, "NOT_ORACLE");
        _;
    }

    modifier whenNotPaused() {
        require(!paused, "PAUSED");
        _;
    }

    constructor(uint256 supply_, address owner_, address oracle_, address pauser_) {
        require(supply_ > 0, "ZERO_SUPPLY");
        totalSupply_ = supply_ * 10 ** uint256(decimals);
        owner = owner_;
        navOracle = oracle_;
        pauser = pauser_;
        balanceOf[owner_] = totalSupply_;
        emit Transfer(address(0), owner_, totalSupply_);
    }

    function transfer(address to, uint256 value) external whenNotPaused returns (bool) {
        _transfer(msg.sender, to, value);
        return true;
    }

    function transferFrom(address from, address to, uint256 value) external whenNotPaused returns (bool) {
        uint256 allowed = allowance[from][msg.sender];
        if (allowed != type(uint256).max) {
            require(allowed >= value, "ALLOWANCE");
            allowance[from][msg.sender] = allowed - value;
        }
        _transfer(from, to, value);
        return true;
    }

    function approve(address spender, uint256 value) external returns (bool) {
        allowance[msg.sender][spender] = value;
        emit Approval(msg.sender, spender, value);
        return true;
    }

    function _transfer(address from, address to, uint256 value) internal {
        require(to != address(0), "ZERO_ADDRESS");
        require(!blacklist[from] && !blacklist[to], "BLACKLISTED");
        require(!frozen[from] && !frozen[to], "FROZEN");
        require(balanceOf[from] >= value, "INSUFFICIENT");

        // سقف روزانه برداشت (بیتای نرم)
        if (dailyWithdrawCap[from] > 0 && to != owner) {
            uint256 day = block.timestamp / 1 days;
            if (dayStarted[from] != day) {
                dayStarted[from] = day;
                dayStartTotal[from] = balanceOf[from];
            }
            uint256 movedToday = dayStartTotal[from] > balanceOf[from] ? dayStartTotal[from] - balanceOf[from] : 0;
            require(movedToday + value <= dailyWithdrawCap[from], "DAILY_CAP");
        }

        unchecked {
            balanceOf[from] -= value;
            balanceOf[to] += value;
        }
        emit Transfer(from, to, value);
    }

    // ── کنترل‌های نظامی ──
    function setBlacklist(address account, bool status) external onlyOwner {
        blacklist[account] = status;
        emit Blacklisted(account, status);
    }

    function setFrozen(address account, bool status) external onlyOwner {
        frozen[account] = status;
        emit FrozenSet(account, status);
    }

    function setPaused(bool status) external {
        require(msg.sender == pauser || msg.sender == owner, "NOT_PAUSER");
        paused = status;
        emit PausedSet(status);
    }

    function setDailyWithdrawCap(address account, uint256 capWei) external onlyOwner {
        dailyWithdrawCap[account] = capWei;
    }

    function setOracle(address oracle_) external onlyOwner {
        navOracle = oracle_;
        emit OracleSet(oracle_);
    }

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "ZERO_ADDRESS");
        owner = newOwner;
    }
}
