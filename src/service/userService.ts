/* eslint-disable no-throw-literal */
import { Inject, Provide } from 'flash-wolves'
import { UserError } from '@/constants/errorMsg'
import { UserRepository } from '@/db/userDb'
import { rAccount, rMobilePhone, rPassword } from '@/utils/regExp'
import { encryption, formatDate } from '@/utils/stringUtil'
import { User } from '@/db/entity'
import BehaviorService from './behaviorService'
import TokenService from './tokenService'
import { USER_STATUS } from '@/db/model/user'

@Provide()
export default class UserService {
  @Inject(BehaviorService)
  private behaviorService: BehaviorService

  @Inject(UserRepository)
  private userRepository: UserRepository

  @Inject(TokenService)
  private tokenService: TokenService

  async register(payload: any) {
    const { account, pwd, bindPhone, phone, code } = payload
    // TODO：参数校验可优化使用zod
    if (!rAccount.test(account)) {
      this.behaviorService.add('user', `新用户注册 账号:${account} 格式错误`, {
        account
      })
      throw UserError.account.fault
    }
    if (!rPassword.test(pwd)) {
      this.behaviorService.add(
        'user',
        `新用户注册 账号:${account} 密码格式不正确`,
        {
          account
        }
      )
      throw UserError.pwd.fault
    }
    // 检查账号是否存在
    let user = await this.userRepository.findOneUser({ account })
    // 账号是手机号格式，那么该手机号不能已经是被注册的
    if (rMobilePhone.test(account) && !user) {
      user = await this.userRepository.findOneUser({ phone: account })
    }
    // 存在返回错误
    if (user) {
      this.behaviorService.add('user', `新用户注册 账号:${account} 已存在`, {
        account
      })
      throw UserError.account.exist
    }

    // 绑定手机
    if (bindPhone) {
      if (!rMobilePhone.test(phone)) {
        this.behaviorService.add(
          'user',
          `新用户注册 手机号:${phone} 格式错误`,
          {
            phone
          }
        )
        throw UserError.mobile.fault
      }
      const rightCode = await this.tokenService.getVerifyCode(phone)
      if (!code || code !== rightCode) {
        this.behaviorService.add('user', `新用户注册 验证码错误:${code}`, {
          code,
          rightCode
        })
        throw UserError.code.fault
      }
      // 检查手机号是否存在
      user = await this.userRepository.findOneUser({ phone })
      // 检查该手机号是否出现在账号中
      if (!user) {
        user = await this.userRepository.findOneUser({ account: phone })
      }
      // 存在返回错误
      if (user) {
        this.behaviorService.add('user', `新用户注册 手机号:${phone} 已存在`)
        throw UserError.mobile.exist
      }
      // 过期验证码
      this.tokenService.expiredToken(phone)
    }

    this.behaviorService.add(
      'user',
      `新用户注册 账号:${account} 绑定手机:${bindPhone ? '是' : '否'} 注册成功`,
      {
        account,
        bindPhone
      }
    )
    // 不存在则加入
    const u = new User()
    u.account = account
    u.password = encryption(pwd)
    if (bindPhone) {
      u.phone = phone
    }

    return this.userRepository.insertUser(u)
  }

  async login(account: string, pwd: string) {
    const isPhone = rMobilePhone.test(account)
    // 密码格式不正确
    if (!rPassword.test(pwd)) {
      this.behaviorService.add(
        'user',
        `用户登录 账号:${account} 密码格式不正确`,
        {
          account
        }
      )

      throw UserError.pwd.fault
    }
    // 规避注册时逻辑导致的问题

    // 先当做账号处理
    let user = await this.userRepository.findOneUser({ account })
    // 不存在&&不是手机号
    if (!user && !isPhone) {
      this.behaviorService.add('user', `用户登录 账号:${account} 不存在`, {
        account
      })
      throw UserError.account.fault
    }

    // 不存在&&是手机号
    if (!user && isPhone) {
      user = await this.userRepository.findOneUser({ phone: account })
    }
    if (!user) {
      this.behaviorService.add('user', `用户登录 账号:${account} 不存在`, {
        account
      })

      throw isPhone ? UserError.mobile.fault : UserError.account.fault
    }
    if (user.password !== encryption(pwd)) {
      this.behaviorService.add('user', `用户登录 账号:${account} 密码不正确`, {
        account
      })

      throw UserError.pwd.fault
    }
    if (user.status === USER_STATUS.BAN) {
      this.behaviorService.add(
        'user',
        `用户登录失败 账号:${account} 已被封禁`,
        {
          account
        }
      )

      throw UserError.account.ban
    }
    if (user.status === USER_STATUS.FREEZE) {
      const openDate = new Date(user.openTime)
      if (openDate.getTime() > Date.now()) {
        this.behaviorService.add(
          'user',
          `用户登录失败 账号:${account} 已被冻结 解冻时间${formatDate(
            openDate
          )}`,
          {
            account,
            openDate
          }
        )
        throw {
          code: UserError.account.freeze.code,
          msg: UserError.account.freeze.msg,
          data: {
            openTime: user.openTime
          }
        }
      }
      user.status = USER_STATUS.NORMAL
      user.openTime = null
    }

    user.loginCount += 1
    user.loginTime = new Date()
    this.behaviorService.add('user', `用户登录 账号:${account} 登录成功`, {
      account
    })
    return this.userRepository.updateUser(user)
  }
}
