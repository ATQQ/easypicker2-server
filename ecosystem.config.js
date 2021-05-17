module.exports = {
    apps: [{
        name: 'easypicker2-test',
        script: 'src/server.ts',
        interpreter: './node_modules/.bin/ts-node',
        watch: false,
        ignore_watch:['upload','node_modules'],
        log_type: 'json',
        env: {
            NODE_ENV: 'development',
        },
        env_production: {
            NODE_ENV: 'production',
        }
    },
    ],
}
