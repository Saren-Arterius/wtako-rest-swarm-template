-- Desired operator
select *, pgroonga_score(article.tableoid, article.ctid) AS score from "article" where ARRAY[article.title, article.description] &@~ ('test', ARRAY[10, 1], 'article_pgroonga_idx')::pgroonga_full_text_search_condition order by "score" desc limit 10;
-- Alt operator
select * from "article" where ARRAY[article.title, article.description] &@ ('test', ARRAY[10, 1], 'article_pgroonga_idx')::pgroonga_full_text_search_condition limit 10;