import {
  RouterController,
  Post,
  Context,
  InjectCtx,
  ReqBody,
  Inject
} from 'flash-wolves'
import { addBehavior } from '@/db/logDb'
import { Task } from '@/db/model/task'
import { TaskService } from '@/service'

@RouterController('task')
export default class TaskController {
  @InjectCtx()
  private Ctx: Context

  @Inject(TaskService)
  private taskService: TaskService

  /**
   * 创建任务
   */
  @Post('create', {
    needLogin: true
  })
  async createTask(@ReqBody() payload) {
    const { name, category } = payload
    const { id, account: logAccount } = this.Ctx.req.userInfo
    const options: Task = {
      name,
      categoryKey: category || '',
      userId: id
    }
    await this.taskService.createTask(options)
    addBehavior(this.Ctx.req, {
      module: 'task',
      msg: `创建任务 用户:${logAccount} 任务:${name} 成功`,
      data: {
        account: logAccount,
        name
      }
    })
  }
}
