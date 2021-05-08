import { IncomingMessage, ServerResponse } from 'http'
import { SuperRequest, SuperResponse } from '../middleware'

interface FWRequest extends IncomingMessage, SuperRequest { }

interface FWResponse extends ServerResponse, SuperResponse { }

type Middleware = (req: FWRequest, res?: FWResponse) => void
type MiddlewarePosition = 'first' | 'last'
type Callback = (req: FWRequest, res: FWResponse) => void

interface Route {
    method: Method
    path: string
    callback: Callback
    options?: any
}

type Method = 'get' | 'post' | 'put' | 'delete' | 'option'

type Controller = (path: string, callback: Callback, options?: any) => void
type RuntimeErrorInterceptor = (req: FWRequest, res: FWResponse, err:Error)=>void

interface FWInterceptors{
    /**
     * 打印Request获取到的是原生的HttpRequest
     */
    printReq?:(req:FWRequest)=>void
    /**
     * 执行路由匹配前，获取到的是包装后的req与res
     */
    beforeMathRoute?:Middleware
    /**
     * 执行路由内部逻辑之前
     */
    beforeRunRoute?:Middleware
    /**
     * 捕获运行错误，返回错误信息之前
     */
    beforeReturnRuntimeError?:RuntimeErrorInterceptor
    /**
     * 处理运行时捕获的错误
     */
    catchRuntimeError?:RuntimeErrorInterceptor
}
