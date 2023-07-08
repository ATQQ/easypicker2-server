import { DataSource } from 'typeorm'
import { entities } from './entity'
import LocalUserDB from '@/utils/user-local-db'

export async function initTypeORM() {
  const cfg = LocalUserDB.getUserConfigByType('mysql')
  const AppDataSource = new DataSource({
    type: 'mysql',
    host: cfg.host,
    port: cfg.port,
    username: cfg.user,
    password: cfg.password,
    database: cfg.database,
    entities,
    synchronize: true,
    logging: false
  })

  await AppDataSource.initialize()
}
