const {
  newOLE,
  newStageWithOle,
  price1, invalidSignatureError, expiredSignatureError
} = require("./shareUtil");
const { BN, expectEvent, expectRevert } = require("@openzeppelin/test-helpers");
const { web3, ethers } = require("hardhat");
const { expect } = require("chai");
const { hexStringToArray } = require("../util/EtheUtil");
contract("StageShare", function(accounts) {
  let shareCtr;
  let oleCtr;
  let stageId = new BN(1);
  let owner = accounts[0];
  let trader = accounts[1];
  let maxInAmount = web3.utils.toWei("10000");
  let validDuration = 300;
  let timestamp;
  let issuer;
  let invalidIssuer;

  beforeEach(async () => {
    oleCtr = await newOLE(owner);
    [issuer, invalidIssuer] = await ethers.getSigners();
    shareCtr = await newStageWithOle(oleCtr.address, issuer.address, owner);
    timestamp = (await web3.eth.getBlock("latest")).timestamp;
    await shareCtr.createStage({ from: owner });
    await oleCtr.mint(trader, maxInAmount);
    await oleCtr.approve(shareCtr.address, maxInAmount, { from: trader });
  });

  it("should successfully verify a valid signature", async () => {
    let validSignature = await sign(trader, timestamp, issuer);
    await shareCtr.buyShares(stageId, new BN(1), price1, timestamp, validSignature, { from: trader });
  });

  it("should fail when signature content is inconsistent", async () => {
    let validSignature = await sign(accounts[2], timestamp, issuer);
    await expectRevert(
      shareCtr.buyShares(stageId, new BN(1), price1, timestamp, validSignature, { from: trader }),
      invalidSignatureError
    );
    validSignature = await sign(trader, timestamp - 1, issuer);
    await expectRevert(
      shareCtr.buyShares(stageId, new BN(1), price1, timestamp, validSignature, { from: trader }),
      invalidSignatureError
    );
  });

  it("should fail when signature is expired", async () => {
    let newTimestamp = timestamp - 6000; // 100 minutes ago
    let expiredSignature = await sign(trader, newTimestamp, issuer);
    await expectRevert(
      shareCtr.buyShares(stageId, new BN(1), price1, newTimestamp, expiredSignature, { from: trader }),
      expiredSignatureError
    );
  });

  it("should fail when owner address is inconsistent", async () => {
    let validSignature = await sign(trader, timestamp, invalidIssuer);
    await expectRevert(
      shareCtr.buyShares(stageId, new BN(1), price1, timestamp, validSignature, { from: trader }),
      invalidSignatureError
    );
  });

  async function sign(user, timestamp, issuer) {
    let sign;
    await issuer.signMessage(hexStringToArray(ethers.solidityPackedKeccak256(["address", "uint256"], [user, timestamp]))).then(result => {
      sign = result;
    });
    return sign;
  }

});