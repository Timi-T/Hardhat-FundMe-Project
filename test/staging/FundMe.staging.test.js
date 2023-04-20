const { network, ethers, getNamedAccounts } = require("hardhat");
const { developmentChains } = require("../../helper-hardhat-config");
const { assert } = require("chai");

developmentChains.includes(network.name)
  ? describe.skip("Skipping Integration tests...")
  : describe("FundMe Integration tests", async () => {
      let fundMe;
      let deployer;
      const sendValue = ethers.utils.parseEther("0.03");

      beforeEach(async () => {
        fundMe = await ethers.getContract("FundMe");
        deployer = (await getNamedAccounts()).deployer;
      });

      it("Allows users to fund and withdraw", async () => {
        await fundMe.fund({ value: sendValue });
        await fundMe.withdraw();
        const finalBalance = await fundMe.provider.getBalance(fundMe.address);

        assert(finalBalance.toString(), "0");
      });
    });
