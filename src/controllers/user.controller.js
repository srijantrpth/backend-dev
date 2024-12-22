import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { uploadOnCloudinary } from "../utils/Cloudinary.js";
import { User } from "../models/user.models.js";
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
  

  const coverImageLocalPath = req.files.coverImage ? req.files.coverImage[0].path : "";
  console.log(`reached here coverImage path`);

  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar is Required! ");
  }
  const avatarResponse = await uploadOnCloudinary(avatarLocalPath);
  const coverImageResponse = coverImageLocalPath ? await uploadOnCloudinary(coverImageLocalPath) : "";
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
 const createdUser =  await User.findById(user._id).select(
  "-pasword -refreshToken"
 )
 if(!createdUser) {
  throw new ApiError(500, "Account Creation Unsuccesful at MongoDB")
 }
 return res.status(201).json(new ApiResponse(200, createdUser, "User Registered Succesfully! "))

});

export { registerUser };
