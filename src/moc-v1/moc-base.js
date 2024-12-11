import { BigNumber } from 'bignumber.js'
import { ethers } from 'ethers'

import { sendTransaction } from '../transaction.js'
import { toContractPrecision, BUCKET_X2 } from '../utils.js'
import { calcCommission } from './multicall.js'

const addCommissions = async (provider, dContracts, configProject, dataContractStatus, userBalanceStats, reserveAmount, token, action) => {
  // get reserve price from contract
  const reservePrice = new BigNumber(ethers.utils.formatEther(dataContractStatus.bitcoinPrice))

  // Get commissions from contracts
  const commissions = await calcCommission(provider, dContracts, dataContractStatus, reserveAmount, token, action)

  // Calculate commissions using Reserve payment
  const commissionInReserve = new BigNumber(ethers.utils.formatEther(commissions.commission_reserve))
    .plus(new BigNumber(ethers.utils.formatEther(commissions.vendorMarkup)))

  // Calculate commissions using TG payment
  const commissionInTG = new BigNumber(ethers.utils.formatEther(commissions.commission_moc))
    .plus(new BigNumber(ethers.utils.formatEther(commissions.vendorMarkup)))
    .times(reservePrice).div(ethers.utils.formatEther(dataContractStatus.mocPrice))

  // Enough TG to Pay commission with TG
  const enoughTGBalance = BigNumber(ethers.utils.formatEther(userBalanceStats.mocBalance)).gte(commissionInTG)

  // Enough TG allowance to Pay commission with TG
  const enoughTGAllowance = BigNumber(ethers.utils.formatEther(userBalanceStats.mocAllowance)).gt(0) &&
      BigNumber(ethers.utils.formatEther(userBalanceStats.mocAllowance)).gte(commissionInTG)

  // add commission to value send
  let valueToSend

  if (enoughTGBalance && enoughTGAllowance) {
    valueToSend = reserveAmount
    console.log(`Paying commission with ${configProject.tokens.TG.name} Tokens: ${commissionInTG} ${configProject.tokens.TG.name}`)
  } else {
    valueToSend = reserveAmount.plus(commissionInReserve)
    console.log(`Paying commission with ${configProject.tokens.RESERVE.name}: ${commissionInReserve} ${configProject.tokens.RESERVE.name}`)
  }

  return valueToSend
}

const AllowPayingCommissionTG = async (provider, dContracts, allow) => {
  // const userAddress = `${process.env.USER_ADDRESS}`.toLowerCase()
  const tg = dContracts.contracts.tg

  let amountAllowance = '0'
  const valueToSend = null
  if (allow) {
    amountAllowance = Number.MAX_SAFE_INTEGER.toString()
  }

  const estimateGas = await tg.estimateGas.approve(dContracts.contracts.moc.address, ethers.utils.parseEther(amountAllowance))
  const encodedCall = tg.interface.encodeFunctionData('approve', [dContracts.contracts.moc.address, ethers.utils.parseEther(amountAllowance)])

  const { receipt, filteredEvents } = await sendTransaction(provider, valueToSend, estimateGas, encodedCall, tg.address)

  console.log(`Transaction hash: ${receipt.transactionHash}`)

  return { receipt, filteredEvents }
}

const calcMintInterest = async (dContracts, amount) => {
  const mocinrate = dContracts.contracts.mocinrate
  const calcMintInterest = await mocinrate.calcMintInterestValues(BUCKET_X2, toContractPrecision(amount))
  return calcMintInterest
}

const AllowUseTokenMigrator = async (provider, dContracts, allow) => {
  // const userAddress = `${process.env.USER_ADDRESS}`.toLowerCase()

  if (!dContracts.contracts.tp_legacy) console.log('Error: Please set token migrator address!')

  const tpLegacy = dContracts.contracts.tp_legacy
  const tokenMigrator = dContracts.contracts.token_migrator

  let amountAllowance = '0'
  const valueToSend = null
  if (allow) {
    amountAllowance = Number.MAX_SAFE_INTEGER.toString()
  }

  const estimateGas = await tpLegacy.estimateGas.approve(tokenMigrator.address, ethers.utils.parseEther(amountAllowance))
  const encodedCall = tpLegacy.interface.encodeFunctionData('approve', [tokenMigrator.address, ethers.utils.parseEther(amountAllowance)])

  const { receipt, filteredEvents } = await sendTransaction(provider, valueToSend, estimateGas, encodedCall, tpLegacy.address)

  console.log(`Transaction hash: ${receipt.transactionHash}`)

  return { receipt, filteredEvents }
}

const MigrateToken = async (provider, dContracts) => {
  // const userAddress = `${process.env.USER_ADDRESS}`.toLowerCase()

  if (!dContracts.contracts.token_migrator) console.log('Error: Please set token migrator address!')

  const tokenMigrator = dContracts.contracts.token_migrator

  const estimateGas = await tokenMigrator.estimateGas.migrateToken()
  const encodedCall = tokenMigrator.interface.encodeFunctionData('migrateToken')

  const valueToSend = null

  const { receipt, filteredEvents } = await sendTransaction(provider, valueToSend, estimateGas, encodedCall, tokenMigrator.address)

  console.log(`Transaction hash: ${receipt.transactionHash}`)

  return { receipt, filteredEvents }
}

export {
  addCommissions,
  AllowPayingCommissionTG,
  calcMintInterest,
  AllowUseTokenMigrator,
  MigrateToken
}
