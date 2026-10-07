begin;
create extension if not exists pgtap with schema extensions;

select plan(3);

select col_type_is('public', 'babies', 'sex', 'baby_sex', 'babies record a sex');
select col_is_null('public', 'babies', 'sex', 'sex is optional');
select enum_has_labels('public', 'baby_sex', array['female', 'male'], 'sex is female or male');

select * from finish();
rollback;
