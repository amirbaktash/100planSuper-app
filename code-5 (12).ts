import { expect } from "chai";
import { ethers } from "hardhat";

describe("DaricVault beta caps", () => {
  it("rejects withdraw above daily cap", async () => {
    const [admin, o1, o2, user] = await ethers.getSigners();
    const V = await ethers.getContractFactory("DaricVault");
    const vault = await V.deploy([o1.address, o2.address, admin.address], 2, admin.address);
    const token = await (await ethers.getContractFactory("MockERC20")).deploy("T", "T");
    await token.mint(user.address, ethers.parseEther("100000"));
    await token.connect(user).approve(vault.getAddress(), ethers.MaxUint256);

    const tx = await vault.connect(user).lock(token.getAddress(),
      ethers.parseEther("100000"), 3600);
    const rc = await tx.wait();
    const id = rc.logs[1].args.id;

    const sig = (signer: any) => signer.signMessage(ethers.toBeArray(
      ethers.keccak256(ethers.AbiCoder.defaultAbiCoder().encode(
        ["bytes32","uint256","address"], [id, ethers.parseEther("60000"), user.address]))));

    await expect(vault.connect(user).withdraw(id, ethers.parseEther("60000"),
      [await sig(o1), await sig(o2)])).to.be.revertedWithCustomError(vault, "DailyCapExceeded");
  });

  it("allows withdraw within cap after timelock", async () => {
    // ... (مشابه — مبلغ ۴۰K → revert نمی‌شود)
  });
});
