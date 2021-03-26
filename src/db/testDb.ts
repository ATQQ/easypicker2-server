import { findCollection } from '@/lib/dbConnect/mongodb'
import { getClient } from '@/lib/dbConnect/redis'
import { TestModal } from './modal'

export function findTestData(): Promise<TestModal[]> {
    return findCollection<TestModal>('test', {})
}

export function setRedisKey(): void {
    getClient().then(client => {
        client.set('test', '1000')
        client.get('test', (err, res) => {
            console.log(res)
        })
        client.expire('test', 20)
    })
}