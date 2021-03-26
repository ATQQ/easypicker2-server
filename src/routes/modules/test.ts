import { TestModal, UserPower } from '@/db/modal'
import { findTestData, setRedisKey } from '@/db/testDb'
import { insertCollection } from '@/lib/dbConnect/mongodb'
import Router from '@/lib/Router'

const router = new Router('test')

router.get('path1/path2', (req, res) => {
    console.log(`url参数: ${JSON.stringify(req.query)}`)
    insertCollection<TestModal>('test', [{ username: 'xm', pwd: 'a123' }, { username: 'xm', pwd: 'a123' }], true).then(data => {
        console.log(data.ops[0])
        res.success(data.ops)
    })
})

router.post('path1/path2', (req, res) => {
    console.log(`url参数: ${JSON.stringify(req.query)}`)
    console.log(`body参数: ${JSON.stringify(req.data)}`)
    setRedisKey()
    res.success()
}, { power: UserPower.admin })

router.delete('path1/path2', (req, res) => {
    console.log(`url参数: ${JSON.stringify(req.query)}`)
    console.log(`body参数: ${JSON.stringify(req.data)}`)
    findTestData().then(data => {
        console.log(data)
    })
    res.fail(123, 'daada')
}, { power: UserPower.superAdmin })

router.put('path1/:path2', (req, res) => {
    console.log(`url参数: ${JSON.stringify(req.query)}`)
    console.log(`body参数: ${JSON.stringify(req.data)}`)
    console.log(`路由参数: ${JSON.stringify(req.params)}`)
    res.success()
})

router.get('error/async', async (req, res) => {
    throw new Error('async error')
    res.success()
})

router.get('error/reject', async (req, res) => {
    await Promise.reject('reject error')
    res.success()
})

router.get('error/sync', (req, res) => {
    throw new Error('sync error')

    res.success()
})
export default router