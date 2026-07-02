import type { NextApiRequest, NextApiResponse } from 'next';
import { getTeams } from '../../utils/yahooData';

type ResponseData = {
  name?: string;
  error?: string;
  statusCode?: number;
};

export default async function teams(
  req: NextApiRequest,
  res: NextApiResponse<ResponseData>
) {
  try {
    const teams = await getTeams(req);
    
    // Check if the response contains an error
    if (teams && typeof teams === 'object' && 'error' in teams) {
      const errorData = teams as { error: string; statusCode?: number };
      const statusCode = errorData.statusCode || 500;
      console.error(`Teams API error: ${errorData.error}`);
      res.status(statusCode).json({ error: errorData.error });
      return;
    }
    
    res.status(200).json(teams as ResponseData);
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown error';
    console.error(`Teams API exception: ${errorMsg}`);
    res.status(500).json({ error: 'failed to load data' });
  }
}
