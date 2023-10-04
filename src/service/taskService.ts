import { Context, InjectCtx, Provide } from 'flash-wolves'
import { Task } from '@/db/model/task'
import { insertTask } from '@/db/taskDb'

@Provide()
export default class TaskService {
  @InjectCtx()
  private Ctx: Context

  async createTask(task: Task) {
    await insertTask(task)
  }
}
