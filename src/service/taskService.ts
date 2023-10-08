import { Context, Inject, InjectCtx, Provide } from 'flash-wolves'
import { TaskRepository } from '@/db/taskDb'
import { Task, TaskInfo } from '@/db/entity'
import { getUniqueKey } from '@/utils/stringUtil'
import { TaskInfoService } from '.'

@Provide()
export default class TaskService {
  @InjectCtx()
  private Ctx: Context

  @Inject(TaskRepository)
  private taskRepository: TaskRepository

  @Inject(TaskInfoService)
  private taskInfoService: TaskInfoService

  async createTask(task: Task) {
    task.k = getUniqueKey()
    // 新增taskInfo
    const taskInfo = new TaskInfo()
    taskInfo.taskKey = task.k
    taskInfo.userId = task.userId
    await this.taskInfoService.createTaskInfo(taskInfo)
    await this.taskRepository.insert(task)
  }
}
