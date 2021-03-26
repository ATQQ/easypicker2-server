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