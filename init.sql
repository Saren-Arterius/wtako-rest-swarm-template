CREATE EXTENSION IF NOT EXISTS "pgroonga";

DROP TABLE public.article;

CREATE TABLE public.article(
    id character varying(11) COLLATE pg_catalog."default" NOT NULL,
    title text COLLATE pg_catalog."default" NOT NULL,
    description text COLLATE pg_catalog."default" NOT NULL
);

CREATE INDEX article_pgroonga_idx ON article USING PGroonga((ARRAY[article.title, article.description]));

-- Populate data
INSERT INTO article (id, title, description) VALUES ('1', 'test title', 'text body');