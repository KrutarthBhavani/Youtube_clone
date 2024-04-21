import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import { uploadOnClodinary } from "../utils/cloudinary.js";
import { User } from "../models/user.model.js";
import jwt from "jsonwebtoken";

const generateAccessAndRefreshTokens = async (userId) => {
  try {
    const user = await User.findById(userId);
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(
      500,
      "Something Went wrong while generating Access & Refresh Token"
    );
  }
};

const registerUser = asyncHandler(async (req, res) => {
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
  const { fullName, email, username, password } = req.body;

  // validation - non empty
  if (
    [fullName, email, username, password].some((field) => field?.trim() === "")
  ) {
    throw new ApiError(400, "All fields are required");
  }

  // check if user already exists: username, email
  const existedUser = await User.findOne({
    $or: [{ username }, { email }],
  });

  if (existedUser) {
    throw new ApiError(409, "User Already Exist");
  }

  // check for images, check for avatar
  /* this ?. called as optional chaining like if there is no file
    attached through the frontEnd then it will not take any action */
  /* it is just like option, if files are there, it will perform the
    operation, otherwise leave it as it is. */
  const avatarLocalPath = req.files?.avatar[0]?.path;

  let coverImageLocalPath;
  if (
    req.files &&
    Array.isArray(req.files.coverImage) &&
    req.files.coverImage.length > 0
  ) {
    coverImageLocalPath = req.files.coverImage[0].path;
  }
  // this is pure javascript if-else condition. if user uploaded coverImage then only we have to save it

  // check for images, check for avatar only
  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar file is required");
  }

  // upload them to cloudinary, avatar & coverImage
  const avatar = await uploadOnClodinary(avatarLocalPath);
  /* why we put await: because jya sudhi cloudinary ma file upload
     no that tya sudhi wait karvano chhe */
  const coverImage = await uploadOnClodinary(coverImageLocalPath);

  if (!avatar) throw new ApiError(400, "Error while uploading avatar");

  const user = await User.create({
    fullName,
    avatar: avatar.url,
    coverImage: coverImage?.url || "", //agar coverimage url hoy to avva do, baki empty reva do
    email,
    password,
    username: username.toLowerCase(),
  });

  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  if (!createdUser) {
    throw new ApiError(500, "Something Went wrong while Registering the User");
  }

  return res
    .status(201)
    .json(new ApiResponse(200, createdUser, "User registered successfully"));
});

const loginUser = asyncHandler(async (req, res) => {
  // get data from user
  // check for validation - empty value
  // check if it is true credential or not
  // access and refresh token
  // send cookie

  const { username, email, password } = req.body;

  if (!(username || email))
    throw new ApiError(400, "Username or email is required");

  const user = await User.findOne({
    $or: [{ email }, { username }],
  });
  if (!user) throw new ApiError(404, "User Does not exist");

  const isPasswordValid = await user.isPasswordCorrect(password);
  if (!isPasswordValid) throw new ApiError(401, "Invalid User Credential");

  const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(
    user._id
  );

  const loggedInUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  const options = {
    httpOnly: true,
    secure: true, // by these two fields, only server can modify the cookie(frontend does not)
  };

  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        200,
        {
          user: loggedInUser,
          accessToken,
          refreshToken,
        },
        "User logged In Successfully"
      )
    );
});

const logoutUser = asyncHandler(async (req, res) => {
  // cookies clear
  // remove refreshToken
  await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        refreshToken: undefined,
      },
    },
    {
      new: true,
    }
  );

  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(201, "User has been successfully logout"));
});

const refreshAccessToken = asyncHandler(async (req, res) => {
  //get refresh token from cookiers
  const incomingRefreshToken =
    req.cookies.refreshToken || req.body.refreshToken;
  // in the mobile app, refresh token come from req.body, that's why we put OR operator

  if (incomingRefreshToken) {
    throw new ApiError(401, "Unauthorized Request");
  }

  try {
    const decodedToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );

    const user = User.findById(decodedToken?._id);

    if (!user) throw new ApiError(401, "Invalid Refresh Token");

    if (incomingRefreshToken !== user?.refreshToken) {
      throw new ApiError(401, "Refresh Token is expired or used");
    }

    const options = {
      httpOnly: true,
      secure: true,
    };

    const { accessToken, newRefreshToken } =
      await generateAccessAndRefreshTokens(user._id);

    return res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", refreshToken, options)
      .json(
        new ApiResponse(
          200,
          { accessToken, refreshToken: new newRefreshToken() },
          "Access Token refreshed"
        )
      );
  } catch (error) {
    throw new ApiError(500, error?.message || "Invalid Refresh Token");
  }
});


const changeCurrentPassword = asyncHandler(async(req,res)=>{
  const {oldPassword, newPassword} = req.body

  const user = await User.findById(req.user?._id)
  const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)
  // why we put await here? ---> because isPasswordCorrect is async method

  if(!isPasswordCorrect) throw new ApiError(400, "Inavlid Old Password")

  user.password = newPassword
  await user.save({validateBeforeSave: false})

  return res
  .status(200)
  .json(new ApiResponse(200, {}, "Password changed successfully"))
})

const getCurrentUser = asyncHandler(async(req,res)=>{
  return res
  .status(200)
  .json(200, req.user, "current User Fetched Successfully")
})
export { registerUser, loginUser, logoutUser, refreshAccessToken, changeCurrentPassword, getCurrentUser };
