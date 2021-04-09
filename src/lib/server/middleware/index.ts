import { FWRequest, FWResponse, Route, Middleware } from '../types'
import nodeUrl from 'url'
import qs from 'query-string'
import { ServerOptions } from 'http'

export interface SuperRequest {
    query?: any
    body?: any
    params?: any
    buffer: Buffer
    route?: Route
}
interface CodeMsg {
    code: number
    msg: string
}

type reqJson = (data: unknown) => void
type reqNotFound = () => void
type reqSuccess = (data?: unknown) => void
type reqFail = (code: number, msg: string, data?: unknown) => void
type failWithError = (err: CodeMsg) => void


export interface SuperResponse {
    json?: reqJson
    notFound?: reqNotFound
    success?: reqSuccess
    fail?: reqFail
    failWithError?: failWithError
}


enum ContentType {
    formData = 'application/x-www-form-urlencoded',
    jsonData = 'application/json',
    multipart = 'multipart/form-data'
}

/**
 * 打印请求信息
 */
export function printRequest(req: FWRequest): void {
    const { method, url } = req
    const urlInfo = nodeUrl.parse(url)
    console.log(`${method} ${urlInfo.pathname}`)
}

export async function wrapperRequest(req: FWRequest): Promise<void> {
    requestQuery(req)
    req.body = await getBodyContent(req)
}

/**
 * 回调模板
 */
class Result {
    private code: number
    private data: unknown
    private msg: string
    constructor(code: number, errMsg: string, data?: unknown) {
        this.code = code
        this.data = data
        this.msg = errMsg
    }
}

export function expandHttpRespPrototype(http: ServerOptions): void {
    const resp: FWResponse = http.ServerResponse.prototype
    resp.notFound = function () {
        this.statusCode = 404
        this.setHeader('Content-Type', 'text/html;charset=utf-8')
        this.end('<h1>url not found</h1>')
    }

    resp.json = function (data) {
        if (!resp.writableEnded) {
            this.end(JSON.stringify(data))
        }
    }

    resp.success = function (data?) {
        this.json(new Result(0, 'ok', data))
    }

    resp.fail = function (code, msg, data) {
        this.json(new Result(code, msg, data))
    }

    resp.failWithError = function (err) {
        this.fail(err.code, err.msg)
    }
}

export function matchRoute(routes: Route[], req: FWRequest, res: FWResponse): void {
    const route = _matchRoute(routes, req)
    if (route) {
        req.route = route
        return
    }
    res.notFound()
}

export function runRoute(req: FWRequest, res: FWResponse): void {
    const { callback } = req.route || {}
    return callback && callback(req, res)
}

export function defaultOperate(req: FWRequest, res: FWResponse): void {
    res.setHeader('Content-Type', 'application/json;charset=utf-8')
}
function _matchRoute(routes: Route[], req: FWRequest): Route {
    const { method: reqMethod, url: reqPath } = req
    const route = routes.find(route => {
        const { path, method } = route
        // 方法不匹配
        if (reqMethod.toLowerCase() !== method) {
            return false
        }

        const { params, ok } = matchReqPath(path, nodeUrl.parse(reqPath).pathname)
        if (ok) {
            req.params = params
        }
        return ok
    })
    return route
}

/**
 * TODO: ddl 2020-1-10 待优化
 * 路由匹配
 */
function matchReqPath(path: string, reqPath: string) {
    const rParams = /\/:(\w+)/g
    // url参数组
    const paramsArr: string[] = []
    path = path.replace(rParams, function (all, p1) {
        paramsArr.push(p1)
        return '/(\\w+)'
    })
    let params = {}
    let ok = false
    // 处理路由开头没有/的情况
    const r = new RegExp(`^${path.startsWith('/') ? '' : '\/'}${path}$`)
    if (r.test(reqPath)) {
        reqPath.replace(r, function (...rest) {
            params = paramsArr.reduce((pre, cuur, cuurIndex) => {
                pre[cuur] = rest[cuurIndex + 1]
                return pre
            }, {})
            return rest[0]
        })
        ok = true
    }
    return {
        params,
        ok
    }
}

/**
 * 获取url参数
 */
function requestQuery(req: FWRequest): void {
    const { query } = nodeUrl.parse(req.url)
    Object.assign(req, { query: qs.parse(query) })
}

/**
 * 获取请求体
 */
function getBodyContent(req: FWRequest) {
    return new Promise((resolve, reject) => {
        let buffer = Buffer.alloc(0)

        req.on('data', chunk => {
            buffer = Buffer.concat([buffer, chunk])
        })

        req.on('end', () => {
            const contentType = req.headers['content-type'] || ''
            let data = {}
            try {
                switch (true) {
                    case contentType.includes(ContentType.formData):
                        data = qs.parse(buffer.toString('utf-8') || '{}')
                        break
                    case contentType.includes(ContentType.jsonData):
                        data = JSON.parse(buffer.toString('utf-8') || '{}')
                        break
                    // case contentType.includes(ContentType.multipart):
                    //     data = parseMultipartFromData(contentType, buffer.toString('utf-8'))
                    //     break
                    default:
                        data = buffer
                        break
                }
            } catch (error) {
                console.error(error)
                data = buffer
            } finally {
                req.buffer = buffer
                resolve(data)
            }
        })
    })
}



function parseMultipartFromData(contentType: string, data: string): any {
    if (!contentType.includes('multipart/form-data')) {
        throw 'not multipart/form-data'
    }
    const boundary = contentType.match(/boundary=(.*)/)[1]

    const formDatas = data.split('\n').filter(v => !v.includes(boundary))
    const res = formDatas.reduce((pre, v) => {
        if (v.startsWith('Content-Disposition')) {
            const reg = /name="(.*?)"/
            const key = v.match(reg)[1]
            const data = {
                key,
                value: null
            }
            if (key === 'file') {
                const filename = v.match(/filename="(.*?)"/)[1]
                pre.unshift({
                    key: 'filename',
                    value: filename
                })
            }
            pre.unshift(data)
        } else if (pre[0].value === null) {
            pre[0].value = ''
        } else {
            pre[0].value += `${v}\n`
        }
        return pre
    }, []).reduce((pre, current) => {
        const { key, value } = current
        pre[key] = value.replace(/\r|\n$/g, '')
        return pre
    }, {})
    return res
}