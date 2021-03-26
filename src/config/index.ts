export const serverConfig = {
    port: +process.env.PORT,
    hostname: 'localhost'
}

// // 判断环境
// if (process.env.NODE_ENV && process.env.NODE_ENV !== 'development') {
//     config = proConfig
// }

// 开发环境的测试数据库
export const mysqlConfig = {
    host: process.env.MYSQL_DB_HOST,
    port: +process.env.MYSQL_DB_PORT,
    database: process.env.MYSQL_DB_NAME,
    user: process.env.MYSQL_DB_USER,
    password: process.env.MYSQL_DB_PWD
}

export const mongodbConfig = {
    host: process.env.MONGO_DB_HOST,
    port: +process.env.MONGO_DB_PORT,
    database: process.env.MONGO_DB_NAME,
    user: process.env.MONGO_DB_USER,
    password: process.env.MONGO_DB_PWD
}

export const redisConfig = {
    host: process.env.REDIS_DB_HOST,
    port: +process.env.REDIS_DB_PORT,
}

// 通过环境变量注入
const { QINIU_ACCESS_KEY, QINIU_SECRET_KEY } = process.env

export const qiniuConfig = {
    accessKey: QINIU_ACCESS_KEY,
    secretKey: QINIU_SECRET_KEY
}