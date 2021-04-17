import { publicError } from '@/constants/errorMsg'
import { deleteFileRecord, insertFile, selectFiles } from '@/db/fileDb'
import { File } from '@/db/model/file'
import { selectPeople, updatePeople } from '@/db/peopleDb'
import { selectTasks } from '@/db/taskDb'
import Router from '@/lib/Router'
import { batchDeleteFiles, batchFileStatus, checkFopTaskStatus, createDownloadUrl, deleteObjByKey, getUploadToken, judgeFileIsExist, makeZipWithKeys } from '@/utils/qiniuUtil'
import { getUserInfo } from '@/utils/userUtil'

// TODO: 统一对所有删除逻辑修改(保留记录用于统计查看,删除云上文件)

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
        return
    }
    res.success({
        link: createDownloadUrl(k)
    })
})

router.get('one', async (req, res) => {
    const { id } = req.query
    const { id: userId } = await getUserInfo(req)
    const [file] = await selectFiles({
        userId,
        id: +id
    })
    if (!file) {
        res.failWithError(publicError.file.notExist)
        return
    }
    const k = `easypicker2/${file.task_key}/${file.hash}/${file.name}`
    const isExist = await judgeFileIsExist(k)
    if (!isExist) {
        res.failWithError(publicError.file.notExist)
        return
    }
    res.success({
        link: createDownloadUrl(k)
    })
})

router.delete('one', async (req, res) => {
    const { id } = req.body
    const { id: userId } = await getUserInfo(req)
    const [file] = await selectFiles({
        userId,
        id
    })
    if (!file) {
        res.failWithError(publicError.file.notExist)
        return
    }
    const k = `easypicker2/${file.task_key}/${file.hash}/${file.name}`
    deleteObjByKey(k)
    deleteFileRecord({
        id
    }).then(() => {
        res.success()
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
        }, ['id'])
        if (!p) {
            res.failWithError(publicError.file.notExist)
            return
        }
        await updatePeople({
            status: 0
        }, {
            id: p.id
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

router.post('batch/down', async (req, res) => {
    const { ids } = req.body
    const { id: userId } = await getUserInfo(req)
    const files = await selectFiles({
        id: ids,
        userId
    })
    if (files.length === 0) {
        res.failWithError(publicError.file.notExist)
        return
    }
    let keys = files.map(v => {
        const { name, task_key, hash } = v
        return `easypicker2/${task_key}/${hash}/${name}`
    })
    const filesStatus =await batchFileStatus(keys)
    const md5List = filesStatus.filter(v=>v.code===200).map(v=>v.data.md5)
    keys = keys.filter(v=>{
        const md5 = md5List.find(m=>v.includes(`/${m}/`))
        return md5
    })
    if (keys.length === 0) {
        res.failWithError(publicError.file.notExist)
        return
    }
    makeZipWithKeys(keys,`${Date.now()}`).then((v)=>{
        res.success({
            k:v
        })
    })
})

router.post('compress/status', (req, res) => {
    const { id } = req.body
    checkFopTaskStatus(id).then(data => {
        res.success(data)
    })
})

router.delete('batch/del', async (req, res) => {
    const { ids } = req.body
    const { id: userId } = await getUserInfo(req)
    const files = await selectFiles({
        id: ids,
        userId
    })
    if (files.length === 0) {
        res.success()
        return
    }
    const keys = files.map(v => {
        const { name, task_key, hash } = v
        return `easypicker2/${task_key}/${hash}/${name}`
    })

    // 删除云上记录
    batchDeleteFiles(keys)
    // 删除记录
    deleteFileRecord({
        id:ids,
        userId
    }).then(()=>{
        res.success()
    })
})

router.post('compress/down',(req,res)=>{
    const {key} = req.body
    // TODO:need鉴权
    if(typeof key==='string' && key.startsWith('easypicker2/temp_package/')){
        res.success({
            url: createDownloadUrl(key)
        })
        return
    }

    res.failWithError(publicError.file.notExist)
})
export default router
