import { Context, Inject, InjectCtx, Provide } from 'flash-wolves'
import BehaviorService from './behaviorService'
import { rMobilePhone } from '@/utils/regExp'
import { UserError } from '@/constants/errorMsg'
import { randomNumStr } from '@/utils/randUtil'
import { sendMessage } from '@/utils/tencent'
import TokenService from './tokenService'

@Provide()
export default class PublicService {
  @InjectCtx()
  private ctx: Context

  @Inject(BehaviorService)
  private behaviorService: BehaviorService

  @Inject(TokenService)
  private tokenService: TokenService

  async getVerifyCode(phone: string) {
    // 手机号不正确,直接返回
    if (!rMobilePhone.test(phone)) {
      this.behaviorService.add(
        'public',
        `获取验证码 手机号:${phone} 格式不正确`,
        {
          phone
        }
      )
      throw UserError.mobile.fault
    }
    const code = randomNumStr(4)
    const logPhone = phone.slice(-4)
    this.behaviorService.add(
      'public',
      `获取验证码 手机尾号:${logPhone}  验证码:${code} 成功`,
      {
        phone: logPhone,
        code
      }
    )
    if (process.env.NODE_ENV !== 'development') {
      sendMessage(phone, code, 2)
    }
    console.log(
      new Date().toLocaleString(),
      `获取验证码 手机尾号:${logPhone}  验证码:${code} 成功`
    )
    this.tokenService.setVerifyCode(phone, code)
  }
}
