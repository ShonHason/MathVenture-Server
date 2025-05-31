import leaderboardModel from '../modules/leaderboardModel';

import { Request, Response } from 'express';

class LeaderboardController {
  async getLeaderboard(req: Request, res: Response): Promise<void> {
    const { gameType, gameDifficulty } = req.query;

  if (!gameType || !gameDifficulty) {
    res.status(400).json({ error: 'Missing game type or difficulty' });
    return ;
  }

  try {
    const leaderboard = await leaderboardModel
      .find({ gameType, gameDifficulty })
      .sort({ score: -1 })
      .limit(5); 

    if (leaderboard.length === 0) {
      res.status(404).json({ message: 'No leaderboard entries found for this game and difficulty' });
      return ;
    }

    res.status(200).json(leaderboard);
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
  }

  async addScore(req: Request, res: Response): Promise<void> {
    const { userId, username, score, email, gameType, gameDifficulty } = req.body;
  
    // בדיקה אם כל השדות הדרושים נמצאים
    if (!userId || typeof score !== 'number') {
      res.status(400).json({ error: 'Invalid input' });
      return;
    }
    if (!username || !email || !gameType || !gameDifficulty) {
      res.status(400).json({ error: 'Missing required fields' });
      return;
    }
  
    try {
      const newEntry = new leaderboardModel({ userId, username, score, email, gameType, gameDifficulty });
      await newEntry.save();
      res.status(200).json({ message: 'Score added successfully' });
      return;
    } catch (error) {
      console.error('Error adding score:', error);
      res.status(500).json({ error: 'Internal server error' });
      return;
    }
  }
}
export default new LeaderboardController();