import type { NextApiRequest, NextApiResponse } from 'next';
import { getTeams } from '../../utils/yahooData';
import type { YahooGame, ApiErrorResponse } from '../../types/yahooFantasy';

type ResponseData = {
  games?: YahooGame[];
  error?: string;
  statusCode?: number;
};

export default async function teams(
  req: NextApiRequest,
  res: NextApiResponse<ResponseData>
) {
  try {
    const teamsData = await getTeams(req);
    
    // Check if the response contains an error
    if (teamsData && typeof teamsData === 'object' && 'error' in teamsData) {
      const errorData = teamsData as ApiErrorResponse;
      const statusCode = errorData.statusCode || 500;
      console.error(`Teams API error: ${errorData.error}`);
      res.status(statusCode).json({ error: errorData.error });
      return;
    }
    
    // Validate that we have an array of games
    if (!Array.isArray(teamsData)) {
      console.error('Teams API: Expected array of games but received:', typeof teamsData);
      res.status(500).json({ error: 'Invalid response format from Yahoo API' });
      return;
    }
    
    res.status(200).json({ games: teamsData as YahooGame[] });
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown error';
    console.error(`Teams API exception: ${errorMsg}`);
    res.status(500).json({ error: 'failed to load data' });
  }
}
