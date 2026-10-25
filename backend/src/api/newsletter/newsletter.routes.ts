import { Router } from 'express';
import { subscribe } from './newsletter.controller';
import { validate } from '../../middleware/validate';
import { subscribeSchema } from './newsletter.validation';

const router = Router();

router.post('/subscribe', validate(subscribeSchema), subscribe);

export default router;
