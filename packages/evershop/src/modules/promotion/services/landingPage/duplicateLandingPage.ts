import { randomUUID } from 'node:crypto';
import {
  commit,
  insert,
  rollback,
  select,
  startTransaction
} from '@evershop/postgres-query-builder';
import { getConnection } from '../../../../lib/postgres/connection.js';
import { PromotionUrn } from '../../../../lib/urn/index.js';
import {
  hookable,
  hookBefore,
  hookAfter
} from '../../../../lib/util/hookable.js';
import { remapColumnAreaParent } from '../../../../lib/widget/columnArea.js';
import { syncLandingPageUrlRewrite } from './syncLandingPageUrlRewrite.js';

/** Find a free `<base>-copy[-N]` url_key (the landing_page.url_key is UNIQUE). */
async function uniqueUrlKey(connection: any, base: string): Promise<string> {
  let candidate = `${base}-copy`;
  let n = 1;
   
  while (
    await select()
      .from('landing_page')
      .where('url_key', '=', candidate)
      .load(connection)
  ) {
    n += 1;
    candidate = `${base}-copy-${n}`;
  }
  return candidate;
}

async function duplicateLandingPageData(
  uuid: string,
  connection: any
): Promise<any> {
  const source = await select()
    .from('landing_page')
    .where('uuid', '=', uuid)
    .load(connection);
  if (!source) {
    throw new Error('Invalid landing page id');
  }

  // 1. Clone the entity row as an unpublished draft with a fresh url_key.
  const newUrlKey = await uniqueUrlKey(connection, source.url_key);
  const copy = await insert('landing_page')
    .given({
      status: false,
      name: `${source.name} (copy)`,
      url_key: newUrlKey,
      description: source.description,
      meta_title: source.meta_title,
      meta_description: source.meta_description,
      publish_start: source.publish_start,
      publish_end: source.publish_end
    })
    .execute(connection);

  await syncLandingPageUrlRewrite(connection, {
    uuid: copy.uuid,
    url_key: newUrlKey
  });

  // 2. Deep-clone the page-builder body. Settings live on widget_instance, so a
  // placement-only (shallow) copy would let editing the copy mutate the original
  // — clone the instances too and repoint the cloned placements at them + the
  // new entity_urn. See wiki/landing-pages.md § Duplicate.
  const oldUrn = PromotionUrn.landingPage(uuid);
  const newUrn = PromotionUrn.landingPage(copy.uuid);
  const placements = await select()
    .from('widget_placement')
    .where('entity_urn', '=', oldUrn)
    .execute(connection);

  const instanceIds = [
    ...new Set(placements.map((p: any) => p.widget_instance_id))
  ];
  const idMap = new Map<number, number>();
  // Container children encode their parent by UUID in `area`
  // (`columnsContainer_<parentUuid>_col_<n>`), so cloning also needs an
  // old-uuid → new-uuid map. The new uuid is minted here rather than left to
  // the column default so it is known before the placements are written.
  const uuidMap = new Map<string, string>();
  for (const oldId of instanceIds) {

    const wi = await select()
      .from('widget_instance')
      .where('widget_instance_id', '=', oldId)
      .load(connection);
    if (!wi) continue;
    const newUuid = randomUUID();

    const newWi = await insert('widget_instance')
      .given({
        uuid: newUuid,
        name: wi.name,
        type: wi.type,
        settings: wi.settings,
        status: wi.status,
        theme: wi.theme
      })
      .execute(connection);
    idMap.set(oldId as number, newWi.widget_instance_id);
    uuidMap.set(wi.uuid as string, newUuid);
  }

  for (const p of placements) {
    const newInstanceId = idMap.get(p.widget_instance_id);
    if (!newInstanceId) continue;

    await insert('widget_placement')
      .given({
        widget_instance_id: newInstanceId,
        route: p.route,
        // Repoint nested children at the CLONED container. Copying `area`
        // verbatim left them addressed to the source page's container uuid,
        // so a duplicated page silently lost the contents of every Columns /
        // Section widget — the children were written but nothing rendered
        // them, because `findWidgetsInArea` matches on this exact string.
        area: remapColumnAreaParent(p.area, uuidMap),
        sort_order: p.sort_order,
        theme: p.theme,
        entity_urn: newUrn
      })
      .execute(connection);
  }

  /**
   * 3. Clone the page-builder body's OTHER representation.
   *
   * An entity-scoped `puck_document` is what the Puck render path reads, and
   * it is keyed by `(route, scope_urn)` — so a duplicate that only cloned
   * widget rows would produce a copy whose page was empty under Puck while
   * looking correct under the widget pipeline, right up until cutover.
   *
   * The document's `data` is copied verbatim, component ids included. Those
   * ids are per-document, and two documents are never rendered on the same
   * page, so there is nothing for them to collide with — unlike the widget
   * rows above, whose uuids are globally unique and therefore had to be
   * remapped.
   */
  await connection.query(
    `INSERT INTO puck_document (route, scope_urn, theme, data)
     SELECT route, $1, theme, data
       FROM puck_document
      WHERE scope_urn = $2
     ON CONFLICT (route, COALESCE(scope_urn,''), COALESCE(theme,''))
     DO UPDATE SET data = EXCLUDED.data`,
    [newUrn, oldUrn]
  );

  return copy;
}

const _duplicateLandingPage = async function duplicateLandingPage(
  uuid: string,
  context: any
): Promise<any> {
  const connection = await getConnection();
  await startTransaction(connection);
  try {
    const copy = await hookable(duplicateLandingPageData, {
      ...context,
      connection
    })(uuid, connection);
    await commit(connection);
    return copy;
  } catch (e) {
    await rollback(connection);
    throw e;
  }
};

export async function duplicateLandingPage(
  uuid: string,
  context: any
): Promise<any> {
  if (context && typeof context !== 'object') {
    throw new Error('Context must be an object');
  }
  return hookable(_duplicateLandingPage, context)(uuid, context);
}

export default duplicateLandingPage;

export function hookBeforeDuplicateLandingPageData(
  callback: (...args: any[]) => void | Promise<void>,
  priority = 10
): void {
  hookBefore('duplicateLandingPageData', callback, priority);
}
export function hookAfterDuplicateLandingPageData(
  callback: (...args: any[]) => void | Promise<void>,
  priority = 10
): void {
  hookAfter('duplicateLandingPageData', callback, priority);
}
