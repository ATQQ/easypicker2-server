import { Context, Inject, InjectCtx, Provide } from 'flash-wolves'
import { TaskRepository } from '@/db/taskDb'
import { Task, TaskInfo } from '@/db/entity'
import { getUniqueKey } from '@/utils/stringUtil'
import { BehaviorService, TaskInfoService } from '@/service'
import { BOOLEAN } from '@/db/model/public'
import FileService from './fileService'

@Provide()
export default class TaskService {
  @InjectCtx()
  private Ctx: Context

  @Inject(TaskRepository)
  private taskRepository: TaskRepository

  @Inject(TaskInfoService)
  private taskInfoService: TaskInfoService

  @Inject(BehaviorService)
  private behaviorService: BehaviorService

  @Inject(FileService)
  private fileService: FileService

  async createTask(task: Task) {
    task.k = getUniqueKey()
    // 新增taskInfo
    const taskInfo = new TaskInfo()
    taskInfo.taskKey = task.k
    taskInfo.userId = task.userId
    await this.taskInfoService.createTaskInfo(taskInfo)
    await this.taskRepository.insert(task)
  }

  async getTasks(userId: number, account: string) {
    const data = await this.taskRepository.findWithSpecifyColumn(
      {
        userId,
        del: BOOLEAN.FALSE
      },
      ['name', 'categoryKey', 'k']
    )

    const tasks = data.map((t) => {
      const { name, categoryKey: category, k: key } = t
      return {
        name,
        category,
        key,
        recentLog: []
      }
    })
    const recentSubmitLogCount = 4
    for (const t of tasks) {
      const files = await this.fileService.selectFilesLimitCount(
        {
          taskKey: t.key
        },
        recentSubmitLogCount
      )

      t.recentLog = files.map((v) => ({ filename: v.name, date: v.date }))
    }

    this.behaviorService.add('task', `获取任务列表 用户:${account}`, {
      account
    })

    return { tasks }
  }
}
