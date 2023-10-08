import { Context, Inject, InjectCtx, Provide } from 'flash-wolves'
import qiniu from 'qiniu'
import { getTipImageKey } from '@/utils/stringUtil'
import BehaviorService from './behaviorService'
import { qiniuConfig } from '@/config'

@Provide()
export default class QiniuService {
  @InjectCtx()
  private ctx: Context

  @Inject(BehaviorService)
  private behaviorService: BehaviorService

  private config = qiniuConfig

  get bucket() {
    return this.config.bucketName
  }

  get mac() {
    return new qiniu.auth.digest.Mac(
      this.config.accessKey,
      this.config.secretKey
    )
  }

  deleteObjByKey(key: string) {
    const config = new qiniu.conf.Config()
    const bucketManager = new qiniu.rs.BucketManager(this.mac, config)

    bucketManager.delete(this.bucket, key, (err) => {
      if (err) {
        console.log('------删除失败 start-------')
        console.log(key)
        console.log(err)
        console.log('------删除失败 end-------')
        if (this.ctx) {
          this.behaviorService.error(
            `删除失败:${key}${err?.message}`,
            err?.stack
          )
        }
      }
    })
  }

  getTipImageKey(key: string, name: string, uid: number) {
    return getTipImageKey(key, name, uid)
  }
}
