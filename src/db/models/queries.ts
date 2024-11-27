export const SQL_QUERIES = {
    INSERT_USER: `
      INSERT INTO users (discordUsername, faceitUsername, previousElo, gamePlayerId)
      VALUES (?, ?, ?, ?)
    `,
    UPDATE_USER_ELO: `
      UPDATE users
      SET previousElo = ?
      WHERE userId = ?
    `,
    SELECT_ALL_USERS: `
      SELECT userId, discordUsername, faceitUsername, previousElo, gamePlayerId
      FROM users
    `,
    DELETE_USER: `
      DELETE FROM users
      WHERE discordUsername = ?
    `,
    UPDATE_USER_FACEIT_ID: `
      UPDATE users
      SET gamePlayerId = ?
      WHERE userId = ?
    `,
  };
  