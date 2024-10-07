const { db, dbLite } = require("./db");

// db.count("*")
//   .from("users")
//   .then((count) => {
//     console.log(count);
//   });

// db.count("*").from("questions").then(console.log);

// 1st - obtain user_id from email
// 2nd - obtain user_settings from user_id
// 3rd - obtain all questions filtering by user_settings default_visibility

const runTest = async (queryFunc, dbInstance, iterations = 1) => {
  const dbType = dbInstance === dbLite ? "DbLite" : "Postgres";
  console.log(`Running test - ${queryFunc.name} with ${dbType}...`);
  const startTime = Date.now();
  for (let i = 0; i < iterations; i++) {
    await queryFunc(dbInstance);
  }
  const endTime = Date.now();
  return endTime - startTime;
};

const threeQueries = async (dbInstance) => {
  // const startTime = performance.now();

  // Select * from users where email = ''
  const user = await dbInstance("users")
    .where({ email: "ec899bd6-d3c5-4ef6-ac92-e6ec94f2e39d@example.com" })
    .first();

  // Select * from user_settings where user_id = ''
  const settings = await dbInstance("user_settings")
    .where({ user_id: user.id })
    .first();

  // Select * from questions where user_id = '' and visibility = '' or visibility is null
  // Case when default_visibility is public then get all questions with visibility public or null
  // Case when default_visibility is not public then get all questions with visibility public
  let questionsQuery = dbInstance("questions").where({ user_id: user.id });
  if (settings.default_visibility === "public") {
    questionsQuery = questionsQuery.andWhere(function (builder) {
      builder.where("visibility", "public").orWhereNull("visibility");
    });
  } else {
    questionsQuery = questionsQuery.andWhere("visibility", "public");
  }
  const questions = await questionsQuery;

  // const endTime = performance.now();
  // console.log(`Execution time: ${endTime - startTime} milliseconds`);

  return questions;
};

const oneQuery = async (dbInstance) => {
  // const startTime = performance.now();

  const questions = await dbInstance("questions as q")
    .join("users as u", "q.user_id", "u.id") // Join users table
    .join("user_settings as us", "u.id", "us.user_id") // Join user_settings table
    .where("u.email", "ec899bd6-d3c5-4ef6-ac92-e6ec94f2e39d@example.com") // Filter by email
    .andWhere(function () {
      // Begin WHERE clause grouping
      this.where("q.visibility", "public") // q.visibility = 'public'
        .orWhere(function () {
          // Begin OR condition grouping
          this.where("us.default_visibility", "public") // us.default_visibility = 'public'
            .whereNull("q.visibility"); // AND q.visibility IS NULL
        });
    })
    .select("q.*"); // Select all columns from questions (q)

  /*
        SELECT q.*
        FROM users u
        JOIN user_settings us ON u.id = us.user_id
        JOIN questions q ON q.user_id = u.id
        WHERE u.email = 'ec899bd6-d3c5-4ef6-ac92-e6ec94f2e39d@example.com'
        AND (
            q.visibility = 'public'
            OR (us.default_visibility = 'public' AND q.visibility IS NULL)
        );
*/

  // const endTime = performance.now();
  // // console.log(`Execution time: ${endTime - startTime} milliseconds`);
  //   console.log(questions);
  return questions;
};

const runConcurrentTests = async (
  queryFunc,
  dbInstance,
  concurrency,
  iterations = 1
) => {
  const dbType = dbInstance === dbLite ? "DbLite" : "Postgres";
  console.log(
    `Running concurrent test - ${queryFunc.name} with ${dbType}, concurrency: ${concurrency}...`
  );
  const startTime = Date.now();

  const promises = Array(concurrency)
    .fill()
    .map(() => runTest(queryFunc, dbInstance, iterations));
  await Promise.all(promises);

  const endTime = Date.now();
  return endTime - startTime;
};

const runTests = async () => {
  console.log(
    "Three queries for a search with sqlite:",
    await runTest(threeQueries, dbLite),
    "milliseconds"
  );
  console.log(
    "10 Three queries for a search with sqlite:",
    await runTest(threeQueries, dbLite, 10),
    "milliseconds"
  );
  console.log("\n------------\n");
  console.log(
    "1 Three queries with postgres:",
    await runTest(threeQueries, db),
    "milliseconds"
  );
  console.log(
    "10x three queries with postgres:",
    await runTest(threeQueries, db, 10),
    "milliseconds"
  );

  console.log(
    "\n1 oneQuery with sqlite:",
    await runTest(oneQuery, dbLite),
    "milliseconds"
  );
  console.log(
    "10x oneQuery with sqlite:",
    await runTest(oneQuery, dbLite, 10),
    "milliseconds"
  );
  console.log(
    "1 oneQuery with postgres:",
    await runTest(oneQuery, db),
    "milliseconds"
  );
  console.log(
    "10x oneQuery with postgres:",
    await runTest(oneQuery, db, 10),
    "milliseconds"
  );

  console.log("\n--- Concurrent Tests ---\n");

  console.log(
    "5 concurrent threeQueries with sqlite (1 iteration each):",
    await runConcurrentTests(threeQueries, dbLite, 5),
    "milliseconds"
  );

  console.log(
    "5 concurrent threeQueries with postgres (1 iteration each):",
    await runConcurrentTests(threeQueries, db, 5),
    "milliseconds"
  );

  console.log(
    "5 concurrent oneQuery with sqlite (1 iteration each):",
    await runConcurrentTests(oneQuery, dbLite, 5),
    "milliseconds"
  );

  console.log(
    "5 concurrent oneQuery with postgres (1 iteration each):",
    await runConcurrentTests(oneQuery, db, 5),
    "milliseconds"
  );

  console.log(
    "10 concurrent threeQueries with sqlite (5 iterations each):",
    await runConcurrentTests(threeQueries, dbLite, 10, 5),
    "milliseconds"
  );

  console.log(
    "10 concurrent threeQueries with postgres (5 iterations each):",
    await runConcurrentTests(threeQueries, db, 10, 5),
    "milliseconds"
  );

  console.log(
    "10 concurrent oneQuery with sqlite (5 iterations each):",
    await runConcurrentTests(oneQuery, dbLite, 10, 5),
    "milliseconds"
  );

  console.log(
    "10 concurrent oneQuery with postgres (5 iterations each):",
    await runConcurrentTests(oneQuery, db, 10, 5),
    "milliseconds"
  );
};

runTests();
