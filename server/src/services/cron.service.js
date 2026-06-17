/**
 * cron.service.js — Daily scheduled allocation job.
 *
 * Runs every day at 09:00 UTC using node-cron. Queries all active ScheduledAllocation rules
 * whose next_run_at timestamp has passed and executes each transfer atomically:
 *   - If the sender is a manager: debits from their personal token_balance.
 *   - If the sender is an employer: debits from the company's token_balance.
 *   - If the rule targets a specific receiver_id: transfers to that user only.
 *   - If receiver_id is null: transfers to all active employees in the company,
 *     excluding any user IDs listed in excluded_user_ids.
 *
 * Each individual transfer uses its own PostgreSQL transaction. A failure (e.g. insufficient
 * balance) on one target does not roll back other targets in the same rule.
 * After processing, next_run_at is advanced to the following occurrence.
 *
 * startCron is called once at server startup (from server.js) to register the job.
 */
const cron = require('node-cron');
const { Op } = require('sequelize');
const sequelize = require('../config/database');
const { ScheduledAllocation, User, Company, TokenTransaction } = require('../models');

/**
 * Computes the next monthly run date for a given day-of-month.
 * dayOfMonth is the target day (1–28). Returns a Date set to 09:00 UTC on the next
 * occurrence of that day. If the date has already passed this month, advances to next month.
 */
function nextMonthly(dayOfMonth) {
  const now = new Date();
  const candidate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), dayOfMonth, 9, 0, 0));
  if (candidate <= now) {
    candidate.setUTCMonth(candidate.getUTCMonth() + 1);
  }
  return candidate;
}

/**
 * Computes the next annual run date for a given day and month.
 * dayOfMonth is the target day (1–28). month is 1-based (1 = January, 12 = December).
 * Returns a Date set to 09:00 UTC on the next occurrence of that day in that month.
 * If the date has already passed this year, advances to next year.
 */
function nextAnnual(dayOfMonth, month) {
  const now = new Date();
  // month is 1-based
  const candidate = new Date(Date.UTC(now.getUTCFullYear(), month - 1, dayOfMonth, 9, 0, 0));
  if (candidate <= now) {
    candidate.setUTCFullYear(candidate.getUTCFullYear() + 1);
  }
  return candidate;
}

/**
 * Fetches all due allocation rules and executes each transfer. Called by the cron job.
 * Can also be invoked directly (e.g. in tests) via the exported runScheduledAllocations symbol.
 * A rule is "due" when active = true and next_run_at <= now.
 */
async function runScheduledAllocations() {
  const due = await ScheduledAllocation.findAll({
    where: {
      active: true,
      next_run_at: { [Op.lte]: new Date() },
    },
    include: [
      { model: User, as: 'sender' },
      { model: User, as: 'receiver' },
      { model: Company, as: 'company' },
    ],
  });

  for (const rule of due) {
    const excluded = Array.isArray(rule.excluded_user_ids) ? rule.excluded_user_ids : [];
    const targets = rule.receiver_id
      ? [rule.receiver]
      : await User.findAll({
          where: {
            company_id: rule.company_id,
            role: 'employee',
            status: 'active',
            ...(excluded.length > 0 ? { id: { [Op.notIn]: excluded } } : {}),
          },
        });

    for (const receiver of targets) {
      if (!receiver) continue;
      const t = await sequelize.transaction();
      try {
        const sender = await User.findByPk(rule.sender_id, { lock: true, transaction: t });

        if (sender && sender.role === 'manager') {
          if (sender.token_balance < rule.amount) {
            await t.rollback();
            continue;
          }
          await sender.decrement('token_balance', { by: rule.amount, transaction: t });
        } else {
          const company = await Company.findOne({
            where: { id: rule.company_id },
            lock: true,
            transaction: t,
          });
          if (!company || company.token_balance < rule.amount) {
            await t.rollback();
            continue;
          }
          await company.decrement('token_balance', { by: rule.amount, transaction: t });
        }

        await receiver.increment('token_balance', { by: rule.amount, transaction: t });

        await TokenTransaction.create(
          {
            sender_id: rule.sender_id,
            receiver_id: receiver.id,
            company_id: rule.company_id,
            amount: rule.amount,
            type: rule.label || 'scheduled_allocation',
          },
          { transaction: t }
        );

        await t.commit();
      } catch {
        await t.rollback();
      }
    }

    // Calcul de la prochaine exécution
    const nextRun =
      rule.frequency === 'monthly'
        ? nextMonthly(rule.day_of_month)
        : nextAnnual(rule.day_of_month, rule.month);

    await rule.update({ next_run_at: nextRun });
  }
}

/**
 * Registers the recurring cron job. Must be called once at server startup after the database
 * connection is established. The job fires every day at 09:00 UTC and calls
 * runScheduledAllocations; any error is logged to stderr without crashing the process.
 */
function startCron() {
  // Exécution tous les jours à 09h00 UTC
  cron.schedule('0 9 * * *', () => {
    runScheduledAllocations().catch((err) =>
      console.error('[cron] scheduled allocations error:', err.message)
    );
  });
  console.log('[cron] Scheduled allocations cron started');
}

module.exports = { startCron, runScheduledAllocations };
