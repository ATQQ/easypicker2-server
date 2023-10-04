import { OkPacket } from 'mysql'
import { Provide } from 'flash-wolves'
import { FindOneOptions } from 'typeorm'
import { query } from '@/lib/dbConnect/mysql'
import {
  insertTableByModel,
  selectTableByModel,
  updateTableByModel
} from '@/utils/sqlUtil'
import { User, USER_STATUS } from './model/user'
import { AppDataSource } from './index'
import { User as UserEntity } from './entity'

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

export function selectUserById(id: number): Promise<User[]> {
  const { sql, params } = selectTableByModel('user', {
    data: {
      id
    }
  })
  return query<User[]>(sql, ...params)
}

export function insertUser(options: User): Promise<OkPacket> {
  const { sql, params } = insertTableByModel('user', {
    status: USER_STATUS.NORMAL,
    ...options
  })
  return query<OkPacket>(sql, ...params)
}

export function updateUser(options: User, q: User): Promise<OkPacket> {
  const { sql, params } = updateTableByModel('user', options, q)
  return query<OkPacket>(sql, ...params)
}

export function selectAllUser(columns: string[]): Promise<User[]> {
  const { sql, params } = selectTableByModel('user', {
    data: {},
    columns,
    order: 'order by id desc'
  })
  return query<User[]>(sql, ...params)
}

@Provide()
export class UserRepository {
  private userRepository = AppDataSource.getRepository(UserEntity)

  findOneUser(where: FindOneOptions<UserEntity>['where']) {
    return this.userRepository.findOne({
      where
    })
  }

  insertUser(options: UserEntity) {
    return this.userRepository.save(options)
  }
}
