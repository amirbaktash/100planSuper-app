// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title DaricTimelock
 * @notice تایم‌لاک ۴۸ ساعته برای برداشت‌های بزرگ و تغییرات حساس
 *         عملیات اجراپذیری (queued) می‌شود و پس از ۴۸ ساعت قابل اجراست.
 *         در فاز Beta ادمین می‌تواند صف را لغو کند (pause سریع).
 */
contract DaricTimelock {
    uint256 public constant DELAY = 48 hours;

    address public owner;
    address public pauser;
    bool public paused;

    struct Entry {
        address target;
        uint256 value;
        bytes data;
        uint256 eta;
        bool executed;
        bool cancelled;
        string reason;
    }

    Entry[] public queue;
    mapping(uint256 => mapping(address => bool)) public approved; // dual-approval
    mapping(uint256 => uint256) public approvals;

    event Queued(uint256 indexed id, address indexed target, uint256 value, uint256 eta, string reason);
    event ApprovedEntry(uint256 indexed id, address indexed approver);
    event Executed(uint256 indexed id);
    event Cancelled(uint256 indexed id, address indexed by);
    event PausedSet(bool status);

    modifier onlyOwner() {
        require(msg.sender == owner, "NOT_OWNER");
        _;
    }

    constructor(address owner_, address pauser_) {
        owner = owner_;
        pauser = pauser_;
    }

    function queueOperation(address target, uint256 value, bytes calldata data, string calldata reason)
        external
        onlyOwner
        returns (uint256 id)
    {
        require(target != address(0), "ZERO_TARGET");
        id = queue.length;
        queue.push(Entry(target, value, data, block.timestamp + DELAY, false, false, reason));
        emit Queued(id, target, value, block.timestamp + DELAY, reason);
    }

    /// @notice تأیید دوم (dual-control) — اجرای عملیات مالی نیاز به ۲ تأیید دارد
    function approveEntry(uint256 id) external onlyOwner {
        Entry storage e = queue[id];
        require(!e.executed && !e.cancelled, "INACTIVE");
        require(!approved[id][msg.sender], "ALREADY_APPROVED");
        approved[id][msg.sender] = true;
        approvals[id] += 1;
        emit ApprovedEntry(id, msg.sender);
    }

    function execute(uint256 id) external onlyOwner {
        require(!paused, "PAUSED");
        Entry storage e = queue[id];
        require(!e.executed && !e.cancelled, "INACTIVE");
        require(block.timestamp >= e.eta, "TIMELOCK_ACTIVE");
        require(approvals[id] >= 2, "NEED_DUAL_APPROVAL");
        e.executed = true;
        (bool ok, ) = e.target.call{value: e.value}(e.data);
        require(ok, "CALL_FAILED");
        emit Executed(id);
    }

    function cancel(uint256 id) external {
        require(msg.sender == owner || msg.sender == pauser, "NOT_AUTH");
        Entry storage e = queue[id];
        require(!e.executed && !e.cancelled, "INACTIVE");
        e.cancelled = true;
        emit Cancelled(id, msg.sender);
    }

    function setPaused(bool status) external {
        require(msg.sender == pauser || msg.sender == owner, "NOT_PAUSER");
        paused = status;
        emit PausedSet(status);
    }

    function queueLength() external view returns (uint256) {
        return queue.length;
    }
}
