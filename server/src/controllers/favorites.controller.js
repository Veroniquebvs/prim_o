/**
 * favorites.controller.js — HTTP handlers for voucher favourite routes.
 *
 * Manages the favourites feature: toggling a voucher favourite on/off and listing the
 * current user's favourites. The toggle is idempotent — calling it twice returns the
 * voucher to its original state.
 */
const { Favorite } = require('../models');

/**
 * Adds or removes a voucher from the authenticated user's favourites.
 * voucher_id is taken from req.body. If the user has already favourited this voucher,
 * the record is deleted and the response returns { favorited: false }. Otherwise a new
 * record is created and the response returns { favorited: true }.
 */
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

/**
 * Returns the list of voucher IDs that the authenticated user has favourited, ordered by most recently added.
 * Each entry contains voucher_id and created_at.
 */
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
