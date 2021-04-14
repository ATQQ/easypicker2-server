import { publicError } from '@/constants/errorMsg'
import { deleteFileRecord, insertFile, selectFiles } from '@/db/fileDb'
import { File } from '@/db/model/file'
import { selectPeople, updatePeople } from '@/db/peopleDb'
import { selectTasks } from '@/db/taskDb'
import Router from '@/lib/Router'
import { createDownloadUrl, deleteObjByKey, getUploadToken, judgeFileIsExist } from '@/utils/qiniuUtil'
import { getUserInfo } from '@/utils/userUtil'

const router = new Router('file')

router.get('token', (req, res) => {
    const token = getUploadToken()
    res.success({
        token
    })
})

router.post('info', async (req, res) => {
    const data: File = req.body
    const [task] = await selectTasks({
        k: data.taskKey
    })
    if (!task) {
        res.failWithError(publicError.request.errorParams)
        return
    }
    const { user_id } = task
    Object.assign<File, File>(data, { user_id, date: new Date() })
    await insertFile(data)
    res.success()
})

router.get('list', async (req, res) => {
    console.log(req.headers['token'])
    const { id: userId } = await getUserInfo(req)
    selectFiles({
        userId
    }).then(files => {
        res.success({
            files
        })
    }).catch(err => {
        res.fail(500, err)
    })
})

router.get('template', async (req, res) => {
    const { template, key } = req.query
    const k = `easypicker2/${key}_template/${template}`
    const isExist = await judgeFileIsExist(k)
    if (!isExist) {
        res.failWithError(publicError.file.notExist)
    }
    res.success({
        link: createDownloadUrl(k)
    })
})

router.delete('withdraw', async (req, res) => {
    const { taskKey, taskName, filename, hash, peopleName, info } = req.body
    const [file] = await selectFiles({
        taskKey, taskName, name: filename, hash,
        info,
    })
    if (!file || (file.people && file.people !== peopleName)) {
        res.failWithError(publicError.file.notExist)
        return
    }

    // 更新人员提交状态
    if (peopleName) {
        const [p] = await selectPeople({
            name: peopleName,
            status: 1,
            taskKey
        },['id'])
        if (!p) {
            res.failWithError(publicError.file.notExist)
            return
        }
        await updatePeople({
            status: 0
        }, {
            id:p.id
        })
    }
    // 删除提交记录
    // 删除文件
    const key = `easypicker2/${taskKey}/${hash}/${filename}`
    deleteObjByKey(key)
    deleteFileRecord({ id: file.id }).then(() => {
        res.success()
    })
})
export default router
