import {
  RouterController,
  ReqParams,
  FWRequest,
  Get,
} from 'flash-wolves'
import { selectTasks } from '@/db/taskDb'
import { getUserInfo } from '@/utils/userUtil'
import { selectTaskInfo } from '@/db/taskInfoDb'

const power = {
  needLogin: true,
}

@RouterController('task_info')
export default class TaskInfoController {
  @Get('/template/:key', power)
  async getUsefulTemplate(@ReqParams('key') taskKey:string, req:FWRequest) {
    // userInfo可以通过装饰器注入
    const user = await getUserInfo(req)
    const infoList = (await selectTaskInfo({
      userId: user.id,
    }, ['task_key', 'info'])).filter((v) => v.task_key !== taskKey)

    const taskInfo = (await selectTasks({
      k: infoList.map((v) => v.task_key),
    }, ['k', 'name']))

    const data = taskInfo.map((v) => {
      const { info } = infoList.find((v2) => v2.task_key === v.k)
      return {
        taskKey: v.k,
        name: v.name,
        info,
      }
    })
    return data
  }
}
