const path = require("path");
const express = require("express");
const logger = require("../logger");
const xss = require("xss");
const BookmarksService = require("./bookmarks-service");

const bookmarksRouter = express.Router();
const bodyParser = express.json();
const { isWebUri } = require("valid-url");

const serializeBookmark = bookmark => ({
  id: bookmark.id,
  title: xss(bookmark.title),
  url: bookmark.url,
  description: xss(bookmark.description),
  rating: Number(bookmark.rating)
});

bookmarksRouter
  .route("/")
  .get((req, res, next) => {
    const knexInstance = req.app.get("db");
    BookmarksService.getAllBookmarks(knexInstance)
      .then(bookmarks => {
        res.json(bookmarks.map(serializeBookmark));
      })
      .catch(next);
  })
  .post(bodyParser, (req, res, next) => {
    const knexInstance = req.app.get("db");
    for (const field of ["title", "url", "rating"]) {
      if (!req.body[field]) {
        logger.error(`${field} is required`);
        return res.status(400).send({
          error: { message: `'${field}' is required` }
        });
      }
    }

    const { title, url, description, rating } = req.body;

    if (!Number.isInteger(rating) || rating < 0 || rating > 5) {
      logger.error(`Invalid rating '${rating}' supplied`);
      return res.status(400).send({
        error: { message: `'rating' must be a number between 0 and 5` }
      });
    }

    if (!isWebUri(url)) {
      logger.error(`Invalid url '${url}' supplied`);
      return res.status(400).send({
        error: { message: `'url' must be a valid URL` }
      });
    }

    const newBookmark = { title, url, description, rating };

    BookmarksService.insertBookmark(knexInstance, newBookmark)
      .then(bookmark => {
        logger.info(`Bookmark with id ${bookmark.id} created.`);
        res
          .status(201)
          .location(path.posix.join(req.originalUrl, `/${bookmark.id}`))
          .json(serializeBookmark(bookmark));
      })
      .catch(next);
  });

bookmarksRouter
  .route("/:bookmark_id")
  .all((req, res, next) => {
    const { bookmark_id } = req.params;
    BookmarksService.getById(req.app.get("db"), bookmark_id)
      .then(bookmark => {
        if (!bookmark) {
          logger.error(`Bookmark with id ${bookmark_id} not found.`);
          return res.status(404).json({
            error: { message: `Bookmark Not Found` }
          });
        }
        res.bookmark = bookmark;
        next();
      })
      .catch(next);
  })
  .get((req, res) => {
    res.json(serializeBookmark(res.bookmark));
  })
  .delete((req, res, next) => {
    const { bookmark_id } = req.params;
    BookmarksService.deleteBookmark(req.app.get("db"), bookmark_id)
      .then(numRowsAffected => {
        logger.info(`Bookmark with id ${bookmark_id} deleted.`);
        res.status(204).end();
      })
      .catch(next);
  })
  .patch(bodyParser, (req, res, next) => {
    const { title, url, rating, description } = req.body;
    const bookmarkToUpdate = { title, url, rating, description };

    const numberOfValues = Object.values(bookmarkToUpdate).filter(Boolean)
      .length;
    if (numberOfValues === 0) {
      return res.status(400).json({
        error: {
          message: `Request body must contain either 'title', 'url' or 'rating'`
        }
      });
    }

    if ((rating && !Number.isInteger(rating)) || rating < 0 || rating > 5) {
      logger.error(`Invalid rating '${rating}' supplied`);
      return res.status(400).send({
        error: { message: `'rating' must be a number between 0 and 5` }
      });
    }

    if (url && !isWebUri(url)) {
      logger.error(`Invalid url '${url}' supplied`);
      return res.status(400).send({
        error: { message: `'url' must be a valid URL` }
      });
    }

    BookmarksService.updateBookmark(
      req.app.get("db"),
      req.params.bookmark_id,
      bookmarkToUpdate
    )
      .then(numRowsAffected => {
        res.status(204).end();
      })
      .catch(next);
  });

module.exports = bookmarksRouter;
