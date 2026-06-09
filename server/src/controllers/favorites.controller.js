const { Favorite } = require('../models');

const toggle = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { voucher_id } = req.body;

    const existing = await Favorite.findOne({ where: { user_id: userId, voucher_id } });
    if (existing) {
      await existing.destroy();
      return res.json({ success: true, data: { favorited: false } });
    }

    await Favorite.create({ user_id: userId, voucher_id });
    return res.json({ success: true, data: { favorited: true } });
  } catch (err) {
    next(err);
  }
};

const getUserFavorites = async (req, res, next) => {
  try {
    const favorites = await Favorite.findAll({
      where: { user_id: req.user.id },
      attributes: ['voucher_id', 'created_at'],
      order: [['created_at', 'DESC']],
    });
    res.json({
      success: true,
      data: favorites.map((f) => ({ voucher_id: f.voucher_id, created_at: f.created_at })),
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { toggle, getUserFavorites };
