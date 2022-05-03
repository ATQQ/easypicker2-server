import { Router } from 'flash-wolves'
import { addBehavior, getClientIp } from '@/db/logDb'
import { selectTasks } from '@/db/taskDb'
import { selectTaskInfo, updateTaskInfo } from '@/db/taskInfoDb'

import { deleteFiles } from '@/utils/qiniuUtil'
import { getUniqueKey } from '@/utils/stringUtil'
import { getUserInfo } from '@/utils/userUtil'

const router = new Router('task_info')

/**
 * 获取任务附加属性
 */
router.get('/:key', async (req) => {
  const { key } = req.params
  const [taskInfo] = await selectTaskInfo({
    taskKey: key,
  })
  const {
    template, rewrite, format, info, share_key: share, limit_people: people, tip,
  } = taskInfo || {}
  let { ddl } = taskInfo || {}
  if (ddl) {
    ddl = new Date(ddl.getTime() + 8 * 60 * 60 * 1000)
  }
  selectTasks({
    k: key,
  }).then(([task]) => {
    if (task) {
      addBehavior(req, {
        module: 'taskInfo',
        msg: `获取任务属性 任务:${task.name} 成功`,
        data: {
          key,
          name: task.name,
        },
      })
    }
  })

  return {
    template, rewrite, format, info, share, ddl, people, tip,
  }
})

/**
 * 更新附加属性信息
 */
router.put('/:key', async (req, res) => {
  const {
    template, rewrite, format, info, ddl, people, tip,
  } = req.body
  let { share } = req.body
  const { key } = req.params
  const { id: userId, account: logAccount } = await getUserInfo(req)

  if (share !== undefined) {
    share = getUniqueKey()
  }
  if (!template && template !== undefined) {
    // 删除旧模板文件
    deleteFiles(`easypicker2/${key}_template/`)
  }
  const options = {
    template, rewrite, format, info, ddl, shareKey: share, limitPeople: people, tip,
  }
  await updateTaskInfo(options, { taskKey: key, userId })

  // 日志
  selectTasks({
    k: key,
  }).then(([task]) => {
    const [ks] = Object.keys(options).filter((o) => options[o] !== undefined)
    const bType = {
      template: '修改模板',
      rewrite: '设置自动重命名',
      info: '设置提交必填信息',
      ddl: '设置截止日期',
      limitPeople: '限制提交人员',
    }

    if (task) {
      addBehavior(req, {
        module: 'taskInfo',
        msg: `更新任务属性 ${bType[ks]} 用户:${logAccount} 任务:${task.name} 成功`,
        data: {
          key,
          name: task.name,
          account: logAccount,
        },
      })
    }
  })

  res.success()
}, {
  needLogin: true,
})

export default router
