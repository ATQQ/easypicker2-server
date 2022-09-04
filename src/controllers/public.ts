import {
  FWRequest,
  Get,
  Post,
  ReqQuery,
  Response,
  RouterController
} from 'flash-wolves'

import { rMobilePhone } from '@/utils/regExp'
import { UserError } from '@/constants/errorMsg'
import { randomNumStr } from '@/utils/randUtil'
import { setRedisValue } from '@/db/redisDb'
import { sendMessage } from '@/utils/tencent'
import { addBehavior, addPvLog } from '@/db/logDb'
import { selectUserByAccount, selectUserByPhone } from '@/db/userDb'

@RouterController('public')
export default class PublicController {
  @Get('code')
  getVerCode(@ReqQuery('phone') phone: string, req: FWRequest) {
    // 手机号不正确,直接返回
    if (!rMobilePhone.test(phone)) {
      addBehavior(req, {
        module: 'public',
        msg: `获取验证码 手机号:${phone} 格式不正确`,
        data: {
          phone
        }
      })
      return Response.failWithError(UserError.mobile.fault)
    }
    const code = randomNumStr(4)
    const logPhone = phone.slice(-4)
    addBehavior(req, {
      module: 'public',
      msg: `获取验证码 手机尾号:${logPhone}  验证码:${code} 成功`,
      data: {
        phone: logPhone,
        code
      }
    })
    if (process.env.NODE_ENV !== 'development') {
      sendMessage(phone, code, 2)
    }
    console.log(
      new Date().toLocaleString(),
      `获取验证码 手机尾号:${logPhone}  验证码:${code} 成功`
    )
    setRedisValue(`code-${phone}`, code, 120)
  }

  @Post('report/pv')
  reportPv(req: FWRequest) {
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
}
