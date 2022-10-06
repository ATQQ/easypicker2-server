import {
  RouterController,
  Post,
  ReqBody,
  FWRequest,
  Put,
  Response
} from 'flash-wolves'
import { addBehavior } from '@/db/logDb'
import { selectFiles, updateFileInfo } from '@/db/fileDb'
import {
  batchFileStatus,
  createDownloadUrl,
  judgeFileIsExist,
  mvOssFile
} from '@/utils/qiniuUtil'
import { qiniuConfig } from '@/config'
import { fileError } from '@/constants/errorMsg'
import { User } from '@/db/model/user'
import { ReqUserInfo } from '@/decorator'

const power = {
  needLogin: true
}

@RouterController('file')
export default class FileController {
  /**
   * 获取图片的预览图
   */
  @Post('/image/preview', power)
  async checkPeopleIsExist(
    @ReqBody('ids') idList: number[],
    @ReqUserInfo() user: User,
    req: FWRequest
  ) {
    addBehavior(req, {
      module: 'file',
      msg: `获取图片预览链接 用户:${user.account}`,
      data: {
        account: user.account,
        idList
      }
    })
    const files = await selectFiles(
      {
        id: idList as any,
        userId: user.id
      },
      ['task_key', 'name', 'hash']
    )
    const keys = files.map(
      (file) => `easypicker2/${file.task_key}/${file.hash}/${file.name}`
    )
    const filesStatus = await batchFileStatus(keys)
    const result = filesStatus.map((status, idx) => {
      if (status.code === 200 && status.data?.mimeType?.includes('image')) {
        return {
          cover: createDownloadUrl(
            `${keys[idx]}${qiniuConfig.imageCoverStyle}`
          ),
          preview: createDownloadUrl(
            `${keys[idx]}${qiniuConfig.imagePreviewStyle}`
          )
        }
      }
      return {
        cover: '',
        preview:
          'https://img.cdn.sugarat.top/mdImg/MTY0OTkwMDMxNTY4NA==649900315684'
      }
    })
    return result
  }

  @Put('/name/rewrite', power)
  async rewriteFilename(
    @ReqBody('id') id: number,
    @ReqBody('name') newName: string,
    @ReqUserInfo() user: User,
    req: FWRequest
  ) {
    const file = (await selectFiles({ id, userId: user.id }))[0]
    if (!file) {
      addBehavior(req, {
        module: 'file',
        msg: `重命名文件失败 用户:${user.account} 文件id:${id} 新文件名:${newName}`
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
      msg: `重命名文件成功 用户:${user.account} 文件id:${id} 新文件名:${newName}`
    })
  }
}
