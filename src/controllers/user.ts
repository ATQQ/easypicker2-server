import {
  FWRequest,
  Post, ReqBody, Response, RouterController,
} from 'flash-wolves'

import { UserError } from '@/constants/errorMsg'
import { addBehavior } from '@/db/logDb'
import { User, USER_STATUS } from '@/db/model/user'
import { expiredRedisKey, getRedisVal } from '@/db/redisDb'
import {
  insertUser, selectUserByAccount, selectUserByPhone, updateUser,
} from '@/db/userDb'
import { rAccount, rMobilePhone, rPassword } from '@/utils/regExp'
import { encryption, formatDate } from '@/utils/stringUtil'
import tokenUtil from '@/utils/tokenUtil'

const power = {
  needLogin: true,
}

@RouterController('user')
export default class UserController {
  @Post('register')
  async register(@ReqBody() body:any, req:FWRequest) {
    const {
      account, pwd, bindPhone, phone, code,
    } = body

    if (!rAccount.test(account)) {
      addBehavior(req, {
        module: 'user',
        msg: `新用户注册 账号:${account} 格式错误`,
        data: {
          account,
        },
      })
      return Response.failWithError(UserError.account.fault)
    }
    if (!rPassword.test(pwd)) {
      addBehavior(req, {
        module: 'user',
        msg: `账号:${account} 密码格式不正确`,
        data: {
          account,
        },
      })
      return Response.failWithError(UserError.pwd.fault)
    }
    // 检查账号是否存在
    let [user] = await selectUserByAccount(account)
    // 账号是手机号格式，那么该手机号不能已经是被注册的
    if (rMobilePhone.test(account) && !user) {
      ([user] = await selectUserByPhone(account))
    }
    // 存在返回错误
    if (user) {
      addBehavior(req, {
        module: 'user',
        msg: `新用户注册 账号:${account} 已存在`,
        data: {
          account,
        },
      })
      return Response.failWithError(UserError.account.exist)
    }

    // 绑定手机
    if (bindPhone) {
      if (!rMobilePhone.test(phone)) {
        addBehavior(req, {
          module: 'user',
          msg: `新用户注册 手机号:${phone} 格式错误`,
          data: {
            phone,
          },
        })
        return Response.failWithError(UserError.mobile.fault)
      }
      const rightCode = await getRedisVal(`code-${phone}`)
      if (!code || code !== rightCode) {
        addBehavior(req, {
          module: 'user',
          msg: `新用户注册 验证码错误:${code}`,
          data: {
            code,
            rightCode,
          },
        })
        return Response.failWithError(UserError.code.fault)
      }
      // 检查手机号是否存在
      ([user] = await selectUserByPhone(phone))
      // 检查该手机号是否出现在账号中
      if (!user) {
        ([user] = await selectUserByAccount(phone))
      }
      // 存在返回错误
      if (user) {
        addBehavior(req, {
          module: 'user',
          msg: '新用户注册 手机号已存在',
        })
        return Response.failWithError(UserError.mobile.exist)
      }
      // 过期验证码
      expiredRedisKey(`code-${phone}`)
    }

    addBehavior(req, {
      module: 'user',
      msg: `新用户注册 账号:${account} 绑定手机:${bindPhone ? '是' : '否'} 注册成功`,
      data: {
        account,
        bindPhone,
      },
    })
    // 不存在则加入
    await insertUser({
      password: encryption(pwd),
      account,
      loginCount: 0,
      ...(bindPhone ? { phone } : {}),
    })
    const [u] = await selectUserByAccount(account)
    const token = tokenUtil.createToken(u)
    return {
      token,
    }
  }

  @Post('login')
  async login(@ReqBody('account') account:string, @ReqBody('pwd') pwd:string, req:FWRequest) {
    const isPhone = rMobilePhone.test(account)
    // 密码格式不正确
    if (!rPassword.test(pwd)) {
      addBehavior(req, {
        module: 'user',
        msg: `用户登录 账号:${account} 密码不正确`,
        data: {
          account,
        },
      })
      return Response.failWithError(UserError.pwd.fault)
    }
    let user: User
    // 规避注册时逻辑导致的问题
    // 先当做账号
    ([user] = await selectUserByAccount(account))
    // 手机号不正确
    if (!user && !isPhone) {
      addBehavior(req, {
        module: 'user',
        msg: `用户登录 账号:${account} 不存在`,
        data: {
          account,
        },
      })
      return Response.failWithError(UserError.account.fault)
    }
    if (!user && isPhone) {
      ([user] = await selectUserByPhone(account))
    }
    if (!user) {
      addBehavior(req, {
        module: 'user',
        msg: `用户登录 账号:${account} 不存在`,
        data: {
          account,
        },
      })
      return Response.failWithError(isPhone ? UserError.mobile.fault : UserError.account.fault)
    }
    if (user.password !== encryption(pwd)) {
      addBehavior(req, {
        module: 'user',
        msg: `用户登录 账号:${account} 密码不正确`,
        data: {
          account,
        },
      })
      return Response.failWithError(UserError.pwd.fault)
    }
    if (user.status === USER_STATUS.BAN) {
      addBehavior(req, {
        module: 'user',
        msg: `用户登录失败 账号:${account} 已被封禁`,
        data: {
          account,
        },
      })
      return Response.failWithError(UserError.account.ban)
    }
    if (user.status === USER_STATUS.FREEZE) {
      const openDate = new Date(user.open_time)
      if (openDate.getTime() > Date.now()) {
        addBehavior(req, {
          module: 'user',
          msg: `用户登录失败 账号:${account} 已被冻结 解冻时间${formatDate(openDate)}`,
          data: {
            account,
            openDate,
          },
        })
        return Response.fail(UserError.account.freeze.code, UserError.account.freeze.msg, {
          openTime: user.open_time,
        })
      }
      updateUser({
        status: USER_STATUS.NORMAL,
        open_time: null,
      }, {
        id: user.id,
      })
    }
    await updateUser({
      loginCount: user.login_count + 1,
      loginTime: new Date(),
    }, {
      id: user.id,
    })
    addBehavior(req, {
      module: 'user',
      msg: `用户登录 账号:${account} 登录成功`,
      data: {
        account,
      },
    })
    // 7天有效时间
    return {
      token: tokenUtil.createToken(user, 60 * 60 * 24 * 7),
    }
  }
}
