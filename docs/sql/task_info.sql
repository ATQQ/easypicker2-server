create table task_info (
    id int auto_increment primary key,
    user_id int not null comment '关联user_id',
    task_key varchar(256) not null comment '关联任务的key',
    template varchar(512) null comment '模板文件名称',
    rewrite tinyint default 0 not null comment '自动重命名',
    format varchar(1024) null comment '文件名格式',
    info varchar(1024) null comment '提交必填的内容(表单)',
    ddl timestamp null comment '截止日期',
    share_key varchar(128) not null comment '用于分享的链接',
    limit_people tinyint default 0 not null comment '是否限制提交人员'
) comment '任务附加属性';