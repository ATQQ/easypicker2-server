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
  mongodbConfig,
  mysqlConfig,
  qiniuConfig,
  redisConfig,
  txConfig
} from '@/config'
import { refreshQinNiuConfig } from './qiniuUtil'
import { refreshTxConfig } from './tencent'
import LocalUserDB from './user-local-db'
import { refreshMongoDb } from '@/lib/dbConnect/mongodb'

type TableName = 'task_info' | 'category' | 'files' | 'task' | 'people' | 'user'
type DBTables = {
  task_info: TaskInfo
  category: Category
  files: File
  task: Task
  people: People
  user: User
}

interface TableField<T extends TableName> {
  /**
   * 字段名
   */
  fieldName: keyof DBTables[T]
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
async function addTableField<T extends TableName>(
  tableName: T,
  field: TableField<T>
) {
  const cfg = LocalUserDB.getUserConfigByType('mysql')
  const dbName = cfg.database

  const { fieldName, defaultValue, comment, fieldType } = field

  const checkFieldCountSql =
    'SELECT count(*) as count FROM information_schema.COLUMNS WHERE table_name = ? AND column_name = ? AND table_schema = ?'
  const { count } = (
    await query(checkFieldCountSql, tableName, `${String(fieldName)}`, dbName)
  )[0]
  if (count === 0) {
    console.log(`添加字段 ${tableName}.${String(fieldName)}`)
    console.log(
      `ALTER TABLE ${tableName} ADD COLUMN ${String(
        fieldName
      )} ${fieldType} DEFAULT ${defaultValue} COMMENT '${comment}'`
    )
    console.log(
      await query(
        `ALTER TABLE ${tableName} ADD COLUMN ${String(
          fieldName
        )} ${fieldType} DEFAULT ${defaultValue} COMMENT '${comment}'`
      )
    )
  }
}

async function modifyTableField<T extends TableName>(
  tableName: T,
  field: Partial<TableField<T>>
) {
  const cfg = LocalUserDB.getUserConfigByType('mysql')
  const dbName = cfg.database
  const { fieldName, fieldType } = field
  const checkFieldCountSql =
    'SELECT count(*) as count FROM information_schema.COLUMNS WHERE table_name = ? AND column_name = ? AND table_schema = ?'
  const { count } = (
    await query(checkFieldCountSql, tableName, `${String(fieldName)}`, dbName)
  )[0]
  if (count === 0) {
    console.log('表', tableName, '不存在字段', fieldName, fieldType)
    return
  }

  const getColumnTypeSql =
    'SELECT * FROM information_schema.COLUMNS WHERE table_name = ? AND column_name = ? AND table_schema = ?'
  const { COLUMN_TYPE: originType } = (
    await query(getColumnTypeSql, tableName, `${String(fieldName)}`, dbName)
  )[0]

  if (originType !== fieldType) {
    console.log(`修改字段 ${tableName}.${String(fieldName)}`)
    console.log(
      `ALTER TABLE ${tableName} MODIFY ${String(fieldName)} ${fieldType}`
    )
    console.log(
      await query(
        `ALTER TABLE ${tableName} MODIFY ${String(fieldName)} ${fieldType}`
      )
    )
  }
}

export async function patchTable() {
  const TenK = Math.round(1024 * 10)
  await addTableField('task_info', {
    fieldName: 'tip',
    fieldType: 'text',
    comment: '批注信息',
    defaultValue: ''
  })

  await addTableField('files', {
    fieldName: 'origin_name',
    fieldType: 'varchar(1024)',
    comment: '原文件名',
    defaultValue: ''
  })

  await addTableField('task', {
    fieldName: 'del',
    fieldType: 'tinyint',
    comment: '是否删除',
    defaultValue: 0
  })

  await addTableField('files', {
    fieldName: 'del',
    fieldType: 'tinyint',
    comment: '是否删除',
    defaultValue: 0
  })

  await modifyTableField('task_info', {
    fieldName: 'info',
    fieldType: `varchar(${TenK})`
  })

  await modifyTableField('files', {
    fieldName: 'info',
    fieldType: `varchar(${TenK})`
  })

  await modifyTableField('task_info', {
    fieldName: 'tip',
    fieldType: 'text'
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
  let userAccount = LocalUserDB.findUserConfig({
    type: 'server',
    key: 'USER'
  })?.[0]?.value
  let userPWD = LocalUserDB.findUserConfig({ type: 'server', key: 'PWD' })?.[0]
    ?.value
  if (!userAccount || !userPWD) {
    userAccount = getRandomUser()
    userPWD = getRandomPassword()
    LocalUserDB.addUserConfigData({
      type: 'server',
      key: 'USER',
      value: userAccount,
      isSecret: true
    })
    LocalUserDB.addUserConfigData({
      type: 'server',
      key: 'PWD',
      value: userPWD,
      isSecret: true
    })
  }
  // 打印日志
  console.log('!!! 服务管理面板!!! ', '账号:', userAccount, '密码:', userPWD)
  console.log('!!! 服务管理面板!!! ', '账号:', userAccount, '密码:', userPWD)
  console.log('!!! 服务管理面板!!! ', '账号:', userAccount, '密码:', userPWD)

  const storeDbInfo = (type: UserConfigType, config: Record<string, any>) => {
    const configList = LocalUserDB.findUserConfig({ type })
    if (configList.length === 0) {
      Object.keys(config).forEach((key) => {
        LocalUserDB.addUserConfigData({
          type,
          key,
          value: config[key],
          isSecret: ['password', 'secretKey'].includes(key)
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
 * 从本地配置文件 user-config 取出数据库与第三方服务所需配置
 */
export function readyServerDepService() {
  return Promise.all([
    // 1. MySQL
    refreshPool(),
    // 2. qiniu
    refreshQinNiuConfig(),
    // 4 mongodb
    refreshMongoDb(),
    // 5. tx
    refreshTxConfig()
  ])

  // 大多数情况下不需要额外配置
  // 3. redis
}
