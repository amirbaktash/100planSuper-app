// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title DaricNAV_Oracle_Military
 * @notice اوراکل NAV توکن داریک با امضای 2-of-3 مولتی‌سیگ + ارجاع IPFS
 *         هر آپدیت NAV باید توسط حداقل ۲ نفر از ۳ امضاکننده تأیید شود؛
 *         متن کامل گزارش دارایی روی IPFS ذخیره و هش آن روی-chain ثبت می‌شود.
 * @dev    NAV قدیمی بیش از MAX_STALENESS قابل استفاده نیست (قفل خودکار).
 */
contract DaricNAV_Oracle_Military {
    struct NavUpdate {
        uint256 navPerToken; // ۱۸ اعشار
        uint256 timestamp;
        string ipfsHash;     // CID گزارش کامل دارایی
        bytes32 reportHash;  // sha256 گزارش
    }

    address public owner;
    address[3] public signers;
    uint256 public constant THRESHOLD = 2;
    uint256 public constant MAX_STALENESS = 1 days;

    NavUpdate public latest;
    // proposalId => signer => امضا شده؟
    mapping(bytes32 => mapping(address => bool)) public signed;
    // proposalId => تعداد امضا
    mapping(bytes32 => uint256) public sigCount;
    mapping(bytes32 => NavUpdate) public proposals;

    event NAVProposed(bytes32 indexed proposalId, address indexed signer, uint256 navPerToken, string ipfsHash);
    event NAVFinalized(bytes32 indexed proposalId, uint256 navPerToken, string ipfsHash, bytes32 reportHash);
    event SignerRotated(address indexed oldSigner, address indexed newSigner);

    modifier onlyOwner() {
        require(msg.sender == owner, "NOT_OWNER");
        _;
    }

    constructor(address[3] signers_, address owner_) {
        require(
            signers_[0] != signers_[1] && signers_[1] != signers_[2] && signers_[0] != signers_[2],
            "DUPLICATE_SIGNERS"
        );
        owner = owner_;
        signers = signers_;
    }

    function _isSigner(address a) internal view returns (bool) {
        return a == signers[0] || a == signers[1] || a == signers[2];
    }

    function _proposalId(uint256 navPerToken, string calldata ipfsHash, bytes32 reportHash)
        internal
        pure
        returns (bytes32)
    {
        return keccak256(abi.encodePacked(navPerToken, ipfsHash, reportHash));
    }

    /// @notice امضاکننده، NAV جدید را پیشنهاد می‌دهد (آپلود IPFS در oracle-service انجام شده)
    function propose(uint256 navPerToken, string calldata ipfsHash, bytes32 reportHash)
        external
        returns (bytes32 proposalId)
    {
        require(_isSigner(msg.sender), "NOT_SIGNER");
        require(navPerToken > 0, "ZERO_NAV");
        proposalId = _proposalId(navPerToken, ipfsHash, reportHash);
        proposals[proposalId] = NavUpdate(navPerToken, block.timestamp, ipfsHash, reportHash);

        if (!signed[proposalId][msg.sender]) {
            signed[proposalId][msg.sender] = true;
            sigCount[proposalId] += 1;
        }
        emit NAVProposed(proposalId, msg.sender, navPerToken, ipfsHash);

        if (sigCount[proposalId] >= THRESHOLD) {
            NavUpdate memory p = proposals[proposalId];
            latest = p;
            emit NAVFinalized(proposalId, p.navPerToken, p.ipfsHash, p.reportHash);
        }
    }

    /// @notice NAV خواندنی برای قراردادهای دیگر — حتماً تازه باشد
    function currentNAV() external view returns (uint256) {
        require(latest.timestamp > 0, "NO_NAV");
        require(block.timestamp - latest.timestamp <= MAX_STALENESS, "NAV_STALE");
        return latest.navPerToken;
    }

    /// @notice حتی اگر stale باشد (فقط نمایش/هشدار) — برای داشبورد
    function currentNAVRaw() external view returns (uint256 nav, uint256 ts, string memory ipfs) {
        return (latest.navPerToken, latest.timestamp, latest.ipfsHash);
    }

    function rotateSigner(address oldSigner, address newSigner) external onlyOwner {
        require(newSigner != address(0), "ZERO_ADDRESS");
        for (uint256 i = 0; i < 3; i++) {
            if (signers[i] == oldSigner) {
                for (uint256 j = 0; j < 3; j++) {
                    require(signers[j] != newSigner, "ALREADY_SIGNER");
                }
                emit SignerRotated(oldSigner, newSigner);
                signers[i] = newSigner;
                return;
            }
        }
        revert("NOT_SIGNER");
    }
}
