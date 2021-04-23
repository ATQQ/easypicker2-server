import { insertCollection } from '@/lib/dbConnect/mongodb'
import { FWRequest } from '@/lib/server/types'

export function addRequestLog(req:FWRequest) {
  const {
    query = {}, params = {}, method, url,
  } = req
  let { body = {} } = req
  if (method !== 'GET') {
    console.log(body)
  } else if (body instanceof Buffer) {
    body = {}
  }
  const { headers } = req
  const userAgent = headers['user-agent']
  const refer = headers.referer
  const ip = getClientIp(req)
  const data = {
    method,
    url,
    query,
    params,
    body,
    userAgent,
    refer,
    ip,
  }
  insertCollection('log', data)
}
function getClientIp(req:FWRequest) {
  return req.headers['x-forwarded-for'] || req.connection.remoteAddress || req.socket.remoteAddress
}
