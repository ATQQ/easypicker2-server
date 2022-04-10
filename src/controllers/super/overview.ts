import {
  Get, Post, ReqBody, ReqParams, RouterController,
} from 'flash-wolves'
import { ObjectId } from 'mongodb'
import { selectFiles } from '@/db/fileDb'
import {
  findLog,
  findLogCount, findLogReserve, findLogWithPageOffset, findLogWithTimeRange, findPvLogWithRange,
} from '@/db/logDb'
import {
  Log,
  LogBehaviorData, LogErrorData, LogRequestData, LogType, PvData,
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

  private filterLog(logs: Log[]) {
    return logs.map((log) => {
      const { type, data, id } = log
      const date = new ObjectId(id).getTimestamp()
      if (type === 'request') {
        const d = data as LogRequestData
        return {
          id,
          date,
          type,
          ip: d.ip,
          msg: `${d.method} ${d.url}`,
        }
      }
      if (type === 'behavior') {
        const d = data as LogBehaviorData

        return {
          id,
          date,
          type,
          msg: (d?.info?.msg) || '未知',
          ip: (d?.req?.ip) || '未知',
        }
      }

      if (type === 'pv') {
        const d = data as PvData

        return {
          id,
          date,
          type,
          ip: d.ip,
          msg: `${d.path}`,
        }
      }
      const d = data as LogErrorData

      // 默认是错误
      return {
        id,
        date,
        type,
        ip: (d?.req?.ip) || '未知',
        msg: (d?.msg) || '未知',
      }
    })
  }

  /**
   * 查询某条日志的详细信息
   * TODO:针对不同类型过滤
   */
  @Get('log/:id', power)
  async getLogDetail(@ReqParams('id') id: string) {
    const [log] = await findLog({ id })
    delete log.data.userId
    return log.data
  }

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

  /**
   * 一次性全查
   */
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
    const result = this.filterLog(logs)

    return {
      logs: result,
    }
  }

  /**
   * 分页查询
   */
  @Post('log', power)
  async getPartLog(@ReqBody('type') type:LogType, @ReqBody('pageSize') size = 6, @ReqBody('pageIndex') index = 1, @ReqBody('search') search = '') {
    const logCount = await findLogCount({ type })
    const logs = await findLogWithPageOffset((index - 1) * size, size, { type })
    return {
      logs: this.filterLog(logs),
      sum: logCount,
    }
  }
}
