import { Context, Inject, InjectCtx, Provide } from 'flash-wolves'
import { In } from 'typeorm'
import { TaskInfoRepository } from '@/db/taskInfoDb'
import { TaskRepository } from '@/db/taskDb'
// TODO：这里的依赖注入有问题，需要优化
import QiniuService from '@/service/qiniuService'

@Provide()
export default class TaskInfoService {
  @InjectCtx()
  private ctx: Context

  @Inject(TaskInfoRepository)
  private taskInfoRepository: TaskInfoRepository

  @Inject(TaskRepository)
  private taskRepository: TaskRepository

  @Inject(QiniuService)
  private qiniuService: QiniuService

  async getUseFullTemplate(taskKey: string) {
    const user = this.ctx.req.userInfo
    const infoList = (
      await this.taskInfoRepository.findWithSpecifyColumn(
        {
          userId: user.id
        },
        ['taskKey', 'info']
      )
    ).filter((v) => v.taskKey !== taskKey)
    if (!infoList.length) {
      return []
    }

    const taskInfo = await this.taskRepository.findWithSpecifyColumn(
      {
        k: In(infoList.map((v) => v.taskKey))
      },
      ['k', 'name']
    )

    const data = taskInfo.map((v) => {
      const { info } = infoList.find((v2) => v2.taskKey === v.k)
      return {
        taskKey: v.k,
        name: v.name,
        info
      }
    })
    return data
  }

  async delTipImage(payload: { uid: number; name: string; key: string }) {
    const { uid, name, key } = payload
    const tipImageKey = this.qiniuService.getTipImageKey(key, name, uid)
    console.log(tipImageKey)
  }
}
