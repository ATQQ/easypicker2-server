import { Get, RouterController } from 'flash-wolves'
import { USER_POWER } from '@/db/model/user'
import { getRedisStatus } from '@/lib/dbConnect/redis'
import { getMongoDBStatus } from '@/lib/dbConnect/mongodb'
import { getTxServiceStatus } from '@/utils/tencent'
import { getMysqlStatus } from '@/lib/dbConnect/mysql'
import { getQiniuStatus } from '@/utils/qiniuUtil'

@RouterController('config', { userPower: USER_POWER.SYSTEM, needLogin: true })
export default class UserController {
  @Get('service/overview')
  async getServiceStatus() {
    const data = await Promise.all([
      getQiniuStatus(),
      getTxServiceStatus(),
      getRedisStatus(),
      getMysqlStatus(),
      getMongoDBStatus()])

    const result = data.reduce((pre, cur) => {
      const { type, ...rest } = cur
      pre[type] = rest
      return pre
    }, {})
    return result
  }
}
