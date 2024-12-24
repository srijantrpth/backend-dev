import { Router } from "express";
import {
  registerUser,
  logoutUser,
  loginUser,
  refreshAccessToken,
  changeCurrentUserPassword,
  getCurrentUser,
  updateAccountDetails,
  updateAvatar,
  updateCoverImage,
  getUserChannelProfile,
  getWatchHistory
} from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middleware.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

// ROUTES ADD
const router = Router();
router.route("/register").post(
  upload.fields([
    {
      name: "avatar",
      maxCount: 1,
    },
    {
      name: "coverImage",
      maxCount: 1,
    },
  ]),
  registerUser
);
router.route("/login").post(loginUser);
// Secured Routes
router.route("/logout").post(verifyJWT, logoutUser);
router.route("/refresh-token").post(refreshAccessToken);
router
  .route("/change-current-user-password")
  .post(verifyJWT, changeCurrentUserPassword);
router.route("/get-current-user").post(verifyJWT, getCurrentUser);
router.route("/update-account-details").post(verifyJWT, updateAccountDetails);
router
  .route("/update-avatar")
  .post(
    upload.fields([{ name: "avatar", maxCount: 1 }]),
    verifyJWT,
    updateAvatar
  );
router
  .route("/update-cover-image")
  .post(
    upload.fields([{ name: "coverImage", maxCount: 1 }]),
    verifyJWT,
    updateCoverImage
  );
export default router;
