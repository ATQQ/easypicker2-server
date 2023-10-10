import {
  RouterController,
  Post,
  Context,
  InjectCtx,
  ReqBody,
  Inject,
  Get,
  ReqParams,
  Delete,
  Put
} from 'flash-wolves'
import { updateTask } from '@/db/taskDb'
import { BehaviorService, TaskService } from '@/service'
import { Task } from '@/db/entity'
import { wrapperCatchError } from '@/utils/context'

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

  @Get('')
  async getTasks() {
    const { id, account } = this.Ctx.req.userInfo
    return this.taskService.getTasks(id, account)
  }

  @Get('/:key', { needLogin: false })
  getTaskByKey(@ReqParams('key') key: string) {
    try {
      return this.taskService.getTaskByKey(key)
    } catch (error) {
      return wrapperCatchError(error)
    }
  }

  @Delete('/:key')
  delTask(@ReqParams('key') key: string) {
    return this.taskService.delTask(key)
  }

  @Put('/:key')
  updateTask(@ReqParams('key') key: string, @ReqBody() payload) {
    return this.taskService.updateTask(key, payload)
  }
}
