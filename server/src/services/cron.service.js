const cron = require('node-cron');
const { Op } = require('sequelize');
const sequelize = require('../config/database');
const { ScheduledAllocation, User, Company, TokenTransaction } = require('../models');

function nextMonthly(dayOfMonth) {
  const now = new Date();
  const candidate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), dayOfMonth, 9, 0, 0));
  if (candidate <= now) {
    candidate.setUTCMonth(candidate.getUTCMonth() + 1);
  }
  return candidate;
}

function nextAnnual(dayOfMonth, month) {
  const now = new Date();
  // month is 1-based
  const candidate = new Date(Date.UTC(now.getUTCFullYear(), month - 1, dayOfMonth, 9, 0, 0));
  if (candidate <= now) {
    candidate.setUTCFullYear(candidate.getUTCFullYear() + 1);
  }
  return candidate;
}

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
