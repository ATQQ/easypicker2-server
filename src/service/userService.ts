import { Inject, Provide } from 'flash-wolves'
import { UserError } from '@/constants/errorMsg'
import { UserRepository } from '@/db/userDb'
import { rAccount, rMobilePhone, rPassword } from '@/utils/regExp'
import { encryption } from '@/utils/stringUtil'
import { User } from '@/db/entity'
import BehaviorService from './behaviorService'
import TokenService from './tokenService'

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
}
