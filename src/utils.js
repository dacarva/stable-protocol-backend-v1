import { BigNumber } from 'bignumber.js'
import { ethers } from 'ethers'
import fs from 'fs'

BigNumber.config({
  ROUNDING_MODE: BigNumber.ROUND_DOWN,
  FORMAT: { decimalSeparator: '.', groupSeparator: ',' }
})

const BUCKET_X2 = '0x5832000000000000000000000000000000000000000000000000000000000000'
const BUCKET_C0 = '0x4330000000000000000000000000000000000000000000000000000000000000'

const readJsonFile = (path) => {
  let config
  if (fs.existsSync(path)) {
    const rawdata = fs.readFileSync(path)
    config = JSON.parse(rawdata)
  } else {
    throw new Error('Missing json file.')
  }
  return config
}

const getProvider = (hostUri) => {
  return new ethers.providers.JsonRpcProvider(hostUri)
}

const getGasPrice = async (provider) => {
  try {
    const gasPrice = await provider.getGasPrice()
    return gasPrice.toString()
  } catch (e) {
    console.log(e)
  }
}

const toContractPrecision = (amount) => {
  return ethers.utils.parseEther(amount.toFormat(18, BigNumber.ROUND_DOWN))
}

const precision = (contractDecimals) => new BigNumber(10).exponentiatedBy(contractDecimals)

const fromContractPrecisionDecimals = (amount, decimals) => {
  return new BigNumber(amount).div(precision(decimals))
}

const toContractPrecisionDecimals = (amount, decimals) => {
  const result = new BigNumber(amount.toFormat(decimals, BigNumber.ROUND_DOWN))
    .times(precision(decimals))
    .toFixed(0)
  return result
}

const formatVisibleValue = (amount, decimals) => {
  return BigNumber(amount)
    .div(precision(18))
    .toFormat(decimals, BigNumber.ROUND_UP, {
      decimalSeparator: '.',
      groupSeparator: ','
    })
}

const formatTimestamp = (timestamp) => {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  }).format(timestamp)
}

export {
  readJsonFile,
  getProvider,
  getGasPrice,
  toContractPrecision,
  formatVisibleValue,
  formatTimestamp,
  fromContractPrecisionDecimals,
  toContractPrecisionDecimals,
  BUCKET_X2,
  BUCKET_C0
}
