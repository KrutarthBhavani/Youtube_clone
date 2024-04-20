import {Router} from 'express';
import { registerUser, loginUser, logoutUser } from '../controllers/user.controller.js';
import {upload} from "../middlewares/multer.middleware.js"
import {verifyJWT} from "../middlewares/auth.middleware.js"
const router = Router()


router.route("/register").post(
    upload.fields([
        {
            name: "avatar",
            maxCount: 1 // How many files do you want to accept
        },
        {
            name: "coverImage",
            maxCount: 1 // How many files do you want to accept
        }
    ]),
    registerUser
)

router.route("/login").post(loginUser)

//secured routes
router.route("/logout").post(verifyJWT, logoutUser)


export default router