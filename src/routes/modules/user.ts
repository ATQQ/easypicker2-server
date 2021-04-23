import { UserError } from '@/constants/errorMsg'
import { addBehavior } from '@/db/logDb'
import { User, USER_POWER, USER_STATUS } from '@/db/model/user'
import { expiredRedisKey, getRedisVal } from '@/db/redisDb'
import {
  insertUser, selectUserByAccount, selectUserByPhone, updateUser,
} from '@/db/userDb'
import Router from '@/lib/Router'
import { rAccount, rMobilePhone, rPassword } from '@/utils/regExp'
import { encryption } from '@/utils/stringUtil'
import tokenUtil from '@/utils/tokenUtil'
import { getUserInfo } from '@/utils/userUtil'

const router = new Router('user')

/**
 * 注册
 */
router.post('register', async (req, res) => {
  const {
    account, pwd, bindPhone, phone, code,
  } = req.body

  if (!rAccount.test(account)) {
    addBehavior(req, {
      module: 'user',
      msg: `新用户注册 账号:${account} 格式错误`,
      data: {
        account,
      },
    })
    res.failWithError(UserError.account.fault)
    return
  }
  // 检查账号是否存在
  let [user] = await selectUserByAccount(account)

  // 存在返回错误
  if (user) {
    addBehavior(req, {
      module: 'user',
      msg: `新用户注册 账号:${account} 已存在`,
      data: {
        account,
      },
    })
    res.failWithError(UserError.account.exist)
    return
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
      res.failWithError(UserError.mobile.fault)
      return
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
      res.failWithError(UserError.code.fault)
      return
    }
    // 检查手机号是否存在
    ([user] = await selectUserByPhone(phone))

    // 存在返回错误
    if (user) {
      addBehavior(req, {
        module: 'user',
        msg: '新用户注册 手机号已存在',
      })
      res.failWithError(UserError.mobile.exist)
      return
    }
    // 过期验证码
    expiredRedisKey(phone)
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
  insertUser({
    password: encryption(pwd),
    account,
    ...(bindPhone ? { phone } : {}),
  }).then(() => {
    res.success()
  })
})

/**
 * 登录
 */
router.post('login', async (req, res) => {
  const { account = '', pwd = '' } = req.body
  // const isAccount = rAccount.test(account)
  // 兼容旧平台数据不校验账号格式
  const isAccount = true
  const isPhone = rMobilePhone.test(account)

  // 帐号不正确
  if (!isAccount) {
    addBehavior(req, {
      module: 'user',
      msg: `用户登录 账号:${account} 格式不正确`,
      data: {
        account,
      },
    })
    res.failWithError(UserError.account.fault)
    return
  }
  // 密码不正确
  if (!rPassword.test(pwd)) {
    addBehavior(req, {
      module: 'user',
      msg: `用户登录 账号:${account} 密码不正确`,
      data: {
        account,
      },
    })
    res.failWithError(UserError.pwd.fault)
    return
  }
  let user: User
  if (isAccount) {
    ([user] = await selectUserByAccount(account))
  }
  // 手机号不正确
  if (!user && !isPhone) {
    addBehavior(req, {
      module: 'user',
      msg: `用户登录 账号:${account} 不存在`,
      data: {
        account,
      },
    })
    res.failWithError(UserError.mobile.fault)
    return
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
    res.failWithError(isPhone ? UserError.mobile.fault : UserError.account.fault)
    return
  }
  if (user.password !== encryption(pwd)) {
    addBehavior(req, {
      module: 'user',
      msg: `用户登录 账号:${account} 密码不正确`,
      data: {
        account,
      },
    })
    res.failWithError(UserError.pwd.fault)
    return
  }
  // TODO:状态判断
  if (user.status === USER_STATUS.BAN) {
    console.log('判断状态')
  }
  if (user.status === USER_STATUS.FREEZE) {
    console.log('冻结')
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
  const token = tokenUtil.createToken(user)
  res.success({
    token,
  })
})

/**
 * 验证码登录
 */
router.post('login/code', async (req, res) => {
  const { code, phone } = req.body

  const logPhone = phone && phone.slice(-4)

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
  const [user] = await selectUserByPhone(phone)

  if (!user) {
    addBehavior(req, {
      module: 'user',
      msg: `验证码登录 手机号:${logPhone} 不存在`,
      data: {
        phone: logPhone,
      },
    })
    res.failWithError(UserError.mobile.fault)
    return
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

  const logPhone = phone && phone.slice(-4)
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
  res.success(user.power === USER_POWER.SUPER)
}, {
  needLogin: true,
})
export default router
