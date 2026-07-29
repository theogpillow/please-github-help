import { Router, type IRouter } from "express";
import healthRouter from "./health";
import usersRouter from "./users";
import prototypesRouter from "./prototypes";
import conversationsRouter from "./conversations";
import feedbackRouter from "./feedback";
import uploadRouter from "./upload";
import followsRouter from "./follows";
import adminRouter from "./admin";
import verificationRouter from "./verification";
import reportsRouter from "./reports";
import notificationsRouter from "./notifications";

const router: IRouter = Router();

router.use(healthRouter);
router.use(usersRouter);
router.use(prototypesRouter);
router.use(conversationsRouter);
router.use(feedbackRouter);
router.use("/upload", uploadRouter);
router.use(followsRouter);
router.use(adminRouter);
router.use(verificationRouter);
router.use(reportsRouter);
router.use(notificationsRouter);

export default router;
