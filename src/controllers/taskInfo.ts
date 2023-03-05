import {
  RouterController,
  ReqParams,
  FWRequest,
  Get,
  Delete,
  ReqBody
} from 'flash-wolves'
import { selectTasks } from '@/db/taskDb'
import { getUserInfo } from '@/utils/userUtil'
import { selectTaskInfo } from '@/db/taskInfoDb'
import { deleteObjByKey } from '@/utils/qiniuUtil'
import { getTipImageKey } from '@/utils/stringUtil'

const power = {
  needLogin: true
}

@RouterController('task_info', power)
export default class TaskInfoController {
  @Get('/template/:key')
  async getUsefulTemplate(@ReqParams('key') taskKey: string, req: FWRequest) {
    // userInfo可以通过装饰器注入
    const user = await getUserInfo(req)
    const infoList = (
      await selectTaskInfo(
        {
          userId: user.id
        },
        ['task_key', 'info']
      )
    ).filter((v) => v.task_key !== taskKey)
    if (!infoList.length) {
      return []
    }
    const taskInfo = await selectTasks(
      {
        k: infoList.map((v) => v.task_key)
      },
      ['k', 'name']
    )

    const data = taskInfo.map((v) => {
      const { info } = infoList.find((v2) => v2.task_key === v.k)
      return {
        taskKey: v.k,
        name: v.name,
        info
      }
    })
    return data
  }

  @Delete('/tip/image/:key')
  async delTipImage(
    @ReqBody('uid') uid: number,
    @ReqBody('name') name: string,
    @ReqParams('key') key: string,
    req: FWRequest
  ) {
    // TODO：未校验用户权限，存在水平越权漏洞，先观察一段时间看看(记录可回溯)
    deleteObjByKey(getTipImageKey(key, name, uid), req)
  }
}
