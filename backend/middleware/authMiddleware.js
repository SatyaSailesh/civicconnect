const jwt = require("jsonwebtoken");
const User = require("../models/User");

module.exports = async (req, res, next) => {
  const match = /^Bearer (\S+)$/i.exec(req.header("Authorization") || "");
  if (!match) return res.status(401).json({ message: "No token, authorization denied" });

  let decoded;
  try {
    decoded = jwt.verify(match[1], process.env.JWT_SECRET);
  } catch {
    return res.status(401).json({ message: "Token is not valid" });
  }

  try {
    const user = await User.findById(decoded.id).select("role isApproved");
    if (!user) return res.status(401).json({ message: "Account not found" });
    if (user.role === "admin" && !user.isApproved)
      return res.status(403).json({ message: "Your official account is pending approval." });

    req.user = { id: user.id, role: user.role };
    next();
  } catch (error) {
    next(error);
  }
};
