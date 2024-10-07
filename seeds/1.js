// seeds/seed_all_tables.js

const crypto = require("crypto");

exports.seed = async function (knex) {
  // Delete existing data
  await knex("user_settings").del();
  await knex("questions").del();
  await knex("users").del();

  const USER_BATCH_SIZE = 150; // Adjusted batch size for users
  const TOTAL_USERS = 1000000;

  let questionIdCounter = 1;

  for (
    let batchStart = 1;
    batchStart <= TOTAL_USERS;
    batchStart += USER_BATCH_SIZE
  ) {
    const users = [];
    const questions = [];
    const userSettings = [];

    const batchEnd = Math.min(batchStart + USER_BATCH_SIZE - 1, TOTAL_USERS);

    for (let i = batchStart; i <= batchEnd; i++) {
      // Generate random user data
      const userId = i;
      const name = `User_${userId}`;
      const email = `${crypto.randomUUID()}@example.com`;

      users.push({
        id: userId,
        name: name,
        email: email,
      });

      // Generate user settings data
      const defaultVisibilityOptions = ["public", "private"];
      const default_visibility =
        defaultVisibilityOptions[
          Math.floor(Math.random() * defaultVisibilityOptions.length)
        ];
      const profile_handle = `handle_${userId}`;

      userSettings.push({
        user_id: userId,
        default_visibility: default_visibility,
        profile_handle: profile_handle,
      });

      // Generate at least one question for each visibility ('public', 'private', null)
      const visibilityOptions = ["public", "private", null];
      visibilityOptions.forEach((visibility) => {
        const questionId = questionIdCounter++;
        const questionText = `Question text for user ${userId} with visibility ${visibility}`;
        const answerText =
          Math.random() > 0.5 ? `Answer text for question ${questionId}` : null;

        questions.push({
          id: questionId,
          question: questionText,
          answer: answerText,
          visibility: visibility,
          user_id: userId,
          created_at: new Date(),
          updated_at: new Date(),
        });
      });
    }

    console.log(
      `Inserting batch ${Math.ceil(batchEnd / USER_BATCH_SIZE)} of ${Math.ceil(
        TOTAL_USERS / USER_BATCH_SIZE
      )}`
    );

    // Insert users
    await knex.batchInsert("users", users, USER_BATCH_SIZE);

    // Insert user settings
    await knex.batchInsert("user_settings", userSettings, USER_BATCH_SIZE);

    // Insert questions
    // Batch size for questions is adjusted to ensure we don't exceed SQLite limits
    const QUESTION_BATCH_SIZE = USER_BATCH_SIZE * 3; // Since we have 3 questions per user
    await knex.batchInsert("questions", questions, QUESTION_BATCH_SIZE);
  }

  console.log("Seeding completed.");
};
