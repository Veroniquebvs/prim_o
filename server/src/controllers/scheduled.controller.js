/**
 * scheduled.controller.js — HTTP handlers for employer-level scheduled allocation routes.
 *
 * Manages recurring token distribution rules created by employers (targeting employees or all
 * active employees). The next_run_at date is computed locally by the controller rather than
 * delegating to a service, which differs from the pattern used in manager routes.
 *
 * Note: the 'monthly' and 'annual' next-run helpers here are duplicates of the same helpers
 * in cron.service.js; both must stay in sync if the scheduling logic changes.
 */
const { ScheduledAllocation, User, Team } = require('../models');

function nextMonthly(dayOfMonth) {
  const now = new Date();
  const candidate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), dayOfMonth, 9, 0, 0));
  if (candidate <= now) candidate.setUTCMonth(candidate.getUTCMonth() + 1);
  return candidate;
}

function nextAnnual(dayOfMonth, month) {
  const now = new Date();
  const candidate = new Date(Date.UTC(now.getUTCFullYear(), month - 1, dayOfMonth, 9, 0, 0));
  if (candidate <= now) candidate.setUTCFullYear(candidate.getUTCFullYear() + 1);
  return candidate;
}

const withReceiver = {
  include: [
    { model: User, as: 'receiver', attributes: ['id', 'first_name', 'name', 'email'] },
    { model: Team, as: 'target_team', attributes: ['id', 'name'] }
  ],
};

/** Returns all scheduled allocation rules for the authenticated employer's company, newest first. */
const list = async (req, res, next) => {
  try {
    const rules = await ScheduledAllocation.findAll({
      where: { company_id: req.user.company_id },
      ...withReceiver,
      order: [['created_at', 'DESC']],
    });
    res.json({ success: true, data: rules });
  } catch (err) {
    next(err);
  }
};

/** Creates a new recurring allocation rule for the authenticated employer's company. Responds 201. */
const create = async (req, res, next) => {
  try {
    const { receiver_id, target_type, target_team_id, amount, label, frequency, day_of_month, month, excluded_user_ids } = req.body;

    const next_run_at =
      frequency === 'monthly'
        ? nextMonthly(day_of_month)
        : nextAnnual(day_of_month, month);

    const rule = await ScheduledAllocation.create({
      company_id: req.user.company_id,
      sender_id: req.user.id,
      receiver_id: receiver_id || null,
      target_type: target_type || (receiver_id ? 'user' : 'all_company'),
      target_team_id: target_team_id || null,
      amount,
      label: label || null,
      frequency,
      day_of_month,
      month: frequency === 'annual' ? month : null,
      next_run_at,
      excluded_user_ids: (target_type === 'user' || receiver_id) ? [] : (excluded_user_ids || []),
    });

    const full = await ScheduledAllocation.findByPk(rule.id, withReceiver);
    res.status(201).json({ success: true, data: full });
  } catch (err) {
    next(err);
  }
};

/** Replaces an existing allocation rule's schedule and target. Recomputes next_run_at. */
const update = async (req, res, next) => {
  try {
    const rule = await ScheduledAllocation.findOne({
      where: { id: req.params.id, company_id: req.user.company_id },
    });
    if (!rule) return res.status(404).json({ error: 'Not found', code: 404 });

    const { receiver_id, target_type, target_team_id, amount, label, frequency, day_of_month, month, excluded_user_ids } = req.body;

    const next_run_at =
      frequency === 'monthly'
        ? nextMonthly(day_of_month)
        : nextAnnual(day_of_month, month);

    await rule.update({
      receiver_id: receiver_id || null,
      target_type: target_type || (receiver_id ? 'user' : 'all_company'),
      target_team_id: target_team_id || null,
      amount,
      label: label || null,
      frequency,
      day_of_month,
      month: frequency === 'annual' ? month : null,
      next_run_at,
      excluded_user_ids: (target_type === 'user' || receiver_id) ? [] : (excluded_user_ids || []),
    });

    const full = await ScheduledAllocation.findByPk(rule.id, withReceiver);
    res.json({ success: true, data: full });
  } catch (err) {
    next(err);
  }
};

/** Flips the active flag of a rule, pausing or resuming it without deleting it. */
const toggle = async (req, res, next) => {
  try {
    const rule = await ScheduledAllocation.findOne({
      where: { id: req.params.id, company_id: req.user.company_id },
    });
    if (!rule) return res.status(404).json({ error: 'Not found', code: 404 });

    await rule.update({ active: !rule.active });
    res.json({ success: true, data: rule });
  } catch (err) {
    next(err);
  }
};

/** Permanently deletes a scheduled allocation rule scoped to the employer's company. */
const remove = async (req, res, next) => {
  try {
    const rule = await ScheduledAllocation.findOne({
      where: { id: req.params.id, company_id: req.user.company_id },
    });
    if (!rule) return res.status(404).json({ error: 'Not found', code: 404 });

    await rule.destroy();
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
};

module.exports = { list, create, update, toggle, remove };
