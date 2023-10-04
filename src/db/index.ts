import { DataSource } from 'typeorm'
import { entities } from './entity'
import LocalUserDB from '@/utils/user-local-db'

// eslint-disable-next-line import/no-mutable-exports
export let AppDataSource: DataSource

export async function initTypeORM() {
  const cfg = LocalUserDB.getUserConfigByType('mysql')
  AppDataSource = new DataSource({
    type: 'mysql',
    host: cfg.host,
    port: cfg.port,
    username: cfg.user,
    password: cfg.password,
    database: cfg.database,
    entities,
    synchronize: false,
    logging: process.env.NODE_ENV === 'development'
  })

  await AppDataSource.initialize()
}
