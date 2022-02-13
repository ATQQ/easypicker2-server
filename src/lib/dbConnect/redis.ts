import redis, { RedisClient } from 'redis'
import { redisConfig } from '@/config'

const { port, host, password } = redisConfig

const needPassword = false

export function getClient(): Promise<RedisClient> {
  return new Promise<RedisClient>((res, rej) => {
    const client = redis.createClient(port, host, needPassword ? {
      password,
    } : {})
    res(client)

    client.on('error', (err) => {
      console.log(`Error ${err}`)
      rej(err)
    })
  })
}
