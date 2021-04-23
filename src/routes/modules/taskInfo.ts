import { addBehavior } from '@/db/logDb'
import { selectTaskInfo, updateTaskInfo } from '@/db/taskInfoDb'
import Router from '@/lib/Router'
import { deleteFiles } from '@/utils/qiniuUtil'
import { getUniqueKey } from '@/utils/stringUtil'
import { getUserInfo } from '@/utils/userUtil'

const router = new Router('task_info')

/**
 * 获取任务附加属性
 */
router.get('/:key', async (req, res) => {
  const { key } = req.params
  const [taskInfo] = await selectTaskInfo({
    taskKey: key,
  })
  const {
    template, rewrite, format, info, share_key: share, limit_people: people,
  } = taskInfo || {}
  let { ddl } = taskInfo || {}
  if (ddl) {
    ddl = new Date(ddl.getTime() + 8 * 60 * 60 * 1000)
  }
  addBehavior(req, {
    module: 'taskInfo',
    msg: `获取任务属性 任务${key} 成功`,
    data: {
      key,
    },
  })
  res.success(
    {
      template, rewrite, format, info, share, ddl, people,
    },
  )
})

/**
 * 更新附加属性信息
 */
router.put('/:key', async (req, res) => {
  const {
    template, rewrite, format, info, ddl, people,
  } = req.body
  let { share } = req.body
  const { key } = req.params
  const { id: userId } = await getUserInfo(req)

  if (share !== undefined) {
    share = getUniqueKey()
  }
  if (!template) {
    // 删除旧模板文件
    deleteFiles(`easypicker2/${key}_template/`)
  }
  await updateTaskInfo({
    template, rewrite, format, info, ddl, shareKey: share, limitPeople: people,
  }, { taskKey: key, userId })
  addBehavior(req, {
    module: 'taskInfo',
    msg: `更新任务属性 任务${key} 成功`,
    data: {
      key,
    },
  })
  res.success()
}, {
  needLogin: true,
})

export default router
