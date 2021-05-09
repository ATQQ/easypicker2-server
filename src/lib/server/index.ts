import http from 'http'
// types
import {
  RuntimeErrorInterceptor,
  FWInterceptors,
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

  private beforeRuntimeErrorInterceptor: RuntimeErrorInterceptor

  private runtimeErrorInterceptor:RuntimeErrorInterceptor

  private async _catchRuntimeErrorFn(req:FWRequest, res:FWResponse, error:Error) {
    if (!res.writableEnded && this.beforeRuntimeErrorInterceptor) {
      await this.beforeRuntimeErrorInterceptor(req, res, error)
    }
    if (!res.writableEnded && this.runtimeErrorInterceptor) {
      await this.runtimeErrorInterceptor(req, res, error)
    }

    // 兜底处理
    if (!res.writableEnded) {
      res.fail(500, error.toString())
    }
  }

  private async _execMiddleware(req: FWRequest, res: FWResponse) {
    for (const middleware of this._middleWares) {
      // 已经执行request.end()
      if (res.writableEnded) {
        return
      }
      // 处理捕获运行时错误
      try {
        const p: any = middleware(req, res)
        if (p instanceof Promise) {
          await p
        }
      } catch (error) {
        await this._catchRuntimeErrorFn(req, res, error)
      }
    }
  }

  private addInterceptor(interceptorFun: () => Middleware) {
    return async function interceptor(req: FWRequest, res: FWResponse) {
      const _interceptor = interceptorFun()
      if (_interceptor && typeof _interceptor === 'function') {
        await _interceptor(req, res)
      }
    }
  }

  private _use(middleware: Middleware, position: MiddlewarePosition = 'last'): void {
    if (position === 'last') {
      this._middleWares.push(this.addInterceptor(() => middleware))
    }
    if (position === 'first') {
      this._middleWares.unshift(this.addInterceptor(() => middleware))
    }
  }

  constructor(afterRequestCallback?: Middleware, interceptors?:FWInterceptors) {
    super()
    // 初始化
    this._middleWares = []
    const {
      printReq, beforeMathRoute, beforeRunRoute, beforeReturnRuntimeError, catchRuntimeError,
    } = interceptors || {}
    this.beforeRuntimeErrorInterceptor = beforeReturnRuntimeError
    this.runtimeErrorInterceptor = catchRuntimeError
    // 打印请求信息
    this._use(printReq || printRequest)

    // 做一些默认操作
    this._use(defaultOperate)

    // 构造函数
    this._use(afterRequestCallback)

    // 包装request
    this._use(wrapperRequest)

    // 执行路由匹配前
    this._use(beforeMathRoute)
    // 路由匹配
    this._use(matchRoute.bind(this, this._routes))

    // 执行匹配的路由内部逻辑前
    this._use(beforeRunRoute)

    // 执行路由中的逻辑
    this._use(runRoute)

    this._server = http.createServer(this.callback())
  }

  /**
   * 处理原生的httpRequest 与 httpResponse
   */
  public use(middleware: Middleware): void {
    this._middleWares.unshift(this.addInterceptor(() => middleware))
  }

  public listen(port = PORT, hostname = HOSTNAME, callback?: () => void): void {
    this._server.listen(port, hostname, callback)
  }

  public callback() {
    return async (req: FWRequest, res: FWResponse) => {
      // default config
      this._execMiddleware(req, res)
    }
  }
}
