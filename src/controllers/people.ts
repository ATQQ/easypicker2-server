import {
  RouterController,
  Post,
  ReqBody,
  ReqParams,
  FWRequest,
  Get,
} from 'flash-wolves'
import { selectTasks } from '@/db/taskDb'
import { selectPeople } from '@/db/peopleDb'
import { addBehavior } from '@/db/logDb'
import { getUserInfo } from '@/utils/userUtil'
import { selectTaskInfo } from '@/db/taskInfoDb'

const power = {
  needLogin: true,
}

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

  @Get('/template/:key', power)
  async getUsefulTemplate(@ReqParams('key') taskKey:string, req:FWRequest) {
    // userInfo可以通过装饰器注入
    const user = await getUserInfo(req)
    const taskKeyList = (await selectTaskInfo({
      userId: user.id,
      limitPeople: 1,
    }, ['task_key'])).filter((v) => v.task_key !== taskKey).map((v) => v.task_key)

    const taskInfo = (await selectTasks({
      k: taskKeyList,
    }, ['k', 'name']))

    // 查询每任务中的的成员名单信息
    const people = await selectPeople({ taskKey: taskInfo.map((v) => v.k) }, ['task_key', 'name'])

    const data = taskInfo.map((v) => {
      const count = people.filter((p) => p.task_key === v.k).length
      return {
        taskKey: v.k,
        name: v.name,
        count,
      }
    })
    return data
  }
}
