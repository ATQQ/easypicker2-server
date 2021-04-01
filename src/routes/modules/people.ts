import { publicError } from '@/constants/errorMsg'
import Router from '@/lib/Router'
import { getUserInfo } from '@/utils/userUtil'
import path from 'path'
import fs from 'fs'

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
            const data = fs.readFileSync(filepath, { encoding: 'utf-8' })
            // TODO:continue
            console.log(data)
            break
        default: break
    }
    res.success()
})

export default router