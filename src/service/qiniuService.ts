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

  deleteFiles(prefix: string): void {
    const config = new qiniu.conf.Config()
    const bucketManager = new qiniu.rs.BucketManager(this.mac, config)
    bucketManager.listPrefix(
      this.bucket,
      {
        limit: 1000,
        prefix
      },
      (err, respBody) => {
        const files: any[] = respBody.items
        // 使用批量删除接口
        this.batchDeleteFiles(files.map((f) => f.key))
      }
    )
  }

  batchDeleteFiles(keys: string[]) {
    if (!keys.length) return
    const { bucket, mac } = this
    const config = new qiniu.conf.Config()
    const delOptions = keys.map((k) => qiniu.rs.deleteOp(bucket, k))
    const bucketManager = new qiniu.rs.BucketManager(mac, config)
    bucketManager.batch(delOptions, (err, respBody, respInfo) => {
      if (err) {
        console.log(err)
        this.behaviorService.error(`批量删除异常: ${err.message}`, err.stack)
        // throw err;
      } else {
        // 200 is success, 298 is part success
        // eslint-disable-next-line no-lonely-if
        if (parseInt(`${respInfo.statusCode / 100}`, 10) === 2) {
          respBody.forEach((item) => {
            if (+item.code !== 200) {
              this.behaviorService.error(
                `${item.code}\t${item.data.error}`,
                item
              )
            }
          })
        } else {
          console.log(respInfo.deleteusCode)
          console.log(respBody)
          this.behaviorService.error(
            `批量删除异常: ${respInfo.deleteusCode}`,
            respBody
          )
        }
      }
    })
  }
}
