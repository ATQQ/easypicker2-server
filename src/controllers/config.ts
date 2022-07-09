import { Get, RouterController } from 'flash-wolves'
import { USER_POWER } from '@/db/model/user'
import { getRedisStatus } from '@/lib/dbConnect/redis'
import { getMongoDBStatus } from '@/lib/dbConnect/mongodb'
import { getTxServiceStatus } from '@/utils/tencent'

@RouterController('config', { userPower: USER_POWER.SYSTEM, needLogin: true })
export default class UserController {
  @Get('service/overview')
  async getServiceStatus() {
    return {
      qiniu: {
        status: true,
      },
      tx: {
        status: await getTxServiceStatus(),
      },
      redis: {
        status: await getRedisStatus(),
      },
      mysql: {
        status: true,
      },
      mongodb: {
        status: await getMongoDBStatus(),
      },
    }
  }
}
