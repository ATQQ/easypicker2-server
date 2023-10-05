import {
  Context,
  Get,
  Inject,
  InjectCtx,
  Post,
  Put,
  ReqBody,
  Response,
  RouterController
} from 'flash-wolves'

import { UserError } from '@/constants/errorMsg'
import { USER_POWER } from '@/db/model/user'
import LocalUserDB from '@/utils/user-local-db'
import UserService from '@/service/userService'
import BehaviorService from '@/service/behaviorService'
import { wrapperCatchError } from '@/utils/context'
import TokenService from '@/service/tokenService'
import { User } from '@/db/entity'

@RouterController('user')
export default class UserController {
  @Inject(UserService)
  private userService: UserService

  @Inject(BehaviorService)
  private behaviorService: BehaviorService

  @Inject(TokenService)
  private tokenService: TokenService

  @InjectCtx()
  private Ctx: Context

  @Post('register')
  async register(@ReqBody() body: any) {
    try {
      const user = await this.userService.register(body)
      const token = await this.tokenService.createTokenByUser(user)
      return {
        token
      }
    } catch (error) {
      return wrapperCatchError(error)
    }
  }

  @Post('login')
  async login(
    @ReqBody('account') account: string,
    @ReqBody('pwd') pwd: string
  ) {
    // 先判断是否系统账号
    const isSystemAccount =
      LocalUserDB.findUserConfig({
        type: 'server',
        key: 'USER',
        value: account
      }).length !== 0
    if (isSystemAccount) {
      const isRightPwd =
        LocalUserDB.findUserConfig({ type: 'server', key: 'PWD', value: pwd })
          .length !== 0
      if (isRightPwd) {
        const u = new User()
        u.account = account
        u.power = USER_POWER.SYSTEM
        return {
          token: await this.tokenService.createTokenByUser(u),
          system: true
        }
      }
      return Response.failWithError(UserError.account.fault)
    }

    try {
      const user = await this.userService.login(account, pwd)
      const token = await this.tokenService.createTokenByUser(user)
      return {
        token
      }
    } catch (error) {
      return wrapperCatchError(error)
    }
  }

  @Get('logout', { needLogin: true })
  async logout() {
    const { account } = this.Ctx.req.userInfo
    this.behaviorService.add('user', `退出登录 ${account}`, {
      account
    })
    this.tokenService.expiredToken(this.Ctx.req.headers.token as string)
  }

  @Post('login/code')
  async loginByCode(@ReqBody() body) {
    try {
      const { code, phone } = body
      const user = await this.userService.loginByCode(phone, code)
      const token = await this.tokenService.createTokenByUser(user)
      return {
        token
      }
    } catch (error) {
      return wrapperCatchError(error)
    }
  }

  @Put('password')
  async updatePassword(@ReqBody() body) {
    try {
      const user = await this.userService.updatePassword(body)
      const token = await this.tokenService.createTokenByUser(user)
      return {
        token
      }
    } catch (error) {
      return wrapperCatchError(error)
    }
  }

  @Get('power/super', { needLogin: true })
  async isSuperPower() {
    const { power, account } = this.Ctx.req.userInfo
    this.tokenService.refreshToken(this.Ctx.req.headers.token as string)
    return {
      power: power === USER_POWER.SUPER,
      name: account,
      system: power === USER_POWER.SYSTEM
    }
  }

  @Get('login', { needLogin: true })
  async isLogin() {
    return !!this.Ctx.req.userInfo
  }
}
