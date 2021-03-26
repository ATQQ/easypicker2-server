import { encryption } from './stringUtil'
import storage from './storageUtil'
import { User } from '@/db/modal'
/**
 * Token(身份令牌)工具类
 */
class TokenUtil {

    /**
     * 生成token
     */
    createToken(user: User, timeout = 60 * 60 * 24) {
        const { username } = user
        const token = encryption([username, Date.now()].join())
        storage.setItem(token, {
            user,
            updateDate: Date.now()
        }, timeout)
        return token
    }

    expiredToken(token: string) {
        storage.expireItem(token)
    }

    getUserInfo(token: string) {
        return storage.getItem(token)?.value?.user
    }

    static instance: TokenUtil = null
    static getInstance() {
        if (!this.instance) {
            this.instance = new TokenUtil()
        }
        return this.instance
    }
}

export default TokenUtil.getInstance()