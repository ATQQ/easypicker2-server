import {
  RouterController,
  ReqParams,
  Get,
  Delete,
  ReqBody,
  Inject,
  Put
} from 'flash-wolves'

import { TaskInfoService } from '@/service'

const power = {
  needLogin: true
}

const notLogin = {
  needLogin: false
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
    @ReqParams('key') key: string
  ) {
    return this.taskInfoService.delTipImage({ uid, name, key })
  }

  @Get('/:key', notLogin)
  getTaskInfo(@ReqParams('key') key: string) {
    return this.taskInfoService.getTaskInfo(key)
  }

  @Put('/:key')
  async updateTaskInfo(@ReqBody() body, @ReqParams('key') key: string) {
    return this.taskInfoService.updateTaskInfo(body, key)
  }
}
