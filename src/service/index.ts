import QiniuService from './qiniuService'
import TaskInfoService from './taskInfoService'

export { default as BehaviorService } from './behaviorService'
export { default as TokenService } from './tokenService'
export { default as UserService } from './userService'
export { default as TaskService } from './taskService'
export { default as PublicService } from './publicService'

// TODO: 编译问题，暂时这样解决
export { QiniuService, TaskInfoService }
