import { publicError } from '@/constants/errorMsg'
import { insertFile, selectFiles } from '@/db/fileDb'
import { File } from '@/db/model/file'
import { selectTasks } from '@/db/taskDb'
import Router from '@/lib/Router'
import { createDownloadUrl, getUploadToken, judgeFileIsExist } from '@/utils/qiniuUtil'
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

router.get('template',async (req,res)=>{
    const {template,key} = req.query
    const k = `easypicker2/${key}_template/${template}`
    const isExist =  await judgeFileIsExist(k)
    if(!isExist){
        res.failWithError(publicError.file.notExist)
    }
    res.success({
        link:createDownloadUrl(k)
    })
})
export default router
