import {
  RouterController,
  Post,
  ReqBody,
  FWRequest,
} from 'flash-wolves'
import { addBehavior } from '@/db/logDb'
import { getUserInfo } from '@/utils/userUtil'
import { selectFiles } from '@/db/fileDb'
import { batchFileStatus, createDownloadUrl } from '@/utils/qiniuUtil'
import { qiniuConfig } from '@/config'

const power = {
  needLogin: true,
}

@RouterController('file')
export default class FileController {
  /**
   * 获取图片的预览图
   */
  @Post('/image/preview', power)
  async checkPeopleIsExist(
    @ReqBody('ids') idList:number[],
      req:FWRequest,
  ) {
    const user = await getUserInfo(req)
    addBehavior(req, {
      module: 'file',
      msg: `获取图片预览链接 用户:${user.account}`,
      data: {
        account: user.account,
        idList,
      },
    })
    const files = await selectFiles({
      id: idList as any,
      userId: user.id,
    }, ['task_key', 'name', 'hash'])
    const keys = files.map((file) => `easypicker2/${file.task_key}/${file.hash}/${file.name}`)
    const filesStatus = await batchFileStatus(keys)
    const result = filesStatus.map((status, idx) => {
      if (status.code === 200 && status.data?.mimeType?.includes('image')) {
        return {
          cover: createDownloadUrl(`${keys[idx]}${qiniuConfig.imageCoverStyle}`),
          preview: createDownloadUrl(`${keys[idx]}${qiniuConfig.imagePreviewStyle}`),
        }
      }
      return {
        cover: '',
        preview: 'https://img.cdn.sugarat.top/mdImg/MTY0OTkwMDMxNTY4NA==649900315684',
      }
    })
    return result
  }
}
