// 编译后的绝对路径映射插件
// 下面这行从package.json读取配置
// import 'module-alias/register'
import moduleAlias from 'module-alias'

function loadModuleAlias() {
  moduleAlias.addAliases({
    '@': `${__dirname}/../`
  })
}

export default loadModuleAlias()
