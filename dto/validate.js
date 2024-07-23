exports.validate = (schema) => {
    return (req, res, next) => {
      try {
        const filteredBody = schema.parse(req.body);
        req.body = filteredBody;
        next();
      } catch (error) {
        return res.status(409).json({ error: error });
      }
    };
  };