const marketplaceService = require('../services/marketplace.service');

const listItems = async (req, res, next) => {
  try {
    const data = await marketplaceService.listItems();
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

const getItem = async (req, res, next) => {
  try {
    const data = await marketplaceService.getItem(req.params.id);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

const createItem = async (req, res, next) => {
  try {
    const data = await marketplaceService.createItem(req.body);
    res.status(201).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

const updateItem = async (req, res, next) => {
  try {
    const data = await marketplaceService.updateItem(req.params.id, req.body);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

const deleteItem = async (req, res, next) => {
  try {
    await marketplaceService.deleteItem(req.params.id);
    res.json({ success: true, message: 'Item deleted' });
  } catch (err) {
    next(err);
  }
};

const redeem = async (req, res, next) => {
  try {
    const data = await marketplaceService.redeem(req.user.id, req.body.voucherId);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

const listOrders = async (req, res, next) => {
  try {
    const data = await marketplaceService.listOrders(req.user.id);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

module.exports = { listItems, getItem, createItem, updateItem, deleteItem, redeem, listOrders };
