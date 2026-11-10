function validate(schema, source = 'body') {
  return (req, res, next) => {
    const dataToValidate = req[source];
    const { error, value } = schema.validate(dataToValidate, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      const messages = error.details.map((d) => d.message);
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: 'Dữ liệu đầu vào không hợp lệ.',
        errors: messages
      });
    }

    req[source] = value;
    next();
  };
}

module.exports = validate;

