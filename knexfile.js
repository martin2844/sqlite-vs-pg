module.exports = {
  development: {
    client: "pg", // Using PostgreSQL client
    connection: {
      host: "localhost", // PostgreSQL server host
      port: 5432, // PostgreSQL server port
      user: "postgres", // PostgreSQL user
      password: "mysecretpassword", // PostgreSQL password (hardcoded)
      database: "mydatabase", // PostgreSQL database name (hardcoded)
    },
    migrations: {
      directory: "./migration",
    },
    seeds: {
      directory: "./seeds",
    },
  },
};
