import {
  RouterController,
  Post,
  ReqBody,
  ReqParams,
  FWRequest,
} from 'flash-wolves'
import { selectTasks } from '@/db/taskDb'
import { selectPeople } from '@/db/peopleDb'
import { addBehavior } from '@/db/logDb'

@RouterController('people')
export default class PeopleController {
  /**
   * 检查是否有提交权限
   */
  @Post('/check/:key')
  async checkPeopleIsExist(
    @ReqBody('name') name:string,
    @ReqParams('key') key:string,
      req:FWRequest,
  ) {
    const [task] = await selectTasks({
      k: key,
    })
    if (!task) {
      return {
        exist: false,
      }
    }
    const people = await selectPeople({
      taskKey: key,
      name,
    })
    const exist = people.length !== 0
    addBehavior(req, {
      module: 'people',
      msg: `查询是否拥有提交权限 任务:${task.name} 成员姓名:${name} 权限:${exist ? '有' : '无'}`,
      data: {
        taskName: task.name,
        name,
        exist,
      },
    })
    return {
      exist,
    }
  }
}
