import { randomUUID } from 'node:crypto';
import { getDb } from './db.js';

/**
 * One published landing page so `/admin/landing-pages/:uuid` has a row.
 *
 * Unlike cms_page, landing_page keeps its content on the row itself — there
 * is no `landing_page_description` companion table — so name/url_key/
 * description are all set in a single insert.
 */

export interface TestLandingPage {
  landingPageId: number;
  uuid: string;
  urlKey: string;
}

export async function seedLandingPage(): Promise<TestLandingPage> {
  const db = getDb();
  const urlKey = `e2e-landing-${randomUUID().replace(/-/g, '').slice(0, 10)}`;

  // status defaults to false (draft); the capture wants the published view.
  const { rows } = await db.query<{ landing_page_id: number; uuid: string }>(
    `INSERT INTO landing_page
       (name, url_key, status, description, meta_title, meta_description,
        publish_start, publish_end)
     VALUES ('E2E Fixture Landing Page', $1, true,
             'Landing page created by the e2e fixture seeder.',
             'E2E Fixture Landing Page',
             'Landing page created by the e2e fixture seeder.',
             NOW() - INTERVAL '1 day', NOW() + INTERVAL '1 year')
     RETURNING landing_page_id, uuid`,
    [urlKey]
  );
  return {
    landingPageId: rows[0].landing_page_id,
    uuid: rows[0].uuid,
    urlKey
  };
}

/** Sweep every `e2e-` landing page by url_key prefix. */
export async function cleanupLandingPages(): Promise<void> {
  const db = getDb();
  await db.query(`DELETE FROM landing_page WHERE url_key LIKE 'e2e-%'`);
}
