import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { uploadOnCloudinary } from "../utils/Cloudinary.js";
import { User } from "../models/user.models.js";
import jwt from "jsonwebtoken";
const options = { httpOnly: true, secure: true };
const generateAccessAndRefreshTokens = async (userId) => {
  try {
    const user = await User.findById(userId);
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();
    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });
    return { accessToken, refreshToken };
  } catch (error) {
    console.log(error);

    throw new ApiError(
      500,
      "Something went wrong while generating refresh and access tokens"
    );
  }
};

const registerUser = asyncHandler(async (req, res) => {
  console.log("Request received at /register");
  console.log("Request body:", req.body);

  const { username, email, fullName, password } = req.body;

  if (
    [username || email || fullName || password].some(
      (field) => field?.trim() === ""
    )
  ) {
    throw new ApiError(409, "All fields are required! ");
  }

  const existingUser = await User.findOne({
    $or: [{ username }, { email }],
  });

  if (existingUser) {
    throw new ApiError(400, "User already exists");
  }

  const avatarLocalPath = req.files?.avatar[0]?.path;
  const coverImageLocalPath = req.files.coverImage
    ? req.files.coverImage[0].path
    : "";

  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar is Required! ");
  }
  const avatarResponse = await uploadOnCloudinary(avatarLocalPath);
  const coverImageResponse = coverImageLocalPath
    ? await uploadOnCloudinary(coverImageLocalPath)
    : "";
  if (!avatarResponse) {
    throw new ApiError(400, "Avatar Image Upload Failed! ");
  }
  const user = await User.create({
    fullName,
    avatar: avatarResponse.url,
    coverImage: coverImageResponse?.url || "",
    email,
    password,
    username: username.toLowerCase(),
  });
  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );
  if (!createdUser) {
    throw new ApiError(500, "Account Creation Unsuccesful at MongoDB");
  }
  return res
    .status(201)
    .json(new ApiResponse(200, createdUser, "User Registered Succesfully! "));
});

const loginUser = asyncHandler(async (req, res) => {
  const { email, password, username } = req.body;

  if (!email && !username) {
    throw new ApiError(400, "Email or Username is Required! ");
  }

  const user = await User.findOne({
    $or: [{ email }, { username }],
  });
  if (!user) {
    throw new ApiError(404, "User not Found! ");
  }

  const passwordCheck = await user.isPasswordCorrect(password);
  if (!passwordCheck) {
    throw new ApiError(401, "Invalid Credentials! ");
  }
  const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(
    user._id
  );

  const loggedInUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

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
        "User Logged in Succesfully! "
      )
    );
});
const logoutUser = asyncHandler(async (req, res) => {
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
  res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User Logged Out Successfully"));
});
const refreshAccessToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken =
    req.cookies.refreshToken || req.body.refreshToken;
  if (!incomingRefreshToken) {
    throw new ApiError(401, "Refresh Token is Required! Unauthorized Request");
  }
  try {
    const decodedToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );
    const user = await User.findById(decodedToken?._id);
    if (!user) {
      throw new ApiError(400, "Invalid Refresh Token! ");
    }
    if (decodedToken !== user?.refreshToken) {
      throw new ApiError(400, "Refresh Token is Expired or Used!");
    }
    const { accessToken, newRefreshToken } =
      await generateAccessAndRefreshTokens(user._id);
    return res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", newRefreshToken, options)
      .json(
        new ApiResponse(
          200,
          { accessToken, refreshToken: newRefreshToken },
          "Access Token Refreshed Successfully! "
        )
      );
  } catch (error) {
    throw new ApiError(400, "Invalid Refresh Token! ");
  }
});

const changeCurrentUserPassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  if (!(oldPassword && newPassword)) {
    throw new ApiError(400, "Old Password and New Password are Required! ");
  }
  const user = await User.findById(req.user?._id);
  const passwordCheck = await user.isPasswordCorrect(oldPassword);
  if (!passwordCheck) {
    throw new ApiError(401, "Invalid Password! ");
  }
  user.password = newPassword;
  await user.save({ validateBeforeSave: false });
  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Password Changed Successfully! "));
});

const getCurrentUser = asyncHandler(async (req, res) => {
  return res
    .status(200)
    .json(new ApiResponse(200, req.user, "User Data Fetched Successfully! "));
});
const updateAccountDetails = asyncHandler(async (req, res) => {
  const { newFullName, username } = req.body;
  if (!newFullName || !username) {
    throw new ApiError(400, "Full Name and Username are Required! ");
  }
  const existingUser = await User?.findOne({ $or: { username } });
  if (existingUser) {
    throw new ApiError(409, "Username already exists! ");
  }
  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        fullName: newFullName,
        username: username.toLowerCase(),
      },
    },
    { new: true }
  ).select("-password -refreshToken");
  return res
    .status(200)
    .json(new ApiResponse(200, user, "Account Details Updated Successfully! "));
});
const updateAvatar = asyncHandler(async (req, res) => {
  const avatarLocalPath = req.file?.path;
  if(!avatarLocalPath){
    throw new ApiError(400, "Avatar is Required! ");
  }
const avatar =  await uploadOnCloudinary(avatarLocalPath)
if(!avatar.url){
  throw new ApiError(400, "Avatar Image Upload Failed on Cloudinary! ");
}
const user = await User.findByIdAndUpdate(req.user?._id,{
  $set: {
    avatar: avatar.url
  }
},{new: true}).select("-password -refreshToken");
return res.status(200).json(new ApiResponse(200, user, "Avatar Updated Successfully! "));      
});
const updateCoverImage = asyncHandler(async (req, res) => {
  const coverLocalPath = req.file?.path;
  if(!coverLocalPath){
    throw new ApiError(400, "Cover Image is Required! ");
  }
const cover =  await uploadOnCloudinary(coverLocalPath)
if(!cover.url){
  throw new ApiError(400, "Cover Image Upload Failed on Cloudinary! ");
}
const user = await User.findByIdAndUpdate(req.user?._id,{
  $set: {
    coverImage: cover.url
  }
},{new: true}).select("-password -refreshToken");
return res.status(200).json(new ApiResponse(200, user, "Cover Image Updated Successfully! "));      
});
   

export {
  registerUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  changeCurrentUserPassword,
  getCurrentUser,
  updateAccountDetails,
  updateAvatar,
  updateCoverImage
};