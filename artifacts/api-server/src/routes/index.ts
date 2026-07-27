import { Router, type IRouter } from "express";
import healthRouter from "./health";
import usersRouter from "./users";
import prototypesRouter from "./prototypes";
import conversationsRouter from "./conversations";
import feedbackRouter from "./feedback";

const router: IRouter = Router();

router.use(healthRouter);
router.use(usersRouter);
router.use(prototypesRouter);
router.use(conversationsRouter);
router.use(feedbackRouter);

export default router;
