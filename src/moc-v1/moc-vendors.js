import { ethers } from 'ethers'
import { sendTransaction } from '../transaction.js'

const AdminVendorInfo = async (provider, dContracts, vendorAddress, configProject) => {
  const mocvendors = dContracts.contracts.mocvendors

  const vendor = await mocvendors.vendors(vendorAddress)

  console.log('\x1b[35m%s\x1b[0m', `Vendor Account: ${vendorAddress}`)
  console.log('\x1b[32m%s\x1b[0m', `Is Active: ${vendor.isActive}`)
  console.log('\x1b[35m%s\x1b[0m', `Markup: ${ethers.utils.formatEther(vendor.markup)}`)
  console.log('\x1b[32m%s\x1b[0m', `Total Paid in ${configProject.tokens.TG.name}: ${ethers.utils.formatEther(vendor.totalPaidInMoC)}`)
  console.log('\x1b[35m%s\x1b[0m', `Staking: ${ethers.utils.formatEther(vendor.staking)}`)
}

const AdminVendorAllowance = async (provider, dContracts, allow) => {
  // const userAddress = `${process.env.USER_ADDRESS}`.toLowerCase()
  const tg = dContracts.contracts.tg

  let amountAllowance = '0'
  const valueToSend = null
  if (allow) {
    amountAllowance = Number.MAX_SAFE_INTEGER.toString()
  }

  // Calculate estimate gas cost
  const estimateGas = await tg.estimateGas.approve(
    dContracts.contracts.mocvendors.address, 
    ethers.utils.parseEther(amountAllowance)
  )

  // encode function
  const encodedCall = tg.interface.encodeFunctionData(
    'approve',
    [dContracts.contracts.mocvendors.address, ethers.utils.parseEther(amountAllowance)]
  )

  // send transaction to the blockchain and get receipt
  const { receipt, filteredEvents } = await sendTransaction(provider, valueToSend, estimateGas, encodedCall, tg.address)

  console.log(`Transaction hash: ${receipt.transactionHash}`)

  return { receipt, filteredEvents }
}

const AdminVendorAddStake = async (provider, dContracts, amountStake) => {
  // const userAddress = `${process.env.USER_ADDRESS}`.toLowerCase()
  const mocvendors = dContracts.contracts.mocvendors
  const valueToSend = null

  // Calculate estimate gas cost
  const estimateGas = await mocvendors.estimateGas.addStake(ethers.utils.parseEther(amountStake))

  // encode function
  const encodedCall = mocvendors.interface.encodeFunctionData('addStake', [ethers.utils.parseEther(amountStake)])

  // send transaction to the blockchain and get receipt
  const { receipt, filteredEvents } = await sendTransaction(provider, valueToSend, estimateGas, encodedCall, mocvendors.address)

  console.log(`Transaction hash: ${receipt.transactionHash}`)

  return { receipt, filteredEvents }
}

const AdminVendorRemoveStake = async (provider, dContracts, amountStake) => {
  // const userAddress = `${process.env.USER_ADDRESS}`.toLowerCase()
  const mocvendors = dContracts.contracts.mocvendors
  const valueToSend = null

  // Calculate estimate gas cost
  const estimateGas = await mocvendors.estimateGas.removeStake(ethers.utils.parseEther(amountStake))

  // encode function
  const encodedCall = mocvendors.interface.encodeFunctionData('removeStake', [ethers.utils.parseEther(amountStake)])

  // send transaction to the blockchain and get receipt
  const { receipt, filteredEvents } = await sendTransaction(provider, valueToSend, estimateGas, encodedCall, mocvendors.address)

  console.log(`Transaction hash: ${receipt.transactionHash}`)

  return { receipt, filteredEvents }
}

export {
  AdminVendorInfo,
  AdminVendorAllowance,
  AdminVendorAddStake,
  AdminVendorRemoveStake
}
