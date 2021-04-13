import { publicError } from '@/constants/errorMsg'
import Router from '@/lib/Router'
import { getUserInfo } from '@/utils/userUtil'
import path from 'path'
import fs from 'fs'
import { People } from '@/db/model/people'
import { deletePeople, insertPeople, selectPeople, updatePeople } from '@/db/peopleDb'
import { selectFiles } from '@/db/fileDb'

const router = new Router('people')
const fileDir = path.resolve(__dirname, '../../upload')

// TODO: excel格式支持
const supportType = ['text/plain']

router.post('/:key', async (req, res) => {
    const { filename, type } = req.body
    const { id: userId } = await getUserInfo(req)
    const { key } = req.params
    const filepath = path.join(fileDir, filename)

    if (!supportType.includes(type)) {
        res.failWithError(publicError.file.notSupport)
        return
    }
    switch (type) {
        case 'text/plain':
            const fileContent = fs.readFileSync(filepath, { encoding: 'utf-8' })
            fs.rmSync(filepath)
            const defaultData: People = { taskKey: key, userId }
            // 文件中的名单
            const peopleData: string[] = fileContent.split('\n')
            // 已经存在的名单
            const alreadyPeople = (await selectPeople(defaultData)).map(v => v.name)

            const fail: string[] = []
            const success: string[] = []

            peopleData.forEach(p => {
                if (alreadyPeople.includes(p)) {
                    fail.push(p)
                } else if (!!p) {
                    success.push(p)
                }
            })
            if (success.length > 0) {
                await insertPeople(success.map(name => ({ name })), defaultData)
            }
            res.success({
                success: success.length,
                fail
            })
            return
        default:
            break
    }
    res.success()
})


router.get('/:key', async (req, res) => {
    const { id: userId } = await getUserInfo(req)
    const { key } = req.params
    const people = (await selectPeople({
        userId,
        taskKey: key
    }, [])).map(v => {
        return {
            id: v.id,
            name: v.name,
            status: v.status,
            lastDate: v.submit_date,
            count: v.submit_count
        }
    })

    res.success({
        people
    })
})

router.get('/check/:key', async (req, res) => {
    const { key } = req.params
    const { name } = req.query
    const people = await selectPeople({
        taskKey: key,
        name
    })
    res.success({
        exist: people.length !== 0
    })
})

router.delete('/:key', async (req, res) => {
    const { key } = req.params
    const { id } = req.body
    const { id: userId } = await getUserInfo(req)
    if (key && id && userId) {
        deletePeople({
            id,
            userId,
            taskKey: key
        })
    }
    res.success()
})

router.put('/:key', async (req, res) => {
    const { key } = req.params
    const { name, filename } = req.body
    if (!name || !filename || !key) {
        res.failWithError(publicError.request.errorParams)
        return
    }
    const files = await selectFiles({
        taskKey: key,
        name: filename
    })
    if (files.length === 0) {
        res.failWithError(publicError.request.errorParams)
        return
    }
    await updatePeople({
        status: 1,
        submitDate:new Date()
    }, {
        name,
        taskKey: key
    })
    res.success()
})
export default router