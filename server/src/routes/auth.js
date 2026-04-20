const { createClient } = require("@supabase/supabase-js");

const VALID_ROLES = new Set(["fan", "security", "admin"]);
const MAX_USER_ID_LENGTH = 64;

function createAuthHelpers(state) {
  const supabase =
    process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
      ? createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
      : null;

  /**
   * Optionally resolves req.user from a Bearer token or header/body values.
   * Sanitises userId (max 64 chars) and role (whitelist enforced).
   */
  async function optionalAuth(req, _res, next) {
    const body = req.body || {};
    const bearerToken = req.headers.authorization?.replace("Bearer ", "");

    // Raw values from request — sanitised before use
    const rawUserId = req.headers["x-user-id"] || body.userId || req.query.userId;
    const rawRole = req.headers["x-user-role"] || body.role || req.query.role || "fan";

    // Sanitise
    const userId = rawUserId ? String(rawUserId).slice(0, MAX_USER_ID_LENGTH) : undefined;
    const role = VALID_ROLES.has(String(rawRole)) ? String(rawRole) : "fan";

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
      req.user = { id: userId, role };
    }

    next();
  }

  /**
   * Middleware: rejects requests from non-admin/security users.
   */
  function requireAdmin(req, res, next) {
    if (!req.user || !["admin", "security"].includes(req.user.role)) {
      return res.status(403).json({ error: "Admin access required" });
    }
    return next();
  }

  return { supabase, optionalAuth, requireAdmin };
}

module.exports = { createAuthHelpers };
