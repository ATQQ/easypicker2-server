#!/usr/bin/env zx

// user config
const originName = 'ep.test'
const serverName = 'ep-server'

// not care
const compressPkgName = `${originName}.tar.gz`
const user = 'root'
const origin = 'sugarat.top'
const fullOrigin = `${originName}.${origin}`
const baseServerDir = '/www/wwwroot'
const destDir = 'easypicker2-server'

await $`pnpm build`

await $`echo ==🔧 压缩==`
await $`tar -zvcf ${compressPkgName} dist`

await $`echo ==🚀 上传到服务器 ==`
await $`scp ${compressPkgName} ${user}@${origin}:./`
await $`rm -rf ${compressPkgName}`

await $`echo ==✅ 部署代码 ==`
if (destDir) {
    await $`ssh -p22 ${user}@${origin} "mkdir -p ${baseServerDir}/${fullOrigin}/${destDir}"`
}
await $`ssh -p22 ${user}@${origin} "tar -xf ${compressPkgName} -C ${baseServerDir}/${fullOrigin}/${destDir}"`

await $`echo ==🏆︎ 重启服务 ==`
await $`ssh -p22 ${user}@${origin} "pm2 restart ${serverName}"`