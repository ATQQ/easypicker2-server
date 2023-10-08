import { Context, Inject, InjectCtx, Provide } from 'flash-wolves'
import { In } from 'typeorm'
import { TaskInfoRepository } from '@/db/taskInfoDb'
import { TaskRepository } from '@/db/taskDb'
import { BehaviorService, QiniuService } from './index'

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

  @Inject(BehaviorService)
  private behaviorService: BehaviorService

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

  delTipImage(payload: { uid: number; name: string; key: string }) {
    const { uid, name, key } = payload
    const tipImageKey = this.qiniuService.getTipImageKey(key, name, uid)
    this.behaviorService.add(
      'taskInfo',
      `${this.ctx.req.userInfo.account} 删除提示图片: ${tipImageKey}`,
      {
        tipImageKey
      }
    )
    // TODO：未校验用户权限，存在水平越权漏洞，先观察一段时间看看(记录可回溯)
    this.qiniuService.deleteObjByKey(tipImageKey)
  }
}
