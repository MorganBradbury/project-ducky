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
    SELECT userId, discordUsername, faceitUsername, previousElo, gamePlayerId, faceitId
    FROM users
  `,
  DELETE_USER: `
    DELETE FROM users
    WHERE discordUsername = ?
  `,
  INSERT_MATCH: `
  INSERT INTO matches (matchId, trackedPlayers, mapName, teamId, faction, voiceChannelId, voiceChannelName, liveScoresChannelId)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  ON DUPLICATE KEY UPDATE matchId = matchId
`,
  DELETE_MATCH: `
  DELETE FROM matches
  WHERE matchId = ?
  `,

  CHECK_MATCH_EXISTS: `
  SELECT 1
  FROM matches
  WHERE matchId = ?
  LIMIT 1
`,
  SELECT_MATCH_DETAILS: `
  SELECT * FROM matches
  WHERE matchId = ?
  LIMIT 1
`,
  UPDATE_ACTIVE_SCORES_CHANNEL_ID: `
    UPDATE matches
    SET liveScoresChannelId = ?
    WHERE matchId = ?
  `,
};
