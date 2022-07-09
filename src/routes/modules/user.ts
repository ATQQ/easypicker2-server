import { Router } from 'flash-wolves'

import { UserError } from '@/constants/errorMsg'
import { addBehavior } from '@/db/logDb'
import { USER_POWER, USER_STATUS } from '@/db/model/user'
import { expiredRedisKey, getRedisVal } from '@/db/redisDb'
import {
  insertUser, selectUserByPhone, updateUser,
} from '@/db/userDb'
import { randomNumStr } from '@/utils/randUtil'
import { rPassword } from '@/utils/regExp'
import { encryption, formatDate, getUniqueKey } from '@/utils/stringUtil'
import tokenUtil from '@/utils/tokenUtil'
import { getUserInfo } from '@/utils/userUtil'

const router = new Router('user')

/**
 * 验证码登录
 */
router.post('login/code', async (req, res) => {
  const { code, phone } = req.body

  const logPhone = phone?.slice(-4)
  const v = await getRedisVal(`code-${phone}`)
  if (code !== v) {
    addBehavior(req, {
      module: 'user',
      msg: `验证码登录 验证码错误:${code}`,
      data: {
        code,
        rightCode: v,
      },
    })
    res.failWithError(UserError.code.fault)
    return
  }
  let [user] = await selectUserByPhone(phone)

  if (!user) {
    addBehavior(req, {
      module: 'user',
      msg: `验证码登录 手机号:${logPhone} 不存在 创建新用户`,
      data: {
        phone: logPhone,
      },
    })

    // 不存在则直接创建
    await insertUser({
      // 随机生成一个谁也不知的密码,用户后续只能通过找回密码重置
      password: encryption(randomNumStr(6) + getUniqueKey().slice(6)),
      // 默认账号就为手机号
      account: phone,
      loginCount: 0,
      phone,
    });
    ([user] = await selectUserByPhone(phone))
  }

  const { account } = user
  // 权限校验
  if (user.status === USER_STATUS.BAN) {
    addBehavior(req, {
      module: 'user',
      msg: `用户登录失败 账号:${account} 已被封禁`,
      data: {
        account,
      },
    })
    res.failWithError(UserError.account.ban)
    return
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
      res.fail(UserError.account.freeze.code, UserError.account.freeze.msg, {
        openTime: user.open_time,
      })
      return
    }
    updateUser({
      status: USER_STATUS.NORMAL,
      open_time: null,
    }, {
      id: user.id,
    })
  }
  const token = tokenUtil.createToken(user)
  await updateUser({
    loginCount: user.login_count + 1,
    loginTime: new Date(),
  }, {
    id: user.id,
  })

  addBehavior(req, {
    module: 'user',
    msg: `验证码登录 手机号:${logPhone} 登录成功`,
    data: {
      phone: logPhone,
    },
  })
  expiredRedisKey(`code-${phone}`)
  res.success({
    token,
  })
})

/**
 * 重置密码
 */
router.put('password', async (req, res) => {
  const { code, phone, pwd } = req.body

  const logPhone = phone?.slice(-4)
  const v = await getRedisVal(`code-${phone}`)
  if (code !== v) {
    addBehavior(req, {
      module: 'user',
      msg: `重置密码 手机号:${logPhone} 验证码不正确: ${code}`,
      data: {
        phone: logPhone,
        code,
        rightCode: v,
      },
    })
    res.failWithError(UserError.code.fault)
    return
  }
  const [user] = await selectUserByPhone(phone)

  if (!user) {
    addBehavior(req, {
      module: 'user',
      msg: `重置密码 手机号:${logPhone} 不存在`,
      data: {
        phone: logPhone,
      },
    })
    res.failWithError(UserError.mobile.noExist)
    return
  }
  if (!rPassword.test(pwd)) {
    addBehavior(req, {
      module: 'user',
      msg: `重置密码 手机号:${logPhone} 密码格式不正确`,
      data: {
        phone: logPhone,
      },
    })
    res.failWithError(UserError.pwd.fault)
    return
  }
  await updateUser({
    password: encryption(pwd),
  }, {
    id: user.id,
  })
  expiredRedisKey(`code-${phone}`)
  addBehavior(req, {
    module: 'user',
    msg: `重置密码 手机号:${logPhone} 重置成功`,
    data: {
      phone: logPhone,
    },
  })

  const { account } = user
  // 权限校验
  if (user.status === USER_STATUS.BAN) {
    addBehavior(req, {
      module: 'user',
      msg: `用户登录失败 账号:${account} 已被封禁`,
      data: {
        account,
      },
    })
    res.failWithError(UserError.account.ban)
    return
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
      res.fail(UserError.account.freeze.code, UserError.account.freeze.msg, {
        openTime: user.open_time,
      })
      return
    }
    updateUser({
      status: USER_STATUS.NORMAL,
      open_time: null,
    }, {
      id: user.id,
    })
  }
  const token = tokenUtil.createToken(user)
  res.success({
    token,
  })
})

/**
 * 判断是否超级管理员
 */
router.get('power/super', async (req, res) => {
  const user = await getUserInfo(req)
  res.success({
    power: user?.power === USER_POWER.SUPER,
    name: user?.account,
    system: user?.power === USER_POWER.SYSTEM,
  })
})

router.get('login', async (req, res) => {
  const user = await getUserInfo(req)
  res.success(!!user)
})
export default router
