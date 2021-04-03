module.exports = {
    apps: [{
        name: 'easypicker2-test',
        script: 'src/server.ts',
        interpreter: './node_modules/.bin/ts-node',
        watch: '.',
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
