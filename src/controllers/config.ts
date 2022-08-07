import {
  Get, Put, ReqBody, RouterController,
} from 'flash-wolves'
import { USER_POWER } from '@/db/model/user'
import { getRedisStatus } from '@/lib/dbConnect/redis'
import { getMongoDBStatus } from '@/lib/dbConnect/mongodb'
import { getTxServiceStatus, refreshTxConfig } from '@/utils/tencent'
import { getMysqlStatus, refreshPool } from '@/lib/dbConnect/mysql'
import { getQiniuStatus, refreshQinNiuConfig } from '@/utils/qiniuUtil'
import { UserConfig } from '@/db/model/config'
import { UserConfigLabels } from '@/constants'
import LocalUserDB from '@/utils/user-local-db'

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

  cleanUserConfig(cfg:UserConfig[]) {
    return cfg.map((v) => {
      const {
        key, isSecret, value, type,
      } = v
      return {
        key,
        value: isSecret ? '******' : value,
        type,
        label: UserConfigLabels[type][key],
      }
    })
  }

  @Get('service/config')
  async getUserConfig() {
    const tx = this.cleanUserConfig(LocalUserDB.findUserConfig({
      type: 'tx',
    }))

    const mysql = this.cleanUserConfig(LocalUserDB.findUserConfig({
      type: 'mysql',
    }))

    const qiniu = this.cleanUserConfig(LocalUserDB.findUserConfig({
      type: 'qiniu',
    }))

    return [
      { title: 'MySQL', data: mysql },
      { title: '七牛云', data: qiniu },
      { title: '腾讯云', data: tx },
    ]
  }

  @Put('service/config')
  async updateUserConfig(@ReqBody() data: Partial<UserConfig>) {
    LocalUserDB.updateUserConfig({
      type: data.type,
      key: data.key,
    }, {
      value: data.value,
    })
    if (data.type === 'mysql') {
      await refreshPool()
    }
    if (data.type === 'qiniu') {
      await refreshQinNiuConfig()
    }
    if (data.type === 'tx') {
      await refreshTxConfig()
    }
  }
}
