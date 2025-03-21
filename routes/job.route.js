import express from "express";
import authenticateToken from "../middleware/isAuthenticated.js";
import {
  getAdminJob,
  getAllJobs,
  getJobById,
  postJob,
  deleteJob,
} from "../controllers/job.controller.js";

const router = express.Router();

router.route("/post").post(authenticateToken, postJob);
router.route("/get/:id").get(authenticateToken, getJobById);
router.route("/getadminjobs").get(authenticateToken, getAdminJob);
router.route("/get").get(authenticateToken, getAllJobs);
router.route("/delete/:id").delete(authenticateToken, deleteJob);

export default router;
