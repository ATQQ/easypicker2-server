import { Provide } from 'flash-wolves'
import { User } from '@/db/entity'
import { encryption } from '@/utils/stringUtil'
import { expiredRedisKey, getRedisVal, setRedisValue } from '@/db/redisDb'

@Provide()
export default class TokenService {
  // TODO: inject ctx
  realToken(token) {
    return process.env.TOKEN_PREFIX + token
  }

  createTokenByUser(user: User, timeout = 60 * 60 * 24 * 7) {
    const { account, power } = user
    const token = encryption([account, power, Date.now()].join())
    setRedisValue(this.realToken(token), JSON.stringify(user), timeout)
    return token
  }

  expiredToken(token: string) {
    expiredRedisKey(this.realToken(token))
  }

  async getUserInfo(token: string): Promise<User> {
    if (!token) {
      return null
    }
    const v = await getRedisVal(this.realToken(token))
    if (v) {
      return JSON.parse(v)
    }
    return null
  }

  async refreshToken(token: string, timeout = 60 * 60 * 24 * 7) {
    const user = this.getUserInfo(token)
    setRedisValue(this.realToken(token), JSON.stringify(user), timeout)
  }

  getVerifyCode(phone: string) {
    return getRedisVal(`${process.env.TOKEN_PREFIX}-code-${phone}`)
  }

  expiredVerifyCode(phone: string) {
    return expiredRedisKey(`${process.env.TOKEN_PREFIX}-code-${phone}`)
  }
}
