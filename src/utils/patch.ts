import type { Category } from '@/db/model/category'
import type { File } from '@/db/model/file'
import type { TaskInfo } from '@/db/model/taskInfo'
import type { Task } from '@/db/model/task'
import type { People } from '@/db/model/people'
import type { User } from '@/db/model/user'
import { query, refreshPool } from '@/lib/dbConnect/mysql'
import { getUniqueKey } from './stringUtil'
import { UserConfigType } from '@/db/model/config'
import {
  mongodbConfig, mysqlConfig, qiniuConfig, redisConfig, txConfig,
} from '@/config'
import { refreshQinNiuConfig } from './qiniuUtil'
import { refreshTxConfig } from './tencent'
import LocalUserDB from './user-local-db'

type TableName = 'task_info' | 'category' | 'files' | 'task' | 'people' | 'user'
type DBTables = {
    'task_info': TaskInfo
    'category': Category
    'files': File
    'task': Task
    'people': People
    'user': User
}

interface TableField<T extends TableName> {
    /**
     * 字段名
     */
    fieldName: keyof DBTables[T],
    /**
     * 字段类型
     */
    fieldType: string
    /**
     * 默认值
     */
    defaultValue: string | number
    /**
     * 字段释义
     */
    comment: string
}
async function addTableField<T extends TableName>(tableName:T, field: TableField<T>) {
  const {
    fieldName, defaultValue, comment, fieldType,
  } = field
  const { count } = (await query('SELECT count(*) as count FROM information_schema.COLUMNS WHERE table_name = ? AND column_name = ?', tableName, `${String(fieldName)}`))[0]
  if (count === 0) {
    console.log(`添加字段 ${tableName}.${String(fieldName)}`)
    console.log(`ALTER TABLE ${tableName} ADD COLUMN ${String(fieldName)} ${fieldType} DEFAULT ${defaultValue} COMMENT '${comment}'`)
    console.log(await query(`ALTER TABLE ${tableName} ADD COLUMN ${String(fieldName)} ${fieldType} DEFAULT ${defaultValue} COMMENT '${comment}'`))
  }
}

export async function patchTable() {
  await addTableField('task_info', {
    fieldName: 'tip',
    fieldType: 'varchar(1024)',
    comment: '批注信息',
    defaultValue: '\'\'',
  })

  await addTableField('files', {
    fieldName: 'origin_name',
    fieldType: 'varchar(1024)',
    comment: '原文件名',
    defaultValue: '\'\'',
  })
}

function getRandomUser() {
  const key = getUniqueKey()
  return `ep${key.slice(18, key.length)}`
}

function getRandomPassword() {
  const key = getUniqueKey()
  return key.slice(10, 18)
}

export function initUserConfig() {
  // 创建1个单独可配置服务的用户
  let userAccount = LocalUserDB.findUserConfig({ type: 'server', key: 'USER' })?.[0]?.value
  let userPWD = LocalUserDB.findUserConfig({ type: 'server', key: 'PWD' })?.[0]?.value
  if (!userAccount || !userPWD) {
    userAccount = getRandomUser()
    userPWD = getRandomPassword()
    LocalUserDB.addUserConfigData({
      type: 'server',
      key: 'USER',
      value: userAccount,
      isSecret: true,
    })
    LocalUserDB.addUserConfigData({
      type: 'server',
      key: 'PWD',
      value: userPWD,
      isSecret: true,
    })
  }
  // 打印日志
  console.log('!!! 服务管理面板!!! ', '账号:', userAccount, '密码:', userPWD)
  console.log('!!! 服务管理面板!!! ', '账号:', userAccount, '密码:', userPWD)
  console.log('!!! 服务管理面板!!! ', '账号:', userAccount, '密码:', userPWD)

  const storeDbInfo = (type:UserConfigType, config:Record<string, any>) => {
    const configList = LocalUserDB.findUserConfig({ type })
    if (configList.length === 0) {
      Object.keys(config).forEach((key) => {
        LocalUserDB.addUserConfigData({
          type,
          key,
          value: config[key],
          isSecret: ['password', 'secretKey'].includes(key),
        })
      })
    }
  }
  storeDbInfo('mysql', mysqlConfig)
  storeDbInfo('mongo', mongodbConfig)
  storeDbInfo('redis', redisConfig)
  storeDbInfo('qiniu', qiniuConfig)
  storeDbInfo('tx', txConfig)
}

/**
 * 从 MongoDB 取出数据库鉴权需要的数据启动服务
 */
export async function readyServerDepService() {
  await Promise.all([
    // 1. MySQL
    refreshPool(),
    // 2. qiniu
    refreshQinNiuConfig(),
    // 5. tx
    refreshTxConfig(),
  ])

  // 大多数情况下不需要额外配置
  // 此功能依赖mongodb,所以不处理它
  // 3. redis
  // 4. mongodb
}
