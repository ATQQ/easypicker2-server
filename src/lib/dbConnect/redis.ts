import redis, { RedisClient } from 'redis'
import { redisConfig } from '@/config'

const { port, host, password } = redisConfig

const isDEV = process.env.NODE_ENV === 'development'

export function getClient(): Promise<RedisClient> {
  return new Promise<RedisClient>((res, rej) => {
    const client = redis.createClient(port, host, !isDEV ? {
      password,
    } : {})
    res(client)

    client.on('error', (err) => {
      console.log(`Error ${err}`)
      rej(err)
    })
  })
}
