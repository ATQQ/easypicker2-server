import redis, { RedisClient } from 'redis'
import { redisConfig } from '@/config'
const { port, host } = redisConfig


export function getClient(): Promise<RedisClient> {
    return new Promise<RedisClient>((res, rej) => {
        const client = redis.createClient(port, host)
        res(client)

        client.on('error', function (err) {
            console.log('Error ' + err)
            rej(err)
        })
    })
}