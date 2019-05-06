const { expect } = require("chai");
const knex = require("knex");
const app = require("../src/app");
const { makeBookmarksArray } = require("./bookmarks.fixtures");

describe.only("Bookmarks Endpoints", function() {
  let db;

  before("make knex instance", () => {
    db = knex({
      client: "pg",
      connection: process.env.TEST_DB_URL
    });
    app.set("db", db);
  });

  after("disconnect from db", () => db.destroy());

  before("clean the table", () => db("bookmarks").truncate());

  afterEach("cleanup", () => db("bookmarks").truncate());

  describe(`Unauthorized requests`, () => {
    it(`responds with 401 Unauthorized for GET /bookmarks`, () => {
      return supertest(app)
        .get("/bookmarks")
        .expect(401, { error: "Unauthorized request" });
    });

    // it(`responds with 401 Unauthorized for POST /bookmarks`, () => {
    //   return supertest(app)
    //     .post('/bookmarks')
    //     .send({ title: 'test-title', url: 'http://some.thing.com', rating: 1 })
    //     .expect(401, { error: 'Unauthorized request' })
    // })

    it(`responds with 401 Unauthorized for GET /bookmarks/:id`, () => {
      const testBookmarks = makeBookmarksArray();
      const secondBookmark = testBookmarks[1];
      return supertest(app)
        .get(`/bookmarks/${secondBookmark.id}`)
        .expect(401, { error: "Unauthorized request" });
    });

    // it(`responds with 401 Unauthorized for DELETE /bookmarks/:id`, () => {
    //   const aBookmark = store.bookmarks[1]
    //   return supertest(app)
    //     .delete(`/bookmarks/${aBookmark.id}`)
    //     .expect(401, { error: 'Unauthorized request' })
    // })
  });

  describe(`GET /bookmarks`, () => {
    context(`Given no bookmarks`, () => {
      it(`responds with 200 and an empty list`, () => {
        return supertest(app)
          .get("/bookmarks  ")
          .set("Authorization", `Bearer ${process.env.API_TOKEN}`)
          .expect(200, []);
      });
    });
    context("Given there are bookmarks in the database", () => {
      const testBookmarks = makeBookmarksArray();

      beforeEach("insert bookmarks", () => {
        return db.into("bookmarks").insert(testBookmarks);
      });

      it("responds with 200 and all of the bookmarks", () => {
        return supertest(app)
          .get("/bookmarks")
          .set("Authorization", `Bearer ${process.env.API_TOKEN}`)
          .expect(200, testBookmarks);
      });
    });
  });

  describe(`GET /bookmakrs/:id`, () => {
    context(`Given no bookmarks`, () => {
      it(`responds with 404`, () => {
        const bookmarkId = 123456;
        return supertest(app)
          .get(`/bookmarks/${bookmarkId}`)
          .set("Authorization", `Bearer ${process.env.API_TOKEN}`)
          .expect(404, { error: { message: `Bookmark Not Found` } });
      });
    });

    context("Given there are bookmarks in the database", () => {
      const testBookmarks = makeBookmarksArray();

      beforeEach("insert bookmarks", () => {
        return db.into("bookmarks").insert(testBookmarks);
      });

      it("responds with 200 and the specified bookmark", () => {
        const bookmarkId = 2;
        const expectedBookmark = testBookmarks[bookmarkId - 1];
        return supertest(app)
          .get(`/bookmarks/${bookmarkId}`)
          .set("Authorization", `Bearer ${process.env.API_TOKEN}`)
          .expect(200, expectedBookmark);
      });
    });
  });
});
