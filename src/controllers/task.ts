import {
  RouterController,
  Post,
  Context,
  InjectCtx,
  ReqBody,
  Inject
} from 'flash-wolves'
import { BehaviorService, TaskService } from '@/service'
import { Task } from '@/db/entity'

const needLogin = {
  needLogin: true
}
@RouterController('task', needLogin)
export default class TaskController {
  @InjectCtx()
  private Ctx: Context

  @Inject(TaskService)
  private taskService: TaskService

  @Inject(BehaviorService)
  private behaviorService: BehaviorService

  /**
   * 创建任务
   */
  @Post('create')
  async createTask(@ReqBody() payload) {
    const { name, category } = payload
    const { id, account: logAccount } = this.Ctx.req.userInfo
    const task = new Task()
    task.name = name
    task.categoryKey = category || ''
    task.userId = id

    await this.taskService.createTask(task)
    this.behaviorService.add(
      'task',
      `创建任务 用户:${logAccount} 任务:${name} 成功`,
      {
        account: logAccount,
        name
      }
    )
  }
}
