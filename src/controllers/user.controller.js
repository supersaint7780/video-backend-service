import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import fs from "fs";

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
      "Something went wrong while generating refresh and access tokens"
    );
  }
};

const registerUser = asyncHandler(async (req, res) => {
  // STEP 1: Get user details from the frontend
  // STEP 2: Validation - not empty - proper format
  // STEP 3: Check if user already exists by usernmame and email
  // STEP 4: Check if avatar has been provided
  // STEP 5: Upload the avatar and cover image to cloudinary
  // STEP 6: Check if avatar succesfully uploaded to cloudinary
  // STEP 7: Create user object - create entry in database
  // STEP 8: Remove password and refresh token field from response
  // STEP 9: Check if user created in the databse
  // STEP 10: Return response

  const { fullName, email, username, password } = req.body;

  if (
    [fullName, email, username, password].some((field) => field?.trim() === "")
  ) {
    throw new ApiError(400, "All Fields are required");
  }

  const existingUser = await User.findOne({
    $or: [{ username }, { email }],
  });

  const avatarLocalPath = req.files?.avatar[0]?.path;

  let coverImageLocalPath;
  if (
    req.files &&
    Array.isArray(req.files.coverImage) &&
    req.files.coverImage.length > 0
  ) {
    coverImageLocalPath = req.files.coverImage[0].path;
  }

  if (existingUser) {
    // remove the received files from our server is user exists
    if (fs.existsSync(avatarLocalPath)) fs.unlinkSync(avatarLocalPath);
    if (fs.existsSync(coverImageLocalPath)) fs.unlinkSync(coverImageLocalPath);
    throw new ApiError(409, "User with username or email already exists");
  }

  if (!avatarLocalPath) throw new ApiError(400, "Avatar is required");

  const avatar = await uploadOnCloudinary(avatarLocalPath);
  const coverImage = await uploadOnCloudinary(coverImageLocalPath);

  if (!avatar) {
    throw new ApiError(400, "Avatar file is required");
  }

  const user = await User.create({
    fullName,
    avatar: avatar.url,
    coverImage: coverImage?.url || "",
    email,
    password,
    username: username.toLowerCase(),
  });

  // pass whatever you do not want
  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  if (!createdUser) {
    throw new ApiError(500, "Somerthing went wrong while registering the user");
  }

  return res
    .status(201)
    .json(new ApiResponse(200, createdUser, "User registered successfully"));
});

const loginUser = asyncHandler(async (req, res) => {
  // STEP 1: Get user details from the frontend(email or username and password)
  // STEP 2: Check if user with the given username or password exist
  // STEP 3: If the user exists match the password
  // STEP 4: If password matched generate accessToken and refreshToken
  // STEP 5: Send to the user and send the cookie
  const { email, username, password } = req.body;
  if (!(email || username)) {
    throw new ApiError(400, "Email or Username required");
  }

  if (!password) {
    throw new ApiError(400, "Password is required");
  }

  const user = await User.findOne({
    $or: [{ username }, { email }],
  });

  if (!user) {
    throw new ApiError(409, "User does not exist");
  }

  // methods created by us on user schema our accesible on our object
  // and not on the mongodb User schema
  const isPasswordValid = await user.isPasswordCorrect(password);
  if (!isPasswordValid) {
    throw new ApiError(401, "Invalid User Credentials");
  }

  const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(
    user._id
  );

  // user.refreshToken = refreshToken;
  // choose to get new user or change the current object
  // whatever you seem fit based on performane
  const loggedInUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  // cookie options
  // httpOnly : makes the cookies only modifiable by the user
  const options = {
    httpOnly: true,
    secure: true,
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
        "User logged In Succesfully"
      )
    );
});

const logoutUser = asyncHandler(async (req, res) => {
  // STEP 1: Clear the cookies
  // STEP 2: Reset the refresh token
  await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        refreshToken: undefined,
      },
    },
    {
      // this will ensure the response user returned is the updated user
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
    .json(new ApiResponse(200, {}, "User Logged Out Succesfully"));
});

export { registerUser, loginUser, logoutUser };
