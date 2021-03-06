create table bookmarks (
  id INTEGER PRIMARY KEY GENERATED BY DEFAULT AS IDENTITY
  (START WITH 1 INCREMENT BY 1),
  title TEXT UNIQUE NOT NULL,
  url TEXT UNIQUE NOT NULL,
  description TEXT,
  rating INTEGER NOT NULL
);