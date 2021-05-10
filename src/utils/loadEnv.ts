// 读取配置的环境变量
import dotenv from 'dotenv'

function load(parseEnvObj) {
  const { parsed } = parseEnvObj
  if (parsed && parsed instanceof Object) {
    Object.getOwnPropertyNames(parsed).forEach((k) => {
      process.env[k] = parsed[k]
    })
  }
}

export default function loadEnv() {
  const baseDir = `${process.cwd()}/`
  // .env
  dotenv.config()
  // .env.local
  load(dotenv.config({ path: `${baseDir}.env.local` }))
  // .env.[mode].local
  load(dotenv.config({ path: `${baseDir}.env.${process.env.NODE_ENV}.local` }))
  // .env.[mode]
  load(dotenv.config({ path: `${baseDir}.env.${process.env.NODE_ENV}` }))
}
