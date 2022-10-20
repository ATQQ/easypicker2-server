const cyanColor = (str) =>`[36m${str}[39m`
try {
    const userData = require('./user-config.json')
    const type = process.argv[2]
    if(!type){
        console.log(`你应该在执行脚本后添加 ${cyanColor('<type>')} 参数，支持如下值`);
        console.log([...new Set(userData.map(v=>v.type))]);
        console.log('例如',cyanColor('curl https://script.sugarat.top/js/ep/user-config.js | node - server'));
        process.exit(1)
    }
    const getTypeObj = (type) => userData
        .filter(v => v.type === type)
        .reduce((pre, cur) => {
            pre[cur.key] = cur.value
            return pre
        }, {})
    console.table(getTypeObj(type));
} catch (error) {
    console.log('❌', '执行目录不正确，请确保在 easypicker2-server 目录下执行');
    console.log('❌', '该目录下不存在 user-config.json 文件');
}