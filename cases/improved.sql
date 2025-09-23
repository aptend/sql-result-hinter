create database if not exists db;

use db;

drop table if exists t;

create table t(a int,  b int, primary key (a, b));

insert into t values (1, 1), (1, 1), (2, 2);
| @regex(pattern=r"Duplicate entry '(1, 1)' for key '(.*)'");
   
select mo_ctl('dn', 'flush', 'db.t');

drop database if exists db;

select 
    current_account_name(),
    current_account_id()
;


select current_user_name();
select current_user_id();
select current_role_name();
select current_role_id();
select * from current_account() as t; -- test table function

drop account if exists abc;
create account abc ADMIN_NAME 'admin' IDENTIFIED BY '123456';


-- the following test commands will be executed in session 1
@session(id=1, user="abc:admin", password="123456") {
    drop role if exists test_role;
    create role test_role;
    grant test_role to admin;
    set role test_role;

    select current_account_name();
    select current_user_name();
    select current_user_id();
    select current_role_name();
}

-- if https://github.com/matrixorigin/matrixone/issues/24424 is not fixed
-- the following test commands will be ignored
@issue(no=24424) { 
    select "WARN: this line should be executed, issue#24424 is not fixed";
}

-- test sleep 5 seconds
@sleep(5);


select current_user_id();
select current_role_name();
select current_role_id();

