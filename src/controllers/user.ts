import {
  Context,
  FWRequest,
  Get,
  Inject,
  InjectCtx,
  Post,
  ReqBody,
  Response,
  RouterController
} from 'flash-wolves'

import { UserError } from '@/constants/errorMsg'
import { addBehavior } from '@/db/logDb'
import { USER_POWER, USER_STATUS } from '@/db/model/user'
import type { User } from '@/db/model/user'
import { selectUserByAccount, selectUserByPhone, updateUser } from '@/db/userDb'
import { rMobilePhone, rPassword } from '@/utils/regExp'
import { encryption, formatDate } from '@/utils/stringUtil'
import tokenUtil from '@/utils/tokenUtil'
import LocalUserDB from '@/utils/user-local-db'
import { ReqUserInfo } from '@/decorator'
import UserService from '@/service/userService'
import BehaviorService from '@/service/behaviorService'
import { wrapperCatchError } from '@/utils/context'
import TokenService from '@/service/tokenService'

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
      const token = this.tokenService.createTokenByUser(user)
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
    @ReqBody('pwd') pwd: string,
    req: FWRequest
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
        return {
          token: tokenUtil.createToken(
            {
              account,
              power: USER_POWER.SYSTEM
            },
            60 * 60 * 24 * 7
          ),
          system: true
        }
      }
      return Response.failWithError(UserError.account.fault)
    }
    const isPhone = rMobilePhone.test(account)
    // 密码格式不正确
    if (!rPassword.test(pwd)) {
      addBehavior(req, {
        module: 'user',
        msg: `用户登录 账号:${account} 密码不正确`,
        data: {
          account
        }
      })
      return Response.failWithError(UserError.pwd.fault)
    }
    let user: User
      // 规避注册时逻辑导致的问题
      // 先当做账号
    ;[user] = await selectUserByAccount(account)
    // 手机号不正确
    if (!user && !isPhone) {
      addBehavior(req, {
        module: 'user',
        msg: `用户登录 账号:${account} 不存在`,
        data: {
          account
        }
      })
      return Response.failWithError(UserError.account.fault)
    }
    if (!user && isPhone) {
      ;[user] = await selectUserByPhone(account)
    }
    if (!user) {
      addBehavior(req, {
        module: 'user',
        msg: `用户登录 账号:${account} 不存在`,
        data: {
          account
        }
      })
      return Response.failWithError(
        isPhone ? UserError.mobile.fault : UserError.account.fault
      )
    }
    if (user.password !== encryption(pwd)) {
      addBehavior(req, {
        module: 'user',
        msg: `用户登录 账号:${account} 密码不正确`,
        data: {
          account
        }
      })
      return Response.failWithError(UserError.pwd.fault)
    }
    if (user.status === USER_STATUS.BAN) {
      addBehavior(req, {
        module: 'user',
        msg: `用户登录失败 账号:${account} 已被封禁`,
        data: {
          account
        }
      })
      return Response.failWithError(UserError.account.ban)
    }
    if (user.status === USER_STATUS.FREEZE) {
      const openDate = new Date(user.open_time)
      if (openDate.getTime() > Date.now()) {
        addBehavior(req, {
          module: 'user',
          msg: `用户登录失败 账号:${account} 已被冻结 解冻时间${formatDate(
            openDate
          )}`,
          data: {
            account,
            openDate
          }
        })
        return Response.fail(
          UserError.account.freeze.code,
          UserError.account.freeze.msg,
          {
            openTime: user.open_time
          }
        )
      }
      updateUser(
        {
          status: USER_STATUS.NORMAL,
          open_time: null
        },
        {
          id: user.id
        }
      )
    }
    await updateUser(
      {
        loginCount: user.login_count + 1,
        loginTime: new Date()
      },
      {
        id: user.id
      }
    )
    addBehavior(req, {
      module: 'user',
      msg: `用户登录 账号:${account} 登录成功`,
      data: {
        account
      }
    })
    // 7天有效时间
    return {
      token: tokenUtil.createToken(user, 60 * 60 * 24 * 7)
    }
  }

  @Get('logout', { needLogin: true })
  async logout(@ReqUserInfo() user: User, req: FWRequest) {
    tokenUtil.expiredToken(req.headers.token as string)
    addBehavior(req, {
      module: 'user',
      msg: `退出登录 ${user.account}`
    })
  }
}
