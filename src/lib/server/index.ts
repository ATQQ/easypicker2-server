import http from 'http'
// types
import {
  FWRequest, FWResponse, Middleware, MiddlewarePosition,
} from './types'

// router
import Router from '../Router'

// 自带中间件
import {
  defaultOperate, expandHttpRespPrototype, matchRoute, runRoute, printRequest, wrapperRequest,
} from './middleware'

const PORT = 3000
const HOSTNAME = 'localhost'

// 拓展httpResponse的原型
expandHttpRespPrototype(http)

export default class FW extends Router {
    private _server: http.Server

    private _middleWares: Middleware[]

    private async _execMiddleware(req: FWRequest, res: FWResponse) {
      for (const middleware of this._middleWares) {
        // 已经执行request.end()
        if (res.writableEnded) {
          return
        }
        try {
          const p: any = middleware(req, res)
          if (p instanceof Promise) {
            p.catch((error) => {
              res.fail(500, error.toString())
            })
            await p
          }
        } catch (error) {
          if (!res.writableEnded) {
            res.fail(500, error.toString())
          }
        }
      }
    }

    public interceptor: Middleware

    constructor(afterRequestCallback?: Middleware, beforeRouteCallback?: Middleware) {
      super()
      // 初始化
      this._middleWares = []

      // 通过各种中间件包装req与res
      // 通过中间件对请求进行处理
      if (afterRequestCallback) {
        this.use(afterRequestCallback)
      }
      this.use(defaultOperate)
      // 包装request
      this.use(wrapperRequest)
      // 打印请求信息
      this.use(printRequest)
      // 路由匹配
      this.use(matchRoute.bind(this, this._routes))
      // beforeRunRouteInterceptor
      if (beforeRouteCallback) {
        this.use(beforeRouteCallback)
      }
      // 执行路由中的逻辑
      this.use(runRoute)
      this._server = http.createServer(async (req: FWRequest, res: FWResponse) => {
        // default config
        // 拦截器
        if (this.interceptor) {
          await this.interceptor(req, res)
        }
        this._execMiddleware(req, res)
      })
    }

    /**
     * TODO: ddl 2021-1-12 考虑声明周期？
     * @param middleware 中间件函数
     */
    public use(middleware: Middleware, position: MiddlewarePosition = 'last'): void {
      if (position === 'last') {
        this._middleWares.push(middleware)
      }
      if (position === 'first') {
        this._middleWares.unshift(middleware)
      }
    }

    public listen(port = PORT, hostname = HOSTNAME, callback?: () => void): void {
      console.log(this._routes)
      this._server.listen(port, hostname, callback)
    }
}
