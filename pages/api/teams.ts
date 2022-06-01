import type { NextApiRequest, NextApiResponse } from 'next';
import { getToken } from 'next-auth/jwt';
import https from 'https';
import zlib from 'zlib';
import { parseString } from 'xml2js';
import { getTeams } from '../../utils/yahooData';

type ResponseData = {
  name?: string;
  error?: string;
};

export default async function teams(
  req: NextApiRequest,
  res: NextApiResponse<ResponseData>
) {
  try {
    const teams = await getTeams(req);
    // console.log(teams);
    res.status(200).json(teams);
  } catch (err) {
    res.status(500).json({ error: 'failed to load data' });
  }
}
