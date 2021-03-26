/**
 * 用户权限
 */
export enum UserPower {
    /**
     * 管理员(注册用户均为管理员)
     */
    admin = 6,

    /**
     * 超级管理员
     */
    superAdmin = 0
}

/**
 * 用户状态
 */
export enum UserStatus {
    /**
     * 正常
     */
    normal = 1,
    /**
     * 冻结
     */
    freeze = 0
}

export interface User {
    /**
     * 主键
     */
    id: number
    /**
     * 用户名
     */
    username: string
    /**
     * 密码
     */
    password: string
    /**
     * 用户状态
     */
    status: UserStatus
    /**
     * 用户权限
     */
    power: UserPower
    /**
     * 注册日期
     */
    date: number
    /**
     * 手机号
     */
    mobile?: string
}

export interface TestModal {
    _id?: unknown
    username?: string
    pwd?: string
}