import { Router, type IRouter } from "express";
import healthRouter from "./health";
import devicesRouter from "./devices";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/v1", devicesRouter);

export default router;
