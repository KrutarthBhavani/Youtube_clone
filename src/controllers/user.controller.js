import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import {ApiError} from "../utils/ApiError.js"
import {uploadOnClodinary} from "../utils/cloudinary.js"
import {User} from "../models/user.model.js"

const registerUser = asyncHandler( async (req,res) => {
    // get user details from FrontEnd
    // validation - non empty
    // check if user already exists: username, email
    // check for images, check for avatar only
    // upload them to cloudinary, avatar
    // create user object - create entry in db
    // remove password and refresh token field from response
    // check for user creation
    // return res


    // get user details from FrontEnd
    const {fullName, email, username, password} = req.body
    
    // validation - non empty
    if(
        [fullName, email, username, password].some((field)=>field?.trim() === "")
    ){
        throw new ApiError(400, "All fields are required")
    }

    // check if user already exists: username, email
    const existedUser = await User.findOne({
        $or: [{ username }, { email }]
    })

    if(existedUser){
        throw new ApiError(409, "User Already Exist")
    }

    // check for images, check for avatar
    /* this ?. called as optional chaining like if there is no file
    attached through the frontEnd then it will not take any action */
    /* it is just like option, if files are there, it will perform the
    operation, otherwise leave it as it is. */
    const avatarLocalPath= req.files?.avatar[0]?.path
    const coverImageLocalPath = req.files?.coverImage[0]?.path

    // check for images, check for avatar only
    if(!avatarLocalPath){
        throw new ApiError(400, "Avatar file is required")
    }

    // upload them to cloudinary, avatar & coverImage
    const avatar = await uploadOnClodinary(avatarLocalPath)
    /* why we put await: because jya sudhi cloudinary ma file upload
     no that tya sudhi wait karvano chhe */
    const coverImage = await uploadOnClodinary(coverImageLocalPath)

    if(!avatar) throw new ApiError(400,"Error while uploading avatar")
    
    const user = await User.create({
        fullName,
        avatar: avatar.url,
        coverImage: coverImage?.url || "", //agar coverimage url hoy to avva do, baki empty reva do
        email, 
        password,
        username: username.toLowerCase()
    })

    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )

    if(!createdUser){
        throw new ApiError(500, "Something Went wrong while Registering the User")
    }

    return res.status(201).json(
        new ApiResponse(200, createdUser, "User registered successfully")
    )
});

export {registerUser}