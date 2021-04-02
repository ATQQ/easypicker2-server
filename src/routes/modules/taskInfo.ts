import { selectTaskInfo, updateTaskInfo } from '@/db/taskInfoDb'
import Router from '@/lib/Router'
import { getUniqueKey } from '@/utils/stringUtil'
import { getUserInfo } from '@/utils/userUtil'
const router = new Router('task_info')

router.get('/:key', async (req, res) => {
    const { key } = req.params
    const [taskInfo] = await selectTaskInfo({
        taskKey: key,
    })
    const { template, rewrite, format, info, share_key: share, ddl } = taskInfo || {}
    res.success(
        { template, rewrite, format, info, share, ddl }
    )
})

router.put('/:key', async (req, res) => {
    const { template, rewrite, format, info, ddl } = req.body
    let { share } = req.body
    const { key } = req.params
    const { id: userId } = await getUserInfo(req)

    if (share !== undefined) {
        share = getUniqueKey()
    }
    await updateTaskInfo({
        template, rewrite, format, info, ddl, shareKey: share
    }, { taskKey: key, userId })
    res.success()
})

export default router