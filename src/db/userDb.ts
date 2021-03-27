import { query } from '@/lib/dbConnect/mysql'
import { insertTableByModel, selectTableByModel } from '@/utils/sqlUtil'
import { OkPacket } from 'mysql'
import { User } from './model/user'

export function selectUserByAccount(account: string): Promise<User[]> {
    const { sql, params } = selectTableByModel('user', {
        data: {
            account
        }
    })
    return query<User[]>(sql, ...params)
}

export function selectUserByPhone(phone: string): Promise<User[]> {
    const { sql, params } = selectTableByModel('user', {
        data: {
            phone
        }
    })
    return query<User[]>(sql, ...params)
}

export function insertUser(options: User): Promise<OkPacket> {
    const modal = Object.assign({}, options)
    const { sql, params } = insertTableByModel('user', modal)
    return query<OkPacket>(sql, ...params)
}