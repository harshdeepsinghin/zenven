const { createClient } = require("@supabase/supabase-js");

function createAuthHelpers(state) {
  const supabase =
    process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
      ? createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
      : null;

  async function optionalAuth(req, _res, next) {
    const body = req.body || {};
    const bearerToken = req.headers.authorization?.replace("Bearer ", "");
    const userId = req.headers["x-user-id"] || body.userId || req.query.userId;
    const role = req.headers["x-user-role"] || body.role || req.query.role || "fan";

    if (bearerToken && supabase) {
      const { data } = await supabase.auth.getUser(bearerToken);
      if (data?.user) {
        req.user = {
          id: data.user.id,
          email: data.user.email,
          role: state.userProfiles.get(data.user.id)?.role || role
        };
      }
    }

    if (!req.user && userId) {
      req.user = {
        id: String(userId),
        role: String(role)
      };
    }

    next();
  }

  function requireAdmin(req, res, next) {
    if (!req.user || !["admin", "security"].includes(req.user.role)) {
      return res.status(403).json({
        error: "Admin access required"
      });
    }

    return next();
  }

  return {
    supabase,
    optionalAuth,
    requireAdmin
  };
}

module.exports = {
  createAuthHelpers
};
