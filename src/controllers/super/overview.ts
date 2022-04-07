import { Get, RouterController } from 'flash-wolves'
import { ObjectId } from 'mongodb'
import { selectFiles } from '@/db/fileDb'
import {
  findLogCount, findLogReserve, findLogWithTimeRange, findPvLogWithRange,
} from '@/db/logDb'
import {
  Log,
  LogBehaviorData, LogErrorData, LogRequestData, PvData,
} from '@/db/model/log'
import { USER_POWER } from '@/db/model/user'
import { selectAllUser } from '@/db/userDb'

const power = {
  userPower: USER_POWER.SUPER,
  needLogin: true,
}

@RouterController('super/overview')
export default class OverviewController {
  private cacheLogs: Log[] = []

  @Get('count', power)
  async getDataOverview() {
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

    return {
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
    }
  }

  @Get('log', power)
  async getAllLog() {
    let logs = []
    if (this.cacheLogs) {
      logs = this.cacheLogs
      findLogReserve({}).then((data) => {
        this.cacheLogs = data
      })
    } else {
      logs = await findLogReserve({})
      this.cacheLogs = logs
    }
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
          msg: (d?.info?.msg) || '未知',
          ip: (d?.req?.ip) || '未知',
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
        ip: (d?.req?.ip) || '未知',
        msg: (d?.msg) || '未知',
      }
    })

    return {
      logs: result,
    }
  }
}
