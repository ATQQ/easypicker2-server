import { query } from '@/lib/dbConnect/mysql'
import { insertTableByModel, selectTableByModel, updateTableByModel } from '@/utils/sqlUtil'
import { OkPacket } from 'mysql'
import { User, USER_STATUS } from './model/user'

export function selectUserByAccount(account: string): Promise<User[]> {
  const { sql, params } = selectTableByModel('user', {
    data: {
      account,
    },
  })
  return query<User[]>(sql, ...params)
}

export function selectUserByPhone(phone: string): Promise<User[]> {
  const { sql, params } = selectTableByModel('user', {
    data: {
      phone,
    },
  })
  return query<User[]>(sql, ...params)
}

export function insertUser(options: User): Promise<OkPacket> {
  const { sql, params } = insertTableByModel('user', {
    status: USER_STATUS.NORMAL,
    ...options,
  })
  return query<OkPacket>(sql, ...params)
}

export function updateUser(options: User, q: User): Promise<OkPacket> {
  const { sql, params } = updateTableByModel('user', options, q)
  return query<OkPacket>(sql, ...params)
}

export function selectAllUser(columns:string[]): Promise<User[]> {
  const { sql, params } = selectTableByModel('user', {
    data: {},
    columns,
  })
  return query<User[]>(sql, ...params)
}
