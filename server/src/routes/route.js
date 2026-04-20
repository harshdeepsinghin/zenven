const express = require("express");
const { computeRoutes } = require("../engines/routingEngine");

function createRouteRouter({ state, venueData, authHelpers }) {
  const router = express.Router();
  router.use(authHelpers.optionalAuth);

  router.get("/api/route", (req, res) => {
    const { from, to, eventId, userId } = req.query;
    if (!from || !to || !eventId) {
      return res.status(400).json({
        error: "from, to and eventId are required"
      });
    }

    const routes = computeRoutes({
      venueData,
      state,
      from,
      to,
      eventId,
      userId: userId || req.user?.id
    });

    return res.json(routes);
  });

  return router;
}

module.exports = {
  createRouteRouter
};
