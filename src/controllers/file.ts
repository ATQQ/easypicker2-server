import type {
  Context,
  FWRequest,
} from 'flash-wolves'
import {
  Get,
  Inject,
  InjectCtx,
  Post,
  Put,
  ReqBody,
  ReqParams,
  ReqQuery,
  Response,
  RouterController,
} from 'flash-wolves'
import { ObjectID } from 'mongodb'
import { addBehavior } from '@/db/logDb'
import { selectFiles, updateFileInfo } from '@/db/fileDb'
import {
  batchFileStatus,
  createDownloadUrl,
  judgeFileIsExist,
  mvOssFile,
} from '@/utils/qiniuUtil'
import { qiniuConfig } from '@/config'
import { fileError, publicError } from '@/constants/errorMsg'
import type { User } from '@/db/model/user'
import { ReqUserInfo } from '@/decorator'
import { BehaviorService, FileService } from '@/service'
import { wrapperCatchError } from '@/utils/context'
import { findAction } from '@/db/actionDb'
import { ActionType, type DownloadActionData } from '@/db/model/action'
import { getQiniuFileUrlExpiredTime } from '@/utils/userUtil'
import LocalUserDB from '@/utils/user-local-db'

const power = {
  needLogin: true,
}

@RouterController('file', power)
export default class FileController {
  @InjectCtx()
  private ctx: Context

  @Inject(FileService)
  private fileService: FileService

  @Inject(BehaviorService)
  private behaviorService: BehaviorService

  /**
   * 获取图片的预览图
   */
  @Post('/image/preview', power)
  async checkPeopleIsExist(
    @ReqBody('ids') idList: number[],
    @ReqUserInfo() user: User,
    req: FWRequest,
  ) {
    addBehavior(req, {
      module: 'file',
      msg: `获取图片预览链接 用户:${user.account}`,
      data: {
        account: user.account,
        idList,
      },
    })
    const files = await selectFiles(
      {
        id: idList as any,
        userId: user.id,
      },
      ['task_key', 'name', 'hash'],
    )
    const keys = files.map(
      file => `easypicker2/${file.task_key}/${file.hash}/${file.name}`,
    )
    const expiredTime = getQiniuFileUrlExpiredTime(LocalUserDB.getSiteConfig()?.downloadOneExpired || 1)

    const filesStatus = await batchFileStatus(keys)
    const result = filesStatus.map((status, idx) => {
      if (status.code === 200 && status.data?.mimeType?.includes('image')) {
        return {
          cover: createDownloadUrl(
            `${keys[idx]}${qiniuConfig.imageCoverStyle}`,
            expiredTime,
          ),
          preview: createDownloadUrl(
            `${keys[idx]}${qiniuConfig.imagePreviewStyle}`,
            expiredTime,
          ),
        }
      }
      return {
        cover: '',
        preview:
          'https://img.cdn.sugarat.top/mdImg/MTY0OTkwMDMxNTY4NA==649900315684',
      }
    })
    return result
  }

  @Post('/download/count', power)
  async downloadCount(
    @ReqBody('ids') idList: number[],
  ) {
    return this.fileService.downloadCount(idList)
  }

  @Put('/name/rewrite', power)
  async rewriteFilename(
    @ReqBody('id') id: number,
    @ReqBody('name') newName: string,
    @ReqUserInfo() user: User,
    req: FWRequest,
  ) {
    const file = (await selectFiles({ id, userId: user.id }))[0]
    if (!file) {
      addBehavior(req, {
        module: 'file',
        msg: `重命名文件失败 用户:${user.account} 文件id:${id} 新文件名:${newName}`,
      })
      return Response.failWithError(fileError.noPower)
    }
    // 重命名OSS资源
    const ossKey = `easypicker2/${file.task_key}/${file.hash}/${file.name}`
    const newOssKey = `easypicker2/${file.task_key}/${file.hash}/${newName}`
    const isOldExist = await judgeFileIsExist(ossKey)
    const isNewExist = await judgeFileIsExist(newOssKey)
    if (!isOldExist) {
      return Response.failWithError(fileError.noOssFile)
    }
    if (isNewExist) {
      return Response.failWithError(fileError.ossFileRepeat) // 文件重名
    }
    // 重命名OSS资源
    await mvOssFile(ossKey, newOssKey, req)
    // 更新数据库
    await updateFileInfo({ id, userId: user.id }, { name: newName })
    addBehavior(req, {
      module: 'file',
      msg: `重命名文件成功 用户:${user.account} 文件id:${id} 新文件名:${newName}`,
    })
  }

  /**
   * 获取文件列表(带下载链接)
   */
  @Get('/list/withUrl', power)
  async listWithUrl() {
    const { id: userId } = this.ctx.req.userInfo
    const files = await selectFiles({
      userId,
    })
    return {
      files: files.map(v => ({
        ...v,
        download: createDownloadUrl(this.fileService.getOssKey(v)),
      })),
    }
  }

  // TODO: 后端限制超容量下载上传
  @Get('/one')
  async downloadOne(@ReqQuery('id') id: string) {
    try {
      return await this.fileService.downloadOne(+id)
    }
    catch (error) {
      return wrapperCatchError(error)
    }
  }

  /**
   * 文件重定向下载，记录下载日志，便于统计单文件真实被下载次数
   */
  @Get('/download/:key', { needLogin: false })
  async downloadFile(@ReqParams('key') key: string) {
    // 302重定向到OSS下载地址
    try {
      ObjectID(key)
    }
    catch {
      this.behaviorService.add('file', `非法文件下载参数: ${key}`)
      return Response.failWithError(publicError.request.errorParams)
    }
    const [download] = await findAction<DownloadActionData>({
      _id: ObjectID(key),
    })
    if (!download) {
      return Response.failWithError(publicError.request.errorParams)
    }
    const { account: logAccount, tip: fileName, mimeType, size: fileSize } = download.data

    const logMap = {
      [ActionType.Download]: '下载文件成功',
      [ActionType.Compress]: '归档下载文件成功',
      [ActionType.TemplateDownload]: '下载模板文件',
    }

    this.behaviorService.add('file', `${logMap[download.type]} 用户:${logAccount} 文件:${fileName} 类型:${mimeType}`, {
      account: logAccount,
      downloadType: download.type,
      name: fileName,
      size: fileSize,
      mimeType,
      downloadActionId: key,
    })

    this.ctx.res.statusCode = 302
    this.ctx.res.setHeader('Location', download.data.originUrl)
    this.ctx.res.end()
  }

  @Post('/batch/down')
  async batchDownload(@ReqBody() body) {
    const { ids, zipName } = body
    try {
      return await this.fileService.batchDownload(ids, zipName)
    }
    catch (error) {
      return wrapperCatchError(error)
    }
  }

  /**
   * 模板文件下载
   */
  @Get('/template')
  async downloadTemplate(@ReqQuery() query) {
    const { template, key } = query
    try {
      return await this.fileService.downloadTemplate(template, key)
    }
    catch (error) {
      return wrapperCatchError(error)
    }
  }
}
