import type { Core } from '@strapi/strapi';

/** YYYY-MM-DD `days` from today (UTC). */
function isoDate(days: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export default {
  /**
   * An asynchronous register function that runs before
   * your application is initialized.
   */
  register(/* { strapi }: { strapi: Core.Strapi } */) {},

  /**
   * Runs before the app starts. We seed a couple of example reading challenges
   * on first boot so the app has live data to render immediately. Edit or delete
   * them in the admin — the seed only runs when the collection is empty.
   */
  async bootstrap({ strapi }: { strapi: Core.Strapi }) {
    const existing = await strapi.db.query('api::challenge.challenge').count();
    if (existing > 0) return;

    type ChallengeSeed = {
      title: string;
      description: string;
      goalType:
        | 'days_logged'
        | 'books_finished'
        | 'pages_read'
        | 'minutes_read'
        | 'distinct_genres';
      target: number;
      startDate: string;
      endDate: string;
      xpReward: number;
      coinReward: number;
    };

    const seeds: ChallengeSeed[] = [
      {
        title: 'July Reading Sprint',
        description: 'Log a reading session on 10 days this month.',
        goalType: 'days_logged',
        target: 10,
        startDate: isoDate(0),
        endDate: isoDate(30),
        xpReward: 200,
        coinReward: 100,
      },
      {
        title: 'Finish the Stack',
        description: 'Finish 3 books before the challenge ends.',
        goalType: 'books_finished',
        target: 3,
        startDate: isoDate(0),
        endDate: isoDate(45),
        xpReward: 500,
        coinReward: 250,
      },
    ];

    for (const data of seeds) {
      await strapi.documents('api::challenge.challenge').create({
        data,
        status: 'published',
      });
    }
    strapi.log.info(`[bootstrap] seeded ${seeds.length} example challenges`);
  },
};
