import mysql from 'mysql'
import { mysqlConfig } from '@/config'
// 创建连接池
const pool = mysql.createPool(mysqlConfig)

export function getConnection(): Promise<mysql.PoolConnection> {
  return new Promise((res, rej) => {
    pool.getConnection((err, coon) => {
      if (err) {
        console.error('------ db connection error -------')
        console.error(err)
        rej(err)
        return
      }
      res(coon)
    })
  })
}

pool.on('error', (err) => {
  console.log('pool connect error')
  console.error(err)
})

type param = string | number
/**
 * 执行sql语句
 * @param sql sql语句
 * @param params 参数
 */
export function query<T>(sql: string, ...params: param[]): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    getConnection().then((coon) => {
      coon.query(sql, params, (err, result) => {
        if (err) {
          reject(err)
          return
        }
        // 请求完就释放
        coon.release()
        resolve(result)
      })
    }).catch((err) => {
      reject(err)
    })
  })
}
