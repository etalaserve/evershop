import { SettingMenuItem } from '@components/admin/SettingMenuItem.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import React from 'react';

interface ThemeBuilderMenuProps {
  themeBuilderUrl: string;
}

export default function ThemeBuilderMenu({
  themeBuilderUrl
}: ThemeBuilderMenuProps) {
  return (
    <SettingMenuItem
      url={themeBuilderUrl}
      title={_('Theme Builder')}
      description={_('Customize colors, radius, and fonts')}
    />
  );
}

export const layout = {
  areaId: 'settingPageMenu',
  sortOrder: 15
};

export const query = `
  query Query {
    themeBuilderUrl: url(routeId: "themeBuilder")
  }
`;
