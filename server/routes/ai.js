import { Router } from 'express';
import { askCopilot, copilotStatus } from '../services/copilot.js';
import { generateInsights } from '../services/insights.js';
import { buildLocationContext } from '../services/context.js';
import { parseBodyLocation } from '../middleware/validate.js';
import { rateLimit } from '../middleware/rateLimit.js';
import { HttpError } from '../utils/errors.js';

const router = Router();

router.post('/assistant', rateLimit({ windowMs: 60_000, max: 12, scope: 'ai-assistant' }), async (req, res) => {
  const question = typeof req.body?.question === 'string' ? req.body.question.trim() : '';

  if (question.length < 3) {
    throw new HttpError(400, 'QUESTION_REQUIRED', 'Please ask a question about the selected location.');
  }
  if (question.length > 500) {
    throw new HttpError(400, 'QUESTION_TOO_LONG', 'Please keep questions under 500 characters.');
  }

  const location = parseBodyLocation(req.body?.location);
  const { current, context } = await buildLocationContext(location);
  const answer = await askCopilot({ question, context });

  res.json({
    ...answer,
    groundedOn: {
      location: current.location,
      dataTimestamp: current.dataTimestamp,
      fetchedAt: current.fetchedAt,
      provider: current.provider,
      measurementType: current.measurementType,
      aqiStandard: current.primaryStandard,
      stale: current.stale,
    },
  });
});

router.post('/insights', rateLimit({ windowMs: 60_000, max: 20, scope: 'ai-insights' }), async (req, res) => {
  const location = parseBodyLocation(req.body?.location);
  const { current, forecast, history, context } = await buildLocationContext(location);
  const result = await generateInsights({ context, current, forecast, history });

  res.json({
    ...result,
    location: current.location,
    dataTimestamp: current.dataTimestamp,
    provider: current.provider,
    measurementType: current.measurementType,
    aqiStandard: current.primaryStandard,
    aiStatus: copilotStatus(),
  });
});

export default router;
