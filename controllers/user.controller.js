import { User } from "../models/user.model.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import getDataUri from "../utils/datauri.js";
import { v2 as cloudinary } from "cloudinary";

//------------------------------------ Register Part -----------------------

export const register = async (req, res) => {
  try {
    const { fullname, email, phoneNumber, password, adharcard, pancard, role } =
      req.body;

    if (
      !fullname ||
      !email ||
      !phoneNumber ||
      !password ||
      !role ||
      !pancard ||
      !adharcard
    ) {
      return res.status(404).json({
        message: "Missing required fields",
        success: false,
      });
    }
    const existingAdharcard = await User.findOne({ adharcard });
    if (existingAdharcard) {
      return res.status(400).json({
        message: "Adhar number already exists",
        success: false,
      });
    }

    const existingPancard = await User.findOne({ pancard });
    if (existingPancard) {
      return res.status(400).json({
        message: "Pan number already exists",
        success: false,
      });
    }
    const file = req.file;
    const fileUri = getDataUri(file);
    const cloudResponse = await cloudinary.uploader.upload(fileUri.content);

    const user = await User.findOne({ email });
    if (user) {
      return res.status(404).json({
        message: "Email already exists",
        success: false,
      });
    }

    //Convert Password to Hash
    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({
      fullname,
      email,
      phoneNumber,
      password: hashedPassword,
      adharcard,
      pancard,
      role,
      profile: {
        profilePhoto: cloudResponse.secure_url,
        skills: [],
      },
    });

    // console.log(newUser);

    await newUser.save();

    return res.status(200).json({
      message: `Account created successfully ${fullname}`,
      success: true,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Server Error register",
      success: false,
    });
  }
};

//------------------------------------ Login Part -----------------------

export const login = async (req, res) => {
  try {
    const { email, password, role } = req.body;

    if (!email || !password || !role) {
      return res.status(404).json({
        message: "Missing required fields",
        success: false,
      });
    }

    let user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({
        message: "Incorrect email or password",
        success: false,
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(404).json({
        message: "Incorrect email or password",
        success: false,
      });
    }

    //Check role correctly or not
    if (user.role !== role) {
      return res.status(404).json({
        message: "You don't have the necessary role to access this resource.",
        success: false,
      });
    }

    //Generate token
    const tokenData = {
      userId: user._id,
    };

    const token = await jwt.sign(tokenData, process.env.JWT_SECRET, {
      expiresIn: "1d",
    });

    const sanitizedUser = {
      _id: user._id,
      fullname: user.fullname,
      email: user.email,
      phoneNumber: user.phoneNumber,
      adharcard: user.adharcard,
      pancard: user.pancard,
      role: user.role,
      profile: user.profile,
    };

    return res
      .status(200)
      .cookie("token", token, {
        maxAge: 1 * 24 * 60 * 60 * 1000,
        httpOnly: true,
        sameSite: "Strict",
      })
      .json({
        message: `Welcome back ${user.fullname}`,
        user,
        success: true,
      });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Server Error login",
      success: false,
    });
  }
};

//------------------------------------ Logout Part --------------------

export const logout = (req, res) => {
  try {
    return res.status(200).cookie("token", "", { maxAge: 0 }).json({
      message: "Logged out successfully",
      success: true,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Server Error logout",
      success: false,
    });
  }
};

//--------------------------------- Update Profile --------------------

export const updateProfile = async (req, res) => {
  try {
    const { fullname, email, phoneNumber, pancard, adharcard, bio, skills } =
      req.body;
    const file = req.file;

    // console.log(fullname, email, phoneNumber, bio, skills);

    //Cloudinary upload
    // const fileUri = getDataUri(file);
    // const cloudinaryResponse = await cloudinary.uploader.upload(
    //   fileUri.content
    // );

    // Cloudinary upload (only if a file is provided)
    let cloudinaryResponse;
    if (file) {
      const fileUri = getDataUri(file);
      cloudinaryResponse = await cloudinary.uploader.upload(fileUri.content);
    }

    let skillsArray;

    if (skills) {
      skillsArray = skills.split(",");
    }

    const userId = req.id; //Middleware Authentication

    let user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        message: "User not found",
        success: false,
      });
    }

    if (fullname) user.fullname = fullname;

    if (email) user.email = email;

    if (phoneNumber) user.phoneNumber = phoneNumber;
    if (pancard) user.pancard = pancard;
    if (adharcard) user.adharcard = adharcard;

    if (bio) user.profile.bio = bio;

    //let skillsArray;
    if (skills) user.profile.skills = skillsArray;

    //resume
    // if (cloudinaryResponse) {
    //   user.profile.resume = cloudinaryResponse.secure_url;
    //   user.profile.resumeOriginalname = file.originalname;
    // }

    // Update resume only if a new file is uploaded
    if (file && cloudinaryResponse) {
      user.profile.resume = cloudinaryResponse.secure_url;
      user.profile.resumeOriginalname = file.originalname;
    }

    await user.save();

    user = {
      _id: user._id,
      fullname: user.fullname,
      email: user.email,
      phoneNumber: user.phoneNumber,
      pancard: user.pancard,
      adharcard: user.adharcard,
      role: user.role,
      skills: user.profile.skills,
      profile: user.profile,
      resume: user.profile.resume,
    };

    return res.status(200).json({
      message: "Profile updated successfully",
      user,
      success: true,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Server Error update profile",
      success: false,
    });
  }
};
