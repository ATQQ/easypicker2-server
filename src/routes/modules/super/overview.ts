import { selectFiles } from '@/db/fileDb'
import {
  findLogCount, findLogReserve, findLogWithTimeRange, findPvLogWithRange,
} from '@/db/logDb'
import {
  LogBehaviorData, LogErrorData, LogRequestData, PvData,
} from '@/db/model/log'
import { USER_POWER } from '@/db/model/user'
import { selectAllUser } from '@/db/userDb'
import Router from '@/lib/Router'
import { ObjectId } from 'mongodb'

const router = new Router('super/overview')

/**
 * 数据量
 */
router.get('count', async (req, res) => {
  const now = new Date()
  const nowDate = new Date(`${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`)
  const users = await selectAllUser(['join_time'])
  const userRecent = users.filter((u) => new Date(u.join_time) > nowDate).length

  const files = await selectFiles({}, ['date'])
  const fileRecent = files.filter((f) => new Date(f.date) > nowDate).length

  const logCount = await findLogCount({})
  const logRecent = await findLogWithTimeRange(nowDate)

  // 总
  const pvList = await findLogReserve({
    type: 'pv',
  })
  const uv = new Set(pvList.map((pv) => pv.data.ip)).size
  // 当日
  const todayPv = await findPvLogWithRange(nowDate)
  const todayUv = new Set(todayPv.map((pv) => pv.data.ip)).size
  res.success({
    user: {
      sum: users.length,
      recent: userRecent,
    },
    file: {
      sum: files.length,
      recent: fileRecent,
    },
    log: {
      sum: logCount,
      recent: logRecent.length,
    },
    pv: {
      today: {
        sum: todayPv.length,
        uv: todayUv,
      },
      all: {
        sum: pvList.length,
        uv,
      },
    },
  })
}, {
  userPower: USER_POWER.SUPER,
  needLogin: true,
})

/**
 * 获取所有日志(只返回关键字)
 */
router.get('log', async (req, res) => {
  const logs = await findLogReserve({})
  const result = logs.map((log) => {
    const { type, data, id } = log
    const date = new ObjectId(id).getTimestamp()
    if (type === 'request') {
      const d = data as LogRequestData
      return {
        date,
        type,
        ip: d.ip,
        msg: `${d.method} ${d.url}`,
      }
    }
    if (type === 'behavior') {
      const d = data as LogBehaviorData

      return {
        date,
        type,
        msg: (d && d.info && d.info.msg) || '未知',
        ip: (d && d.req && d.req.ip) || '未知',
      }
    }

    if (type === 'pv') {
      const d = data as PvData

      return {
        date,
        type,
        ip: d.ip,
        msg: `${d.path}`,
      }
    }
    const d = data as LogErrorData

    // 默认是错误
    return {
      date,
      type,
      ip: (d && d.req && d.req.ip) || '未知',
      msg: (d && d.msg) || '未知',
    }
  })

  res.success({
    logs: result,
  })
}, {
  userPower: USER_POWER.SUPER,
  needLogin: true,
})
export default router
