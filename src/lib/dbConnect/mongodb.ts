import {
  Db, FilterQuery, InsertOneWriteOpResult, MongoClient, UpdateQuery, UpdateWriteOpResult, WithId,
} from 'mongodb'
import { mongodbConfig } from '@/config'

const {
  host, port, user, password, database,
} = mongodbConfig

const needPassword = false
const url = needPassword ? `mongodb://${user}:${password}@${host}:${port}/${database}` : `mongodb://${host}:${port}/${database}`

interface Res {
  db: MongoClient
  Db: Db
}

export function getDBConnection(): Promise<Res> {
  return new Promise((res, rej) => {
    MongoClient.connect(url, {
      useUnifiedTopology: true,
      useNewUrlParser: true,
    }).then((db) => {
      res({
        db,
        Db: db.db(database),
      })
    }).catch((err) => {
      rej(err)
    })
  })
}

type Callback<T> = (db: Db, resolve: (value: T | PromiseLike<T>) => void) => void

export function query<T>(callback: Callback<T>): Promise<T> {
  const p = new Promise<T>((resolve, rej) => {
    getDBConnection().then(({ db, Db }) => {
      // 执行回调
      callback(Db, resolve)
      // resolve后关闭
      p.catch((e) => rej(e))
        .finally(() => {
          db.close()
        })
    })
  })
  return p
}

export const mongoDbQuery = query
export function updateCollection<T>(collection: string, query: FilterQuery<T>, data: UpdateQuery<T>, many = false) {
  return mongoDbQuery<UpdateWriteOpResult>((db, resolve) => {
    if (many) {
      db.collection<T>(collection).updateMany(query, data).then(resolve)
      return
    }
    db.collection<T>(collection).updateOne(query, data).then(resolve)
  })
}

export function insertCollection<T>(collection: string, data: T[] | T, many = false) {
  return mongoDbQuery<InsertOneWriteOpResult<WithId<T>>>((db, resolve) => {
    if (many && Array.isArray(data)) {
      db.collection<T>(collection).insertMany(data as any).then(resolve as any)
      return
    }
    db.collection<T>(collection).insertOne(data as any).then(resolve)
  })
}
export function findCollection<T>(collection: string, query: FilterQuery<T>): Promise<T[]> {
  return mongoDbQuery<T[]>((db, resolve) => {
    db.collection<T>(collection).find(query).toArray().then((data) => {
      resolve(data)
    })
  })
}
