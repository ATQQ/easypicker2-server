# node-server

## 简介
适用于中小型web应用,demo演示等等的服务端开发脚手架

基于node+ts实现,不依赖第三方Web服务端框架

开箱即用
## 快速食用
1. 克隆仓库到本地
```sh
git clone https://github.com/ATQQ/node-server.git
```

2. 进入目录
```sh
cd node-server
```

3. 安装相关依赖
```sh
yarn install
```

4. 启动项目
```sh
# -------prod--------
npm run start
# or
yarn start

# -------dev--------
npm run dev
# or
yarn dev
```
---

## 自定义实现
* [x] router(路由)
* [x] localStorage(本地存储)
* [x] tokenUtil
* [x] 拦截器
  * [x] 全局拦截
  * [x] 路由拦截
* [x] 单元测试 - jest
* [x] 数据库方法包装
  * [x] mysql
  * [x] redis
  * [x] mongodb

## 数据库相关
* [x] mysql:完成基本配置与测试用例的编写
* [x] redis
* [x] mongodb
* ...

## 错误处理
* 运行时的错误
  * [x] 同步
  * [x] Promise rejection
  * [x] async await

## 目录简介

```sh
src
├── config            # 配置文件
│   └── index.ts
├── constants         # 常量
│   ├── dbModalParam.ts
│   ├── errorMsg.ts
│   └── index.ts
├── db                # 数据库操作
│   ├── modal
│   │   └── index.ts
│   └── userDb.ts
├── lib               # 自己封装的模块
│   ├── dbConnect     # 链接数据库
│   │   └── mysql.ts  # mysql
│   ├── README.md     
│   ├── Router        # 路由
│   │   └── index.ts
│   └── server        # 服务框架
│       ├── index.ts
│       ├── middleware
│       │   └── index.ts
│       └── types
│           └── index.d.ts
├── middleware              # 中间件
│   ├── index.ts
│   ├── routeInterceptor.ts # 路由拦截
│   └── serverInterceptor.ts  # 全局拦截
├── routes              # 路由
│   ├── index.ts          # 对外统一暴露
│   └── modules 
│       └── test.ts     # 各个子模块
├── server.ts           # 入口启动文件
└── utils               # 工具方法
    ├── qiniuUtil.ts
    ├── randUtil.ts
    ├── regExp.ts
    ├── storageUtil.ts
    ├── stringUtil.ts
    └── tokenUtil.ts
```
