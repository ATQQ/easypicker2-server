import { getClient } from '@/lib/dbConnect/redis'

export function setRedisValue(k: string, v: string, expiredTime = -1) {
    getClient().then(client => {
        client.set(k, v, () => {
            if (expiredTime !== -1) {
                client.expire(k, expiredTime, () => {
                    client.quit()
                })
                return
            }
            client.quit()
        })
    })
}

export function getRedisVal(k: string): Promise<string> {
    return new Promise(resolve => {
        getClient().then(client => {
            client.get(k, (err, reply) => {
                resolve(reply)
                client.quit()
            })
        })
    })
}

export function expiredRedisKey(k: string) {
    setRedisValue(k, '', 0)
}