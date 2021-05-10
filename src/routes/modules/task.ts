import { selectFilesLimitCount } from '@/db/fileDb'
import { addBehavior, getClientIp } from '@/db/logDb'
import { Task } from '@/db/model/task'
import {
  deleteTask, insertTask, selectTasks, updateTask,
} from '@/db/taskDb'
import Router from '@/lib/Router'
import { getUserInfo } from '@/utils/userUtil'

const router = new Router('task')

/**
 * 创建任务
 */
router.post('create', async (req, res) => {
  const { name, category } = req.body
  const { id, account: logAccount } = await getUserInfo(req)
  const options: Task = {
    name,
    categoryKey: category || '',
    userId: id,
  }
  await insertTask(options)
  addBehavior(req, {
    module: 'task',
    msg: `创建任务 用户:${logAccount} 任务:${name} 成功`,
    data: {
      account: logAccount,
      name,
    },
  })
  res.success()
}, {
  needLogin: true,
})

/**
 * 获取任务列表
 */
router.get('', async (req, res) => {
  const { id, account: logAccount } = await getUserInfo(req)
  const data = await selectTasks({
    userId: id,
  })

  const tasks = data.map((t) => {
    const { name, category_key: category, k: key } = t
    return {
      name,
      category,
      key,
      recentLog: [],
    }
  })
  const recentSubmitLogCount = 4
  for (const t of tasks) {
    const files = await selectFilesLimitCount({
      taskKey: t.key,
    }, recentSubmitLogCount)
    t.recentLog = files.map((v) => ({ filename: v.name, date: v.date }))
  }

  addBehavior(req, {
    module: 'task',
    msg: `获取任务列表 用户:${logAccount}`,
    data: {
      account: logAccount,
    },
  })
  res.success({
    tasks,
  })
}, {
  needLogin: true,
})

/**
 * 获取任务详细信息(名称/分类)
 */
router.get('/:key', async (req, res) => {
  const { key } = req.params
  const [task] = await selectTasks({
    k: key,
  })
  const ip = getClientIp(req)
  addBehavior(req, {
    module: 'task',
    msg: `获取任务详细信息 ip:${ip}`,
    data: {
      ip,
    },
  })
  res.success({
    name: task.name,
    category: task.category_key,
  })
})

/**
 * 删除指定任务
 */
router.delete('/:key', async (req, res) => {
  const { id, account: logAccount } = await getUserInfo(req)
  const { key } = req.params
  const [task] = await selectTasks({
    userId: id,
    k: key,
  })
  if (task) {
    await deleteTask({
      userId: id,
      k: key,
    })
  }

  // TODO: 待定任务删除了,异步删除任务下的所有已经提交的文件
  const logTaskName = task?.name
  addBehavior(req, {
    module: 'task',
    msg: `删除指定任务 用户:${logAccount} 任务名:${logTaskName}`,
    data: {
      account: logAccount,
      name: logTaskName,
    },
  })
  res.success()
}, {
  needLogin: true,
})

/**
 * 更新任务分类与名称
 */
router.put('/:key', async (req, res) => {
  const { name, category } = req.body
  const { id, account: logAccount } = await getUserInfo(req)
  const { key } = req.params
  const query: Task = { userId: id, k: key }
  const task: Task = {}
  if (name) {
    task.name = name
  }
  if (category !== undefined) {
    task.categoryKey = category
  }
  const [originTask] = await selectTasks(query)
  if (originTask) {
    await updateTask(task, query)
  }
  addBehavior(req, {
    module: 'task',
    msg: `更新任务分类/名称 用户:${logAccount} 原:${originTask.name} 新:${task.name}`,
    data: {
      account: logAccount,
      oldName: originTask.name,
      newName: task.name,
    },
  })
  res.success()
}, {
  needLogin: true,
})
export default router
