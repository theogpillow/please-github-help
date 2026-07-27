import { Router, type IRouter } from "express";
import { GetInvestorFeedbackBody, GetNitraFeedbackBody } from "@workspace/api-zod";
import { generateAIContent } from "../lib/ai";

const router: IRouter = Router();

router.post("/feedback/investor", async (req, res): Promise<void> => {
  const parsed = GetInvestorFeedbackBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const result = await generateAIContent({
    type: "investor_feedback",
    ...parsed.data,
  });
  res.json(JSON.parse(result));
});

router.post("/feedback/nitra", async (req, res): Promise<void> => {
  const parsed = GetNitraFeedbackBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const result = await generateAIContent({
    type: "nitra_feedback",
    ...parsed.data,
  });
  res.json(JSON.parse(result));
});

export default router;
