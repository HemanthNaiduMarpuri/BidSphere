import axios from 'axios'
import { notify } from './notify'

const API = axios.create({ baseURL: 'http://localhost:8000/api', withCredentials: false })

API.interceptors.request.use((config) => {
  const token = localStorage.getItem('access')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

API.interceptors.response.use(
  res => res,
  async err => {
    const original = err.config
    if (err.response?.status === 401 && !original._retry) {
      original._retry = true
      try {
        const refresh = localStorage.getItem('refresh')
        console.log(refresh)
        const { data } = await axios.post('http://localhost:8000/api/users/token/refresh/', { refresh })
        localStorage.setItem('access', data.access)
        original.headers.Authorization = `Bearer ${data.access}`
        return API(original)
      } catch {
        localStorage.clear()
        window.location.href = '/login'
      }
    }
    notify.error(err.response?.data?.error || 'Server error')
    return Promise.reject(err)
  }
)

export const authAPI = {
  register: (data) => API.post('/users/register/', data),
  login: (data) => API.post('/users/login/', data),
  logout: (refresh) => API.post('/users/logout/', { refresh }),
  profile: () => API.get('/users/me/'),
  updateProfile: (data) => API.patch('/users/me/', data),
  changePassword: (data) => API.post('/users/change-password/', data)
}

export const auctionAPI = {
  list: () => API.get('/auctions/rooms/'),
  detail: (id) => API.get(`/auctions/rooms/${id}/`),
  create: (data) => API.post('/auctions/rooms/', data),
  update: (id, data) => API.patch(`/auctions/rooms/${id}/`, data),
  start: (id) => API.post(`/auctions/rooms/${id}/start/`),
  close: (id) => API.post(`/auctions/rooms/${id}/close/`),
  schedule: (id) => API.post(`/auctions/rooms/${id}/schedule/`),
  delete: (id) => API.delete(`auctions/rooms/${id}/`),
  verifyAccess: (id, code) => API.post(`/auctions/rooms/${id}/verification/`, { access_code: code }),
  currentItem: (auctionId) => API.get(`/auctions/rooms/${auctionId}/items/current_item/`),
  nextItem: (auctionId) => API.post(`/auctions/rooms/${auctionId}/items/next_item/`),
  items: (auctionId) => API.get(`/auctions/rooms/${auctionId}/items/`),
  addItem: (auctionId, data) => API.post(`/auctions/rooms/${auctionId}/items/`, data, {
    headers: { 'Content-Type': data instanceof FormData ? 'multipart/form-data' : 'application/json' }
  }),
  updateItem: (auctionId, itemId, data) => API.patch(`/auctions/rooms/${auctionId}/items/${itemId}/`, data, {
    headers: { 'Content-Type': data instanceof FormData ? 'multipart/form-data' : 'application/json' }
  }),
  deleteItem: (auctionId, itemId) => API.delete(`/auctions/rooms/${auctionId}/items/${itemId}/`),
  soldItem: (auctionId, itemId) => API.post(`/auctions/rooms/${auctionId}/items/${itemId}/sold/`),
  unsoldItem: (auctionId, itemId) => API.post(`/auctions/rooms/${auctionId}/items/${itemId}/unsold/`),
  passItem: (auctionId, itemId) => API.post(`/auctions/rooms/${auctionId}/items/${itemId}/item_pass/`),
  changeStatus: (auctionId, itemId) => API.post(`/auctions/rooms/${auctionId}/items/${itemId}/changeStatus/`),
  activateItem: (auctionId, itemId, method = null) => API.post(`/auctions/rooms/${auctionId}/items/${itemId}/activate_item/${method ? `?method=${method}` : ''}`),
  extendTime: (auctionId, itemId) => API.post(`/auctions/rooms/${auctionId}/items/${itemId}/extendTime/`),
  chatHistory: (auctionId) => API.get(`/auctions/rooms/${auctionId}/chat/`),
  bidHistory: (auctionId) => API.get(`/auctions/rooms/${auctionId}/items/bid_history/`),
  retractBid: (auctionId, itemId) => API.post(`/auctions/rooms/${auctionId}/items/${itemId}/retractBid/`),
  requestedItems: (roomId) => API.get(`auctions/request-panel/${roomId}/items/requested-items/`),
  requestItem: (roomId, itemId) => API.post(`auctions/request-panel/${roomId}/items/${itemId}/request-item/`),
  voteItem: (roomId, panelId, vote) => API.post(`auctions/request-panel/${roomId}/items/${panelId}/vote/?vote=${vote}`),
  rejectRequestedItem: (roomId, itemId) => API.post(`auctions/request-panel/${roomId}/items/${itemId}/cancel-requested-item/`),
  completeItem: (roomId, itemId) => API.post(`/auctions/rooms/${roomId}/items/${itemId}/complete/`),
  toggle: (auctionId, itemId) => API.post(`auctions/wishlist/${auctionId}/items/${itemId}/toggle/`),
  wishlistList: () => API.get('auctions/wishlist/')
}

export const bidAPI = {
  place: (data) => API.post('/auctions/bids/', data),
  myBids: () => API.get('/auctions/bids/my/'),
  myWonBids: () => API.get('/auctions/bids/my/?status=Won')
}

export const paymentAPI = {
  topup: (amount) => API.post('/payment/topup/', { amount }),
  settle: (bidId) => API.post(`/payment/pay/${bidId}/`),
  history: (historyType) => API.get(`/payment/transactions/${historyType}/`),
}

export const supportAPI = {
  getTickets: () => API.get('/contact/'),

  createTicket: (data) =>
    API.post('/contact/', data, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }),

  updateTicket: (id, data) =>
    API.patch(`/contact/${id}/`, data, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }),

  replyTicket: (id, data) =>
    API.post(`/contact/${id}/reply/`, data),

  updateTicket: (id, data) =>
    API.patch(`/contact/${id}/`, data, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }),

  deleteTicket: (id) =>
    API.delete(`/contact/${id}/`),
}

export default API
