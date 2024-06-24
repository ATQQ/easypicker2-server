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
import { BehaviorService, FileService, TaskService } from '@/service'
import { Task } from '@/db/entity'
import { wrapperCatchError } from '@/utils/context'
import { UserRepository } from '@/db/userDb'
import { calculateSize } from '@/utils/userUtil'
import { USER_POWER } from '@/db/model/user'

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

  @Inject(UserRepository)
  private userRepository: UserRepository

  @Inject(FileService)
  private fileService: FileService

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
  async getTaskByKey(@ReqParams('key') key: string) {
    try {
      const data = await this.taskService.getTaskByKey(key)
      const user = await this.userRepository.findOne({
        id: data.userId
      })

      // user.size = 0
      // user.power = USER_POWER.NORMAL

      // TODO：重复代码，可优化
      const size = calculateSize(
        (user.power === USER_POWER.SUPER
          ? Math.max(1024, user?.size)
          : user?.size) ?? 2
      )
      const usage = await this.fileService.getFileUsage(user.id)
      const limitUpload = size < usage
      // 判断是否限制上传
      return {
        ...data,
        limitUpload
      }
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
