exports.up = function (knex) {
  return (
    knex.schema
      // Create 'users' table
      .createTable("users", function (table) {
        table.increments("id"); // id INTEGER PRIMARY KEY AUTOINCREMENT
        table.string("name").notNullable(); // name TEXT NOT NULL
        table.string("email").notNullable().unique(); // email TEXT NOT NULL UNIQUE
      })
      // Create 'questions' table
      .createTable("questions", function (table) {
        table.increments("id"); // id INTEGER PRIMARY KEY AUTOINCREMENT
        table.text("question").notNullable(); // question TEXT NOT NULL
        table.text("answer"); // answer TEXT
        table.string("visibility").defaultTo(null); // visibility TEXT DEFAULT NULL
        table
          .integer("user_id")
          .unsigned()
          .references("id")
          .inTable("users")
          .onDelete("SET NULL"); // FOREIGN KEY (user_id) REFERENCES users(id)
        table.timestamp("created_at").defaultTo(knex.fn.now()); // created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        table.timestamp("updated_at").defaultTo(knex.fn.now()); // updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      })
      // Create 'user_settings' table
      .createTable("user_settings", function (table) {
        table
          .integer("user_id")
          .unsigned()
          .primary()
          .references("id")
          .inTable("users")
          .onDelete("CASCADE"); // user_id INTEGER PRIMARY KEY, FOREIGN KEY
        table.string("default_visibility"); // default_visibility TEXT
        table.string("profile_handle"); // profile_handle TEXT
      })
  );
};

exports.down = function (knex) {
  return knex.schema
    .dropTableIfExists("user_settings")
    .dropTableIfExists("questions")
    .dropTableIfExists("users");
};
