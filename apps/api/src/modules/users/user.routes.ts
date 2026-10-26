import { Router } from "express";
import {
  idParamSchema,
  userCreateSchema,
  userListQuerySchema,
  userUpdateSchema,
} from "@clinic/shared";
import { authenticate, requireRole } from "../../middlewares/auth";
import { validateBody, validateParams, validateQuery } from "../../middlewares/validate";
import { asyncHandler } from "../../utils/async-handler";
import {
  createUserController,
  deleteUserController,
  getUserController,
  listUsersController,
  updateUserController,
} from "./user.controller";

export const userRouter = Router();

userRouter.use(authenticate, requireRole("admin"));

userRouter.get("/", validateQuery(userListQuerySchema), asyncHandler(listUsersController));
userRouter.post("/", validateBody(userCreateSchema), asyncHandler(createUserController));
userRouter.get("/:id", validateParams(idParamSchema), asyncHandler(getUserController));
userRouter.patch(
  "/:id",
  validateParams(idParamSchema),
  validateBody(userUpdateSchema),
  asyncHandler(updateUserController),
);
userRouter.delete(
  "/:id",
  validateParams(idParamSchema),
  asyncHandler(deleteUserController),
);
