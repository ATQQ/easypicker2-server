import { findCollection } from '@/lib/dbConnect/mongodb'
import { FWRequest } from '@/lib/server/types'

export function addRequestLog(req:FWRequest) {
  const {
    body, query = {}, params = {}, method,
  } = req
  if (method !== 'GET') {
    console.log(body)
  }
  console.log(query, params)
}
