import { insertCollection } from '@/lib/dbConnect/mongodb'
import { FWRequest } from '@/lib/server/types'
import { getUniqueKey } from '@/utils/stringUtil'
import { getUserInfo } from '@/utils/userUtil'
import {
  Log, LogType, LogData, LogRequestData, LogBehaviorData,
} from './model/log'

function getLogData(type: LogType, data: LogData): Log {
  return {
    id: getUniqueKey(),
    type,
    data,
  }
}

export async function addRequestLog(req: FWRequest) {
  const {
    query = {}, params = {}, method, url,
  } = req
  let { body = {} } = req
  if ((method !== 'GET' && !body) || body instanceof Buffer) {
    body = {}
  }
  const { headers } = req
  const userAgent = headers['user-agent']
  const refer = headers.referer
  const ip = getClientIp(req)
  const user = await getUserInfo(req)
  let userId = 0
  if (user && user.id) {
    userId = user.id
  }
  const data: LogRequestData = {
    method,
    url,
    query,
    params,
    body,
    userAgent,
    refer,
    ip,
    userId,
  }
  insertCollection('log', getLogData('request', data))
}

/**
 * 记录用户行为日志
 */
export async function addBehavior(req: FWRequest, info: LogBehaviorData.Info) {
  const {
    url,
  } = req

  const { headers } = req
  const userAgent = headers['user-agent']
  const refer = headers.referer
  const ip = getClientIp(req)
  const user = await getUserInfo(req)
  let userId = 0
  if (user && user.id) {
    userId = user.id
  }
  const data: LogBehaviorData = {
    req: {
      path: url,
      userAgent,
      refer,
      ip,
    },
    user: {
      userId,
    },
    info,
  }
  insertCollection('log', getLogData('behavior', data))
}
function getClientIp(req: FWRequest): string {
  return (req.headers['x-forwarded-for'] || req.connection.remoteAddress || req.socket.remoteAddress) as string
}
