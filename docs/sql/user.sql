create table user (
    id int auto_increment comment '唯一标识' primary key,
    account varchar(64) null comment '用于登录的账号',
    phone varchar(22) null comment '手机号',
    password varchar(256) not null comment '密码',
    power tinyint default 6 not null comment '账户权限',
    status tinyint default 0 not null comment '账户权限',
    join_time timestamp default CURRENT_TIMESTAMP not null comment '注册时间',
    login_time timestamp null comment '最后登录时间',
    login_count int default 1 not null comment '登陆次数',
    open_time timestamp null comment '解封时间',
    constraint user_account_uindex unique (account),
    constraint user_phone_uindex unique (phone)
) comment '用户表';