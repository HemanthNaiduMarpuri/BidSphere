import { toast } from 'react-toastify'

export const notify = {
  success: (msg) => toast.success(msg),
  error: (msg) => toast.error(msg),
  info: (msg) => toast.info(msg),
  warn: (msg) => toast.warn(msg),

  loginSuccess: () => toast.success('Logged in successfully'),
  logoutSuccess: () => toast.info('Logged out'),
  itemAdded: () => toast.success('Item added successfully'),
  roomCreated: () => toast.success('Auction room created '),
  itemUpdated: () => toast.success('Item updated'),
  itemStatus: (status) => toast.info(`Item marked as ${status}`),
  bidPlaced: () => toast.success('Bid placed'),
  amountTopup: () => toast.success('Wallet updated'),
  paymentDone: () => toast.success('Payment Successful')
}