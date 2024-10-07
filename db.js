const knex = require("knex");
const knexfile = require("./knexfile");
const knexLite = require("./knexfile-sqlite");

const db = knex(knexfile.development);

const dbLite = knex(knexLite.development);

module.exports = { db, dbLite };
