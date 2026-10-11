/* Revision Tracker study-planning engine, v1.
   Deterministic scheduling rules: enforces daily limits, protected days, deadlines,
   fixed sessions, and cross-plan workload sharing. It does not make AI claims.
*/
(function (root) {
  'use strict';
  const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const MIN_SESSION = 15;
  const MAX_SESSION = 60;
  const MAX_PROPOSED_SESSIONS = 2500;

  function dateFromKey(key) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(key || ''));
    if (!m) return null;
    return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  }
  function keyFromDate(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }
  function addDays(date, amount) {
    const result = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    result.setDate(result.getDate() + amount);
    return result;
  }
  function mondayOf(date) {
    const result = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    result.setDate(result.getDate() - ((result.getDay() + 6) % 7));
    return result;
  }
  function dayName(date) { return DAY_NAMES[(date.getDay() + 6) % 7]; }
  function minutesOfTime(value, fallback) {
    const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(String(value || ''));
    return match ? Number(match[1]) * 60 + Number(match[2]) : fallback;
  }
  function timeOfMinutes(value) {
    const h = Math.floor(value / 60), m = value % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }
  function clampNumber(value, min, max, fallback) {
    const n = Number(value);
    return Number.isFinite(n) ? Math.max(min, Math.min(max, Math.floor(n))) : fallback;
  }
  function normalizeAvailability(raw) {
    const dayModes = {};
    for (const day of DAY_NAMES) dayModes[day] = ['normal', 'light', 'off'].includes(raw?.dayModes?.[day]) ? raw.dayModes[day] : 'normal';
    return {
      dayModes,
      normalDailyMinutes: clampNumber(raw?.normalDailyMinutes, 15, 240, 60),
      lightDailyMinutes: clampNumber(raw?.lightDailyMinutes, 0, 120, 25),
      sessionMinutes: clampNumber(raw?.sessionMinutes, 15, 60, 25),
      weekdayStart: /^([01]\d|2[0-3]):[0-5]\d$/.test(String(raw?.weekdayStart || '')) ? raw.weekdayStart : '17:00',
      weekendStart: /^([01]\d|2[0-3]):[0-5]\d$/.test(String(raw?.weekendStart || '')) ? raw.weekendStart : '10:00'
    };
  }
  function dayCapacity(date, availability) {
    const mode = availability.dayModes[dayName(date)] || 'normal';
    if (mode === 'off') return 0;
    return mode === 'light' ? availability.lightDailyMinutes : availability.normalDailyMinutes;
  }
  function priorityWeight(plan, daysRemaining) {
    const base = plan.priority === 'high' ? 1.55 : plan.priority === 'low' ? 0.72 : 1;
    const urgency = daysRemaining <= 7 ? 1.8 : daysRemaining <= 14 ? 1.45 : daysRemaining <= 30 ? 1.2 : 1;
    return base * urgency;
  }
  function roundDownToFive(value) { return Math.floor(value / 5) * 5; }
  function allocateMinutes(demands, available, weekMonday) {
    const result = new Map(demands.map(item => [item.plan.id, 0]));
    let remainingCapacity = Math.max(0, roundDownToFive(available));
    let remaining = demands.map(item => ({
      ...item,
      weight: item.demand * priorityWeight(item.plan, Math.round((dateFromKey(item.plan.deadline) - weekMonday) / 86400000))
    })).filter(item => item.demand >= MIN_SESSION && item.weight > 0);

    while (remaining.length && remainingCapacity >= MIN_SESSION) {
      const weightSum = remaining.reduce((sum, item) => sum + item.weight, 0);
      if (!weightSum) break;
      const shares = new Map(remaining.map(item => [item.plan.id, remainingCapacity * item.weight / weightSum]));
      const capped = remaining.filter(item => item.demand <= (shares.get(item.plan.id) || 0));
      if (capped.length) {
        for (const item of capped) {
          result.set(item.plan.id, item.demand);
          remainingCapacity -= item.demand;
        }
        const cappedIds = new Set(capped.map(item => item.plan.id));
        remaining = remaining.filter(item => !cappedIds.has(item.plan.id));
        continue;
      }
      let allocatedThisRound = 0;
      for (const item of remaining) {
        const share = roundDownToFive(shares.get(item.plan.id) || 0);
        const allocation = Math.min(item.demand, share);
        result.set(item.plan.id, allocation);
        allocatedThisRound += allocation;
      }
      let residue = remainingCapacity - allocatedThisRound;
      const ranked = [...remaining].sort((a, b) => {
        const remainA = Math.max(1, a.demand - (result.get(a.plan.id) || 0));
        const remainB = Math.max(1, b.demand - (result.get(b.plan.id) || 0));
        return (b.weight / remainB) - (a.weight / remainA);
      });
      while (residue >= 5) {
        let progressed = false;
        for (const item of ranked) {
          const have = result.get(item.plan.id) || 0;
          if (have + 5 <= item.demand && residue >= 5) {
            result.set(item.plan.id, have + 5);
            residue -= 5;
            progressed = true;
          }
        }
        if (!progressed) break;
      }
      break;
    }
    return result;
  }
  function intervalsOverlap(startA, endA, startB, endB) { return startA < endB && endA > startB; }
  function getSlotDate(weekKey, slot) {
    const monday = dateFromKey(weekKey);
    if (!monday || !DAY_NAMES.includes(slot.day)) return null;
    return addDays(monday, DAY_NAMES.indexOf(slot.day));
  }
  function sessionDurations(total, requestedLength) {
    const maxLength = Math.max(MIN_SESSION, Math.min(MAX_SESSION, requestedLength));
    const result = [];
    let remaining = roundDownToFive(total);
    while (remaining >= MIN_SESSION) {
      if (remaining <= maxLength) {
        result.push(remaining);
        break;
      }
      const after = remaining - maxLength;
      if (after > 0 && after < MIN_SESSION) {
        result.push(remaining);
        break;
      }
      result.push(maxLength);
      remaining -= maxLength;
    }
    return result;
  }
  function taskFor(plan, topic, n) {
    const methods = [
      'Recall the key ideas without notes, then check gaps',
      'Complete exam-style questions and mark the answers',
      'Explain the topic from memory and correct omissions',
      'Review mistakes, then retry the hardest questions'
    ];
    const cleanTopic = String(topic || plan.goal || plan.title || 'the target skill').trim().slice(0, 100);
    return `${cleanTopic}: ${methods[n % methods.length]}`.slice(0, 180);
  }
  function buildProposal(input) {
    const today = dateFromKey(input.todayKey) || new Date();
    const todayKey = keyFromDate(today);
    const availability = normalizeAvailability(input.availability);
    const allPlans = Array.isArray(input.plans) ? input.plans : [];
    const plans = allPlans.filter(plan => plan && plan.status === 'active' && dateFromKey(plan.deadline) && plan.deadline >= todayKey && plan.subject && plan.title);
    const existing = Array.isArray(input.existingSessions) ? input.existingSessions : [];
    const result = {
      sessions: [], requestedMinutes: 0, scheduledMinutes: 0, unplacedMinutes: 0,
      availableMinutes: 0, warnings: [], byPlan: [], planCount: plans.length,
      startDate: todayKey, deadline: plans.reduce((max, p) => p.deadline > max ? p.deadline : max, todayKey)
    };
    const metrics = new Map(plans.map(plan => [plan.id, { planId: plan.id, title: plan.title, subject: plan.subject, requestedMinutes: 0, scheduledMinutes: 0, unplacedMinutes: 0, sessions: 0 }]));
    if (!plans.length) {
      result.warnings.push('There are no active plans with a deadline today or later. Create a plan or resume one.');
      return result;
    }

    // Keep manual events and completed plan sessions as real commitments. Uncompleted
    // generated plan sessions are ignored here because approval will replace them.
    const reservations = new Map();
    const ensureDate = key => {
      if (!reservations.has(key)) reservations.set(key, []);
      return reservations.get(key);
    };
    for (const slot of existing) {
      const date = dateFromKey(slot.date);
      if (!date || slot.date < todayKey || !DAY_NAMES.includes(slot.day) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(String(slot.time || ''))) continue;
      const generated = slot.source === 'study-plan' || Boolean(slot.planId);
      if (generated && !slot.completed) continue;
      ensureDate(slot.date).push({
        time: slot.time,
        minutes: clampNumber(slot.minutes, 1, 720, 25),
        completed: slot.completed === true,
        planId: slot.planId || null,
        source: slot.source || 'manual',
        task: String(slot.task || 'Existing session')
      });
    }
    const occupiedMinutes = key => ensureDate(key).reduce((sum, s) => sum + s.minutes, 0);
    const allDailyCapacity = new Map();
    const dailyFree = new Map();
    for (let d = new Date(today); keyFromDate(d) <= result.deadline; d = addDays(d, 1)) {
      const key = keyFromDate(d);
      const cap = dayCapacity(d, availability);
      allDailyCapacity.set(key, cap);
      dailyFree.set(key, Math.max(0, cap - occupiedMinutes(key)));
      result.availableMinutes += Math.max(0, cap - occupiedMinutes(key));
    }

    const todayTime = input.currentTime || `${String(new Date().getHours()).padStart(2, '0')}:${String(new Date().getMinutes()).padStart(2, '0')}`;
    const todayMinute = minutesOfTime(todayTime, 0);
    const timesFor = (dateKey, duration) => {
      const date = dateFromKey(dateKey);
      const isWeekend = date.getDay() === 0 || date.getDay() === 6;
      let start = minutesOfTime(isWeekend ? availability.weekendStart : availability.weekdayStart, isWeekend ? 600 : 1020);
      if (dateKey === todayKey) start = Math.max(start, todayMinute + 10);
      const latestStart = isWeekend ? 17 * 60 : 20 * 60;
      const step = duration + 10;
      const reserved = ensureDate(dateKey);
      const times = [];
      for (let t = start; t <= latestStart && t + duration <= (isWeekend ? 18 * 60 : 21 * 60); t += step) {
        if (reserved.some(s => intervalsOverlap(t, t + duration, minutesOfTime(s.time, 0), minutesOfTime(s.time, 0) + s.minutes))) continue;
        times.push(timeOfMinutes(t));
      }
      return times;
    };

    const maxDate = dateFromKey(result.deadline);
    let monday = mondayOf(today);
    let weekCounter = 0;
    while (monday <= maxDate) {
      const weekDates = [];
      for (let i = 0; i < 7; i++) {
        const date = addDays(monday, i), key = keyFromDate(date);
        if (key >= todayKey && key <= result.deadline) weekDates.push({ date, key, cap: allDailyCapacity.has(key) ? allDailyCapacity.get(key) : dayCapacity(date, availability) });
      }
      const demands = [];
      for (const plan of plans) {
        const eligibleDays = weekDates.filter(item => item.key <= plan.deadline);
        if (!eligibleDays.length) continue;
        const proportion = eligibleDays.length / 7;
        const demand = roundDownToFive(Number(plan.weeklyMinutes || 90) * proportion);
        if (demand < MIN_SESSION) continue;
        demands.push({ plan, demand });
        const m = metrics.get(plan.id); if (m) m.requestedMinutes += demand;
        result.requestedMinutes += demand;
      }
      if (demands.length) {
        const availableThisWeek = weekDates.reduce((sum, item) => sum + Math.max(0, item.cap - occupiedMinutes(item.key)), 0);
        const budgets = allocateMinutes(demands, availableThisWeek, monday);
        const allocations = demands.map(item => ({ ...item, budget: budgets.get(item.plan.id) || 0, remaining: budgets.get(item.plan.id) || 0, topicIndex: 0, sessionIndex: 0 }));
        for (const item of allocations) {
          const m = metrics.get(item.plan.id);
          if (m) m.unplacedMinutes += Math.max(0, item.demand - item.budget);
        }
        const ordered = allocations.filter(item => item.budget >= MIN_SESSION).sort((a, b) => {
          const urgA = (a.plan.priority === 'high' ? 1.5 : a.plan.priority === 'low' ? 0.7 : 1) / Math.max(1, (dateFromKey(a.plan.deadline) - monday) / 86400000 + 1);
          const urgB = (b.plan.priority === 'high' ? 1.5 : b.plan.priority === 'low' ? 0.7 : 1) / Math.max(1, (dateFromKey(b.plan.deadline) - monday) / 86400000 + 1);
          return urgB - urgA;
        });
        let guard = 0;
        while (ordered.some(item => item.remaining >= MIN_SESSION) && guard++ < 2000 && result.sessions.length < MAX_PROPOSED_SESSIONS) {
          for (let oi = 0; oi < ordered.length; oi++) {
            const item = ordered[(oi + weekCounter) % ordered.length];
            if (item.remaining < MIN_SESSION) continue;
            const length = Math.min(availability.sessionMinutes, item.remaining, MAX_SESSION);
            const lastRemainder = item.remaining - length;
            let duration = length;
            if (lastRemainder > 0 && lastRemainder < MIN_SESSION) duration += lastRemainder;
            if (duration > MAX_SESSION) duration = length;
            if (duration < MIN_SESSION) continue;
            const eligible = weekDates.filter(day => day.key <= item.plan.deadline && (dailyFree.get(day.key) || 0) >= duration);
            eligible.sort((a, b) => {
              const usedA = (allDailyCapacity.get(a.key) || 0) - (dailyFree.get(a.key) || 0);
              const usedB = (allDailyCapacity.get(b.key) || 0) - (dailyFree.get(b.key) || 0);
              const ratioA = usedA / Math.max(1, allDailyCapacity.get(a.key) || 1);
              const ratioB = usedB / Math.max(1, allDailyCapacity.get(b.key) || 1);
              const sameA = result.sessions.filter(s => s.date === a.key && s.planId === item.plan.id).length;
              const sameB = result.sessions.filter(s => s.date === b.key && s.planId === item.plan.id).length;
              return sameA - sameB || ratioA - ratioB || ((DAY_NAMES.indexOf(dayName(a.date)) + weekCounter) % 7) - ((DAY_NAMES.indexOf(dayName(b.date)) + weekCounter) % 7);
            });
            let placed = null;
            for (const day of eligible) {
              const times = timesFor(day.key, duration);
              if (times.length) { placed = { ...day, time: times[0], duration }; break; }
            }
            if (!placed) {
              // No remaining date/time combination can hold this session this week.
              // Stop this plan for this week and report the remainder as unscheduled.
              item.unplaceable = (item.unplaceable || 0) + item.remaining;
              item.remaining = 0;
              continue;
            }
            const topics = Array.isArray(item.plan.topics) && item.plan.topics.length ? item.plan.topics : [item.plan.goal || item.plan.title];
            const topic = String(topics[item.topicIndex % topics.length] || item.plan.title).trim().slice(0, 100);
            const slot = {
              date: placed.key, day: dayName(placed.date), time: placed.time,
              subject: item.plan.subject, task: taskFor(item.plan, topic, item.sessionIndex),
              minutes: placed.duration, reminderMinutes: 10, planId: item.plan.id,
              planTopic: topic, source: 'study-plan'
            };
            result.sessions.push(slot);
            ensureDate(placed.key).push({ time: placed.time, minutes: placed.duration, completed: false, planId: item.plan.id, source: 'study-plan', task: slot.task });
            dailyFree.set(placed.key, Math.max(0, (dailyFree.get(placed.key) || 0) - placed.duration));
            item.remaining -= placed.duration;
            item.topicIndex++;
            item.sessionIndex++;
            const m = metrics.get(item.plan.id); if (m) { m.scheduledMinutes += placed.duration; m.sessions++; }
            result.scheduledMinutes += placed.duration;
            if (item.remaining < MIN_SESSION) {
              if (item.remaining > 0) { const mm = metrics.get(item.plan.id); if (mm) mm.unplacedMinutes += item.remaining; }
              item.remaining = 0;
            }
          }
        }
        for (const item of ordered) {
          if (item.remaining >= MIN_SESSION) { const m = metrics.get(item.plan.id); if (m) m.unplacedMinutes += item.remaining; }
        }
      }
      monday = addDays(monday, 7);
      weekCounter++;
    }
    if (result.sessions.length >= MAX_PROPOSED_SESSIONS) result.warnings.push(`The proposal reached the safety limit of ${MAX_PROPOSED_SESSIONS} sessions. Shorten the deadline or create a smaller set of plans.`);
    result.unplacedMinutes = Math.max(0, result.requestedMinutes - result.scheduledMinutes);
    for (const metric of metrics.values()) metric.unplacedMinutes = Math.max(0, metric.requestedMinutes - metric.scheduledMinutes);
    result.byPlan = [...metrics.values()];
    if (result.unplacedMinutes > 0) result.warnings.push(`About ${result.unplacedMinutes} minutes of requested weekly effort could not be fitted around your daily limits, other sessions, days off and deadlines.`);
    if (!result.sessions.length) result.warnings.push('No sessions fit the current availability and calendar. Try a later deadline, a higher daily limit, or fewer active plans.');
    return result;
  }

  const api = { buildProposal, normalizeAvailability, dateFromKey, keyFromDate, mondayOf, dayName };
  root.RevisionStudyPlannerEngine = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
