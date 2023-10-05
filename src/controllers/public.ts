import {
  FWRequest,
  Get,
  Post,
  ReqQuery,
  Response,
  RouterController,
  ReqBody,
  Inject
} from 'flash-wolves'

import { rMobilePhone } from '@/utils/regExp'
import { UserError } from '@/constants/errorMsg'
import { addBehavior, addPvLog } from '@/db/logDb'
import { selectUserByAccount, selectUserByPhone } from '@/db/userDb'
import { createDownloadUrl } from '@/utils/qiniuUtil'
import { qiniuConfig } from '@/config'
import { PublicService, TokenService } from '@/service'
import { wrapperCatchError } from '@/utils/context'

@RouterController('public')
export default class PublicController {
  @Inject(PublicService)
  private publicService: PublicService

  @Inject(TokenService)
  private tokenService: TokenService

  @Get('code')
  async getVerCode(@ReqQuery('phone') phone: string) {
    try {
      await this.publicService.getVerifyCode(phone)
    } catch (error) {
      return wrapperCatchError(error)
    }
  }

  @Get('report/pv', {
    CORS: true
  })
  @Post('report/pv')
  reportPv(req: FWRequest) {
    if (req.method === 'GET') {
      const { path } = req.query
      addPvLog(req, path)
      return Response.plain('<h1>ok</h1>', 'text/html;charset=utf-8')
    }
    const { path } = req.body
    addPvLog(req, path)
  }

  @Get('check/phone')
  async checkPhoneIsExist(@ReqQuery('phone') phone: string, req: FWRequest) {
    if (!rMobilePhone.test(phone)) {
      addBehavior(req, {
        module: 'public',
        msg: `检查手机号是否存在 手机号:${phone} 格式不正确`,
        data: {
          phone
        }
      })
      return Response.failWithError(UserError.mobile.fault)
    }
    let [user] = await selectUserByPhone(phone)
    if (!user) {
      ;[user] = await selectUserByAccount(phone)
    }
    if (user) {
      addBehavior(req, {
        module: 'public',
        msg: `检查手机号是否存在 手机号:${phone} 已存在`,
        data: {
          phone
        }
      })
      return Response.failWithError(UserError.mobile.exist)
    }
    addBehavior(req, {
      module: 'public',
      msg: `检查手机号是否存在 手机号:${phone} 不存在`,
      data: {
        phone
      }
    })
  }

  @Post('tip/image')
  getTipImage(
    @ReqBody('key') key: string,
    @ReqBody('data')
    data: {
      uid: number
      name: string
    }[]
  ) {
    return data.map((v) => ({
      cover: createDownloadUrl(
        `easypicker2/tip/${key}/${v.uid}/${v.name}${qiniuConfig.imageCoverStyle}`
      ),
      preview: createDownloadUrl(
        `easypicker2/tip/${key}/${v.uid}/${v.name}${qiniuConfig.imagePreviewStyle}`
      )
    }))
  }
}
