export const WIDGET_FIELDS = `
  uuid
  type
  status
  rawSettings
  placements { uuid area sortOrder entityUrn }
  columns {
    index
    widgets {
      uuid
      type
      status
      rawSettings
      placements { uuid area sortOrder entityUrn }
      columns {
        index
        widgets {
          uuid
          type
          status
          rawSettings
          placements { uuid area sortOrder entityUrn }
        }
      }
    }
  }
`;

export const WIDGETS_FOR_ROUTE_QUERY = `
  query WidgetsForRoute($route: String!, $changeset: String, $entityUrn: String) {
    widgetsForRoute(route: $route, changeset: $changeset, entityUrn: $entityUrn) {
      ${WIDGET_FIELDS}
    }
  }
`;

export interface WidgetFragment {
  uuid: string;
  type: string;
  status: number;
  rawSettings: Record<string, unknown>;
  placements: Array<{ uuid: string; area: string; sortOrder: number; entityUrn: string | null }>;
  columns: Array<{ index: number; widgets: WidgetFragment[] }>;
}

export interface WidgetsForRouteResponse {
  widgetsForRoute: WidgetFragment[];
}
