exports.validateQuery = (schema) => {
    return (req, res, next) => {
      try {
        const filteredBody = schema.parse(req.query);
        req.query = filteredBody;
        next();
      } catch (error) {
        return res.status(409).json({ error: error });
      }
    };
  };