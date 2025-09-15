// routes/auth.js
const express = require("express");
const router = express.Router();
const User = require("../models/User");

// REGISTER
router.post("/register", async (req, res) => {
  try {
    console.log("📩 Register request body:", req.body);

    const { username, email, password } = req.body;
    if (!username || !email || !password) {
      return res.status(400).json({ success: false, message: "Missing fields" });
    }

    // check duplicate
    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({ success: false, message: "Email already exists" });
    }

    // create new user (password will be hashed by pre-save hook in User.js)
    const user = new User({ username, email, password });
    await user.save();

    res.json({
      success: true,
      message: "User registered!",
      user: { id: user._id, username: user.username, email: user.email },
    });
  } catch (err) {
    console.error("❌ Register error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// LOGIN
router.post("/login", async (req, res) => {
  try {
    console.log("📩 Login request body:", req.body);

    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: "Missing fields" });
    }

    // find user by email only
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ success: false, message: "Invalid credentials" });
    }

    // compare entered password with hashed one
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: "Invalid credentials" });
    }

    res.json({
      success: true,
      message: "Login successful",
      user: { id: user._id, username: user.username, email: user.email },
    });
  } catch (err) {
    console.error("❌ Login error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

module.exports = router;
