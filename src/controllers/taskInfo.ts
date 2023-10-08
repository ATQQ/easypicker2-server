import {
  RouterController,
  ReqParams,
  FWRequest,
  Get,
  Delete,
  ReqBody,
  Inject
} from 'flash-wolves'

import { TaskInfoService } from '@/service'

const power = {
  needLogin: true
}

@RouterController('task_info', power)
export default class TaskInfoController {
  @Inject(TaskInfoService)
  private taskInfoService: TaskInfoService

  @Get('/template/:key')
  async getUsefulTemplate(@ReqParams('key') taskKey: string) {
    return this.taskInfoService.getUseFullTemplate(taskKey)
  }

  @Delete('/tip/image/:key')
  async delTipImage(
    @ReqBody('uid') uid: number,
    @ReqBody('name') name: string,
    @ReqParams('key') key: string,
    req: FWRequest
  ) {
    return this.taskInfoService.delTipImage({ uid, name, key })
  }
}
