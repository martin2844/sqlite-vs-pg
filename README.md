# Performance Comparison: SQLite vs. PostgreSQL

This document summarizes the performance tests conducted to compare SQLite and PostgreSQL using two query strategies: executing multiple simple queries versus a single complex query. The tests also include concurrency to simulate real-world scenarios where multiple queries run simultaneously.

## Table of Contents

1. [Introduction](#introduction)
2. [Test Setup](#test-setup)
   - [Database Instances](#database-instances)
   - [Query Functions](#query-functions)
   - [Test Execution Functions](#test-execution-functions)
3. [Code Samples](#code-samples)
   - [Multiple Simple Queries (`threeQueries`)](#multiple-simple-queries-threequeries)
   - [Single Complex Query (`oneQuery`)](#single-complex-query-onequery)
4. [Test Results](#test-results)
   - [Sequential Tests](#sequential-tests)
   - [Concurrent Tests](#concurrent-tests)
5. [Analysis](#analysis)
   - [Sequential Query Execution](#sequential-query-execution)
   - [Concurrent Query Execution](#concurrent-query-execution)
6. [Key Takeaways](#key-takeaways)
7. [Conclusion](#conclusion)

---

## Introduction

The performance of database operations can significantly impact application responsiveness and scalability. This study compares the performance of SQLite and PostgreSQL by executing:

- **Multiple Simple Queries**: Executing three separate queries sequentially.
- **Single Complex Query**: Combining the three operations into one query using joins.

Additionally, the tests introduce concurrency to simulate multiple users accessing the database simultaneously.

---

## Test Setup

### Database Instances

- **`db`**: Represents the PostgreSQL database connection.
- **`dbLite`**: Represents the SQLite database connection.

Both connections are managed using [Knex.js](http://knexjs.org/), a SQL query builder for Node.js.

### Query Functions

#### `threeQueries`

Performs three sequential queries:

1. **Fetch User by Email**:

   ```javascript
   const user = await dbInstance("users")
     .where({ email: "user@example.com" })
     .first();
   ```

2. **Fetch User Settings**:

   ```javascript
   const settings = await dbInstance("user_settings")
     .where({ user_id: user.id })
     .first();
   ```

3. **Fetch Questions Based on Settings**:

   ```javascript
   let questionsQuery = dbInstance("questions").where({ user_id: user.id });
   if (settings.default_visibility === "public") {
     questionsQuery = questionsQuery.andWhere(function (builder) {
       builder.where("visibility", "public").orWhereNull("visibility");
     });
   } else {
     questionsQuery = questionsQuery.andWhere("visibility", "public");
   }
   const questions = await questionsQuery;
   ```

#### `oneQuery`

Combines the three operations into a single complex query with joins:

```javascript
const questions = await dbInstance("questions as q")
  .join("users as u", "q.user_id", "u.id")
  .join("user_settings as us", "u.id", "us.user_id")
  .where("u.email", "user@example.com")
  .andWhere(function () {
    this.where("q.visibility", "public").orWhere(function () {
      this.where("us.default_visibility", "public").whereNull("q.visibility");
    });
  })
  .select("q.*");
```

**Equivalent SQL Query**:

```sql
SELECT q.*
FROM users u
JOIN user_settings us ON u.id = us.user_id
JOIN questions q ON q.user_id = u.id
WHERE u.email = 'user@example.com'
  AND (q.visibility = 'public' OR (us.default_visibility = 'public' AND q.visibility IS NULL));
```

### Test Execution Functions

#### `runTest`

Executes a given query function on a database instance for a specified number of iterations:

```javascript
const runTest = async (queryFunc, dbInstance, iterations = 1) => {
  const startTime = Date.now();
  for (let i = 0; i < iterations; i++) {
    await queryFunc(dbInstance);
  }
  const endTime = Date.now();
  return endTime - startTime;
};
```

#### `runConcurrentTests`

Runs multiple instances of `runTest` concurrently to simulate concurrent database access:

```javascript
const runConcurrentTests = async (
  queryFunc,
  dbInstance,
  concurrency,
  iterations = 1
) => {
  const startTime = Date.now();

  const promises = Array(concurrency)
    .fill()
    .map(() => runTest(queryFunc, dbInstance, iterations));
  await Promise.all(promises);

  const endTime = Date.now();
  return endTime - startTime;
};
```

---

## Code Samples

### Multiple Simple Queries (`threeQueries`)

**JavaScript Implementation**:

```javascript
const user = await dbInstance("users")
  .where({ email: "user@example.com" })
  .first();

const settings = await dbInstance("user_settings")
  .where({ user_id: user.id })
  .first();

let questionsQuery = dbInstance("questions").where({ user_id: user.id });
if (settings.default_visibility === "public") {
  questionsQuery = questionsQuery.andWhere(function (builder) {
    builder.where("visibility", "public").orWhereNull("visibility");
  });
} else {
  questionsQuery = questionsQuery.andWhere("visibility", "public");
}
const questions = await questionsQuery;
```

### Single Complex Query (`oneQuery`)

**JavaScript Implementation**:

```javascript
const questions = await dbInstance("questions as q")
  .join("users as u", "q.user_id", "u.id")
  .join("user_settings as us", "u.id", "us.user_id")
  .where("u.email", "user@example.com")
  .andWhere(function () {
    this.where("q.visibility", "public").orWhere(function () {
      this.where("us.default_visibility", "public").whereNull("q.visibility");
    });
  })
  .select("q.*");
```

**Equivalent SQL Query**:

```sql
SELECT q.*
FROM users u
JOIN user_settings us ON u.id = us.user_id
JOIN questions q ON q.user_id = u.id
WHERE u.email = 'user@example.com'
  AND (q.visibility = 'public' OR (us.default_visibility = 'public' AND q.visibility IS NULL));
```

---

## Test Results

### Sequential Tests

**1. Three Queries - Single Iteration**

- **SQLite**: 365 ms
- **PostgreSQL**: 307 ms

**2. Three Queries - 10 Iterations**

- **SQLite**: 3,269 ms
- **PostgreSQL**: 2,171 ms

**3. One Query - Single Iteration**

- **SQLite**: 419 ms
- **PostgreSQL**: 142 ms

**4. One Query - 10 Iterations**

- **SQLite**: 4,351 ms
- **PostgreSQL**: 1,352 ms

### Concurrent Tests

**5. 5 Concurrent `threeQueries` - 1 Iteration Each**

- **SQLite**: 1,650 ms
- **PostgreSQL**: 535 ms

**6. 5 Concurrent `oneQuery` - 1 Iteration Each**

- **SQLite**: 2,160 ms
- **PostgreSQL**: 446 ms

**7. 10 Concurrent `threeQueries` - 5 Iterations Each**

- **SQLite**: 16,401 ms
- **PostgreSQL**: 2,454 ms

**8. 10 Concurrent `oneQuery` - 5 Iterations Each**

- **SQLite**: 22,921 ms
- **PostgreSQL**: 2,722 ms

---

## Analysis

### Sequential Query Execution

- **SQLite**:
  - Performs reasonably well with sequential, simple queries.
  - Shows slower performance with complex queries (`oneQuery`), likely due to less advanced query optimization.
- **PostgreSQL**:
  - Outperforms SQLite in both simple and complex queries.
  - Excels with complex queries, leveraging its advanced query planner and optimizer.

### Concurrent Query Execution

- **SQLite**:
  - Performance degrades significantly with increased concurrency.
  - Uses file-level locking, which restricts concurrent access and leads to contention.
- **PostgreSQL**:
  - Handles concurrency efficiently due to its architecture designed for multi-user environments.
  - Employs Multi-Version Concurrency Control (MVCC) to allow simultaneous read and write operations without significant performance loss.

---

## Key Takeaways

1. **Database Selection Matters**:
   - **SQLite** is suitable for applications with low concurrency and simple queries.
   - **PostgreSQL** is ideal for applications requiring high concurrency and complex query execution.

2. **Concurrency Handling**:
   - **SQLite**'s file-level locking hampers performance under concurrent access.
   - **PostgreSQL** efficiently manages multiple simultaneous connections and queries.

3. **Query Optimization**:
   - Complex queries are better optimized in PostgreSQL, resulting in improved performance.
   - In SQLite, breaking complex operations into simpler queries may yield better results.

4. **Scalability**:
   - **SQLite** struggles to scale under high concurrency and workload.
   - **PostgreSQL** maintains consistent performance and scales effectively.

5. **Application Design Implications**:
   - Tailor your database choice and query strategies to the needs of your application.
   - For high-performance, concurrent applications, prefer databases like PostgreSQL.

6. **Testing and Monitoring**:
   - Regularly test and monitor database performance under realistic conditions.
   - Use empirical data to guide optimization efforts.

---

## Conclusion

The tests demonstrate that PostgreSQL significantly outperforms SQLite in both sequential and concurrent scenarios, especially when executing complex queries. PostgreSQL's ability to handle high concurrency and optimize complex queries makes it the preferred choice for applications that demand performance and scalability.

**Recommendations**:

- **For High-Concurrency Applications**:
  - Use PostgreSQL or similar enterprise-grade databases.
  - Optimize queries to reduce round trips and leverage database optimizers.

- **For Low-Concurrency Applications**:
  - SQLite remains a viable option for simple, single-user applications.
  - Keep queries straightforward to maintain optimal performance.

**Next Steps**:

- **Profile Your Application**:
  - Identify bottlenecks in database interactions.
  - Analyze query execution plans.

- **Optimize Database Schema**:
  - Ensure proper indexing on frequently queried columns.
  - Normalize or denormalize tables as appropriate for performance.

- **Implement Connection Pooling**:
  - Efficiently manage database connections to improve performance.

---

By understanding the differences in how SQLite and PostgreSQL handle queries and concurrency, developers can make informed decisions to optimize their applications for performance and scalability.
