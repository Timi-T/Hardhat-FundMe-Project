const { assert, expect } = require("chai");
const { deployments, ethers, getNamedAccounts, network } = require("hardhat");
const { developmentChains } = require("../../helper-hardhat-config");

!developmentChains.includes(network.name)
  ? describe.skip("Skipping unit Tests...")
  : describe("FundMe Tests", async () => {
      let fundMe;
      let deployer;
      let MockV3Aggregator;
      const sendValue = ethers.utils.parseEther("1");

      beforeEach(async () => {
        // Deploy fundme contract
        deployer = (await getNamedAccounts()).deployer;
        await deployments.fixture("all");
        fundMe = await ethers.getContract("FundMe", deployer);
        MockV3Aggregator = await ethers.getContract(
          "MockV3Aggregator",
          deployer
        );
      });

      describe("Constructor function", async () => {
        it("Sets aggregator address correctly", async () => {
          const priceFeedAddress = await fundMe.getPriceFeed();
          assert(priceFeedAddress, MockV3Aggregator.address);
        });
      });

      describe("Fund function", async () => {
        it("Fails when you send too little ETH", async () => {
          await expect(fundMe.fund()).to.be.revertedWith(
            "You need to spend more ETH!"
          );
        });

        it("Updates the mapping for sender => amount", async () => {
          await fundMe.fund({ value: sendValue });
          const amountSent = await fundMe.getAddressToAmountFunded(deployer);
          assert(amountSent.toString(), sendValue.toString());
        });

        it("Adds Funders to array of Funders", async () => {
          await fundMe.fund({ value: sendValue });
          const funder = await fundMe.getFunder(0);
          assert(funder === deployer);
        });
      });

      describe("Withdraw functio", async () => {
        beforeEach(async () => {
          fundMe.fund({ value: sendValue });
        });

        it("Withdraws eth from a single founder", async () => {
          // Arrange Act Assert
          const startingDeployerBalance = await fundMe.provider.getBalance(
            deployer
          );
          const startingFundMeBalance = await fundMe.provider.getBalance(
            fundMe.address
          );

          const transactionReponse = await fundMe.withdraw();
          const transactionReceipt = await transactionReponse.wait(1);
          const { gasUsed, effectiveGasPrice } = transactionReceipt;
          const gasCost = gasUsed.mul(effectiveGasPrice);

          const endingDeployerBalance = await fundMe.provider.getBalance(
            deployer
          );
          const endingFundMeBalance = await fundMe.provider.getBalance(
            fundMe.address
          );

          assert(endingFundMeBalance.toString(), "0");
          assert(
            endingDeployerBalance.add(gasCost).toString(),
            startingDeployerBalance.add(startingFundMeBalance).toString()
          );
        });

        it("Allows us to withdraw with multiple senders", async () => {
          const accounts = await ethers.getSigners();

          for (let i = 1; i < 6; i++) {
            const fundMeConnectedContract = await fundMe.connect(accounts[i]);
            await fundMeConnectedContract.fund({ value: sendValue });
          }

          const startingDeployerBalance = await fundMe.provider.getBalance(
            deployer
          );
          const startingFundMeBalance = await fundMe.provider.getBalance(
            fundMe.address
          );

          const transactionReponse = await fundMe.withdraw();
          const transactionReceipt = await transactionReponse.wait(1);
          const { gasUsed, effectiveGasPrice } = transactionReceipt;
          const gasCost = gasUsed.mul(effectiveGasPrice);

          await expect(fundMe.getFunder(0)).to.be.reverted;

          for (let i = 1; i < 6; i++) {
            assert(fundMe.getAddressToAmountFunded(accounts[i].address), 0);
          }
        });

        it("Only allows contract owner to withdraw funds", async () => {
          const accounts = await ethers.getSigners();
          const attacker = accounts[1];
          const attackerConnectedContract = await fundMe.connect(attacker);
          await expect(
            attackerConnectedContract.withdraw()
          ).to.be.revertedWithCustomError(
            attackerConnectedContract,
            "FundMe__NotOwner"
          );
        });

        it("Allows Cheaper withdrawal for multiple accounts", async () => {
          const accounts = await ethers.getSigners();

          for (let i = 1; i < 6; i++) {
            const fundMeConnectedContract = await fundMe.connect(accounts[i]);
            await fundMeConnectedContract.fund({ value: sendValue });
          }

          const startingDeployerBalance = await fundMe.provider.getBalance(
            deployer
          );
          const startingFundMeBalance = await fundMe.provider.getBalance(
            fundMe.address
          );

          const transactionReponse = await fundMe.cheaperWithdrawal();
          const transactionReceipt = await transactionReponse.wait(1);
          const { gasUsed, effectiveGasPrice } = transactionReceipt;
          const gasCost = gasUsed.mul(effectiveGasPrice);

          await expect(fundMe.getFunder(0)).to.be.reverted;

          for (let i = 1; i < 6; i++) {
            assert(fundMe.getAddressToAmountFunded(accounts[i].address), 0);
          }
        });

        it("Allows cheaper withdrawal for single account", async () => {
          // Arrange Act Assert
          const startingDeployerBalance = await fundMe.provider.getBalance(
            deployer
          );
          const startingFundMeBalance = await fundMe.provider.getBalance(
            fundMe.address
          );

          const transactionReponse = await fundMe.cheaperWithdrawal();
          const transactionReceipt = await transactionReponse.wait(1);
          const { gasUsed, effectiveGasPrice } = transactionReceipt;
          const gasCost = gasUsed.mul(effectiveGasPrice);

          const endingDeployerBalance = await fundMe.provider.getBalance(
            deployer
          );
          const endingFundMeBalance = await fundMe.provider.getBalance(
            fundMe.address
          );

          assert(endingFundMeBalance.toString(), "0");
          assert(
            endingDeployerBalance.add(gasCost).toString(),
            startingDeployerBalance.add(startingFundMeBalance).toString()
          );
        });
      });
    });
