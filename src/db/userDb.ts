import { query } from '@/lib/dbConnect/mysql'
import { User } from '@/db/modal'
import { OkPacket } from 'mysql'

export function selectUserByUsername(username: string): Promise<User[]> {
    const sql = 'select * from user where username = ?'
    return query<User[]>(sql, username)
}

export function insertUser(username: string, password: string, isBindMobile = false, mobile?: string): Promise<OkPacket> {
    const sql = 'insert into user '
    if (isBindMobile) {
        return query<OkPacket>(sql + '(username,password,mobile) values (?,?,?)', username, password, mobile)
    }
    return query<OkPacket>(sql + '(username,password) values (?,?)', username, password)
}