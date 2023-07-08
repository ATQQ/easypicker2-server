import { RouterController, Post } from 'flash-wolves'
import type { FWRequest } from 'flash-wolves'
import { addBehavior } from '@/db/logDb'
import { insertTask } from '@/db/taskDb'
import { getUserInfo } from '@/utils/userUtil'
import { Task } from '@/db/model/task'

@RouterController('task')
export default class TaskController {
  /**
   * 创建任务
   */
  @Post('create', {
    needLogin: true
  })
  async createTask(req: FWRequest) {
    const { name, category } = req.body
    const { id, account: logAccount } = await getUserInfo(req)
    const options: Task = {
      name,
      categoryKey: category || '',
      userId: id
    }
    await insertTask(options)
    addBehavior(req, {
      module: 'task',
      msg: `创建任务 用户:${logAccount} 任务:${name} 成功`,
      data: {
        account: logAccount,
        name
      }
    })
  }
}
