export const SQL_QUERIES = {
  INSERT_USER: `
    INSERT INTO users (discordUsername, faceitUsername, previousElo, gamePlayerId, faceitId)
    VALUES (?, ?, ?, ?, ?)
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
  INSERT_MATCH: `
  INSERT INTO matches_played (match_id, game_player_ids, is_complete, map_name, faction, voiceChannelId)
  VALUES (?, ?, ?, ?, ?, ?)
  ON DUPLICATE KEY UPDATE match_id = match_id
`,
  UPDATE_MATCH_COMPLETE: `
  UPDATE matches_played
  SET is_complete = TRUE
  WHERE match_id = ?
`,
  GET_MATCH_COMPLETE_STATUS: `
  SELECT is_complete
  FROM matches_played
  WHERE match_id = ?;
`,
  CHECK_MATCH_EXISTS: `
  SELECT 1
  FROM matches_played
  WHERE match_id = ?
  LIMIT 1
`,
};
